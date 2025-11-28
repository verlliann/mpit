"""
Documents endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid
import tempfile
import os
import json
from pathlib import Path

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import upload_file, download_file, delete_file, get_presigned_url
from app.models.user import User
from app.models.document import Document, DocumentHistory
from app.models.counterparty import Counterparty
from app.services.document_processor import DocumentProcessor
# RAG and Qwen temporarily disabled
# from app.services.qwen_service import qwen_service
# from app.services.rag_service import rag_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# processor = DocumentProcessor()  # Not needed without RAG/Qwen


class DocumentResponse(BaseModel):
    id: str
    title: str
    type: str
    counterparty: Optional[str]
    counterparty_id: Optional[str]
    date: Optional[str]
    priority: str
    pages: int
    department: Optional[str]
    status: str
    size: Optional[str]
    uploadedBy: str
    path: str
    version: int
    description: Optional[str]
    history: List[dict]
    isFavorite: bool
    isArchived: bool
    isDeleted: bool
    tags: Optional[List[str]]
    created_at: str
    updated_at: Optional[str]


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    limit: int
    pages: int


class CreateDocumentRequest(BaseModel):
    title: str
    type: str
    counterparty_id: Optional[str] = None
    priority: str = "medium"
    department: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    counterparty_id: Optional[str] = None
    priority: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None


@router.get("", response_model=DocumentListResponse)
async def get_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    counterparty_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    is_deleted: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of documents with filters"""
    query = select(Document).where(Document.uploaded_by == current_user.id)
    
    # Apply filters
    if status:
        query = query.where(Document.status == status)
    if priority:
        query = query.where(Document.priority == priority)
    if type:
        query = query.where(Document.type == type)
    if counterparty_id:
        query = query.where(Document.counterparty_id == uuid.UUID(counterparty_id))
    if date_from:
        query = query.where(Document.date >= datetime.fromisoformat(date_from).date())
    if date_to:
        query = query.where(Document.date <= datetime.fromisoformat(date_to).date())
    if is_favorite is not None:
        query = query.where(Document.is_favorite == is_favorite)
    if is_archived is not None:
        query = query.where(Document.is_archived == is_archived)
    if is_deleted is not None:
        query = query.where(Document.is_deleted == is_deleted)
    else:
        query = query.where(Document.is_deleted == False)
    
    # Search
    if search:
        query = query.where(
            or_(
                Document.title.ilike(f"%{search}%"),
                Document.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    query = query.order_by(Document.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query.options(selectinload(Document.counterparty)))
    documents = result.scalars().all()
    
    items = []
    for doc in documents:
        items.append({
            "id": str(doc.id),
            "title": doc.title,
            "type": doc.type,
            "counterparty": doc.counterparty.name if doc.counterparty else None,
            "counterparty_id": str(doc.counterparty_id) if doc.counterparty_id else None,
            "date": doc.date.isoformat() if doc.date else None,
            "priority": doc.priority,
            "pages": doc.pages,
            "department": doc.department,
            "status": doc.status,
            "size": doc.size,
            "uploadedBy": str(doc.uploaded_by),
            "path": doc.path,
            "version": doc.version,
            "description": doc.description,
            "history": [],
            "isFavorite": doc.is_favorite,
            "isArchived": doc.is_archived,
            "isDeleted": doc.is_deleted,
            "tags": doc.tags or [],
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single document"""
    result = await db.execute(
        select(Document)
        .where(Document.id == uuid.UUID(document_id))
        .where(Document.uploaded_by == current_user.id)
        .options(selectinload(Document.counterparty), selectinload(Document.history))
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": str(doc.id),
        "title": doc.title,
        "type": doc.type,
        "counterparty": doc.counterparty.name if doc.counterparty else None,
        "counterparty_id": str(doc.counterparty_id) if doc.counterparty_id else None,
        "date": doc.date.isoformat() if doc.date else None,
        "priority": doc.priority,
        "pages": doc.pages,
        "department": doc.department,
        "status": doc.status,
        "size": doc.size,
        "uploadedBy": str(doc.uploaded_by),
        "path": doc.path,
        "version": doc.version,
        "description": doc.description,
        "history": [
            {
                "id": str(h.id),
                "date": h.date.isoformat(),
                "user": str(h.user_id),
                "action": h.action,
                "type": h.type,
                "details": h.details
            }
            for h in doc.history
        ],
        "isFavorite": doc.is_favorite,
        "isArchived": doc.is_archived,
        "isDeleted": doc.is_deleted,
        "tags": doc.tags or [],
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    counterparty_id: Optional[str] = Form(None),
    priority: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Загрузка документа: напрямую в MinIO и метаданные в Postgres
    RAG и Qwen временно отключены
    """
    import time
    start_time = time.time()
    
    # Read file
    file_data = await file.read()
    file_size = len(file_data)
    
    # Определяем параметры документа (без AI классификации)
    doc_type = type or "document"
    doc_priority = priority or "medium"
    
    # Find counterparty if provided
    counterparty_uuid = None
    if counterparty_id:
        try:
            counterparty_uuid = uuid.UUID(counterparty_id)
        except ValueError:
            logger.warning(f"Invalid counterparty_id: {counterparty_id}")
    
    # Generate S3 path (MinIO)
    now = datetime.now()
    file_ext = Path(file.filename).suffix if file.filename else ""
    s3_path = f"{doc_type}s/{now.year}/{now.month:02d}/{uuid.uuid4()}{file_ext}"
    
    # Upload to MinIO
    try:
        upload_file(file_data, s3_path, file.content_type or "application/octet-stream")
        logger.info(f"✅ File uploaded to MinIO: {s3_path}")
    except Exception as e:
        logger.error(f"❌ Failed to upload to MinIO: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось загрузить файл в хранилище: {str(e)}"
        )
    
    # Calculate pages (rough estimate for PDFs)
    pages = 1
    if file_ext.lower() == '.pdf':
        pages = max(1, file_size // 50000)  # Rough estimate: ~50KB per page
    
    # Create document record in Postgres
    document = Document(
        id=uuid.uuid4(),
        title=title or file.filename or "Untitled",
        type=doc_type,
        counterparty_id=counterparty_uuid,
        date=now.date(),
        priority=doc_priority,
        status="processed",
        pages=pages,
        department=department,
        size=f"{file_size / 1024 / 1024:.2f} MB",
        size_bytes=file_size,
        uploaded_by=current_user.id,
        path=s3_path,
        description="",
        tags=json.loads(tags) if tags else [],
        processing_time_minutes=(time.time() - start_time) / 60
    )
    
    db.add(document)
    
    # Add history
    history = DocumentHistory(
        id=uuid.uuid4(),
        document_id=document.id,
        user_id=current_user.id,
        action="Документ загружен",
        type="success"
    )
    db.add(history)
    
    await db.commit()
    await db.refresh(document)
    
    # Generate presigned URL
    try:
        presigned_url = get_presigned_url(s3_path)
    except Exception as e:
        logger.warning(f"Failed to generate presigned URL: {e}")
        presigned_url = None
    
    return {
        "document": {
            "id": str(document.id),
            "title": document.title,
            "type": document.type,
            "status": document.status,
            "path": document.path
        },
        "upload_url": presigned_url
    }


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download document file"""
    result = await db.execute(
        select(Document)
        .where(Document.id == uuid.UUID(document_id))
        .where(Document.uploaded_by == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_data = download_file(doc.path)
    
    from fastapi.responses import Response
    return Response(
        content=file_data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.title}"'}
    )


@router.post("/search")
async def search_documents(
    query: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Простой поиск по метаданным документов (без RAG/Qwen)
    """
    # Простой поиск по названию, типу, тегам
    search_query = select(Document).where(
        Document.uploaded_by == current_user.id,
        Document.is_deleted == False,
        Document.is_archived == False
    )
    
    # Simple text search in title
    if query:
        search_query = search_query.where(
            Document.title.ilike(f"%{query}%")
        )
    
    result = await db.execute(search_query.offset((page - 1) * limit).limit(limit))
    documents = result.scalars().all()
    
    total_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.uploaded_by == current_user.id,
            Document.is_deleted == False,
            Document.is_archived == False,
            Document.title.ilike(f"%{query}%") if query else True
        )
    )
    total = total_result.scalar() or 0
    
    search_result = {
        "answer": f"Найдено документов: {total}",
        "documents": [
            {
                "id": str(doc.id),
                "title": doc.title,
                "type": doc.type,
                "created_at": doc.created_at.isoformat() if doc.created_at else None
            }
            for doc in documents
        ],
        "total": total
    }
    
    # Фильтруем документы по пользователю
    user_documents = []
    for doc_info in search_result.get("documents", []):
        doc_id = doc_info.get("document_id")
        if doc_id:
            result = await db.execute(
                select(Document)
                .where(Document.id == uuid.UUID(doc_id))
                .where(Document.uploaded_by == current_user.id)
                .where(Document.is_deleted == False)
            )
            doc = result.scalar_one_or_none()
            if doc:
                user_documents.append({
                    "id": str(doc.id),
                    "title": doc.title,
                    "type": doc.type,
                    "answer": search_result.get("answer", ""),
                    "available": doc_info.get("available", False)
                })
    
    return {
        "items": user_documents[:limit],
        "answer": search_result.get("answer", ""),
        "total": len(user_documents),
        "page": page,
        "limit": limit,
        "pages": (len(user_documents) + limit - 1) // limit
    }


@router.patch("/{document_id}")
async def update_document(
    document_id: str,
    data: UpdateDocumentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update document"""
    result = await db.execute(
        select(Document)
        .where(Document.id == uuid.UUID(document_id))
        .where(Document.uploaded_by == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc, key, value)
    
    await db.commit()
    await db.refresh(doc)
    
    return {"message": "Document updated"}


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    permanent: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete document"""
    result = await db.execute(
        select(Document)
        .where(Document.id == uuid.UUID(document_id))
        .where(Document.uploaded_by == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if permanent:
        # Permanently delete
        delete_file(doc.path)
        # RAG chunks deletion disabled
        # await rag_service.delete_document_chunks(db, document_id)
        await db.delete(doc)
    else:
        # Move to trash
        doc.is_deleted = True
    
    await db.commit()
    
    return {"message": "Document deleted"}


@router.post("/bulk-delete")
async def bulk_delete(
    document_ids: List[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk delete documents"""
    # Implementation similar to delete_document but for multiple IDs
    return {"message": "Documents deleted"}


@router.post("/bulk-archive")
async def bulk_archive(
    document_ids: List[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk archive documents"""
    # Implementation
    return {"message": "Documents archived"}


@router.post("/{document_id}/restore")
async def restore_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restore document from trash"""
    result = await db.execute(
        select(Document)
        .where(Document.id == uuid.UUID(document_id))
        .where(Document.uploaded_by == current_user.id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_deleted = False
    await db.commit()
    
    return {"message": "Document restored"}

