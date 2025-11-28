# Локальный запуск без Docker

## Требования

1. **Python 3.11+** с установленными зависимостями
2. **Node.js 18+** и npm
3. **PostgreSQL 16+** с расширением pgvector
4. **Redis** (опционально, для кеширования)
5. **MinIO** (опционально, для хранения файлов)

## Шаг 1: Установка зависимостей Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Шаг 2: Настройка базы данных

Убедитесь, что PostgreSQL запущен и создана база данных:

```bash
# Создать базу данных
createdb sirius_dms

# Или через psql:
psql -U postgres
CREATE DATABASE sirius_dms;
CREATE EXTENSION vector;
\q
```

## Шаг 3: Настройка переменных окружения (опционально)

Создайте файл `backend/.env` если нужно изменить настройки:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sirius_dms
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=sirius-documents
QWEN_MODEL_PATH=./models
QWEN_DEVICE=cpu
SECRET_KEY=your-secret-key-change-in-production
```

## Шаг 4: Запуск Backend

```bash
cd backend
source venv/bin/activate  # На Windows: venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend будет доступен на `http://localhost:8000`
API документация: `http://localhost:8000/docs`

## Шаг 5: Установка зависимостей Frontend

```bash
# В корневой директории проекта
npm install
```

## Шаг 6: Запуск Frontend

```bash
npm run dev
```

Frontend будет доступен на `http://localhost:5173` (или другой порт, если 5173 занят)

## Проверка работы

1. Откройте `http://localhost:5173` в браузере
2. Проверьте, что API доступен: `http://localhost:8000/health`
3. Проверьте Swagger UI: `http://localhost:8000/docs`

## Примечания

- **Модели Qwen**: Убедитесь, что модели находятся в `backend/models/`
- **PostgreSQL**: Если используете другой порт или пользователя, обновите `DATABASE_URL` в `backend/app/core/config.py`
- **Redis и MinIO**: Если они не запущены, приложение будет работать, но некоторые функции (кеширование, хранение файлов) могут не работать
- **CORS**: Настроен для `http://localhost:5173` и `http://localhost:3000`

## Решение проблем

### Backend не запускается
- Проверьте, что PostgreSQL запущен и база данных создана
- Проверьте, что все зависимости установлены: `pip install -r requirements.txt`
- Проверьте логи ошибок в консоли

### Frontend не подключается к Backend
- Убедитесь, что Backend запущен на порту 8000
- Проверьте консоль браузера на ошибки CORS
- Проверьте, что `config.ts` использует `http://localhost:8000` в режиме разработки

### Ошибки с моделями
- Убедитесь, что модели находятся в `backend/models/`
- Проверьте путь в переменной окружения `QWEN_MODEL_PATH`
- Для macOS используйте `QWEN_DEVICE=cpu`

