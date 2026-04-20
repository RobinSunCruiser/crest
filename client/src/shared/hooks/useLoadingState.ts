import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface LoadingActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Centralized loading state management hook
 * Provides consistent loading/error state patterns across the application
 */
export const useLoadingState = (initialLoading = false): LoadingState & LoadingActions => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null); // Clear error when starting new operation
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await asyncFn();
      return result;
    } catch (err) {
      // Don't show error messages for user-initiated aborts - they're intentional cancellations
      if (err instanceof Error && (
        err.message === 'Request aborted by user' || 
        err.message.includes('AbortError') || 
        err.message.includes('This operation was aborted')
      )) {
        return null;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  return {
    isLoading,
    error,
    setLoading,
    setError,
    clearError,
    withLoading,
  };
};