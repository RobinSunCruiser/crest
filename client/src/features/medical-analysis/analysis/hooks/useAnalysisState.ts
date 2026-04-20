import { useState, useCallback, useEffect } from 'react';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { STORAGE_KEYS } from '@/shared/constants/storage';

// Multi-model results interface
export interface MultiModelResults {
  [modelId: string]: {
    results: CausalAnalysisResults | null;
    error?: string;
    processingTime: number;
    modelInfo?: { provider: string; model: string };
  };
}

export interface AnalysisState {
  selectedResults: CausalAnalysisResults | null;
  multiModelResults: MultiModelResults;
  batchProgress: { current: number; total: number };
  selectedModelId: string | null;
}

export interface AnalysisStateActions {
  setSelectedResults: (results: CausalAnalysisResults | null) => void;
  setMultiModelResults: (results: MultiModelResults) => void;
  setBatchProgress: (progress: { current: number; total: number }) => void;
  selectModelResult: (modelId: string) => void;
  resetAnalysisState: () => void;
  setSelectedModelId: (modelId: string | null) => void;
}

/**
 * Centralized state management for medical analysis
 * Handles results and progress tracking for multi-model analysis
 * Now includes localStorage persistence for automatic data recovery on page reload
 */
export const useAnalysisState = (): AnalysisState & AnalysisStateActions => {
  const [selectedResults, setSelectedResults] = useState<CausalAnalysisResults | null>(null);

  // Load multiModelResults from localStorage on mount
  const [multiModelResults, setMultiModelResults] = useState<MultiModelResults>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANALYSIS_STATE);
      return stored ? JSON.parse(stored).multiModelResults : {};
    } catch {
      return {};
    }
  });

  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Load selectedModelId from localStorage on mount
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANALYSIS_STATE);
      return stored ? (JSON.parse(stored).selectedModelId || null) : null;
    } catch {
      return null;
    }
  });

  // Restore selectedResults from multiModelResults on mount
  useEffect(() => {
    // If we have multiModelResults and selectedModelId but no selectedResults,
    // this means we just loaded from localStorage and need to restore the display
    if (selectedResults === null && selectedModelId && multiModelResults[selectedModelId]?.results) {
      setSelectedResults(multiModelResults[selectedModelId].results);
    }
    // Also handle case where we have multiModelResults but no selectedModelId
    // (auto-select first available result)
    else if (selectedResults === null && !selectedModelId && Object.keys(multiModelResults).length > 0) {
      const firstModelId = Object.keys(multiModelResults)[0];
      const firstResult = multiModelResults[firstModelId];
      if (firstResult?.results) {
        setSelectedResults(firstResult.results);
        setSelectedModelId(firstResult.modelInfo?.model || firstModelId);
      }
    }
  }, []); // Empty deps - only run once on mount

  const selectModelResult = useCallback((modelId: string) => {
    const result = multiModelResults[modelId];
    if (result?.results) {
      setSelectedResults(result.results);
      setSelectedModelId(modelId);
    }
  }, [multiModelResults]);

  const resetAnalysisState = useCallback(() => {
    setSelectedResults(null);
    setMultiModelResults({});
    setBatchProgress({ current: 0, total: 0 });
    setSelectedModelId(null);
    // Clear from localStorage as well
    try {
      localStorage.removeItem(STORAGE_KEYS.ANALYSIS_STATE);
    } catch (error) {
      console.error('Failed to clear analysis state from storage:', error);
    }
  }, []);

  // Save to localStorage whenever multiModelResults or selectedModelId changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANALYSIS_STATE, JSON.stringify({
        multiModelResults,
        selectedModelId
      }));
    } catch (error) {
      console.error('Failed to save analysis state:', error);
    }
  }, [multiModelResults, selectedModelId]);

  return {
    // State
    selectedResults,
    multiModelResults,
    batchProgress,
    selectedModelId,

    // Actions
    setSelectedResults,
    setMultiModelResults,
    setBatchProgress,
    selectModelResult,
    resetAnalysisState,
    setSelectedModelId,
  };
};