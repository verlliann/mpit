#!/bin/bash

# Script to run the backend

echo "🚀 Starting Sirius DMS Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your settings."
fi

# Initialize database
echo "📦 Initializing database..."
python -c "import asyncio; from app.core.database import init_db; asyncio.run(init_db())"

# Create test user
echo "👤 Creating test user..."
python init_db.py

# Start server
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


