// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
  },
  
  // Documents
  DOCUMENTS: {
    LIST: '/api/v1/documents',
    GET: (id: string) => `/api/v1/documents/${id}`,
    CREATE: '/api/v1/documents',
    UPDATE: (id: string) => `/api/v1/documents/${id}`,
    DELETE: (id: string) => `/api/v1/documents/${id}`,
    UPLOAD: '/api/v1/documents/upload',
    DOWNLOAD: (id: string) => `/api/v1/documents/${id}/download`,
    FAVORITES: '/api/v1/documents/favorites',
    ARCHIVE: '/api/v1/documents/archive',
    TRASH: '/api/v1/documents/trash',
    RESTORE: (id: string) => `/api/v1/documents/${id}/restore`,
    SEARCH: '/api/v1/documents/search',
    BULK_DELETE: '/api/v1/documents/bulk-delete',
    BULK_ARCHIVE: '/api/v1/documents/bulk-archive',
  },
  
  // Counterparties
  COUNTERPARTIES: {
    LIST: '/api/v1/counterparties',
    GET: (id: string) => `/api/v1/counterparties/${id}`,
    CREATE: '/api/v1/counterparties',
    UPDATE: (id: string) => `/api/v1/counterparties/${id}`,
    DELETE: (id: string) => `/api/v1/counterparties/${id}`,
    DOCUMENTS: (id: string) => `/api/v1/counterparties/${id}/documents`,
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/api/v1/analytics/dashboard',
    WORKFLOW: '/api/v1/analytics/workflow',
    TYPES: '/api/v1/analytics/types',
    DOCUMENTS_FLOW: '/api/v1/analytics/documents-flow',
    METRICS: '/api/v1/analytics/metrics',
  },
  
  // Chat / AI Assistant
  CHAT: {
    SEND_MESSAGE: '/api/v1/chat/message',
    STREAM: '/api/v1/chat/stream',
    HISTORY: '/api/v1/chat/history',
    CLEAR: '/api/v1/chat/clear',
  },
  
  // Storage
  STORAGE: {
    INFO: '/api/v1/storage/info',
    STATS: '/api/v1/storage/stats',
  },
  
  // Settings
  SETTINGS: {
    GET: '/api/v1/settings',
    UPDATE: '/api/v1/settings',
    PROFILE: '/api/v1/settings/profile',
    SECURITY: '/api/v1/settings/security',
  },
};


