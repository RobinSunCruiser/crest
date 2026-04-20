import { useState, useCallback } from 'react';

export interface ProgressState {
  processingStep: string;
  isProcessing: boolean;
}

export interface ProgressActions {
  setProcessingStep: (step: string) => void;
  setProcessing: (processing: boolean) => void;
  startProcessing: (initialStep?: string) => void;
  finishProcessing: () => void;
  generateProgressMessage: (params: {
    pageInfo?: { current: number; total: number };
    modelsTotal: number;
    completed: number;
    retries?: string[];
  }) => string;
}

/**
 * Hook for tracking and displaying analysis progress
 * Provides consistent progress message generation and state management
 */
export const useProgressTracking = (): ProgressState & ProgressActions => {
  const [processingStep, setProcessingStep] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
    if (!processing) {
      setProcessingStep('');
    }
  }, []);

  const startProcessing = useCallback((initialStep = 'Starting analysis...') => {
    setIsProcessing(true);
    setProcessingStep(initialStep);
  }, []);

  const finishProcessing = useCallback(() => {
    setIsProcessing(false);
    setProcessingStep('');
  }, []);

  const generateProgressMessage = useCallback(({
    pageInfo,
    modelsTotal,
    completed,
    retries = []
  }: {
    pageInfo?: { current: number; total: number };
    modelsTotal: number;
    completed: number;
    retries?: string[];
  }) => {
    let baseMessage = '';
    
    if (pageInfo && pageInfo.total > 1) {
      baseMessage = `Processing page ${pageInfo.current} of ${pageInfo.total} with ${modelsTotal} ${modelsTotal === 1 ? 'model' : 'models'}`;
    } else {
      baseMessage = `Analyzing with ${modelsTotal} ${modelsTotal === 1 ? 'model' : 'models'}`;
    }
    
    // Only show completion count for multiple models
    if (modelsTotal > 1) {
      baseMessage += ` (${completed} completed)`;
    }
    
    if (retries.length > 0) {
      baseMessage += ` | Retrying: ${retries.join(', ')}`;
    }
    
    return baseMessage;
  }, []);

  return {
    // State
    processingStep,
    isProcessing,
    
    // Actions
    setProcessingStep,
    setProcessing,
    startProcessing,
    finishProcessing,
    generateProgressMessage,
  };
};