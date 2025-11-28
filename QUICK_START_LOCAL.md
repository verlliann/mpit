# Быстрый старт (локально, без Docker)

## 1. Backend

```bash
# Перейти в директорию backend
cd backend

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# или на Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Убедиться, что PostgreSQL запущен и база данных создана
# (если нет, создайте: createdb sirius_dms)

# Запустить backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend будет доступен на: http://localhost:8000
API документация: http://localhost:8000/docs

## 2. Frontend

Откройте новый терминал:

```bash
# В корневой директории проекта
npm install
npm run dev
```

Frontend будет доступен на: http://localhost:5173

## Проверка

1. Откройте http://localhost:5173 в браузере
2. Проверьте http://localhost:8000/health - должно вернуть `{"status": "healthy", ...}`
3. Проверьте http://localhost:8000/docs - должна открыться Swagger документация

## Важно

- **Модели Qwen** должны быть в `backend/models/` (уже есть)
- **PostgreSQL** должен быть запущен (можно использовать Docker только для БД: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16`)
- **Redis и MinIO** опциональны - приложение будет работать без них, но некоторые функции могут не работать

## Если что-то не работает

1. Проверьте логи backend в терминале
2. Проверьте консоль браузера (F12) на ошибки
3. Убедитесь, что порты 8000 и 5173 свободны

