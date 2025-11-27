# API Документация Sirius DMS

Полная документация API для фронтенда и бэкенда.

---

# Часть 1: Frontend API Integration

## Обзор

Фронтенд приложение Sirius DMS готово к интеграции с FastAPI бэкендом. Все API эндпоинты определены и готовы к использованию.

## Структура API на Frontend

```
api/
├── client.ts              # HTTP клиент с токен менеджментом
├── types.ts               # TypeScript типы для запросов/ответов
├── index.ts               # Экспорт всех сервисов
└── services/
    ├── auth.ts            # Аутентификация
    ├── documents.ts       # Управление документами
    ├── counterparties.ts  # Контрагенты
    ├── analytics.ts       # Аналитика
    ├── chat.ts            # AI Ассистент
    ├── storage.ts         # Хранилище S3
    └── settings.ts        # Настройки
```

## Конфигурация

### Переменные окружения

Создайте файл `.env.local`:

```bash
VITE_API_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key_here  # опционально
```

### API Base URL

По умолчанию: `http://localhost:8000`. Изменяется в `config.ts`.

---

## Использование в компонентах

### Пример 1: Аутентификация

```typescript
import { useAuth } from './hooks';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
      console.log('Logged in!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>Welcome, {user?.first_name}!</div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Пример 2: Загрузка документов

```typescript
import { useDocuments, useDocumentMutations } from './hooks';

function DocumentList() {
  const { data, loading, error } = useDocuments({ page: 1, limit: 20 });
  const { upload } = useDocumentMutations({
    onSuccess: () => console.log('Uploaded!'),
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.items.map(doc => (
        <div key={doc.id}>{doc.title}</div>
      ))}
    </div>
  );
}
```

### Пример 3: Прямой вызов API

```typescript
import { documentsService } from './api';

async function fetchDocument(id: string) {
  try {
    const document = await documentsService.getDocument(id);
    console.log(document);
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
}
```

---

## Обработка ошибок

### ApiError

```typescript
import { ApiError } from './api/client';

try {
  await documentsService.getDocument('123');
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Details:', error.details);
  }
}
```

### Утилиты для ошибок

```typescript
import { formatErrorMessage, isAuthError, isNetworkError } from './utils';

try {
  await someApiCall();
} catch (error) {
  if (isAuthError(error)) {
    // Redirect to login
  }
  
  if (isNetworkError(error)) {
    // Show offline message
  }

  const message = formatErrorMessage(error);
  console.error(message);
}
```

---

## Token Management

Токены автоматически сохраняются в `localStorage` и добавляются ко всем запросам.

```typescript
import { setAccessToken, getAccessToken } from './api/client';

// Установить токен
setAccessToken('your-jwt-token');

// Получить токен
const token = getAccessToken();

// Удалить токен
setAccessToken(null);
```

HTTP клиент автоматически добавляет `Authorization: Bearer <token>` ко всем запросам.

---

# Часть 2: Backend API Specification (FastAPI)

## Base URL

```
http://localhost:8000/api/v1
```

---

## Authentication

### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "first_name": "Алексей",
    "last_name": "Алексеев",
    "role": "admin"
  }
}
```

### POST /auth/logout

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

