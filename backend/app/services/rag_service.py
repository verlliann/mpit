import logging
import json
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.config import settings
from app.models.vector_store import DocumentChunk
from app.models.document import Document

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG operations"""
    
    _instance = None
    _embedding_model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RAGService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._embedding_model is None:
            self._load_embedding_model()
    
    def _load_embedding_model(self):
        """Load sentence transformer model for embeddings"""
        try:
            logger.info(f"Загрузка модели эмбеддингов: {settings.RAG_EMBEDDING_MODEL}")
            self._embedding_model = SentenceTransformer(settings.RAG_EMBEDDING_MODEL)
            logger.info("✅ Модель эмбеддингов загружена")
        except Exception as e:
            logger.error(f"❌ Ошибка при загрузке модели эмбеддингов: {e}")
            raise
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        if self._embedding_model is None:
            self._load_embedding_model()
        
        embedding = self._embedding_model.encode(text, convert_to_numpy=True)
        return embedding
    
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
            
            for i, chunk_data in enumerate(chunks):
                # Генерируем эмбеддинг для каждого чанка
                chunk_embedding = self.generate_embedding(chunk_data["text"])
                
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
            logger.info(f"✅ RAG сохранил метрики в Postgres для документа {document_id}")
            
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
            query_sql = """
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
                    1 - (dc.embedding <=> :query_embedding::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE d.is_deleted = false
                ORDER BY similarity DESC
                LIMIT :top_k
            """
            
            result = await db.execute(
                text(query_sql),
                {
                    "query_embedding": query_embedding.tolist(),
                    "top_k": top_k
                }
            )
            
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
            
            query_sql = """
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
                    1 - (dc.embedding <=> :query_embedding::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE d.is_deleted = false
            """
            
            params = {
                "query_embedding": query_embedding.tolist(),
                "top_k": top_k
            }
            
            if document_ids:
                query_sql += " AND dc.document_id = ANY(:document_ids)"
                params["document_ids"] = [str(doc_id) for doc_id in document_ids]
            
            query_sql += " ORDER BY similarity DESC LIMIT :top_k"
            
            result = await db.execute(
                text(query_sql),
                params
            )
            
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
