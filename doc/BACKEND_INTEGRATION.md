# 🔌 Руководство по интеграции Backend
## FastAPI + PostgreSQL + Redis

**Версия**: 1.0.0  
**Дата**: 27 ноября 2025  
**Цель**: Полная интеграция фронтенда с бэкендом

---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Требования](#требования)
3. [Настройка Backend](#настройка-backend)
4. [Удаление мок-данных из Frontend](#удаление-мок-данных-из-frontend)
5. [Эндпоинты по модулям](#эндпоинты-по-модулям)
6. [База данных PostgreSQL](#база-данных-postgresql)
7. [Redis интеграция](#redis-интеграция)
8. [S3 Storage](#s3-storage)
9. [Тестирование](#тестирование)

---

## 🏗️ Архитектура

### Текущая (мок-данные):

```
┌─────────────────────────────────────────┐
│         React Frontend                  │
│         (localhost:5173)                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │     Мок-данные в constants.ts    │  │
│  │     Мок-auth в auth.ts           │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Целевая (с бэкендом):

```
┌──────────────────┐
│  React Frontend  │
│  localhost:5173  │
└────────┬─────────┘
         │ HTTP/WebSocket
         │ JWT Auth
         ↓
┌──────────────────┐     ┌──────────────┐     ┌──────────┐
│   FastAPI        │────→│ PostgreSQL   │     │  Redis   │
│  localhost:8000  │     │ Port: 5432   │     │ Port:6379│
└────────┬─────────┘     └──────────────┘     └──────────┘
         │                                           ↑
         │ S3 Protocol                     Sessions │ Cache
         ↓                                   Search  │
┌──────────────────┐                                │
│  MinIO (S3)      │────────────────────────────────┘
│  localhost:9000  │
└──────────────────┘
```

---

## ✅ Требования

### Backend Stack

```yaml
Python: 3.11+
FastAPI: 0.104+
SQLAlchemy: 2.0+
Alembic: 1.12+ (миграции)
Redis: 7.0+
PostgreSQL: 15+
MinIO: RELEASE.2024+
```

### Python пакеты

```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
redis==5.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
boto3==1.29.7
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
```

---

## 🚀 Настройка Backend

### 1. Создание проекта FastAPI

```bash
# Структура проекта
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Главный файл FastAPI
│   ├── config.py            # Настройки
│   ├── database.py          # PostgreSQL connection
│   ├── redis_client.py      # Redis connection
│   ├── s3_client.py         # MinIO/S3 client
│   ├── models/              # SQLAlchemy модели
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── document.py
│   │   └── counterparty.py
│   ├── schemas/             # Pydantic схемы
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── document.py
│   │   └── counterparty.py
│   ├── api/                 # API роуты
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── documents.py
│   │   ├── counterparties.py
│   │   ├── analytics.py
│   │   ├── chat.py
│   │   ├── storage.py
│   │   └── settings.py
│   ├── services/            # Бизнес-логика
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── document_service.py
│   │   └── search_service.py
│   └── utils/
│       ├── __init__.py
│       ├── security.py      # JWT, хеширование
│       └── dependencies.py  # FastAPI dependencies
├── alembic/                 # Миграции БД
│   ├── versions/
│   └── env.py
├── .env                     # Переменные окружения
├── requirements.txt
└── docker-compose.yml       # PostgreSQL + Redis + MinIO
```

### 2. Переменные окружения

**Backend `.env`:**

```bash
# Database
DATABASE_URL=postgresql://sirius_user:sirius_pass@localhost:5432/sirius_dms
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_SESSION_DB=1
REDIS_CACHE_DB=2
REDIS_SEARCH_DB=3
REDIS_SESSION_TTL=86400  # 24 часа

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_DOCUMENTS=sirius-documents
S3_REGION=us-east-1
S3_USE_SSL=false

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_CREDENTIALS=true

# App
API_V1_PREFIX=/api/v1
DEBUG=true
```

**Frontend `.env.local`:**

```bash
VITE_API_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_key  # Опционально для AI чата
```

### 3. Docker Compose для инфраструктуры

**`docker-compose.yml`:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: sirius_postgres
    environment:
      POSTGRES_USER: sirius_user
      POSTGRES_PASSWORD: sirius_pass
      POSTGRES_DB: sirius_dms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sirius_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sirius_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: sirius_minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**Запуск:**

```bash
docker-compose up -d
```

---

## 🗑️ Удаление мок-данных из Frontend

### Файлы для изменения

#### 1. **`api/services/auth.ts`** - Убрать мок-аутентификацию

**УДАЛИТЬ:**

```typescript
// Mock data for demo purposes
const DEMO_CREDENTIALS = {
  email: 'demo@sirius-dms.com',
  password: 'password'
};

const MOCK_USER: UserProfile = {
  id: 'demo-user-1',
  email: 'demo@sirius-dms.com',
  first_name: 'Демо',
  last_name: 'Пользователь',
  role: 'admin',
  avatar_url: undefined,
};
```

**И ЗАМЕНИТЬ функцию `login`:**

```typescript
async login(credentials: LoginRequest): Promise<LoginResponse> {
  // Try demo credentials first (mock authentication)
  if (credentials.email === DEMO_CREDENTIALS.email && 
      credentials.password === DEMO_CREDENTIALS.password) {
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    setAccessToken(mockToken);
    
    const mockResponse: LoginResponse = {
      access_token: mockToken,
      token_type: 'Bearer',
      user: MOCK_USER
    };
    
    console.log('✅ Mock authentication successful');
    return mockResponse;
  }
  
  // Try real API if credentials don't match demo
  try {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials,
      { requiresAuth: false }
    );
    
    // Store token
    setAccessToken(response.access_token);
    
    return response;
  } catch (error) {
    // If API is not available, show better error message
    throw new Error('Неверный email или пароль. Используйте тестовые данные: demo@sirius-dms.com / password');
  }
}
```

**НА ПРОСТОЙ:**

```typescript
async login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    credentials,
    { requiresAuth: false }
  );
  
  setAccessToken(response.access_token);
  return response;
}
```

**И функцию `getCurrentUser`:**

```typescript
// БЫЛО:
async getCurrentUser(): Promise<UserProfile> {
  const token = getAccessToken();
  
  // If using mock token, return mock user
  if (token && token.startsWith('mock-jwt-token-')) {
    return MOCK_USER;
  }
  
  return apiClient.get<UserProfile>(API_ENDPOINTS.AUTH.ME);
}

// СТАНЕТ:
async getCurrentUser(): Promise<UserProfile> {
  return apiClient.get<UserProfile>(API_ENDPOINTS.AUTH.ME);
}
```

#### 2. **Компоненты - заменить MOCK_DOCUMENTS на API**

**Файлы для изменения:**
- `components/Dashboard.tsx`
- `components/DocumentLibrary.tsx`
- `components/Analytics.tsx`

**БЫЛО (DocumentLibrary.tsx):**

```typescript
import { MOCK_DOCUMENTS } from '../constants';

const documents = useMemo(() => {
  return MOCK_DOCUMENTS.filter(doc => {
    if (currentView === 'favorites') return doc.isFavorite && !doc.isDeleted;
    if (currentView === 'archive') return doc.isArchived && !doc.isDeleted;
    if (currentView === 'trash') return doc.isDeleted;
    return !doc.isDeleted && !doc.isArchived;
  });
}, [currentView]);
```

**СТАНЕТ:**

```typescript
import { useApi } from '../hooks';
import { documentsService } from '../api';

const { data: documentsData, loading, error } = useApi(
  () => documentsService.getDocuments({
    status: currentView === 'favorites' ? 'favorite' : 
            currentView === 'archive' ? 'archived' :
            currentView === 'trash' ? 'deleted' : 'active',
    page: 1,
    limit: 50
  }),
  { immediate: true }
);

const documents = documentsData?.items || [];
```

#### 3. **Компоненты контрагентов**

**БЫЛО (Counterparties.tsx):**

```typescript
import { MOCK_COUNTERPARTIES } from '../constants';

export const Counterparties: React.FC<CounterpartiesProps> = ({ onSelectCounterparty }) => {
  return (
    // ...
    {MOCK_COUNTERPARTIES.map(cp => (
      // ...
    ))}
  );
};
```

**СТАНЕТ:**

```typescript
import { useApi } from '../hooks';
import { counterpartiesService } from '../api';

export const Counterparties: React.FC<CounterpartiesProps> = ({ onSelectCounterparty }) => {
  const { data: counterpartiesData, loading, error } = useApi(
    () => counterpartiesService.getCounterparties({ page: 1, limit: 50 }),
    { immediate: true }
  );

  const counterparties = counterpartiesData?.items || [];

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    // ...
    {counterparties.map(cp => (
      // ...
    ))}
  );
};
```

#### 4. **Dashboard и Analytics**

Аналогично заменить использование:
- `CHART_DATA` → API вызов `analyticsService.getDocumentsFlow()`
- `ANALYTICS_WORKFLOW` → API вызов `analyticsService.getWorkflowData()`
- `ANALYTICS_TYPES` → API вызов `analyticsService.getDocumentTypes()`

---

## 📡 Эндпоинты по модулям

### 🔐 Module 1: Authentication

#### **POST /api/v1/auth/login**

**Назначение:** Вход пользователя с выдачей JWT токена

**Frontend:** `api/services/auth.ts` → `login()`

**Backend реализация:**

```python
# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas.auth import LoginResponse, UserProfile
from app.services.auth_service import AuthService
from app.utils.dependencies import get_db, get_redis

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    """
    Login endpoint
    - Validates credentials
    - Creates JWT access token
    - Stores session in Redis
    """
    auth_service = AuthService(db, redis)
    
    # Authenticate user
    user = await auth_service.authenticate_user(
        email=form_data.username,  # OAuth2 uses 'username' field
        password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = auth_service.create_access_token(user.id)
    
    # Store session in Redis
    await auth_service.store_session(user.id, access_token)
    
    return LoginResponse(
        access_token=access_token,
        token_type="Bearer",
        user=UserProfile.from_orm(user)
    )
```

**Database:**
- Таблица: `users`
- Запрос: SELECT by email
- Проверка: bcrypt hash сравнение

**Redis:**
```python
# Key: session:{user_id}:{token_hash}
# Value: {"user_id": "...", "created_at": "...", "ip": "..."}
# TTL: 24 hours
await redis.setex(
    f"session:{user_id}:{token_hash}",
    86400,  # 24 hours
    json.dumps(session_data)
)
```

---

#### **GET /api/v1/auth/me**

**Назначение:** Получить текущего пользователя

**Frontend:** `api/services/auth.ts` → `getCurrentUser()`

**Backend реализация:**

```python
@router.get("/me", response_model=UserProfile)
async def get_current_user(
    current_user = Depends(get_current_user)
):
    """Get current authenticated user"""
    return UserProfile.from_orm(current_user)
```

**Database:**
- Таблица: `users`
- Запрос: SELECT by id (из JWT токена)

**Redis:**
- Проверка валидности сессии

---

#### **POST /api/v1/auth/logout**

**Назначение:** Выход пользователя

**Frontend:** `api/services/auth.ts` → `logout()`

**Backend реализация:**

```python
@router.post("/logout")
async def logout(
    current_user = Depends(get_current_user),
    token: str = Depends(get_current_token),
    redis = Depends(get_redis)
):
    """
    Logout endpoint
    - Invalidates JWT token
    - Removes session from Redis
    """
    auth_service = AuthService(None, redis)
    await auth_service.invalidate_session(current_user.id, token)
    
    return {"message": "Successfully logged out"}
```

**Redis:**
```python
# Удалить сессию
await redis.delete(f"session:{user_id}:{token_hash}")

# Добавить токен в blacklist
await redis.setex(
    f"blacklist:{token_hash}",
    3600,  # 1 hour (остаток жизни токена)
    "1"
)
```

---

### 📄 Module 2: Documents

#### **GET /api/v1/documents**

**Назначение:** Получить список документов с фильтрацией и пагинацией

**Frontend:** `api/services/documents.ts` → `getDocuments()`

**Параметры:**
```typescript
{
  page?: number;        // Страница (default: 1)
  limit?: number;       // Элементов на странице (default: 20)
  status?: string;      // active | archived | deleted | favorite
  type?: string;        // contract | invoice | act | report
  priority?: string;    // high | medium | low
  search?: string;      // Поиск по названию
  counterparty_id?: string;
  date_from?: string;   // YYYY-MM-DD
  date_to?: string;     // YYYY-MM-DD
  sort_by?: string;     // date | title | priority
  sort_order?: string;  // asc | desc
}
```

**Backend реализация:**

```python
# app/api/documents.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.document import DocumentListResponse, DocumentListParams
from app.services.document_service import DocumentService
from app.utils.dependencies import get_db, get_current_user, get_redis

router = APIRouter()

@router.get("", response_model=DocumentListResponse)
async def get_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    type: str = Query(None),
    priority: str = Query(None),
    search: str = Query(None),
    counterparty_id: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    sort_by: str = Query("date", regex="^(date|title|priority)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user = Depends(get_current_user)
):
    """
    Get documents list with filtering and pagination
    - Supports full-text search via Redis
    - Caches results in Redis
    """
    doc_service = DocumentService(db, redis)
    
    params = DocumentListParams(
        page=page,
        limit=limit,
        status=status,
        type=type,
        priority=priority,
        search=search,
        counterparty_id=counterparty_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Check cache first
    cache_key = f"documents:list:{current_user.id}:{hash(str(params))}"
    cached = await redis.get(cache_key)
    
    if cached:
        return DocumentListResponse.parse_raw(cached)
    
    # Get from database
    result = await doc_service.get_documents(params, current_user.id)
    
    # Cache for 5 minutes
    await redis.setex(cache_key, 300, result.json())
    
    return result
```

**Database:**
```sql
SELECT 
    d.id, d.title, d.type, d.status, d.priority,
    d.date, d.page_count, d.file_url,
    c.name as counterparty_name,
    array_agg(t.tag) as tags
FROM documents d
LEFT JOIN counterparties c ON d.counterparty_id = c.id
LEFT JOIN document_tags t ON d.id = t.document_id
WHERE 
    d.user_id = :user_id
    AND d.is_deleted = :is_deleted
    AND (d.is_archived = :is_archived OR :status != 'archived')
    AND (d.is_favorite = :is_favorite OR :status != 'favorite')
    -- ... другие фильтры
GROUP BY d.id, c.name
ORDER BY d.date DESC
LIMIT :limit OFFSET :offset
```

**Redis Search (если search параметр):**
```python
# Используем RediSearch для полнотекстового поиска
from redis.commands.search import Search
from redis.commands.search.query import Query

# Index создается при старте приложения
# FT.CREATE idx:documents ON JSON PREFIX 1 doc: SCHEMA
#   $.title TEXT SORTABLE
#   $.type TAG
#   $.status TAG
#   $.counterparty TEXT

search_result = await redis.ft("idx:documents").search(
    Query(search_query)
    .limit_offset((page-1)*limit, limit)
)

# Получаем полные данные из PostgreSQL по найденным ID
document_ids = [doc.id for doc in search_result.docs]
```

---

#### **POST /api/v1/documents/upload**

**Назначение:** Загрузить файл документа в S3

**Frontend:** `api/services/documents.ts` → `uploadDocument()`

**Backend реализация:**

```python
from fastapi import UploadFile, File
import uuid
from datetime import datetime

@router.post("/upload", response_model=UploadDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    type: str = Form(...),
    priority: str = Form("medium"),
    counterparty_id: str = Form(None),
    tags: str = Form(None),  # JSON array as string
    db: Session = Depends(get_db),
    s3_client = Depends(get_s3_client),
    current_user = Depends(get_current_user)
):
    """
    Upload document file to S3
    - Validates file type
    - Uploads to S3
    - Creates database record
    - Indexes in Redis for search
    """
    # Validate file type
    allowed_types = ['pdf', 'docx', 'xlsx', 'jpg', 'png']
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in allowed_types:
        raise HTTPException(400, "File type not allowed")
    
    # Generate unique filename
    doc_id = str(uuid.uuid4())
    year_month = datetime.utcnow().strftime("%Y/%m")
    s3_key = f"documents/{year_month}/{doc_id}.{file_ext}"
    
    # Upload to S3
    file_content = await file.read()
    await s3_client.upload_fileobj(
        file_content,
        bucket="sirius-documents",
        key=s3_key,
        metadata={
            "original_filename": file.filename,
            "uploaded_by": current_user.id
        }
    )
    
    # Get file size
    file_size = len(file_content)
    
    # Create database record
    document = Document(
        id=doc_id,
        user_id=current_user.id,
        title=title,
        type=type,
        priority=priority,
        counterparty_id=counterparty_id,
        file_url=s3_key,
        file_name=file.filename,
        file_size=file_size,
        status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(document)
    
    # Add tags
    if tags:
        tag_list = json.loads(tags)
        for tag in tag_list:
            db.add(DocumentTag(document_id=doc_id, tag=tag))
    
    db.commit()
    db.refresh(document)
    
    # Index in Redis for search
    await redis.json().set(
        f"doc:{doc_id}",
        "$",
        {
            "id": doc_id,
            "title": title,
            "type": type,
            "status": "pending",
            "counterparty": counterparty_id,
            "tags": tag_list if tags else []
        }
    )
    
    # Invalidate documents list cache
    await redis.delete_pattern(f"documents:list:{current_user.id}:*")
    
    return UploadDocumentResponse(
        id=doc_id,
        file_url=s3_key,
        file_name=file.filename,
        file_size=file_size,
        message="Document uploaded successfully"
    )
```

**S3 Structure:**
```
sirius-documents/
└── documents/
    └── 2024/
        └── 11/
            ├── uuid-1.pdf
            ├── uuid-2.docx
            └── uuid-3.xlsx
```

---

#### **GET /api/v1/documents/{id}/download**

**Назначение:** Получить presigned URL для скачивания файла

**Frontend:** `api/services/documents.ts` → `downloadDocument()`

**Backend реализация:**

```python
@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    s3_client = Depends(get_s3_client),
    current_user = Depends(get_current_user)
):
    """
    Generate presigned URL for document download
    - Validates user access
    - Returns temporary S3 URL (expires in 1 hour)
    """
    # Get document from DB
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(404, "Document not found")
    
    # Generate presigned URL (valid for 1 hour)
    presigned_url = await s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': 'sirius-documents',
            'Key': document.file_url
        },
        ExpiresIn=3600
    )
    
    return {
        "url": presigned_url,
        "filename": document.file_name,
        "expires_in": 3600
    }
```

---

#### **PATCH /api/v1/documents/{id}**

**Назначение:** Обновить метаданные документа

**Frontend:** `api/services/documents.ts` → `updateDocument()`

**Backend реализация:**

```python
@router.patch("/{document_id}", response_model=DocumentSchema)
async def update_document(
    document_id: str,
    data: UpdateDocumentRequest,
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user = Depends(get_current_user)
):
    """
    Update document metadata
    - Updates database
    - Updates Redis index
    - Invalidates cache
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(404, "Document not found")
    
    # Update fields
    for field, value in data.dict(exclude_unset=True).items():
        setattr(document, field, value)
    
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    
    # Update Redis index
    await redis.json().set(
        f"doc:{document_id}",
        "$",
        {
            "id": document.id,
            "title": document.title,
            "type": document.type,
            "status": document.status,
            # ... other fields
        }
    )
    
    # Invalidate cache
    await redis.delete_pattern(f"documents:list:{current_user.id}:*")
    
    return document
```

---

#### **DELETE /api/v1/documents/{id}**

**Назначение:** Удалить документ (soft delete)

**Frontend:** `api/services/documents.ts` → `deleteDocument()`

**Backend реализация:**

```python
@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    permanent: bool = Query(False),
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    s3_client = Depends(get_s3_client),
    current_user = Depends(get_current_user)
):
    """
    Delete document
    - Soft delete by default (is_deleted=True)
    - Permanent delete if permanent=True (removes from S3)
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(404, "Document not found")
    
    if permanent:
        # Delete from S3
        await s3_client.delete_object(
            Bucket='sirius-documents',
            Key=document.file_url
        )
        
        # Delete from database
        db.delete(document)
        
        # Delete from Redis
        await redis.delete(f"doc:{document_id}")
    else:
        # Soft delete
        document.is_deleted = True
        document.deleted_at = datetime.utcnow()
    
    db.commit()
    
    # Invalidate cache
    await redis.delete_pattern(f"documents:list:{current_user.id}:*")
    
    return {"message": "Document deleted successfully"}
```

---

### 👥 Module 3: Counterparties

#### **GET /api/v1/counterparties**

**Назначение:** Получить список контрагентов

**Frontend:** `api/services/counterparties.ts` → `getCounterparties()`

**Backend реализация:**

```python
# app/api/counterparties.py
from fastapi import APIRouter, Depends, Query
from app.schemas.counterparty import CounterpartyListResponse

router = APIRouter()

@router.get("", response_model=CounterpartyListResponse)
async def get_counterparties(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    type: str = Query(None),  # supplier | customer
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user = Depends(get_current_user)
):
    """
    Get counterparties list
    - Supports search by name, INN
    - Caches in Redis
    """
    # Check cache
    cache_key = f"counterparties:{current_user.id}:{page}:{limit}:{search}:{type}"
    cached = await redis.get(cache_key)
    
    if cached:
        return CounterpartyListResponse.parse_raw(cached)
    
    # Build query
    query = db.query(Counterparty).filter(
        Counterparty.user_id == current_user.id
    )
    
    if search:
        query = query.filter(
            or_(
                Counterparty.name.ilike(f"%{search}%"),
                Counterparty.inn.ilike(f"%{search}%")
            )
        )
    
    if type:
        query = query.filter(Counterparty.type == type)
    
    # Count total
    total = query.count()
    
    # Get paginated results
    counterparties = query.offset((page-1)*limit).limit(limit).all()
    
    result = CounterpartyListResponse(
        items=counterparties,
        total=total,
        page=page,
        limit=limit,
        pages=(total + limit - 1) // limit
    )
    
    # Cache for 10 minutes
    await redis.setex(cache_key, 600, result.json())
    
    return result
```

**Database:**
```sql
SELECT 
    id, name, inn, type, email, phone, address,
    trust_score, documents_count, created_at
FROM counterparties
WHERE user_id = :user_id
    AND (name ILIKE :search OR inn ILIKE :search)
    AND (:type IS NULL OR type = :type)
ORDER BY name ASC
LIMIT :limit OFFSET :offset
```

---

### 📈 Module 4: Analytics

#### **GET /api/v1/analytics/dashboard**

**Назначение:** Получить метрики для дашборда

**Frontend:** `api/services/analytics.ts` → `getDashboardMetrics()`

**Backend реализация:**

```python
# app/api/analytics.py
from fastapi import APIRouter, Depends
from app.schemas.analytics import DashboardMetrics

router = APIRouter()

@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    redis = Depends(get_redis),
    current_user = Depends(get_current_user)
):
    """
    Get dashboard metrics
    - Total documents
    - High priority count
    - Storage usage
    - Processing metrics
    """
    # Check cache (5 min TTL)
    cache_key = f"analytics:dashboard:{current_user.id}"
    cached = await redis.get(cache_key)
    
    if cached:
        return DashboardMetrics.parse_raw(cached)
    
    # Calculate metrics
    total_documents = db.query(func.count(Document.id)).filter(
        Document.user_id == current_user.id,
        Document.is_deleted == False
    ).scalar()
    
    high_priority = db.query(func.count(Document.id)).filter(
        Document.user_id == current_user.id,
        Document.priority == "high",
        Document.status == "pending"
    ).scalar()
    
    storage_used = db.query(func.sum(Document.file_size)).filter(
        Document.user_id == current_user.id
    ).scalar() or 0
    
    # Average processing time (last 30 days)
    avg_processing = db.query(
        func.avg(
            func.extract('epoch', Document.updated_at - Document.created_at)
        )
    ).filter(
        Document.user_id == current_user.id,
        Document.created_at >= datetime.utcnow() - timedelta(days=30),
        Document.status == "approved"
    ).scalar()
    
    result = DashboardMetrics(
        total_documents=total_documents,
        high_priority_count=high_priority,
        storage_used_bytes=storage_used,
        avg_processing_time_seconds=avg_processing or 0
    )
    
    # Cache for 5 minutes
    await redis.setex(cache_key, 300, result.json())
    
    return result
```

**Database:**
```sql
-- Total documents
SELECT COUNT(*) FROM documents 
WHERE user_id = :user_id AND is_deleted = false;

-- High priority
SELECT COUNT(*) FROM documents 
WHERE user_id = :user_id AND priority = 'high' AND status = 'pending';

-- Storage used
SELECT SUM(file_size) FROM documents 
WHERE user_id = :user_id;

-- Avg processing time
SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
FROM documents
WHERE user_id = :user_id 
    AND created_at >= NOW() - INTERVAL '30 days'
    AND status = 'approved';
```

---

## 🗄️ База данных PostgreSQL

### Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
    
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- contract, invoice, act, report
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    page_count INTEGER,
    
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_documents_counterparty ON documents(counterparty_id);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted);

-- Document tags
CREATE TABLE document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON document_tags(tag);

-- Counterparties table
CREATE TABLE counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(500) NOT NULL,
    inn VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL, -- supplier, customer
    
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
    documents_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_counterparties_user_id ON counterparties(user_id);
CREATE INDEX idx_counterparties_inn ON counterparties(inn);
CREATE INDEX idx_counterparties_type ON counterparties(type);

-- Trigger to update documents_count
CREATE OR REPLACE FUNCTION update_counterparty_docs_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE counterparties 
    SET documents_count = (
        SELECT COUNT(*) 
        FROM documents 
        WHERE counterparty_id = NEW.counterparty_id 
            AND is_deleted = false
    )
    WHERE id = NEW.counterparty_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_docs_count
AFTER INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_counterparty_docs_count();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON counterparties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Миграции (Alembic)

```bash
# Инициализация Alembic
alembic init alembic

# Создание миграции
alembic revision --autogenerate -m "Initial schema"

# Применение миграций
alembic upgrade head
```

---

## 🔴 Redis интеграция

### Использование Redis в проекте

#### 1. **Sessions (DB 1)**

```python
# Хранение JWT сессий
# Key format: session:{user_id}:{token_hash}
# TTL: 24 hours

async def store_session(user_id: str, token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
    session_key = f"session:{user_id}:{token_hash}"
    
    session_data = {
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "ip": request.client.host,
        "user_agent": request.headers.get("user-agent")
    }
    
    await redis_session.setex(
        session_key,
        86400,  # 24 hours
        json.dumps(session_data)
    )

async def validate_session(user_id: str, token: str) -> bool:
    token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
    session_key = f"session:{user_id}:{token_hash}"
    
    return await redis_session.exists(session_key)
```

#### 2. **Cache (DB 2)**

```python
# Кеширование результатов запросов
# TTL: 5-10 минут

async def cache_get(key: str):
    """Get from cache"""
    value = await redis_cache.get(key)
    return json.loads(value) if value else None

async def cache_set(key: str, value: any, ttl: int = 300):
    """Set cache with TTL"""
    await redis_cache.setex(key, ttl, json.dumps(value))

async def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    keys = await redis_cache.keys(pattern)
    if keys:
        await redis_cache.delete(*keys)

# Примеры кеш-ключей:
# documents:list:{user_id}:{hash(params)}
# counterparties:{user_id}:{page}:{limit}
# analytics:dashboard:{user_id}
```

#### 3. **Search Index (DB 3 с RediSearch)**

```python
# Полнотекстовый поиск по документам
# Используется RediSearch module

from redis.commands.search import Search
from redis.commands.search.field import TextField, TagField, NumericField

# Создание индекса при старте приложения
async def create_search_index():
    try:
        await redis_search.ft("idx:documents").create_index(
            [
                TextField("$.title", as_name="title"),
                TextField("$.counterparty", as_name="counterparty"),
                TagField("$.type", as_name="type"),
                TagField("$.status", as_name="status"),
                TagField("$.priority", as_name="priority"),
                TagField("$.tags[*]", as_name="tags"),
                NumericField("$.date", as_name="date"),
            ],
            definition=IndexDefinition(
                prefix=["doc:"],
                index_type=IndexType.JSON
            )
        )
    except Exception as e:
        # Index already exists
        pass

# Индексирование документа
async def index_document(doc_id: str, document: Document):
    await redis_search.json().set(
        f"doc:{doc_id}",
        "$",
        {
            "id": doc_id,
            "title": document.title,
            "type": document.type,
            "status": document.status,
            "priority": document.priority,
            "counterparty": document.counterparty.name if document.counterparty else "",
            "tags": [tag.tag for tag in document.tags],
            "date": document.date.timestamp()
        }
    )

# Поиск
async def search_documents(query: str, user_id: str):
    from redis.commands.search.query import Query
    
    search_query = Query(query).paging(0, 20)
    results = await redis_search.ft("idx:documents").search(search_query)
    
    # Получить полные данные из PostgreSQL
    doc_ids = [doc.id for doc in results.docs]
    documents = db.query(Document).filter(
        Document.id.in_(doc_ids),
        Document.user_id == user_id
    ).all()
    
    return documents
```

### Redis Connection Setup

```python
# app/redis_client.py
import redis.asyncio as redis
from app.config import settings

# Три отдельных connection pool
redis_session = redis.from_url(
    f"{settings.REDIS_URL}/1",
    encoding="utf-8",
    decode_responses=True
)

redis_cache = redis.from_url(
    f"{settings.REDIS_URL}/2",
    encoding="utf-8",
    decode_responses=True
)

redis_search = redis.from_url(
    f"{settings.REDIS_URL}/3",
    encoding="utf-8",
    decode_responses=True
)

async def get_redis_session():
    return redis_session

async def get_redis_cache():
    return redis_cache

async def get_redis_search():
    return redis_search
```

---

## 📦 S3 Storage (MinIO)

### Setup

```python
# app/s3_client.py
import boto3
from botocore.client import Config
from app.config import settings

def get_s3_client():
    """Create S3 client for MinIO"""
    return boto3.client(
        's3',
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version='s3v4'),
        use_ssl=settings.S3_USE_SSL
    )

async def ensure_bucket_exists():
    """Create bucket if not exists"""
    s3 = get_s3_client()
    
    try:
        s3.head_bucket(Bucket=settings.S3_BUCKET_DOCUMENTS)
    except:
        s3.create_bucket(Bucket=settings.S3_BUCKET_DOCUMENTS)
        
        # Set CORS policy
        cors_config = {
            'CORSRules': [{
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE'],
                'AllowedOrigins': settings.CORS_ORIGINS.split(','),
                'ExposeHeaders': ['ETag']
            }]
        }
        s3.put_bucket_cors(
            Bucket=settings.S3_BUCKET_DOCUMENTS,
            CORSConfiguration=cors_config
        )
```

### File Operations

```python
# Upload
await s3_client.upload_fileobj(
    file_content,
    bucket=settings.S3_BUCKET_DOCUMENTS,
    key=s3_key,
    ExtraArgs={
        'ContentType': content_type,
        'Metadata': metadata
    }
)

# Generate presigned URL for download
presigned_url = s3_client.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': settings.S3_BUCKET_DOCUMENTS,
        'Key': s3_key
    },
    ExpiresIn=3600  # 1 hour
)

# Delete
await s3_client.delete_object(
    Bucket=settings.S3_BUCKET_DOCUMENTS,
    Key=s3_key
)
```

---

## ✅ Чеклист интеграции

### Backend (FastAPI)

- [ ] Создать проект FastAPI
- [ ] Настроить PostgreSQL подключение
- [ ] Настроить Redis (3 базы: session, cache, search)
- [ ] Настроить MinIO/S3
- [ ] Реализовать модели SQLAlchemy
- [ ] Создать Alembic миграции
- [ ] Реализовать эндпоинты Authentication (5 шт)
- [ ] Реализовать эндпоинты Documents (13 шт)
- [ ] Реализовать эндпоинты Counterparties (7 шт)
- [ ] Реализовать эндпоинты Analytics (5 шт)
- [ ] Настроить CORS middleware
- [ ] Добавить JWT authentication middleware
- [ ] Настроить логирование
- [ ] Написать тесты

### Frontend (React)

- [ ] Убрать мок из `api/services/auth.ts`
- [ ] Заменить MOCK_DOCUMENTS на API в `DocumentLibrary.tsx`
- [ ] Заменить MOCK_DOCUMENTS на API в `Dashboard.tsx`
- [ ] Заменить MOCK_COUNTERPARTIES на API в `Counterparties.tsx`
- [ ] Заменить статичные данные на API в `Analytics.tsx`
- [ ] Настроить `VITE_API_URL` в `.env.local`
- [ ] Протестировать все экраны
- [ ] Проверить обработку ошибок
- [ ] Проверить loading states

### Инфраструктура

- [ ] Запустить PostgreSQL (Docker)
- [ ] Запустить Redis (Docker)
- [ ] Запустить MinIO (Docker)
- [ ] Создать базу данных
- [ ] Применить миграции
- [ ] Создать тестового пользователя
- [ ] Настроить backup базы данных

---

## 🧪 Тестирование

### 1. Тест аутентификации

```bash
# Регистрация
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'

# Вход
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Получить токен и сохранить
TOKEN="<access_token>"

# Проверить текущего пользователя
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Тест документов

```bash
# Получить список
curl -X GET "http://localhost:8000/api/v1/documents?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Загрузить файл
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "type=contract" \
  -F "priority=high"

# Обновить документ
curl -X PATCH http://localhost:8000/api/v1/documents/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### 3. Проверка Redis

```bash
# Подключиться к Redis
redis-cli

# Проверить сессии (DB 1)
SELECT 1
KEYS session:*

# Проверить кеш (DB 2)
SELECT 2
KEYS documents:list:*

# Проверить индекс (DB 3)
SELECT 3
FT.SEARCH idx:documents "*"
```

---

## 📚 Дополнительные ресурсы

**FastAPI документация:**
- https://fastapi.tiangolo.com/

**SQLAlchemy:**
- https://docs.sqlalchemy.org/

**Redis & RediSearch:**
- https://redis.io/docs/stack/search/

**MinIO:**
- https://min.io/docs/minio/linux/index.html

**Alembic:**
- https://alembic.sqlalchemy.org/

---

## 🎯 Итоговая схема интеграции

```
1. Запустить инфраструктуру (docker-compose up -d)
   ├── PostgreSQL (port 5432)
   ├── Redis (port 6379)
   └── MinIO (port 9000, 9001)

2. Backend FastAPI
   ├── Создать виртуальное окружение
   ├── Установить зависимости (pip install -r requirements.txt)
   ├── Настроить .env
   ├── Применить миграции (alembic upgrade head)
   ├── Создать search index в Redis
   └── Запустить (uvicorn app.main:app --reload)

3. Frontend React
   ├── Убрать мок-данные из auth.ts
   ├── Заменить MOCK_* на useApi() в компонентах
   ├── Настроить .env.local (VITE_API_URL)
   └── Запустить (npm run dev)

4. Тестирование
   ├── Зарегистрировать пользователя
   ├── Войти и получить JWT токен
   ├── Загрузить документ
   ├── Проверить все экраны
   └── Проверить поиск и аналитику

✅ ГОТОВО!
```

---

**Версия документа**: 1.0.0  
**Дата создания**: 27 ноября 2025  
**Статус**: ✅ Готов к использованию

