import { useCallback } from 'react';
import { getPageInfo } from '@/features/medical-analysis/input/utils/textChunking';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { MultiModelResults } from './useAnalysisState';
import { useNotifications } from '@/shared/hooks/useNotifications';

export interface BatchProcessingConfig {
  selectedModelIds: string[];
  processBatches: boolean;
  addFirstPageToExisting: boolean;
}

export interface BatchProcessingHooks {
  processingStep: string;
  setProcessingStep: (step: string) => void;
  setBatchProgress: (progress: { current: number; total: number }) => void;
  analyzeSingleModel: (
    modelId: string,
    inputText: string,
    addToExisting?: boolean,
    mergeWithResults?: CausalAnalysisResults | null,
    updateStepCallback?: (step: string) => void
  ) => Promise<CausalAnalysisResults>;
}

export interface BatchProcessingActions {
  processBatchText: (
    inputText: string,
    config: BatchProcessingConfig,
    hooks: BatchProcessingHooks
  ) => Promise<MultiModelResults>;
}

/**
 * Hook for handling multi-page batch processing of medical analysis
 * Manages page-by-page analysis with model failure tracking
 */
export const useBatchProcessing = (): BatchProcessingActions => {
  const { showSuccess } = useNotifications();

  const processBatchText = useCallback(async (
    inputText: string,
    config: BatchProcessingConfig,
    hooks: BatchProcessingHooks
  ): Promise<MultiModelResults> => {
    const { selectedModelIds, addFirstPageToExisting } = config;
    const { 
      setProcessingStep, 
      setBatchProgress, 
      analyzeSingleModel 
    } = hooks;

    const pageInfo = getPageInfo(inputText);
    
    setBatchProgress({ current: 0, total: pageInfo.pageCount });
    
    const accumulatedResults: Record<string, CausalAnalysisResults | null> = {};
    const failedModels = new Set<string>(); // Track models that have failed
    
    // Initialize accumulated results for each model
    selectedModelIds.forEach(modelId => {
      accumulatedResults[modelId] = addFirstPageToExisting ? null : null; // Will be set from existing results
    });

    // Process each page
    for (let i = 0; i < pageInfo.chunks.length; i++) {
      setBatchProgress({ current: i + 1, total: pageInfo.pageCount });
      let pageCompleted = 0;
      let pageRetries: string[] = [];
      
      // Get active models (excluding failed ones)
      const activeModelIds = selectedModelIds.filter(modelId => !failedModels.has(modelId));
      
      // Helper for comprehensive batch progress message
      const generateBatchProgressMessage = () => {
        let message = `Processing page ${i + 1} of ${pageInfo.pageCount} with ${activeModelIds.length} models (${pageCompleted} completed)`;
        if (failedModels.size > 0) {
          message += ` | ${failedModels.size} failed`;
        }
        if (pageRetries.length > 0) {
          message += ` | Retrying: ${pageRetries.join(', ')}`;
        }
        return message;
      };
      
      // Set initial progress message for this page
      setProcessingStep(generateBatchProgressMessage());
      
      const shouldMerge = i === 0 ? addFirstPageToExisting : true;
      
      // Process current page with active models in parallel (skip failed models)
      const promises = activeModelIds.map(async (modelId) => {
        const startTime = Date.now();
        try {
          // Create callback to update batch retry info
          const updateBatchRetryCallback = (retryMessage: string) => {
            const modelName = modelId.split(':')[0];
            const retryInfo = `${modelName}(${retryMessage.match(/retry (\d+)\/(\d+)/)?.[1]}/${retryMessage.match(/retry (\d+)\/(\d+)/)?.[2]})`;
            
            // Update batch retry tracking
            pageRetries = pageRetries.filter(r => !r.startsWith(modelName));
            pageRetries.push(retryInfo);
            
            setProcessingStep(generateBatchProgressMessage());
          };
          
          const result = await analyzeSingleModel(
            modelId, 
            pageInfo.chunks[i], 
            shouldMerge, 
            accumulatedResults[modelId], 
            updateBatchRetryCallback
          );
          accumulatedResults[modelId] = result;
          
          // Clear retries for this model and update progress
          const modelName = modelId.split(':')[0];
          pageRetries = pageRetries.filter(r => !r.startsWith(modelName));
          pageCompleted++;
          setProcessingStep(generateBatchProgressMessage());
          return {
            modelId,
            results: result,
            error: null,
            processingTime: Date.now() - startTime
          };
        } catch (error) {
          // Mark model as failed and clear retries
          failedModels.add(modelId);
          const modelName = modelId.split(':')[0];
          pageRetries = pageRetries.filter(r => !r.startsWith(modelName));
          pageCompleted++; // Count failed models as completed for progress tracking
          setProcessingStep(generateBatchProgressMessage());
          return {
            modelId,
            results: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime
          };
        }
      });

      await Promise.all(promises);
    }

    // Convert accumulated results to MultiModelResults format
    const finalResults: MultiModelResults = {};
    Object.entries(accumulatedResults).forEach(([modelId, result]) => {
      if (failedModels.has(modelId)) {
        // Mark failed models with error information
        finalResults[modelId] = {
          results: null,
          error: 'Model failed on page',
          processingTime: 0,
        };
      } else {
        finalResults[modelId] = {
          results: result,
          processingTime: 0, // Total time would need to be tracked separately
        };
      }
    });

    const successCount = Object.values(finalResults).filter(r => r.results).length;
    showSuccess(
      `${successCount}/${selectedModelIds.length} models completed successfully across ${pageInfo.pageCount} pages`,
      'Batch Analysis Complete'
    );

    return finalResults;
  }, [showSuccess]);

  return {
    processBatchText,
  };
};