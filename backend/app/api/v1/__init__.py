"""
API v1 router
"""
from fastapi import APIRouter
from app.api.v1 import auth, documents, counterparties, analytics, chat, settings, storage

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(counterparties.router, prefix="/counterparties", tags=["counterparties"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])


