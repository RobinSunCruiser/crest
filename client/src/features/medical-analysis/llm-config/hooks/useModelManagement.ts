import { useState, useEffect, useCallback } from 'react';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';
import { modelService } from '@/features/medical-analysis/llm-config/ModelService';
import { socketService } from '@/shared/services';
import { CONFIG } from '@/features/medical-analysis/constants';
import { useLoadingState } from '@/shared/hooks/useLoadingState';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { useErrorHandling } from '@/shared/hooks/useErrorHandling';
import { STORAGE_KEYS } from '@/shared/constants/storage';

/**
 * Custom hook for managing model loading and authentication
 */
export const useModelManagement = () => {
  const [models, setModels] = useState<IModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    // Initialize from localStorage if available
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MODELS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(socketService.isAuthenticated());

  // Use common hooks for consistent patterns
  const { isLoading: modelsLoading, withLoading } = useLoadingState();
  const { showSuccess, showError } = useNotifications();
  const { handleError } = useErrorHandling();

  // Listen for authentication state changes from socketService
  useEffect(() => {
    socketService.onAuthChange(setIsAuthenticated);
  }, []);

  // Load models when authenticated
  const loadModels = useCallback(async () => {
    if (!isAuthenticated) return;

    const result = await withLoading(async () => {
      // Small delay to ensure socket connection is stable
      await new Promise(resolve => setTimeout(resolve, CONFIG.MODEL_LOAD_DELAY));
      
      const modelList = await modelService.listModels(CONFIG.MODEL_LOAD_TIMEOUT);
      
      if (!modelList) {
        throw new Error('No models returned from server');
      }

      setModels(modelList);
      
      // Validate and filter existing selected models
      const validModelIds = modelList.map(m => m.id);
      setSelectedModels(prev => {
        const validSelected = prev.filter(id => validModelIds.includes(id));
        // Update localStorage with valid selections
        localStorage.setItem(STORAGE_KEYS.SELECTED_MODELS, JSON.stringify(validSelected));
        return validSelected;
      });

      return modelList;
    });

    if (result) {
      showSuccess(`Successfully loaded ${result.length} models`, 'Models Loaded');
    } else {
      // Error was already handled by withLoading and useErrorHandling
      showError('Could not load available models. Please check server connection.', 'Model Loading Failed');
    }
  }, [isAuthenticated, withLoading, showSuccess, showError]);

  // Load models when authentication state changes
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleModelsChange = useCallback((modelIds: string[]) => {
    setSelectedModels(modelIds);
    // Save to localStorage with error handling
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODELS, JSON.stringify(modelIds));
    } catch (error) {
      handleError(error, 'Save selected models', { 
        showNotification: false, 
        logToConsole: true 
      });
    }
  }, [handleError]);

  return {
    models,
    selectedModels,
    modelsLoading,
    handleModelsChange,
    reloadModels: loadModels,
  };
};