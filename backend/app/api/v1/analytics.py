"""
Analytics endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.document import Document

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard metrics"""
    # Total documents
    total_docs = await db.execute(
        select(func.count(Document.id))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    total_documents = total_docs.scalar() or 0
    
    # High priority
    high_priority = await db.execute(
        select(func.count(Document.id))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.priority == "high")
        .where(Document.is_deleted == False)
    )
    high_priority_count = high_priority.scalar() or 0
    
    # Average processing time
    avg_time = await db.execute(
        select(func.avg(Document.processing_time_minutes))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.processing_time_minutes.isnot(None))
    )
    avg_processing_time = avg_time.scalar() or 0
    
    # Total pages
    total_pages = await db.execute(
        select(func.sum(Document.pages))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    processed_pages = total_pages.scalar() or 0
    
    # Storage (sum of size_bytes)
    storage = await db.execute(
        select(func.sum(Document.size_bytes))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    storage_bytes = storage.scalar() or 0
    storage_used_gb = storage_bytes / (1024 ** 3) if storage_bytes else 0
    
    return {
        "total_documents": total_documents,
        "high_priority_count": high_priority_count,
        "avg_processing_time_minutes": round(avg_processing_time, 2),
        "processed_pages": processed_pages,
        "storage_used_gb": round(storage_used_gb, 2),
        "storage_total_gb": settings.STORAGE_TOTAL_GB
    }


@router.get("/workflow")
async def get_workflow_data(
    period: str = Query("week", regex="^(week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow data (incoming vs processed)"""
    # Determine date range
    now = datetime.now()
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365)
    
    # Group by day
    result = await db.execute(
        select(
            func.date(Document.created_at).label("date"),
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.created_at >= start_date)
        .where(Document.is_deleted == False)
        .group_by(func.date(Document.created_at))
        .order_by(func.date(Document.created_at))
    )
    
    data = []
    for row in result:
        data.append({
            "name": row.date.strftime("%d.%m"),
            "incoming": row.count,
            "processed": row.count  # Simplified
        })
    
    return data


@router.get("/types")
async def get_document_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document types distribution"""
    result = await db.execute(
        select(
            Document.type,
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
        .group_by(Document.type)
    )
    
    return [
        {"name": row.type, "value": row.count}
        for row in result
    ]


@router.get("/documents-flow")
async def get_documents_flow(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get documents flow over time"""
    start_date = datetime.now() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.date(Document.created_at).label("date"),
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.created_at >= start_date)
        .where(Document.is_deleted == False)
        .group_by(func.date(Document.created_at))
        .order_by(func.date(Document.created_at))
    )
    
    return [
        {
            "name": row.date.strftime("%Y-%m-%d"),
            "docs": row.count
        }
        for row in result
    ]


@router.get("/metrics")
async def get_metrics(
    period: str = Query("week", regex="^(week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all analytics metrics in one response"""
    # Get dashboard metrics
    total_docs = await db.execute(
        select(func.count(Document.id))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    total_documents = total_docs.scalar() or 0
    
    high_priority = await db.execute(
        select(func.count(Document.id))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.priority == "high")
        .where(Document.is_deleted == False)
    )
    high_priority_count = high_priority.scalar() or 0
    
    avg_time = await db.execute(
        select(func.avg(Document.processing_time_minutes))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.processing_time_minutes.isnot(None))
    )
    avg_processing_time = avg_time.scalar() or 0
    
    total_pages = await db.execute(
        select(func.sum(Document.pages))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    processed_pages = total_pages.scalar() or 0
    
    storage = await db.execute(
        select(func.sum(Document.size_bytes))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    storage_bytes = storage.scalar() or 0
    storage_used_gb = storage_bytes / (1024 ** 3) if storage_bytes else 0
    
    dashboard_metrics = {
        "total_documents": total_documents,
        "high_priority_count": high_priority_count,
        "avg_processing_time_minutes": round(avg_processing_time, 2),
        "processed_pages": processed_pages,
        "storage_used_gb": round(storage_used_gb, 2),
        "storage_total_gb": settings.STORAGE_TOTAL_GB
    }
    
    # Get workflow data
    now = datetime.now()
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365)
    
    workflow_result = await db.execute(
        select(
            func.date(Document.created_at).label("date"),
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.created_at >= start_date)
        .where(Document.is_deleted == False)
        .group_by(func.date(Document.created_at))
        .order_by(func.date(Document.created_at))
    )
    
    workflow_data = []
    for row in workflow_result:
        workflow_data.append({
            "name": row.date.strftime("%d.%m"),
            "incoming": row.count,
            "processed": row.count
        })
    
    # Get document types distribution
    types_result = await db.execute(
        select(
            Document.type,
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
        .group_by(Document.type)
    )
    
    types_data = [
        {"name": row.type, "value": row.count}
        for row in types_result
    ]
    
    # Get documents flow
    flow_result = await db.execute(
        select(
            func.date(Document.created_at).label("date"),
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.created_at >= start_date)
        .where(Document.is_deleted == False)
        .group_by(func.date(Document.created_at))
        .order_by(func.date(Document.created_at))
    )
    
    flow_data = [
        {
            "name": row.date.strftime("%Y-%m-%d"),
            "docs": row.count
        }
        for row in flow_result
    ]
    
    return {
        "dashboard": dashboard_metrics,
        "workflow": workflow_data,
        "types": types_data,
        "flow": flow_data
    }


