"""
Celery tasks for background processing
"""
from app.tasks.rag_tasks import process_document_rag

__all__ = ["process_document_rag"]

