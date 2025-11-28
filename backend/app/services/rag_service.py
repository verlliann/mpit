import logging
import json
from typing import List, Dict, Optional
import numpy as np
import torch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.config import settings
from app.models.vector_store import DocumentChunk
from app.models.document import Document
from app.services.qwen_service import QwenService

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG operations using Qwen3-4B for embeddings"""
    
    _instance = None
    _qwen_service = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RAGService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Lazy loading - Qwen модель будет загружена при первом использовании
        # Это предотвращает блокировку при старте приложения
        pass
    
    def _ensure_qwen_loaded(self):
        """Ensure Qwen model is loaded (lazy loading)"""
        if self._qwen_service is None:
            self._qwen_service = QwenService()
            # Убеждаемся, что модель загружена
            self._qwen_service._ensure_model_loaded()
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for text using Qwen3-4B model
        Использует скрытые состояния модели для создания эмбеддингов
        """
        self._ensure_qwen_loaded()
        
        try:
            model = self._qwen_service._model
            tokenizer = self._qwen_service._tokenizer
            
            if model is None or tokenizer is None:
                raise RuntimeError("Qwen model not loaded")
            
            # Токенизация текста
            inputs = tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=2048
            )
            
            device = self._qwen_service._get_best_device()
            
            # Для генерации эмбеддингов всегда используем CPU, чтобы избежать проблем с MPS
            # MPS может иметь проблемы с некоторыми операциями (например, register_pytree_node)
            # Поэтому для стабильности используем CPU для эмбеддингов
            inputs_cpu = {k: v.to("cpu") for k, v in inputs.items()}
            
            # Получаем скрытые состояния модели на CPU
            with torch.no_grad():
                # Временно перемещаем модель на CPU для генерации эмбеддингов
                original_device = next(model.parameters()).device
                model_cpu = model.to("cpu")
                
                try:
                    outputs = model_cpu(**inputs_cpu, output_hidden_states=True)
                finally:
                    # Возвращаем модель на исходное устройство
                    model.to(original_device)
            
            # Нормализуем эмбеддинг (L2 нормализация)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            return embedding.astype(np.float32)
                
        except Exception as e:
            logger.error(f"❌ Ошибка при генерации эмбеддинга через Qwen: {e}")
            raise
    
    async def process_document_for_metrics(
        self,
        text: str,
        filename: str,
        file_size: int
    ) -> Dict[str, any]:
        """
        Обработать документ и подготовить метрики для передачи в Qwen
        Согласно архитектуре: RAG получает документ, обрабатывает и передает метрики в Qwen
        
        Args:
            text: Текст документа
            filename: Имя файла
            file_size: Размер файла в байтах
            
        Returns:
            Метрики документа для передачи в Qwen
        """
        # Генерируем эмбеддинги для текста
        embedding = self.generate_embedding(text)
        
        # Разбиваем на чанки для анализа
        from app.services.document_processor import DocumentProcessor
        processor = DocumentProcessor()
        chunks = processor.chunk_text(text, {
            "file_name": filename,
            "file_size": file_size
        })
        
        # Подготавливаем метрики
        metrics = {
            "text": text,
            "filename": filename,
            "file_size": file_size,
            "text_length": len(text),
            "chunks_count": len(chunks),
            "embedding": embedding.tolist(),
            "chunks": [
                {
                    "text": chunk["text"],
                    "start_pos": chunk["start_pos"],
                    "end_pos": chunk["end_pos"]
                }
                for chunk in chunks
            ]
        }
        
        logger.info(f"✅ RAG обработал документ {filename}, подготовил метрики для Qwen")
        return metrics
    
    def generate_embeddings_batch(self, texts: List[str], batch_size: int = None) -> List[np.ndarray]:
        """
        Генерирует эмбеддинги для батча текстов (оптимизировано для A100 GPU)
        
        Args:
            texts: Список текстов для обработки
            batch_size: Размер батча (None = автоматический выбор для A100)
            
        Returns:
            Список эмбеддингов
        """
        self._ensure_qwen_loaded()
        
        try:
            model = self._qwen_service._model
            tokenizer = self._qwen_service._tokenizer
            
            if model is None or tokenizer is None:
                raise RuntimeError("Qwen model not loaded")
            
            device = self._qwen_service._get_best_device()
            
            # Автоматический выбор batch_size для A100
            if batch_size is None:
                if device == "cuda":
                    # A100 может обрабатывать большие батчи
                    batch_size = min(128, max(32, len(texts) // 5))
                elif device == "mps":
                    # MPS (Apple Silicon) - меньшие батчи
                    batch_size = min(16, max(4, len(texts) // 10))
                else:
                    # CPU - еще меньшие батчи
                    batch_size = min(8, max(2, len(texts) // 20))
            
            logger.info(f"🔄 Генерирую эмбеддинги на {device} батчами по {batch_size}...")
            
            embeddings = []
            
            # Обрабатываем батчами
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                # Токенизация батча
                inputs = tokenizer(
                    batch_texts,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=2048
                )
                
                # Используем GPU (CUDA) для A100, иначе CPU для стабильности
                if device == "cuda":
                    # A100: используем GPU для максимальной производительности
                    inputs_gpu = {k: v.to(device) for k, v in inputs.items()}
                    
                    with torch.no_grad():
                        # Модель уже на GPU
                        outputs = model(**inputs_gpu, output_hidden_states=True)
                        
                        hidden_states = outputs.hidden_states[-1]  # [batch_size, seq_len, hidden_size]
                        attention_mask = inputs_gpu.get('attention_mask', None)
                        
                        if attention_mask is not None:
                            mask_expanded = attention_mask.unsqueeze(-1).expand(hidden_states.size()).float()
                            sum_hidden = torch.sum(hidden_states * mask_expanded, dim=1)
                            sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
                            batch_embeddings = sum_hidden / sum_mask
                        else:
                            batch_embeddings = torch.mean(hidden_states, dim=1)
                        
                        # Перемещаем на CPU для конвертации в numpy
                        batch_embeddings = batch_embeddings.cpu()
                else:
                    # CPU или MPS: используем CPU для стабильности
                    inputs_cpu = {k: v.to("cpu") for k, v in inputs.items()}
                    
                    with torch.no_grad():
                        original_device = next(model.parameters()).device
                        model_cpu = model.to("cpu")
                        
                        try:
                            outputs = model_cpu(**inputs_cpu, output_hidden_states=True)
                        finally:
                            model.to(original_device)
                        
                        hidden_states = outputs.hidden_states[-1]
                        attention_mask = inputs_cpu.get('attention_mask', None)
                        
                        if attention_mask is not None:
                            mask_expanded = attention_mask.unsqueeze(-1).expand(hidden_states.size()).float()
                            sum_hidden = torch.sum(hidden_states * mask_expanded, dim=1)
                            sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
                            batch_embeddings = sum_hidden / sum_mask
                        else:
                            batch_embeddings = torch.mean(hidden_states, dim=1)
                
                # Конвертируем в numpy и нормализуем
                for emb in batch_embeddings:
                    emb_np = emb.numpy().flatten()
                    norm = np.linalg.norm(emb_np)
                    if norm > 0:
                        emb_np = emb_np / norm
                    embeddings.append(emb_np.astype(np.float32))
            
            return embeddings
            
        except Exception as e:
            logger.error(f"❌ Ошибка при генерации эмбеддингов батчем: {e}")
            raise
    
    async def save_metrics_to_postgres(
        self,
        db: AsyncSession,
        document_id: str,
        metrics: Dict[str, any],
        classification_result: Dict[str, any]
    ):
        """
        Сохранить обратные метрики от Qwen в Postgres
        Согласно архитектуре: Qwen формирует обратные метрики → RAG → Postgres
        
        Args:
            db: Database session
            document_id: ID документа
            metrics: Исходные метрики
            classification_result: Результат классификации от Qwen
        """
        try:
            # Сохраняем чанки с эмбеддингами
            chunks = metrics.get("chunks", [])
            embedding = metrics.get("embedding")
            
            from app.models.vector_store import DocumentChunk
            import uuid
            
            if not chunks:
                logger.warning(f"Нет чанков для сохранения документа {document_id}")
                return
            
            # Оптимизация: генерируем эмбеддинги батчами (оптимизировано для A100)
            chunk_texts = [chunk_data["text"] for chunk_data in chunks]
            
            # Автоматический выбор batch_size (для A100 будет 32-128)
            chunk_embeddings = self.generate_embeddings_batch(chunk_texts, batch_size=None)
            logger.info(f"✅ Сгенерировано {len(chunk_embeddings)} эмбеддингов")
            
            # Создаем чанки с эмбеддингами
            for i, (chunk_data, chunk_embedding) in enumerate(zip(chunks, chunk_embeddings)):
                chunk = DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=uuid.UUID(document_id),
                    chunk_id=i,
                    text=chunk_data["text"],
                    start_pos=chunk_data["start_pos"],
                    end_pos=chunk_data["end_pos"],
                    embedding=chunk_embedding.tolist(),
                    chunk_metadata=json.dumps({
                        "filename": metrics.get("filename"),
                        "classification": classification_result
                    })
                )
                
                db.add(chunk)
            
            await db.commit()
            logger.info(f"✅ RAG сохранил {len(chunks)} чанков в Postgres для документа {document_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Ошибка при сохранении метрик в Postgres: {e}")
            raise
    
    async def search_for_qwen(
        self,
        db: AsyncSession,
        query: str,
        top_k: int = None
    ) -> List[Dict]:
        """
        Поиск для Qwen: RAG обращается к Postgres
        Согласно архитектуре: Qwen → RAG → Postgres
        
        Args:
            db: Database session
            query: Поисковый запрос
            top_k: Количество результатов
            
        Returns:
            Список найденных чанков с данными
        """
        if top_k is None:
            top_k = settings.RAG_TOP_K
        
        try:
            # Генерируем эмбеддинг запроса
            query_embedding = self.generate_embedding(query)
            
            # Поиск в Postgres через векторное сравнение
            # Используем правильный синтаксис для pgvector с asyncpg
            embedding_list = query_embedding.tolist()
            embedding_str = '[' + ','.join(map(str, embedding_list)) + ']'
            
            query_sql = f"""
                SELECT 
                    dc.id,
                    dc.document_id,
                    dc.chunk_id,
                    dc.text,
                    dc.start_pos,
                    dc.end_pos,
                    dc.chunk_metadata,
                    d.title as document_title,
                    d.type as document_type,
                    d.path as document_path,
                    1 - (dc.embedding <=> '{embedding_str}'::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE d.is_deleted = false
                ORDER BY similarity DESC
                LIMIT {top_k}
            """
            
            result = await db.execute(text(query_sql))
            
            chunks = []
            for row in result:
                chunks.append({
                    "chunk_id": str(row.id),
                    "document_id": str(row.document_id),
                    "chunk_index": row.chunk_id,
                    "text": row.text,
                    "start_pos": row.start_pos,
                    "end_pos": row.end_pos,
                    "metadata": json.loads(row.chunk_metadata) if row.chunk_metadata else {},
                    "document_title": row.document_title,
                    "document_type": row.document_type,
                    "document_path": row.document_path,
                    "similarity": float(row.similarity)
                })
            
            logger.info(f"✅ RAG нашел {len(chunks)} релевантных чанков для Qwen")
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Ошибка при поиске для Qwen: {e}")
            raise
    
    async def add_document_chunks(
        self,
        db: AsyncSession,
        document_id: str,
        chunks: List[Dict]
    ):
        """Add document chunks with embeddings to vector store (legacy method)"""
        from app.models.vector_store import DocumentChunk
        import uuid
        
        try:
            for chunk_data in chunks:
                embedding = self.generate_embedding(chunk_data['text'])
                
                chunk = DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=uuid.UUID(document_id),
                    chunk_id=chunk_data['chunk_id'],
                    text=chunk_data['text'],
                    start_pos=chunk_data['start_pos'],
                    end_pos=chunk_data['end_pos'],
                    embedding=embedding.tolist(),
                    chunk_metadata=json.dumps(chunk_data.get('metadata', {})) if chunk_data.get('metadata') else None
                )
                
                db.add(chunk)
            
            await db.commit()
            logger.info(f"✅ Добавлено {len(chunks)} чанков для документа {document_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Ошибка при добавлении чанков: {e}")
            raise
    
    async def search_similar_chunks(
        self,
        db: AsyncSession,
        query: str,
        top_k: int = None,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """Search for similar chunks using vector similarity (legacy method)"""
        if top_k is None:
            top_k = settings.RAG_TOP_K
        
        try:
            query_embedding = self.generate_embedding(query)
            
            # Используем правильный синтаксис для pgvector с asyncpg
            embedding_list = query_embedding.tolist()
            embedding_str = '[' + ','.join(map(str, embedding_list)) + ']'
            
            query_sql = f"""
                SELECT 
                    dc.id,
                    dc.document_id,
                    dc.chunk_id,
                    dc.text,
                    dc.start_pos,
                    dc.end_pos,
                    dc.chunk_metadata,
                    d.title as document_title,
                    d.type as document_type,
                    1 - (dc.embedding <=> '{embedding_str}'::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE d.is_deleted = false
            """
            
            if document_ids:
                doc_ids_str = ','.join([f"'{str(doc_id)}'" for doc_id in document_ids])
                query_sql += f" AND dc.document_id = ANY(ARRAY[{doc_ids_str}]::uuid[])"
            
            query_sql += f" ORDER BY similarity DESC LIMIT {top_k}"
            
            result = await db.execute(text(query_sql))
            
            chunks = []
            for row in result:
                chunks.append({
                    "chunk_id": str(row.id),
                    "document_id": str(row.document_id),
                    "chunk_index": row.chunk_id,
                    "text": row.text,
                    "start_pos": row.start_pos,
                    "end_pos": row.end_pos,
                    "metadata": json.loads(row.chunk_metadata) if row.chunk_metadata else {},
                    "document_title": row.document_title,
                    "document_type": row.document_type,
                    "similarity": float(row.similarity)
                })
            
            logger.info(f"Найдено {len(chunks)} релевантных чанков для запроса: {query[:50]}")
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Ошибка при поиске: {e}")
            raise
    
    async def delete_document_chunks(
        self,
        db: AsyncSession,
        document_id: str
    ):
        """Delete all chunks for a document"""
        try:
            await db.execute(
                text("DELETE FROM document_chunks WHERE document_id = :document_id"),
                {"document_id": document_id}
            )
            await db.commit()
            logger.info(f"✅ Удалены чанки для документа {document_id}")
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Ошибка при удалении чанков: {e}")
            raise


# Singleton instance
rag_service = RAGService()
