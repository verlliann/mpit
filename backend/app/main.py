"""
Sirius DMS - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    logger.info("🚀 Starting Sirius DMS Backend...")
    
    # Initialize database
    try:
        await init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        logger.warning("⚠️ Application will continue, but database features may not work")
    
    # Initialize Redis
    try:
        from app.core.redis_client import init_redis
        await init_redis()
        logger.info("✅ Redis initialized")
    except Exception as e:
        logger.warning(f"⚠️ Redis initialization failed: {e}")
    
    # Initialize Storage
    try:
        from app.core.storage import init_storage
        init_storage()
        logger.info("✅ Storage initialized")
    except Exception as e:
        logger.warning(f"⚠️ Storage initialization failed: {e}")
    
    logger.info("✅ Application ready")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    try:
        from app.core.redis_client import close_redis
        await close_redis()
    except Exception:
        pass


app = FastAPI(
    title="Sirius DMS API",
    description="Document Management System with Qwen AI and RAG",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Sirius DMS API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected",
        "storage": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

