import { useCallback } from 'react';
import { showNotification } from '@/shared/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  title?: string;
  message: string;
  type: NotificationType;
  autoClose?: number | boolean;
}

export interface NotificationActions {
  showSuccess: (message: string, title?: string, autoClose?: number) => void;
  showError: (message: string, title?: string, autoClose?: number) => void;
  showWarning: (message: string, title?: string, autoClose?: number) => void;
  showInfo: (message: string, title?: string, autoClose?: number) => void;
  notify: (options: NotificationOptions) => void;
}

/**
 * Centralized notification management hook
 * Provides consistent notification patterns with semantic methods
 */
export const useNotifications = (): NotificationActions => {
  const notify = useCallback((options: NotificationOptions) => {
    showNotification({
      title: options.title || getDefaultTitle(options.type),
      message: options.message,
      type: options.type,
      autoClose: options.autoClose ?? getDefaultAutoClose(options.type),
    });
  }, []);

  const showSuccess = useCallback((message: string, title?: string, autoClose = 4000) => {
    notify({
      message,
      title: title || 'Success',
      type: 'success',
      autoClose,
    });
  }, [notify]);

  const showError = useCallback((message: string, title?: string, autoClose = 8000) => {
    notify({
      message,
      title: title || 'Error',
      type: 'error',
      autoClose,
    });
  }, [notify]);

  const showWarning = useCallback((message: string, title?: string, autoClose = 6000) => {
    notify({
      message,
      title: title || 'Warning',
      type: 'warning',
      autoClose,
    });
  }, [notify]);

  const showInfo = useCallback((message: string, title?: string, autoClose = 5000) => {
    notify({
      message,
      title: title || 'Information',
      type: 'info',
      autoClose,
    });
  }, [notify]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    notify,
  };
};

function getDefaultTitle(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Information';
    default:
      return 'Notification';
  }
}

function getDefaultAutoClose(type: NotificationType): number {
  switch (type) {
    case 'success':
      return 4000;
    case 'error':
      return 8000;
    case 'warning':
      return 6000;
    case 'info':
      return 5000;
    default:
      return 5000;
  }
}