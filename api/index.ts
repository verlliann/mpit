// Export all services
export * from './services/auth';
export * from './services/documents';
export * from './services/counterparties';
export * from './services/analytics';
export * from './services/chat';
export * from './services/storage';
export * from './services/settings';

// Export client and utilities
export { apiClient, setAccessToken, getAccessToken } from './client';
export { ApiError } from './client';

// Export types (ApiError is a class in client.ts, not an interface)
export type * from './types';

// Re-export config
export { API_CONFIG, API_ENDPOINTS } from '../config';


