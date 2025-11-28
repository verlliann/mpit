# Sirius DMS Backend

FastAPI бэкенд для системы управления документами с интеграцией Qwen AI и RAG.

## 🚀 Быстрый старт

### Требования

- Docker и Docker Compose
- Python 3.11+ (для локальной разработки)
- PostgreSQL 16+ с расширением pgvector
- Redis
- MinIO (S3-совместимое хранилище)

### Установка через Docker

```bash
# 1. Клонируйте репозиторий
cd backend

# 2. Создайте .env файл (опционально)
cp .env.example .env

# 3. Запустите все сервисы
docker-compose up -d

# 4. Проверьте статус
docker-compose ps

# 5. Инициализируйте базу данных (автоматически при первом запуске)
```

### Локальная установка

```bash
# 1. Установите зависимости
pip install -r requirements.txt

# 2. Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env файл

# 3. Запустите PostgreSQL, Redis и MinIO (через Docker или локально)
docker-compose up -d postgres redis minio

# 4. Запустите приложение
uvicorn app.main:app --reload
```

## 📁 Структура проекта

```
backend/
├── app/
│   ├── api/              # API роутеры
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── documents.py
│   │       ├── counterparties.py
│   │       ├── analytics.py
│   │       ├── chat.py
│   │       ├── settings.py
│   │       └── storage.py
│   ├── core/             # Основные компоненты
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── redis_client.py
│   │   ├── storage.py
│   │   ├── security.py
│   │   └── dependencies.py
│   ├── models/           # SQLAlchemy модели
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── counterparty.py
│   │   └── vector_store.py
│   ├── services/         # Бизнес-логика
│   │   ├── document_processor.py
│   │   ├── qwen_service.py
│   │   └── rag_service.py
│   └── main.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sirius_dms

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO/S3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=sirius-documents

# JWT
SECRET_KEY=your-secret-key-change-in-production

# Qwen Model
QWEN_MODEL_PATH=/path/to/qwen/models
QWEN_DEVICE=auto

# RAG
RAG_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/refresh` - Обновление токена
- `GET /api/v1/auth/me` - Текущий пользователь

### Documents
- `GET /api/v1/documents` - Список документов
- `POST /api/v1/documents/upload` - Загрузка документа
- `GET /api/v1/documents/{id}` - Получить документ
- `POST /api/v1/documents/search` - Семантический поиск (RAG)
- `PATCH /api/v1/documents/{id}` - Обновить документ
- `DELETE /api/v1/documents/{id}` - Удалить документ

### Counterparties
- `GET /api/v1/counterparties` - Список контрагентов
- `POST /api/v1/counterparties` - Создать контрагента
- `GET /api/v1/counterparties/{id}` - Получить контрагента

### Analytics
- `GET /api/v1/analytics/dashboard` - Метрики дашборда
- `GET /api/v1/analytics/workflow` - Данные workflow
- `GET /api/v1/analytics/types` - Распределение по типам

### Chat
- `POST /api/v1/chat/message` - Отправить сообщение
- `POST /api/v1/chat/stream` - Потоковый ответ (SSE)

### Storage
- `GET /api/v1/storage/info` - Информация о хранилище
- `GET /api/v1/storage/stats` - Статистика по типам

## 🤖 AI Интеграция

### Qwen Model

Модель Qwen используется для:
- Автоматической классификации документов
- Извлечения метаданных (контрагент, дата, приоритет)
- Генерации ответов в чате

### RAG (Retrieval-Augmented Generation)

RAG система обеспечивает:
- Семантический поиск по документам
- Векторные эмбеддинги (pgvector)
- Контекстные ответы на основе документов

## 🗄️ База данных

### PostgreSQL с pgvector

Расширение pgvector используется для хранения векторных эмбеддингов документов.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Миграции

Используйте Alembic для миграций:

```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## 📦 Хранилище

### MinIO (S3)

Файлы документов хранятся в MinIO с версионированием:
- Структура: `{type}s/{year}/{month}/{uuid}.{ext}`
- Presigned URLs для безопасного доступа
- Автоматическое создание bucket при запуске

## 🔐 Безопасность

- JWT токены для аутентификации
- Bcrypt для хеширования паролей
- CORS настройка
- Валидация входных данных (Pydantic)

## 🧪 Тестирование

```bash
# Запуск тестов
pytest

# С покрытием
pytest --cov=app
```

## 📝 Документация API

После запуска приложения:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🐛 Troubleshooting

### Ошибка подключения к PostgreSQL
```bash
# Проверьте, что PostgreSQL запущен
docker-compose ps postgres

# Проверьте логи
docker-compose logs postgres
```

### Ошибка загрузки модели Qwen
- Убедитесь, что путь к модели указан правильно
- Проверьте наличие всех файлов модели
- Используйте `QWEN_DEVICE=cpu` если нет GPU

### Проблемы с MinIO
```bash
# Проверьте доступность
curl http://localhost:9000/minio/health/live

# Создайте bucket вручную
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/sirius-documents
```

## 📄 License

MIT License


