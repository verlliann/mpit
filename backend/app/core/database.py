"""
Database configuration and session management
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine with connection retry
# Используем pool_pre_ping для проверки соединений и connect_args для таймаутов
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "server_settings": {
            "application_name": "sirius_dms"
        }
    }
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database (create tables, extensions)"""
    # Import all models to register them
    from app.models.user import User
    from app.models.document import Document, DocumentHistory
    from app.models.counterparty import Counterparty
    from app.models.vector_store import DocumentChunk
    
    try:
        async with engine.begin() as conn:
            # Enable pgvector extension
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                logger.info("✅ pgvector extension enabled")
            except Exception as e:
                logger.warning(f"⚠️ Could not create vector extension (may already exist): {e}")
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

