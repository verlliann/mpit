import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export function useNotifications(autoCloseDelay = 4000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      type: Notification['type'],
      title: string,
      message: string
    ) => {
      const id = Date.now().toString() + Math.random();
      const notification: Notification = { id, type, title, message };

      setNotifications(prev => [...prev, notification]);

      if (autoCloseDelay > 0) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, autoCloseDelay);
      }

      return id;
    },
    [autoCloseDelay]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message: string) => addNotification('success', title, message),
    [addNotification]
  );

  const error = useCallback(
    (title: string, message: string) => addNotification('error', title, message),
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message: string) => addNotification('warning', title, message),
    [addNotification]
  );

  const info = useCallback(
    (title: string, message: string) => addNotification('info', title, message),
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };
}


