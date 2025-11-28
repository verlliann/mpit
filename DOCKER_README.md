# 🐳 Docker Setup для Sirius DMS

## 📋 Предварительные требования

- Docker Desktop 4.x или выше
- Docker Compose v2.x или выше
- 8GB RAM минимум (рекомендуется 16GB)
- 50GB свободного места на диске

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Sirius DMS Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │Frontend  │  │Backend   │  │Celery Worker │              │
│  │React     │→ │FastAPI   │→ │RAG Process   │              │
│  │Port 3000 │  │Port 8000 │  │              │              │
│  └──────────┘  └──────────┘  └──────────────┘              │
│       ↓             ↓                ↓                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │          │  │PostgreSQL│  │  Redis   │                  │
│  │          │  │+pgvector │  │Cache/Queue│                 │
│  │          │  │Port 5432 │  │Port 6379 │                  │
│  │          │  └──────────┘  └──────────┘                  │
│  │          │                                                │
│  │          │  ┌──────────────────────┐                    │
│  │          │→ │MinIO (S3-compatible) │                    │
│  │          │  │Port 9000, 9001       │                    │
│  └──────────┘  └──────────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Быстрый старт

### 1. Проверка готовности

```bash
./test-docker-build.sh
```

Этот скрипт проверит:
- ✅ Docker запущен
- ✅ Все файлы на месте
- ✅ Python синтаксис корректен
- ✅ Порты свободны
- ✅ Backend собирается без ошибок

### 2. Запуск всех сервисов

```bash
docker-compose up -d
```

Это запустит:
- ✅ PostgreSQL (база данных)
- ✅ Redis (кэш и очередь задач)
- ✅ MinIO (хранилище файлов)
- ✅ Backend API (FastAPI)
- ✅ Celery Worker (обработка RAG)
- ✅ Frontend (React)

### 3. Проверка статуса

```bash
docker-compose ps
```

Все сервисы должны быть в состоянии `Up` и `healthy`.

### 4. Доступ к интерфейсам

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001
  - Login: `minioadmin`
  - Password: `minioadmin`

## 📊 Мониторинг

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f postgres
```

### Проверка здоровья

```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Подключение к контейнеру
docker exec -it sirius_backend bash
docker exec -it sirius_postgres psql -U postgres -d sirius_dms
```

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/sirius_dms
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sirius_dms

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=sirius-documents
MINIO_USE_SSL=false

# Security
SECRET_KEY=your-super-secret-key-change-in-production

# Qwen Model
QWEN_MODEL_PATH=/app/models
QWEN_DEVICE=cpu  # или cuda для GPU

# CORS
CORS_ORIGINS=http://localhost:3000,http://frontend:80
```

### Volumes (постоянное хранилище)

Docker Compose создает volumes для данных:

```yaml
volumes:
  postgres_data:   # База данных
  redis_data:      # Кэш Redis
  minio_data:      # Файлы в MinIO
```

Данные сохраняются даже после `docker-compose down`.

## 🔄 Обновление кода

### Метод 1: Hot Reload (рекомендуется для разработки)

Код монтируется через volume, изменения применяются автоматически:

```yaml
volumes:
  - ./backend/app:/app/app  # Hot reload
```

Просто редактируйте файлы, и FastAPI перезагрузится автоматически.

### Метод 2: Полная пересборка

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Troubleshooting

### Проблема: Backend не стартует

```bash
# Проверить логи
docker-compose logs backend

# Проверить зависимости
docker exec -it sirius_backend pip list

# Проверить подключение к БД
docker exec -it sirius_postgres psql -U postgres -d sirius_dms
```

### Проблема: Celery Worker не обрабатывает задачи

```bash
# Проверить логи
docker-compose logs celery_worker

# Проверить Redis
docker exec -it sirius_redis redis-cli PING
docker exec -it sirius_redis redis-cli LLEN celery

# Проверить очередь
docker exec -it sirius_backend python -c "from app.core.celery_app import celery_app; print(celery_app.control.inspect().active())"
```

