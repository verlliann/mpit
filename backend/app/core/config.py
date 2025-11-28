"""
Application configuration
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://frontend:80,http://localhost:80,http://192.168.*.*:5173,http://192.168.*.*:3000,http://*:5173"
    
    def get_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
        return self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else []
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sirius_dms"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "sirius_dms"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # MinIO/S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "sirius-documents"
    MINIO_USE_SSL: bool = False
    STORAGE_TOTAL_GB: float = 10.0  # Total storage limit in GB
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Qwen Model (Qwen3-4B используется для RAG эмбеддингов)
    QWEN_MODEL_NAME: str = os.environ.get("QWEN_MODEL_NAME", "Qwen/Qwen3-4B")
    QWEN_MODEL_PATH: str = os.environ.get("QWEN_MODEL_PATH", str(Path(__file__).parent.parent.parent / "models"))
    QWEN_DEVICE: str = "auto"
    QWEN_LOAD_IN_8BIT: bool = False
    QWEN_LOAD_IN_4BIT: bool = False
    
    # RAG
    # Используется Qwen3-4B для генерации эмбеддингов (настроено через QWEN_MODEL_PATH)
    RAG_EMBEDDING_MODEL: str = "qwen3-4b"  # Используется Qwen3-4B вместо SentenceTransformer
    RAG_TOP_K: int = 5
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 100
    RAG_BATCH_SIZE: int = 4  # Оптимально для RTX 2050 (4GB VRAM), можно увеличить для более мощных карт
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

