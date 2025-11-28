"""
RAG processing tasks for Celery
"""
import asyncio
import logging
from typing import Dict, Any
from celery import Task

from app.core.celery_app import celery_app
from app.services.document_processor import DocumentProcessor
from app.services.rag_service import RAGService
from app.services.qwen_service import QwenService
from app.core.database import AsyncSessionLocal
from app.models.document import Document
from sqlalchemy import select
import uuid

logger = logging.getLogger(__name__)


class AsyncTask(Task):
    """Base task class that runs async functions"""
    
    def __call__(self, *args, **kwargs):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.run_async(*args, **kwargs))
    
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError


@celery_app.task(bind=True, base=AsyncTask, name="app.tasks.process_document_rag")
class ProcessDocumentRAGTask(AsyncTask):
    """Process document through RAG pipeline"""
    
    async def run_async(self, document_id: str) -> Dict[str, Any]:
        """
        Process document through RAG pipeline:
        1. Extract text from document
        2. Split into chunks
        3. Generate embeddings with Qwen
        4. Save to database
        
        Args:
            document_id: UUID of the document to process
            
        Returns:
            Dict with processing results
        """
        logger.info(f"🔄 [Celery] Starting RAG processing for document {document_id}")
        
        try:
            # Get document from database
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = result.scalar_one_or_none()
                
                if not document:
                    logger.error(f"❌ [Celery] Document {document_id} not found")
                    return {
                        "success": False,
                        "error": "Document not found"
                    }
                
                logger.info(f"📄 [Celery] Processing document: {document.title}")
                
                # Initialize services
                doc_processor = DocumentProcessor()
                rag_service = RAGService()
                qwen_service = QwenService()
                
                # Extract text (load_file is synchronous)
                logger.info(f"📝 [Celery] Extracting text from {document.title}")
                
                # Get file from MinIO first
                from app.core.storage import download_file
                import tempfile
                import os
                from pathlib import Path
                
                # Download from MinIO to temp file
                file_data = download_file(document.path)
                file_ext = Path(document.path).suffix
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                    tmp_file.write(file_data)
                    tmp_path = tmp_file.name
                
                try:
                    text = doc_processor.load_file(tmp_path)
                finally:
                    os.unlink(tmp_path)
                
                if not text or len(text.strip()) < 10:
                    logger.warning(f"⚠️ [Celery] No text extracted from {document.title}")
                    return {
                        "success": False,
                        "error": "No text content extracted"
                    }
                
                # Classify document with Qwen (synchronous method)
                logger.info(f"🤖 [Celery] Classifying document with Qwen")
                classification = qwen_service.classify_document(
                    text=text[:1000],  # First 1000 chars for classification
                    filename=document.title
                )
                
                # Update document classification
                if classification.get("tags"):
                    document.tags = classification.get("tags", [])
                if classification.get("description"):
                    document.summary = classification.get("description", "")
                await session.commit()
                
                logger.info(f"✅ [Celery] Document classified: {classification.get('type', 'unknown')}")
                
                # Process through RAG - generate chunks and embeddings
                logger.info(f"🔍 [Celery] Processing with RAG")
                
                # Split text into chunks
                chunk_size = 500
                chunk_overlap = 100
                chunks = []
                
                for i in range(0, len(text), chunk_size - chunk_overlap):
                    chunk_text = text[i:i + chunk_size]
                    if len(chunk_text.strip()) > 50:  # Skip very short chunks
                        chunks.append({
                            "text": chunk_text,
                            "start_pos": i,
                            "end_pos": min(i + chunk_size, len(text))
                        })
                
                logger.info(f"📊 [Celery] Created {len(chunks)} chunks")
                
                # Save chunks to database
                if chunks:
                    await rag_service.add_document_chunks(
                        db=session,
                        document_id=str(document.id),
                        chunks=chunks
                    )
                    chunks_created = len(chunks)
                else:
                    chunks_created = 0
                
                logger.info(f"✅ [Celery] RAG processing completed: {chunks_created} chunks created")
                
                return {
                    "success": True,
                    "document_id": str(document.id),
                    "chunks_created": chunks_created,
                    "classification": classification
                }
                
        except Exception as e:
            logger.error(f"❌ [Celery] Error processing document {document_id}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


# Export task function
process_document_rag = ProcessDocumentRAGTask()

