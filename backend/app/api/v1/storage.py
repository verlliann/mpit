"""
Storage endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.core.config import settings

router = APIRouter()


@router.get("/info")
async def get_storage_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get storage information"""
    # Calculate storage usage
    result = await db.execute(
        select(func.sum(Document.size_bytes))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    used_bytes = result.scalar() or 0
    used_gb = used_bytes / (1024 ** 3)
    
    total_gb = settings.STORAGE_TOTAL_GB
    
    return {
        "total_gb": total_gb,
        "used_gb": round(used_gb, 2),
        "available_gb": round(total_gb - used_gb, 2),
        "usage_percentage": round((used_gb / total_gb) * 100, 2) if total_gb > 0 else 0,
        "bucket_name": settings.MINIO_BUCKET_NAME,
        "region": "local"
    }


@router.get("/stats")
async def get_storage_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get storage statistics by type"""
    result = await db.execute(
        select(
            Document.type,
            func.sum(Document.size_bytes).label("total_size"),
            func.count(Document.id).label("count")
        )
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
        .group_by(Document.type)
    )
    
    stats = []
    for row in result:
        size_gb = (row.total_size or 0) / (1024 ** 3)
        stats.append({
            "type": row.type,
            "size_gb": round(size_gb, 2),
            "count": row.count
        })
    
    return {
        "by_type": stats
    }


