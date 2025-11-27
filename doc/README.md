# Sirius DMS - Система управления документами

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![API Ready](https://img.shields.io/badge/API-Ready-green)

Современная система управления документами с полной интеграцией FastAPI бэкенда.

---

## 🚀 Быстрый старт

### Требования:
- Node.js 18+ (рекомендуется 20 LTS)

### Установка и запуск:

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск dev сервера
npm run dev

# 3. Production сборка (опционально)
npm run build
npm run preview
```

Приложение откроется на: **http://localhost:5173**

**Тестовый вход**: `demo@sirius-dms.com` / `password`

---

## 📁 Структура проекта

```
mpit/
├── api/                    # API интеграция
│   ├── client.ts          # HTTP клиент
│   ├── types.ts           # TypeScript типы
│   └── services/          # API сервисы (7 файлов)
├── components/            # React компоненты (15 файлов)
├── hooks/                 # Custom React хуки
│   ├── useApi.ts         # Generic API хук
│   ├── useAuth.ts        # Аутентификация
│   ├── useDocuments.ts   # Документы
│   └── useNotifications.ts # Уведомления
├── utils/                 # Утилиты
├── doc/                   # Документация
│   ├── README.md         # Этот файл
│   └── API.md            # API документация
├── config.ts             # Конфигурация API
├── types.ts              # Общие типы
├── constants.ts          # Константы и mock данные
└── App.tsx               # Главный компонент
```

---

## 🎯 Основные функции

### ✅ Готово к работе:

- 🔐 **Аутентификация** (JWT токены, localStorage)
- 📊 **Dashboard** с метриками и графиками
- 📄 **Документы** (CRUD, List/Grid view, фильтры, поиск)
- 📤 **Загрузка файлов** (drag & drop, progress)
- 👥 **Контрагенты** (управление, карточки)
- 📈 **Аналитика** (Recharts графики)
- 💬 **AI Чат** (Gemini AI, streaming)
- ⚙️ **Настройки** (профиль, безопасность)
- 🔔 **Уведомления** (toast система)
- 🔍 **Command Palette** (Cmd/Ctrl+K)

### 📡 API Интеграция:

- ✅ **50+ эндпоинтов** готовы
- ✅ **7 API сервисов** реализованы
- ✅ **HTTP клиент** с auto-retry и error handling
- ✅ **TypeScript типизация**
- ✅ **React хуки** для удобной работы

---

## 📝 Тестовые данные

### Вход в систему:
```
Email:    demo@sirius-dms.com
Password: password
```

⚠️ **Важно**: Пока бэкенд не запущен, приложение работает с **моковыми данными** из `constants.ts`

---

## 🔌 API Endpoints

### Основные группы:

| Группа | Эндпоинтов | Описание |
|--------|------------|----------|
| **Authentication** | 5 | Login, logout, refresh, register, me |
| **Documents** | 12+ | CRUD, upload, download, search, bulk ops |
| **Counterparties** | 6 | CRUD, documents by counterparty |
| **Analytics** | 5 | Dashboard, workflow, types, flow |
| **Chat** | 4 | AI assistant, streaming, history |
| **Storage** | 2 | S3 info, stats |
| **Settings** | 4 | User settings, profile, security |

📖 **Полная документация**: см. [API.md](./API.md)

---

## 🛠️ Разработка

### Доступные команды:

```bash
npm run dev         # Запуск dev сервера
npm run build       # Production сборка
npm run preview     # Preview production сборки
npm run type-check  # TypeScript проверка
```

### Переменные окружения (.env.local):

```bash
VITE_API_URL=http://localhost:8000        # URL бэкенда
VITE_GEMINI_API_KEY=your_key              # Для AI чата (опционально)
```

---

## 🏗️ Архитектура

### Слои приложения:

```
Components → Hooks → Services → HTTP Client → FastAPI Backend
```

### HTTP Client возможности:

- ✅ Автоматическое добавление JWT токенов
- ✅ Error handling (ApiError class)
- ✅ Request timeout (30 сек)
- ✅ FormData support (file uploads)
- ✅ Blob support (file downloads)
- ✅ Query params serialization
- ✅ Retry логика

### Хуки для работы с API:

```typescript
// Аутентификация
const { user, login, logout } = useAuth();

// Загрузка данных
const { data, loading, error } = useApi(
  () => documentsService.getDocuments({ page: 1 }),
  { immediate: true }
);

// Мутации (POST/PUT/DELETE)
const { mutate, loading } = useMutation(
  (data) => documentsService.createDocument(data)
);

// Уведомления
const { success, error } = useNotifications();
```

---

## 🔐 Безопасность

### Frontend:
- ✅ JWT токены в localStorage
- ✅ Автоматический logout при 401
- ✅ XSS защита (React по умолчанию)
- ✅ Input validation

### Backend (требования):
- ⚠️ JWT token verification
- ⚠️ Password hashing (bcrypt)
- ⚠️ CORS настройка
- ⚠️ Rate limiting
- ⚠️ SQL injection prevention (ORM)

---

## 📊 Технологический стек

### Core:
- **React 18.3** - UI библиотека
- **TypeScript 5.4** - Типизация
- **Vite 5.2** - Сборщик

### UI:
- **Tailwind CSS** - Стили (через CDN)
- **Lucide React** - Иконки
- **Recharts** - Графики

### API:
- **Fetch API** - HTTP клиент
- **Custom hooks** - React интеграция

### Dev Tools:
- **TypeScript** - Type checking
- **Vite** - Fast HMR

---

## 🚀 Deployment

### Production сборка:

```bash
npm run build
# Результат в папке dist/
```

### Environment Variables (production):

```bash
VITE_API_URL=https://api.your-domain.com
```

### CORS на бэкенде:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Troubleshooting

### Node.js не найден:
```bash
# Установите Node.js с https://nodejs.org/
node --version
npm --version
```

### Ошибки при npm install:
```bash
npm cache clean --force
npm install
```

### Порт занят:
```bash
# Измените порт
npm run dev -- --port 3000
```

### CORS ошибки:
- Проверьте что FastAPI бэкенд настроен с правильными CORS headers
- Убедитесь что `VITE_API_URL` указан правильно

---

## 📚 Документация

| Файл | Описание |
|------|----------|
| [API.md](./API.md) | API интеграция и эндпоинты |
| [ENDPOINTS_STATUS.md](./ENDPOINTS_STATUS.md) | Отчет о статусе эндпоинтов |
| [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) | Руководство по интеграции бэкенда |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License

---

## 📧 Support

Для вопросов и поддержки:
- Email: support@sirius-dms.com
- GitHub Issues: [Create Issue](https://github.com/your-repo/issues)

---

**Made with ❤️ for efficient document management**

**Версия**: 1.0.0  
**Дата**: Ноябрь 2025

