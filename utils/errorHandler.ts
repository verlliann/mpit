import { ApiError } from '../api/client';

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Произошла неизвестная ошибка';
}

/**
 * Get user-friendly error message based on status code
 */
export function getErrorMessage(status: number, defaultMessage?: string): string {
  const messages: Record<number, string> = {
    400: 'Неверный запрос. Проверьте введенные данные.',
    401: 'Требуется авторизация. Пожалуйста, войдите в систему.',
    403: 'Доступ запрещен. У вас нет прав для выполнения этого действия.',
    404: 'Запрашиваемый ресурс не найден.',
    408: 'Превышено время ожидания запроса.',
    409: 'Конфликт данных. Возможно, ресурс уже существует.',
    422: 'Ошибка валидации данных.',
    429: 'Слишком много запросов. Попробуйте позже.',
    500: 'Внутренняя ошибка сервера. Попробуйте позже.',
    502: 'Сервер временно недоступен.',
    503: 'Сервис временно недоступен. Идет обслуживание.',
  };

  return messages[status] || defaultMessage || 'Произошла ошибка при выполнении запроса';
}

/**
 * Check if error is network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/**
 * Check if error is authentication error
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Log error to console (can be extended to send to error tracking service)
 */
export function logError(error: unknown, context?: string): void {
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  
  // TODO: Send to error tracking service (Sentry, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error);
  // }
}


