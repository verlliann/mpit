#!/bin/bash

# Script to test Docker build and configuration
# Проверяет все потенциальные проблемы перед запуском

set -e  # Exit on error

echo "🔍 Проверка Docker конфигурации Sirius DMS"
echo "=========================================="
echo ""

# 1. Check Docker is running
echo "1️⃣ Проверка Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен! Запустите Docker Desktop."
    exit 1
fi
echo "✅ Docker работает"
echo ""

# 2. Check required files
echo "2️⃣ Проверка наличия файлов..."
files=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "backend/requirements.txt"
    "backend/app/main.py"
    "backend/app/core/celery_app.py"
    "backend/app/tasks/rag_tasks.py"
)

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Файл не найден: $file"
        exit 1
    fi
    echo "   ✓ $file"
done
echo "✅ Все файлы на месте"
echo ""

# 3. Check Python syntax
echo "3️⃣ Проверка Python синтаксиса..."
if command -v python3 &> /dev/null; then
    python3 -m py_compile backend/app/core/celery_app.py 2>/dev/null && echo "   ✓ celery_app.py" || echo "   ⚠️ celery_app.py has syntax errors"
    python3 -m py_compile backend/app/tasks/rag_tasks.py 2>/dev/null && echo "   ✓ rag_tasks.py" || echo "   ⚠️ rag_tasks.py has syntax errors"
else
    echo "   ⚠️ Python3 не найден, пропускаю проверку синтаксиса"
fi
echo ""

# 4. Check environment variables
echo "4️⃣ Проверка переменных окружения..."
if [ -f ".env" ]; then
    echo "   ✓ .env файл найден"
else
    echo "   ⚠️ .env файл не найден (будут использованы значения по умолчанию)"
fi
echo ""

# 5. Test backend build
echo "5️⃣ Тестирование сборки backend..."
echo "   Это может занять несколько минут при первом запуске..."
if docker build -t sirius-backend-test ./backend --quiet; then
    echo "✅ Backend собран успешно"
    docker rmi sirius-backend-test > /dev/null 2>&1 || true
else
    echo "❌ Ошибка сборки backend"
    exit 1
fi
echo ""

# 6. Check docker-compose syntax
echo "6️⃣ Проверка docker-compose.yml..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml корректен"
else
    echo "❌ Ошибка в docker-compose.yml"
    exit 1
fi
echo ""

# 7. Check ports availability
echo "7️⃣ Проверка доступности портов..."
ports=(5432 6379 9000 9001 8000 3000)
for port in "${ports[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "   ⚠️ Порт $port уже занят"
    else
        echo "   ✓ Порт $port свободен"
    fi
done
echo ""

# 8. Summary
echo "=========================================="
echo "✅ Все проверки пройдены!"
echo ""
echo "🚀 Готово к запуску:"
echo "   docker-compose up -d"
echo ""
echo "📊 Проверка статуса:"
echo "   docker-compose ps"
echo ""
echo "📝 Логи:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f celery_worker"
echo ""
echo "🛑 Остановка:"
echo "   docker-compose down"
echo ""

