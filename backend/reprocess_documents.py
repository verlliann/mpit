#!/usr/bin/env python3
"""
Скрипт для повторной обработки документов через RAG
"""
import asyncio
import sys
import os
from pathlib import Path

# Добавляем путь к приложению
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import AsyncSessionLocal
from app.services.rag_service import rag_service
from app.services.qwen_service import qwen_service
from app.core.storage import download_file
from app.services.document_processor import DocumentProcessor
from sqlalchemy import select
from app.models.document import Document
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reprocess_documents():
    """Обработать все документы через RAG"""
    async with AsyncSessionLocal() as db:
        # Получаем все документы
        result = await db.execute(
            select(Document).where(Document.is_deleted == False)
        )
        docs = result.scalars().all()
        
        logger.info(f"📄 Найдено документов для обработки: {len(docs)}")
        
        processor = DocumentProcessor()
        
        for doc in docs:
            logger.info(f"\n{'='*60}")
            logger.info(f"🔄 Обрабатываю: {doc.title} (ID: {doc.id})")
            logger.info(f"{'='*60}")
            
            try:
                # Загружаем файл из MinIO
                logger.info("📥 Загружаю файл из MinIO...")
                file_data = download_file(doc.path)
                logger.info(f"✅ Файл загружен, размер: {len(file_data)} байт")
                
                # Извлекаем текст
                file_ext = Path(doc.path).suffix
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                    tmp.write(file_data)
                    tmp_path = tmp.name
                
                try:
                    logger.info("📝 Извлекаю текст из документа...")
                    text = processor.load_file(tmp_path)
                    logger.info(f"✅ Извлечено текста: {len(text)} символов")
                    
                    if not text or len(text.strip()) < 10:
                        logger.warning(f"⚠️ Документ {doc.title} содержит слишком мало текста, пропускаю")
                        continue
                    
                    # Обрабатываем через RAG для получения метрик
                    logger.info("🔄 Обрабатываю через RAG...")
                    metrics = await rag_service.process_document_for_metrics(
                        text=text,
                        filename=doc.title,
                        file_size=len(file_data)
                    )
                    logger.info(f"✅ RAG обработал: {metrics.get('chunks_count', 0)} чанков")
                    
                    # Классифицируем документ через Qwen
                    logger.info("🤖 Классифицирую документ через Qwen...")
                    classification = await qwen_service.classify_metrics_from_rag(
                        text=text[:2000],  # Первые 2000 символов для классификации
                        filename=doc.title,
                        metrics=metrics
                    )
                    logger.info(f"✅ Классификация: тип={classification.get('type')}, приоритет={classification.get('priority')}")
                    
                    # Сохраняем метрики и чанки в Postgres
                    logger.info("💾 Сохраняю чанки в Postgres...")
                    await rag_service.save_metrics_to_postgres(
                        db=db,
                        document_id=str(doc.id),
                        metrics=metrics,
                        classification_result=classification
                    )
                    await db.commit()
                    logger.info(f"✅ Документ {doc.title} успешно обработан и сохранен!")
                    
                finally:
                    # Удаляем временный файл
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass
                        
            except Exception as e:
                logger.error(f"❌ Ошибка при обработке документа {doc.title}: {e}")
                import traceback
                traceback.print_exc()
                await db.rollback()
                continue
        
        logger.info(f"\n{'='*60}")
        logger.info(f"✅ Обработка завершена!")
        logger.info(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(reprocess_documents())

