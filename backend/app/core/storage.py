"""
MinIO/S3 storage configuration
"""
from minio import Minio
from app.core.config import settings
import logging
from typing import Optional
from datetime import timedelta
import io

logger = logging.getLogger(__name__)

# Initialize MinIO client
minio_client: Optional[Minio] = None


def init_storage():
    """Initialize MinIO client and create bucket if not exists"""
    global minio_client
    
    try:
        from minio.error import S3Error
        
        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        
        # Create bucket if not exists
        try:
            bucket_exists = minio_client.bucket_exists(settings.MINIO_BUCKET_NAME)
            if not bucket_exists:
                minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
                logger.info(f"✅ Created bucket: {settings.MINIO_BUCKET_NAME}")
            else:
                logger.info(f"✅ Bucket already exists: {settings.MINIO_BUCKET_NAME}")
        except Exception as e:
            logger.error(f"❌ Bucket check/create failed: {e}")
            # Retry after a short delay (MinIO might not be ready yet)
            import time
            for attempt in range(3):
                time.sleep(2)
                try:
                    if not minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
                        minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
                        logger.info(f"✅ Created bucket on retry attempt {attempt + 1}: {settings.MINIO_BUCKET_NAME}")
                        return
                    else:
                        logger.info(f"✅ Bucket exists on retry attempt {attempt + 1}: {settings.MINIO_BUCKET_NAME}")
                        return
                except Exception as retry_e:
                    logger.warning(f"⚠️ Bucket creation retry attempt {attempt + 1} failed: {retry_e}")
                    if attempt == 2:
                        logger.error(f"❌ Failed to create bucket after 3 attempts")
                        # Don't raise - allow lazy initialization
            
    except Exception as e:
        logger.warning(f"⚠️ Storage initialization error (will retry on first use): {e}")
        # Don't raise - allow lazy initialization


def get_storage() -> Minio:
    """Get MinIO client"""
    global minio_client
    if minio_client is None:
        init_storage()
    return minio_client


def upload_file(
    file_data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream"
) -> str:
    """
    Upload file to MinIO
    
    Args:
        file_data: File content as bytes
        object_name: Object name in bucket (path)
        content_type: MIME type
        
    Returns:
        Object name (path)
    """
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        client.put_object(
            settings.MINIO_BUCKET_NAME,
            object_name,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type
        )
        logger.info(f"✅ File uploaded: {object_name}")
        return object_name
    except S3Error as e:
        logger.error(f"❌ Upload failed: {e}")
        raise


def download_file(object_name: str) -> bytes:
    """
    Download file from MinIO
    
    Args:
        object_name: Object name in bucket
        
    Returns:
        File content as bytes
    """
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        response = client.get_object(settings.MINIO_BUCKET_NAME, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        return data
    except S3Error as e:
        logger.error(f"❌ Download failed: {e}")
        raise


def delete_file(object_name: str):
    """Delete file from MinIO"""
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        client.remove_object(settings.MINIO_BUCKET_NAME, object_name)
        logger.info(f"✅ File deleted: {object_name}")
    except S3Error as e:
        logger.error(f"❌ Delete failed: {e}")
        raise


def get_presigned_url(object_name: str, expires: timedelta = timedelta(hours=1)) -> str:
    """
    Generate presigned URL for file access
    
    Args:
        object_name: Object name in bucket
        expires: URL expiration time
        
    Returns:
        Presigned URL
    """
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        url = client.presigned_get_object(
            settings.MINIO_BUCKET_NAME,
            object_name,
            expires=expires
        )
        return url
    except S3Error as e:
        logger.error(f"❌ Presigned URL generation failed: {e}")
        raise


def file_exists(object_name: str) -> bool:
    """Check if file exists in storage"""
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        client.stat_object(settings.MINIO_BUCKET_NAME, object_name)
        return True
    except S3Error:
        return False


def get_file_size(object_name: str) -> int:
    """Get file size in bytes"""
    from minio.error import S3Error
    
    client = get_storage()
    
    try:
        stat = client.stat_object(settings.MINIO_BUCKET_NAME, object_name)
        return stat.size
    except S3Error as e:
        logger.error(f"❌ Failed to get file size: {e}")
        return 0