### GET /auth/me

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "first_name": "Алексей",
  "last_name": "Алексеев",
  "role": "admin"
}
```

### POST /auth/refresh

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

## Documents

### GET /documents

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `status` (string: processed | processing | review | error)
- `priority` (string: high | medium | low)
- `type` (string: contract | invoice | act | order | email | scan)
- `search` (string)
- `counterparty_id` (string)
- `date_from` (string: YYYY-MM-DD)
- `date_to` (string: YYYY-MM-DD)
- `is_favorite` (boolean)
- `is_archived` (boolean)
- `is_deleted` (boolean)

**Response:**
```json
{
  "items": [
    {
      "id": "doc-1",
      "title": "Договор №123/2025.pdf",
      "type": "contract",
      "counterparty": "ООО \"Рога и Копыта\"",
      "counterparty_id": "cp-1",
      "date": "2025-01-15",
      "priority": "high",
      "pages": 12,
      "department": "Юридический",
      "status": "processed",
      "size": "2.4 MB",
      "uploadedBy": "Иванов А.А.",
      "path": "s3://bucket/contracts/2025/01/doc-1.pdf",
      "version": 3,
      "description": "Основной рамочный договор",
      "isFavorite": true,
      "isArchived": false,
      "isDeleted": false,
      "tags": ["Важное", "2025"],
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T14:30:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

### GET /documents/{id}

**Response:** Single document object

### POST /documents

**Request:**
```json
{
  "title": "Новый договор.pdf",
  "type": "contract",
  "counterparty_id": "cp-1",
  "priority": "high",
  "department": "Юридический",
  "description": "Описание документа",
  "tags": ["Важное"]
}
```

**Response:** Created document object

### PATCH /documents/{id}

**Request:**
```json
{
  "title": "Обновленное название.pdf",
  "priority": "medium",
  "status": "processed",
  "tags": ["Обновлено"]
}
```

**Response:** Updated document object

### DELETE /documents/{id}

**Query Parameters:**
- `permanent` (boolean, default: false)

**Response:** `204 No Content`

### POST /documents/upload

**Request:** `multipart/form-data`
- `file`: File
- `title` (optional): string
- `type` (optional): string
- `counterparty_id` (optional): string
- `priority` (optional): string
- `department` (optional): string
- `tags` (optional): JSON string array

**Response:**
```json
{
  "document": { /* document object */ },
  "upload_url": "https://s3.amazonaws.com/bucket/path/to/file.pdf"
}
```

### GET /documents/{id}/download

**Response:** Binary file (application/pdf, etc.)

### POST /documents/bulk-delete

**Request:**
```json
{
  "document_ids": ["doc-1", "doc-2", "doc-3"]
}
```

**Response:** `204 No Content`

### POST /documents/bulk-archive

**Request:**
```json
{
  "document_ids": ["doc-1", "doc-2", "doc-3"]
}
```

**Response:** `204 No Content`

---

## Counterparties

### GET /counterparties

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `search` (string)
- `min_trust_score` (int: 0-100)

**Response:**
```json
{
  "items": [
    {
      "id": "cp-1",
      "name": "ООО \"Рога и Копыта\"",
      "inn": "7701234567",
      "kpp": "770101001",
      "address": "Москва, ул. Примерная, д. 1",
      "email": "info@rogaikopita.ru",
      "phone": "+7 (495) 123-45-67",
      "docCount": 156,
      "trustScore": 92,
      "activeContracts": 3,
      "lastInteraction": "2025-01-15",
      "type": ["contract", "invoice"]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "pages": 2
}
```

### POST /counterparties

**Request:**
```json
{
  "name": "ООО \"Новая Компания\"",
  "inn": "7701234567",
  "kpp": "770101001",
  "address": "Москва, ул. Примерная, д. 1",
  "email": "info@company.ru",
  "phone": "+7 (495) 123-45-67"
}
```

---

## Analytics

### GET /analytics/dashboard

**Response:**
```json
{
  "total_documents": 1245,
  "high_priority_count": 7,
  "avg_processing_time_minutes": 45,
  "processed_pages": 4890,
  "storage_used_gb": 247.3,
  "storage_total_gb": 1024
}
```

### GET /analytics/workflow

**Query Parameters:**
- `period` (string: week | month | year)

**Response:**
```json
[
  { "name": "Пн", "incoming": 45, "processed": 40 },
  { "name": "Вт", "incoming": 52, "processed": 48 }
]
```

---

## Chat

### POST /chat/message

**Request:**
```json
{
  "message": "Найди все срочные документы",
  "context": "optional context"
}
```

**Response:**
```json
{
  "id": "msg-123",
  "role": "assistant",
  "content": "Найдено 7 документов с высоким приоритетом...",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### POST /chat/stream

**Request:** Same as /chat/message

**Response:** Server-Sent Events (SSE)
```
data: {"content": "Найдено "}
data: {"content": "7 "}
data: {"content": "документов"}
data: [DONE]
```

---

## Error Responses

Все ошибки следуют формату:

```json
{
  "detail": "Error message",
  "status": 400
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Database Models (рекомендуемые)

### User
```python
class User(Base):
    id: UUID
    email: str (unique, indexed)
    password_hash: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime
```

### Document
```python
class Document(Base):
    id: UUID
    title: str
    type: str  # contract, invoice, act, order, email, scan
    counterparty_id: Optional[UUID]
    date: date
    priority: str  # high, medium, low
    status: str  # processed, processing, review, error
    path: str  # S3 path
    tags: JSON  # array of strings
    is_favorite: bool
    is_archived: bool
    is_deleted: bool
    created_at: datetime
```

---

## S3 Storage Structure

```
bucket-name/
├── contracts/2025/01/{uuid}.pdf
├── invoices/2025/01/{uuid}.pdf
├── acts/2025/01/{uuid}.pdf
└── ...
```

---

**Документация обновлена**: Ноябрь 2025

