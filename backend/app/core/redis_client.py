"""
Redis client configuration
"""
import redis.asyncio as redis
from app.core.config import settings
import logging
import json

logger = logging.getLogger(__name__)

redis_client: redis.Redis = None


async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    try:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        # Test connection
        await redis_client.ping()
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        raise


async def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


async def get_redis() -> redis.Redis:
    """Get Redis client"""
    if redis_client is None:
        await init_redis()
    return redis_client


# Cache helpers
async def cache_get(key: str) -> any:
    """Get value from cache"""
    client = await get_redis()
    value = await client.get(key)
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return None


async def cache_set(key: str, value: any, expire: int = 3600):
    """Set value in cache"""
    client = await get_redis()
    if isinstance(value, (dict, list)):
        value = json.dumps(value)
    await client.setex(key, expire, value)


async def cache_delete(key: str):
    """Delete key from cache"""
    client = await get_redis()
    await client.delete(key)


async def cache_delete_pattern(pattern: str):
    """Delete keys matching pattern"""
    client = await get_redis()
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)


