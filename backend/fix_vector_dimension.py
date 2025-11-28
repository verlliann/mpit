"""
Скрипт для исправления размерности вектора в таблице document_chunks
Qwen3-4B имеет hidden_size=2560, а в таблице было Vector(384)
"""
import asyncio
import os
import sys

# Добавляем путь к приложению
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine

async def fix_vector_dimension():
    """Исправить размерность вектора с 384 на 2560"""
    
    async with engine.begin() as conn:
        print("🔄 Проверяю таблицу document_chunks...")
        
        # Проверяем, существует ли таблица
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'document_chunks'
            )
        """))
        exists = result.scalar()
        
        if not exists:
            print("⚠️ Таблица document_chunks не существует. Она будет создана автоматически при запуске приложения.")
            return
        
        # Проверяем текущую размерность
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM document_chunks
        """))
        count = result.scalar()
        print(f"📊 В таблице {count} чанков")
        
        # Удаляем старые чанки (они всё равно имеют неправильную размерность)
        print("🗑️ Удаляю старые чанки с неправильной размерностью...")
        await conn.execute(text("DELETE FROM document_chunks"))
        
        # Изменяем размерность столбца embedding
        print("🔧 Изменяю размерность вектора с 384 на 2560...")
        try:
            await conn.execute(text("""
                ALTER TABLE document_chunks 
                ALTER COLUMN embedding TYPE vector(2560)
            """))
            print("✅ Размерность вектора изменена на 2560")
        except Exception as e:
            if "does not exist" in str(e) or "column" in str(e).lower():
                print(f"⚠️ Столбец не найден или уже имеет правильный тип: {e}")
            else:
                raise
        
        # Пересоздаём индекс для поиска
        print("🔄 Пересоздаю индекс для векторного поиска...")
        try:
            await conn.execute(text("DROP INDEX IF EXISTS ix_document_chunks_embedding"))
        except Exception:
            pass
        
        try:
            await conn.execute(text("""
                CREATE INDEX ix_document_chunks_embedding 
                ON document_chunks 
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """))
            print("✅ Индекс создан")
        except Exception as e:
            # ivfflat требует минимум 100 записей для lists=100
            print(f"⚠️ Индекс будет создан позже: {e}")
        
        print("✅ Готово! Теперь нужно перезагрузить документы.")

if __name__ == "__main__":
    print("=" * 60)
    print("Исправление размерности вектора в PostgreSQL")
    print("=" * 60)
    asyncio.run(fix_vector_dimension())

