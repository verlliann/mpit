"""
Script to initialize database with test user
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
import uuid

async def init_test_user():
    """Create test user if not exists"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if demo user exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "demo@sirius-dms.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if not existing_user:
            # Create demo user
            demo_user = User(
                id=uuid.uuid4(),
                email="demo@sirius-dms.com",
                password_hash=get_password_hash("password"),
                first_name="Демо",
                last_name="Пользователь",
                role="admin"
            )
            session.add(demo_user)
            await session.commit()
            print("✅ Test user created: demo@sirius-dms.com / password")
        else:
            print("ℹ️ Test user already exists")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_test_user())


