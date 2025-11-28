"""
Counterparties endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.counterparty import Counterparty
from app.models.document import Document

router = APIRouter()


class CounterpartyResponse(BaseModel):
    id: str
    name: str
    inn: str
    kpp: Optional[str]
    address: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    docCount: int
    trustScore: int
    activeContracts: int
    lastInteraction: Optional[str]
    type: List[str]


class CounterpartyListResponse(BaseModel):
    items: List[CounterpartyResponse]
    total: int
    page: int
    limit: int
    pages: int


class CreateCounterpartyRequest(BaseModel):
    name: str
    inn: str
    kpp: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


@router.get("", response_model=CounterpartyListResponse)
async def get_counterparties(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    min_trust_score: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of counterparties"""
    query = select(Counterparty)
    
    if search:
        query = query.where(
            or_(
                Counterparty.name.ilike(f"%{search}%"),
                Counterparty.inn.ilike(f"%{search}%")
            )
        )
    
    if min_trust_score is not None:
        query = query.where(Counterparty.trust_score >= min_trust_score)
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    query = query.order_by(Counterparty.name)
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query.options(selectinload(Counterparty.documents)))
    counterparties = result.scalars().all()
    
    items = []
    for cp in counterparties:
        # Count documents for this user
        doc_count = await db.execute(
            select(func.count(Document.id))
            .where(Document.counterparty_id == cp.id)
            .where(Document.uploaded_by == current_user.id)
            .where(Document.is_deleted == False)
        )
        doc_count_val = doc_count.scalar() or 0
        
        items.append({
            "id": str(cp.id),
            "name": cp.name,
            "inn": cp.inn,
            "kpp": cp.kpp,
            "address": cp.address,
            "email": cp.email,
            "phone": cp.phone,
            "docCount": doc_count_val,
            "trustScore": cp.trust_score,
            "activeContracts": cp.active_contracts,
            "lastInteraction": cp.last_interaction.isoformat() if cp.last_interaction else None,
            "type": cp.type or []
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{counterparty_id}", response_model=CounterpartyResponse)
async def get_counterparty(
    counterparty_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single counterparty"""
    result = await db.execute(
        select(Counterparty)
        .where(Counterparty.id == uuid.UUID(counterparty_id))
        .options(selectinload(Counterparty.documents))
    )
    cp = result.scalar_one_or_none()
    
    if not cp:
        raise HTTPException(status_code=404, detail="Counterparty not found")
    
    doc_count = await db.execute(
        select(func.count(Document.id))
        .where(Document.counterparty_id == cp.id)
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
    )
    doc_count_val = doc_count.scalar() or 0
    
    return {
        "id": str(cp.id),
        "name": cp.name,
        "inn": cp.inn,
        "kpp": cp.kpp,
        "address": cp.address,
        "email": cp.email,
        "phone": cp.phone,
        "docCount": doc_count_val,
        "trustScore": cp.trust_score,
        "activeContracts": cp.active_contracts,
        "lastInteraction": cp.last_interaction.isoformat() if cp.last_interaction else None,
        "type": cp.type or []
    }


@router.post("", response_model=CounterpartyResponse)
async def create_counterparty(
    data: CreateCounterpartyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new counterparty"""
    # Check if exists
    result = await db.execute(
        select(Counterparty).where(Counterparty.inn == data.inn)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Counterparty with this INN already exists")
    
    counterparty = Counterparty(
        id=uuid.uuid4(),
        name=data.name,
        inn=data.inn,
        kpp=data.kpp,
        address=data.address,
        email=data.email,
        phone=data.phone
    )
    
    db.add(counterparty)
    await db.commit()
    await db.refresh(counterparty)
    
    return {
        "id": str(counterparty.id),
        "name": counterparty.name,
        "inn": counterparty.inn,
        "kpp": counterparty.kpp,
        "address": counterparty.address,
        "email": counterparty.email,
        "phone": counterparty.phone,
        "docCount": 0,
        "trustScore": counterparty.trust_score,
        "activeContracts": 0,
        "lastInteraction": None,
        "type": []
    }


@router.get("/{counterparty_id}/documents")
async def get_counterparty_documents(
    counterparty_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get documents for counterparty"""
    result = await db.execute(
        select(Document)
        .where(Document.counterparty_id == uuid.UUID(counterparty_id))
        .where(Document.uploaded_by == current_user.id)
        .where(Document.is_deleted == False)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    
    return {
        "items": [
            {
                "id": str(doc.id),
                "title": doc.title,
                "type": doc.type,
                "date": doc.date.isoformat() if doc.date else None,
                "status": doc.status
            }
            for doc in documents
        ],
        "total": len(documents)
    }


