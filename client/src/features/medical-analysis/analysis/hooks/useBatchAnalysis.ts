import { useCallback } from 'react';
import {
  useAnalysisState,
  useProgressTracking,
  useBatchProcessing,
  useModelResultsManager,
  useSingleModelAnalysis
} from '.';
import { useLoadingState } from '@/shared/hooks';
import { IModelOptions } from '@root/server/src/interfaces';

export const useBatchAnalysis = (
  selectedModelIds: string[],
  systemPrompt: string,
  entityPrompt: string,
  relationPrompt: string,
  probabilityPrompt: string,
  entityMergePrompt: string,
  relationMergePrompt: string,
  probabilityMergePrompt: string,
  timeout: number,
  modelOptions: IModelOptions
) => {
  const { withLoading } = useLoadingState();
  
  const {
    setSelectedResults,
    setMultiModelResults,
    setBatchProgress
  } = useAnalysisState();
  
  const {
    processingStep,
    setProcessingStep
  } = useProgressTracking();
  
  const { processBatchText } = useBatchProcessing();
  const { autoSelectFirstSuccess } = useModelResultsManager();
  
  const { analyzeSingleModel } = useSingleModelAnalysis({
    systemPrompt,
    entityPrompt,
    relationPrompt,
    probabilityPrompt,
    entityMergePrompt,
    relationMergePrompt,
    probabilityMergePrompt,
    timeout,
    modelOptions
  });

  // Batch analysis for multi-page documents with multi-model support
  const analyzeBatchText = useCallback(async (inputText: string, processBatches = false, addFirstPageToExisting = false) => {
    return await withLoading(async () => {
      const results = await processBatchText(
        inputText,
        {
          selectedModelIds,
          processBatches,
          addFirstPageToExisting
        },
        {
          processingStep,
          setProcessingStep,
          setBatchProgress,
          analyzeSingleModel
        }
      );
      
      setMultiModelResults(results);
      
      // Auto-select first successful result
      const firstSuccessResult = autoSelectFirstSuccess(results);
      if (firstSuccessResult) {
        setSelectedResults(firstSuccessResult);
      }
      
      return results;
    });
  }, [selectedModelIds, analyzeSingleModel, withLoading, processBatchText, processingStep, setProcessingStep, setBatchProgress, setMultiModelResults, autoSelectFirstSuccess, setSelectedResults]);

  return {
    analyzeBatchText
  };
};