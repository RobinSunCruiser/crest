import { useCallback } from 'react';
import { useNotifications } from './useNotifications';

export interface ErrorHandlingOptions {
  showNotification?: boolean;
  notificationTitle?: string;
  logToConsole?: boolean;
  onError?: (error: Error) => void;
}

export interface ErrorHandler {
  handleError: (error: unknown, context?: string, options?: ErrorHandlingOptions) => string;
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options?: ErrorHandlingOptions
  ) => Promise<T | null>;
  createErrorMessage: (error: unknown, context?: string) => string;
}

/**
 * Centralized error handling hook
 * Provides consistent error processing, logging, and user notification
 */
export const useErrorHandling = (): ErrorHandler => {
  const { showError } = useNotifications();

  const createErrorMessage = useCallback((error: unknown, context?: string): string => {
    let message: string;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = 'An unknown error occurred';
    }

    return context ? `${context}: ${message}` : message;
  }, []);

  const handleError = useCallback((
    error: unknown,
    context?: string,
    options: ErrorHandlingOptions = {}
  ): string => {
    const {
      showNotification = true,
      notificationTitle,
      logToConsole = true,
      onError,
    } = options;

    const errorMessage = createErrorMessage(error, context);

    // Log to console if enabled
    if (logToConsole) {
      console.error(context ? `[${context}]` : '[Error]', error);
    }

    // Show notification if enabled
    if (showNotification) {
      showError(errorMessage, notificationTitle);
    }

    // Call custom error handler if provided
    if (onError && error instanceof Error) {
      onError(error);
    }

    return errorMessage;
  }, [createErrorMessage, showError]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options: ErrorHandlingOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorMessage,
  };
};