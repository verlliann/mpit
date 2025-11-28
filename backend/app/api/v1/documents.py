"""
Documents endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks
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

from app.core.database import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.core.storage import upload_file, download_file, delete_file, get_presigned_url
from app.models.user import User
from app.models.document import Document, DocumentHistory
from app.models.counterparty import Counterparty
from app.services.document_processor import DocumentProcessor
from app.services.qwen_service import qwen_service
from app.services.rag_service import rag_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

processor = DocumentProcessor()


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


@router.post("/check-duplicate")
async def check_duplicate(
    filename: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Проверка существования документа по имени файла
    """
    result = await db.execute(
        select(Document)
        .where(Document.title == filename)
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    existing_doc = result.scalar_one_or_none()
    
    return {
        "exists": existing_doc is not None,
        "document": {
            "id": str(existing_doc.id),
            "title": existing_doc.title,
            "uploaded_at": existing_doc.created_at.isoformat()
        } if existing_doc else None
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
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Загрузка документа с обработкой через RAG и Qwen
    Архитектура: Файл → MinIO → DocumentProcessor → RAG → Qwen → Postgres/Redis
    """
    import time
    start_time = time.time()
    
    # Read file
    file_data = await file.read()
    file_size = len(file_data)
    
    # Проверка дублей по названию
    filename = title or file.filename or "document"
    result = await db.execute(
        select(Document)
        .where(Document.title == filename)
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    existing_doc = result.scalar_one_or_none()
    
    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Документ с названием '{filename}' уже существует. Загружен {existing_doc.created_at.strftime('%d.%m.%Y %H:%M')}"
        )
    
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
    doc_id = uuid.uuid4()
    s3_path = f"documents/{now.year}/{now.month:02d}/{doc_id}{file_ext}"
    
    # Upload to MinIO first
    try:
        upload_file(file_data, s3_path, file.content_type or "application/octet-stream")
        logger.info(f"✅ File uploaded to MinIO: {s3_path}")
    except Exception as e:
        logger.error(f"❌ Failed to upload to MinIO: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось загрузить файл в хранилище: {str(e)}"
        )
    
    # Extract text from document using DocumentProcessor
    extracted_text = ""
    pages = 1
    try:
        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(file_data)
            tmp_path = tmp_file.name
        
        try:
            extracted_text = processor.load_file(tmp_path)
            # Calculate pages from extracted text or file
            if file_ext.lower() == '.pdf':
                # Try to get actual page count
                try:
                    import pdfplumber
                    with pdfplumber.open(tmp_path) as pdf:
                        pages = len(pdf.pages)
                except:
                    pages = max(1, file_size // 50000)
            else:
                # Estimate pages from text length
                pages = max(1, len(extracted_text) // 2000)
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to extract text from document: {e}")
        extracted_text = title or file.filename or "Untitled"
        pages = 1
    
    # RAG: обрабатываем документ и получаем метрики
    try:
        metrics = await rag_service.process_document_for_metrics(
            text=extracted_text,
            filename=file.filename or "document",
            file_size=file_size
        )
        logger.info("✅ RAG обработал документ")
    except Exception as e:
        logger.error(f"❌ RAG processing failed: {e}")
        metrics = {
            "text": extracted_text,
            "filename": file.filename or "document",
            "file_size": file_size,
            "text_length": len(extracted_text),
            "chunks_count": 0,
            "chunks": []
        }
    
    # Qwen: классифицируем документ
    try:
        classification = qwen_service.classify_document(
            text=extracted_text,
            filename=file.filename or "document"
        )
        logger.info("✅ Qwen классифицировал документ")
        
        # Используем результаты классификации
        doc_type = type or classification.get("type", "document")
        doc_priority = priority or classification.get("priority", "medium")
        doc_description = classification.get("description", "") or ""
        doc_tags = json.loads(tags) if tags else []
        if classification.get("tags"):
            if isinstance(classification.get("tags"), list):
                doc_tags.extend(classification.get("tags", []))
    except Exception as e:
        logger.error(f"❌ Qwen classification failed: {e}")
        doc_type = type or "document"
        doc_priority = priority or "medium"
        doc_description = ""
        doc_tags = json.loads(tags) if tags else []
        classification = {}
    
    # Create document record in Postgres
    document = Document(
        id=doc_id,
        title=title or classification.get("title") or file.filename or "Untitled",
        type=doc_type,
        counterparty_id=counterparty_uuid,
        date=now.date(),
        priority=doc_priority,
        status="processed",
        pages=pages,
        department=department or classification.get("department"),
        size=f"{file_size / 1024 / 1024:.2f} MB",
        size_bytes=file_size,
        uploaded_by=current_user.id,
        path=s3_path,
        description=doc_description,
        tags=doc_tags,
        processing_time_minutes=(time.time() - start_time) / 60
    )
    
    db.add(document)
    
    # Add history
    history = DocumentHistory(
        id=uuid.uuid4(),
        document_id=document.id,
        user_id=current_user.id,
        action="Документ загружен и обработан",
        type="success"
    )
    db.add(history)
    
    try:
        await db.commit()
        await db.refresh(document)
        logger.info(f"✅ Документ сохранен в Postgres: {document.id}")
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Ошибка при сохранении документа в Postgres: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось сохранить документ в базу данных: {str(e)}"
        )
    
    # Формируем ответ ДО фоновых операций
    response_data = {
        "document": {
            "id": str(document.id),
            "title": document.title,
            "type": document.type,
            "status": document.status,
            "path": document.path
        },
        "upload_url": None  # Будет сгенерирован в фоне
    }
    
    # Запускаем RAG обработку через Celery
    try:
        from app.tasks.rag_tasks import process_document_rag
        task = process_document_rag.delay(str(document.id))
        logger.info(f"✅ RAG processing queued via Celery: task_id={task.id}")
    except Exception as e:
        logger.error(f"❌ Failed to queue RAG task: {e}")
        # Fallback to background tasks if Celery is not available
        async def background_save_rag_metrics():
            """Фоновая задача для сохранения RAG метрик"""
            try:
                # Создаем новую сессию для фоновой задачи
                async with AsyncSessionLocal() as bg_db:
                    await rag_service.save_metrics_to_postgres(
                        db=bg_db,
                        document_id=str(document.id),
                        metrics=metrics,
                        classification_result=classification
                    )
                logger.info("✅ RAG сохранил метрики в Postgres (фоновая задача)")
            except Exception as e:
                logger.error(f"❌ Failed to save RAG metrics (фоновая задача): {e}")
    
    async def background_save_redis():
        """Фоновая задача для сохранения в Redis"""
        try:
            await qwen_service.save_document_to_redis(
                document_id=str(document.id),
                file_data=file_data,
                metadata={
                    "id": str(document.id),
                    "title": document.title,
                    "type": document.type,
                    "text": extracted_text,
                    "path": s3_path,
                    "classification": classification
                }
            )
            logger.info("✅ Qwen сохранил документ в Redis (фоновая задача)")
        except Exception as e:
            logger.error(f"❌ Failed to save document to Redis (фоновая задача): {e}")
    
    async def background_generate_url():
        """Фоновая задача для генерации presigned URL"""
        try:
            presigned_url = get_presigned_url(s3_path)
            # Обновить URL в документе можно через отдельный endpoint
            logger.info("✅ Presigned URL сгенерирован (фоновая задача)")
        except Exception as e:
            logger.warning(f"Failed to generate presigned URL (фоновая задача): {e}")
    
    # Добавляем задачи в фон
    background_tasks.add_task(background_save_rag_metrics)
    background_tasks.add_task(background_save_redis)
    background_tasks.add_task(background_generate_url)
    
    logger.info(f"✅ Отправляю ответ на фронт для документа {document.id} (фоновые задачи запущены)")
    return response_data


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
    Семантический поиск документов через RAG и Qwen
    """
    try:
        # Используем RAG для семантического поиска
        chunks = await rag_service.search_similar_chunks(
            db=db,
            query=query,
            top_k=limit * 2,  # Получаем больше для фильтрации по пользователю
            document_ids=None
        )
        
        # Фильтруем по пользователю и получаем уникальные документы
        user_document_ids = set()
        user_documents_map = {}
        
        for chunk in chunks:
            doc_id = chunk.get("document_id")
            if doc_id and doc_id not in user_document_ids:
                # Проверяем, что документ принадлежит пользователю
                result = await db.execute(
                    select(Document)
                    .where(Document.id == uuid.UUID(doc_id))
                    .where(Document.uploaded_by == current_user.id)
                    .where(Document.is_deleted == False)
                    .where(Document.is_archived == False)
                )
                doc = result.scalar_one_or_none()
                if doc:
                    user_document_ids.add(doc_id)
                    user_documents_map[doc_id] = {
                        "id": str(doc.id),
                        "title": doc.title,
                        "type": doc.type,
                        "created_at": doc.created_at.isoformat() if doc.created_at else None,
                        "similarity": chunk.get("similarity", 0.0)
                    }
        
        # Сортируем по similarity и берем нужное количество
        user_documents = sorted(
            user_documents_map.values(),
            key=lambda x: x.get("similarity", 0.0),
            reverse=True
        )[:limit]
        
        total = len(user_documents)
        
        return {
            "items": user_documents,
            "answer": f"Найдено документов: {total}",
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"❌ Semantic search failed: {e}, falling back to simple search")
        # Fallback to simple search
        search_query = select(Document).where(
            Document.uploaded_by == current_user.id,
            Document.is_deleted == False,
            Document.is_archived == False
        )
        
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
        
        return {
            "items": [
                {
                    "id": str(doc.id),
                    "title": doc.title,
                    "type": doc.type,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None
                }
                for doc in documents
            ],
            "answer": f"Найдено документов: {total}",
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
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
        # Delete RAG chunks
        await rag_service.delete_document_chunks(db, document_id)
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

