#!/usr/bin/env python3
"""
Скрипт для очистки всех баз данных:
- PostgreSQL: удаляет все данные из таблиц
- Redis: очищает все ключи
- MinIO: удаляет все объекты из bucket
"""
import asyncio
import sys
from pathlib import Path

# Добавляем путь к приложению
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core import redis_client as redis_module
from app.core import storage
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def cleanup_postgres():
    """Очистить PostgreSQL базу данных"""
    try:
        logger.info("🗑️  Очистка PostgreSQL...")
        
        async with AsyncSessionLocal() as session:
            # Получаем список всех таблиц
            result = await session.execute(text("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
            """))
            tables = [row[0] for row in result]
            
            if not tables:
                logger.info("   ✅ Таблицы не найдены")
                return
            
            # Отключаем внешние ключи временно
            await session.execute(text("SET session_replication_role = 'replica'"))
            
            # Удаляем данные из всех таблиц
            for table in tables:
                try:
                    await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                    logger.info(f"   ✅ Очищена таблица: {table}")
                except Exception as e:
                    logger.warning(f"   ⚠️  Не удалось очистить таблицу {table}: {e}")
            
            # Включаем обратно внешние ключи
            await session.execute(text("SET session_replication_role = 'origin'"))
            await session.commit()
            
            logger.info("✅ PostgreSQL очищена")
            
    except Exception as e:
        logger.error(f"❌ Ошибка при очистке PostgreSQL: {e}")
        raise


async def cleanup_redis():
    """Очистить Redis базу данных"""
    try:
        logger.info("🗑️  Очистка Redis...")
        
        # Инициализируем подключение если еще не инициализировано
        if redis_module.redis_client is None:
            await redis_module.init_redis()
        
        # Очищаем текущую базу данных
        await redis_module.redis_client.flushdb()
        logger.info("✅ Redis очищена")
        
    except Exception as e:
        logger.error(f"❌ Ошибка при очистке Redis: {e}")
        raise


async def cleanup_minio():
    """Очистить MinIO хранилище"""
    try:
        logger.info("🗑️  Очистка MinIO...")
        
        # Инициализируем MinIO если еще не инициализирован
        if storage.minio_client is None:
            storage.init_storage()
        
        client = storage.minio_client
        if client is None:
            logger.error("❌ MinIO client не инициализирован")
            return
        
        bucket_name = settings.MINIO_BUCKET_NAME
        
        # Проверяем существование bucket
        if not client.bucket_exists(bucket_name):
            logger.warning(f"   ⚠️  Bucket {bucket_name} не существует")
            return
        
        # Получаем список всех объектов
        objects = client.list_objects(bucket_name, recursive=True)
        objects_list = list(objects)
        
        if not objects_list:
            logger.info("   ✅ Bucket пуст")
            return
        
        # Удаляем все объекты
        deleted_count = 0
        for obj in objects_list:
            try:
                client.remove_object(bucket_name, obj.object_name)
                deleted_count += 1
            except Exception as e:
                logger.warning(f"   ⚠️  Не удалось удалить {obj.object_name}: {e}")
        
        logger.info(f"✅ MinIO очищена: удалено {deleted_count} объектов")
        
    except Exception as e:
        logger.error(f"❌ Ошибка при очистке MinIO: {e}")
        raise


async def main():
    """Главная функция"""
    logger.info("🚀 Начинаю очистку баз данных...")
    logger.info("")
    
    try:
        # Очищаем PostgreSQL
        await cleanup_postgres()
        logger.info("")
        
        # Очищаем Redis
        await cleanup_redis()
        logger.info("")
        
        # Очищаем MinIO
        await cleanup_minio()
        logger.info("")
        
        logger.info("✅ Все базы данных успешно очищены!")
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        sys.exit(1)
    finally:
        # Закрываем соединения
        # Закрываем соединения
        try:
            if redis_module.redis_client:
                await redis_module.redis_client.aclose()
        except:
            pass
        
        try:
            await engine.dispose()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())

