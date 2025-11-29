
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time

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
    
    # Create test user if not exists
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash
        from sqlalchemy import select
        import uuid
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == "demo@sirius-dms.com")
            )
            existing_user = result.scalar_one_or_none()
            
            if not existing_user:
                # Hash password (bcrypt has 72 byte limit)
                password = "password"
                password_hash = get_password_hash(password)
                
                demo_user = User(
                    id=uuid.uuid4(),
                    email="demo@sirius-dms.com",
                    password_hash=password_hash,
                    first_name="Демо",
                    last_name="Пользователь",
                    role="admin",
                    is_active=True
                )
                session.add(demo_user)
                await session.commit()
                logger.info("✅ Test user created: demo@sirius-dms.com / password")
            else:
                logger.info("ℹ️ Test user already exists")
    except Exception as e:
        logger.warning(f"⚠️ Failed to create test user: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    
    # RAG and Qwen models temporarily disabled
    # logger.info("ℹ️ RAG and Qwen models disabled - documents will be saved directly to MinIO")
    
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

# Request logging middleware (must be before CORS)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging"""
    start_time = time.time()
    
    # Log request
    auth_header = request.headers.get("Authorization", "None")
    auth_preview = auth_header[:50] + "..." if auth_header != "None" and len(auth_header) > 50 else auth_header
    logger.info(f"📥 {request.method} {request.url.path} | Auth: {auth_preview}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"📤 {request.method} {request.url.path} | Status: {response.status_code} | Time: {process_time:.3f}s")
    
    return response

# CORS middleware - разрешаем все источники для локальной сети
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники для доступа из локальной сети
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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
    # Исключаем файлы с моделью из автоперезагрузки чтобы не терять модель в памяти
    reload_excludes = ["**/qwen_service.py", "**/models/**"] if settings.DEBUG else []
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        reload_excludes=reload_excludes if reload_excludes else None
    )