### Проблема: MinIO не доступен

```bash
# Проверить статус
docker-compose ps minio

# Проверить healthcheck
docker inspect sirius_minio | grep -A 10 Health

# Проверить логи
docker-compose logs minio
```

### Проблема: Порты заняты

```bash
# Найти процесс, занимающий порт
lsof -i :8000
lsof -i :5432

# Остановить все контейнеры
docker-compose down

# Изменить порты в docker-compose.yml
ports:
  - "8001:8000"  # Новый порт
```

### Проблема: Ошибки импорта в Celery

```bash
# Проверить структуру проекта
docker exec -it sirius_celery_worker ls -la /app/app

# Проверить PYTHONPATH
docker exec -it sirius_celery_worker python -c "import sys; print(sys.path)"

# Тестовый запуск задачи
docker exec -it sirius_celery_worker python -c "from app.tasks.rag_tasks import process_document_rag; print('OK')"
```

## 🧹 Очистка

### Остановка сервисов

```bash
docker-compose down
```

### Удаление данных (volumes)

```bash
docker-compose down -v
```

⚠️ **ВНИМАНИЕ**: Это удалит все данные (БД, файлы, кэш)!

### Полная очистка Docker

```bash
docker system prune -a --volumes
```

⚠️ **ВНИМАНИЕ**: Удалит ВСЕ неиспользуемые контейнеры, образы и volumes!

## 📝 Полезные команды

```bash
# Перезапуск одного сервиса
docker-compose restart backend

# Пересборка одного сервиса
docker-compose up -d --build backend

# Выполнение команды в контейнере
docker exec -it sirius_backend python manage.py migrate

# Копирование файлов из/в контейнер
docker cp ./models/qwen sirius_backend:/app/models/

# Проверка сети
docker network inspect mpit-main_sirius_network

# Подключение к PostgreSQL
docker exec -it sirius_postgres psql -U postgres -d sirius_dms -c "SELECT COUNT(*) FROM documents;"

# Проверка Redis
docker exec -it sirius_redis redis-cli INFO
```

## 🎯 Production Ready

Для production необходимо:

1. **Изменить секреты**:
   ```env
   SECRET_KEY=<strong-random-key>
   POSTGRES_PASSWORD=<strong-password>
   MINIO_ACCESS_KEY=<random-access-key>
   MINIO_SECRET_KEY=<random-secret-key>
   ```

2. **Отключить DEBUG**:
   ```env
   DEBUG=false
   ```

3. **Настроить CORS**:
   ```env
   CORS_ORIGINS=https://yourdomain.com
   ```

4. **Использовать HTTPS**:
   - Настроить nginx reverse proxy
   - Получить SSL сертификаты (Let's Encrypt)

5. **Бэкапы**:
   ```bash
   # PostgreSQL backup
   docker exec sirius_postgres pg_dump -U postgres sirius_dms > backup.sql
   
   # MinIO backup
   docker exec sirius_minio mc mirror /data /backup
   ```

6. **Мониторинг**:
   - Добавить Prometheus + Grafana
   - Настроить логирование (ELK stack)
   - Использовать Flower для мониторинга Celery

## 🚀 Performance Tips

### Для RTX 2050 (4GB VRAM)

В `.env`:
```env
QWEN_DEVICE=cuda
QWEN_LOAD_IN_4BIT=true
RAG_BATCH_SIZE=4
```

### Для A100 (40GB VRAM)

В `.env`:
```env
QWEN_DEVICE=cuda
QWEN_LOAD_IN_8BIT=false
RAG_BATCH_SIZE=128
```

### Для CPU Only

В `.env`:
```env
QWEN_DEVICE=cpu
RAG_BATCH_SIZE=2
```

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [PostgreSQL + pgvector](https://github.com/pgvector/pgvector)

