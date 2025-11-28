"""
Settings endpoints
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class Settings(BaseModel):
    theme: str = "light"
    compact_list: bool = False
    notifications_enabled: bool = True
    auto_archive_days: int = 90
    lifecycle_policy_enabled: bool = True


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user settings"""
    return {
        "theme": "light",
        "compact_list": False,
        "notifications_enabled": True,
        "auto_archive_days": 90,
        "lifecycle_policy_enabled": True
    }


@router.patch("")
async def update_settings(
    settings: Settings,
    current_user: User = Depends(get_current_user)
):
    """Update user settings"""
    return settings


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """Get user profile"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url
    }


@router.patch("/profile")
async def update_profile(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url
    }


@router.post("/security")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password"""
    from app.core.security import verify_password, get_password_hash
    from fastapi import HTTPException, status
    from app.core.database import get_db
    
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")
    
    current_user.password_hash = get_password_hash(data.new_password)
    await db.commit()
    await db.refresh(current_user)
    
    return {"message": "Password changed"}

