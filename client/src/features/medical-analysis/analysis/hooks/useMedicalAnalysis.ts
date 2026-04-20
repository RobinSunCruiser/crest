import { useCallback, useState } from 'react';
import { conversationService } from '@/shared/services';
import { IModelOptions } from '@root/server/src/interfaces';
import {
  useAnalysisState,
  useProgressTracking,
  useBatchProcessing,
  useModelResultsManager,
  useSingleModelAnalysis
} from '.';
import {
  useLoadingState,
  useNotifications
} from '@/shared/hooks';

const DEFAULT_MODEL_OPTIONS: IModelOptions = {
  stream: false,
  // Use undefined to let each LLM provider use their own defaults
  temperature: undefined,
  top_p: undefined,
  presence_penalty: undefined,
  frequency_penalty: undefined,
  seed: 42, // Keep default seed for reproducibility
};

export const useMedicalAnalysis = (
  selectedModelIds: string[],
  timeout: number = 300000,
  systemPrompt: string,
  entityPrompt: string,
  relationPrompt: string,
  probabilityPrompt: string,
  entityMergePrompt: string,
  relationMergePrompt: string,
  probabilityMergePrompt: string,
  validationPrompt: string,
  modelOptions: IModelOptions = DEFAULT_MODEL_OPTIONS
) => {
  // Initialize focused hooks
  const { isLoading: processing, withLoading } = useLoadingState();
  const { showSuccess } = useNotifications();
  const [error, setError] = useState('');
  
  const {
    selectedResults,
    multiModelResults,
    batchProgress,
    selectedModelId,
    setSelectedResults,
    setMultiModelResults,
    setBatchProgress,
    setSelectedModelId,
    selectModelResult,
    resetAnalysisState
  } = useAnalysisState();
  
  const {
    processingStep,
    setProcessingStep,
    generateProgressMessage
  } = useProgressTracking();
  
  const { processBatchText } = useBatchProcessing();
  const { autoSelectFirstSuccess, performCausalQuery, getSuccessCount } = useModelResultsManager();
  
  const { analyzeSingleModel, replaceTemplateVars } = useSingleModelAnalysis({
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



  // Multi-model analysis
  const analyzeText = useCallback(async (inputText: string, addToExisting: boolean = false): Promise<void> => {
    const result = await withLoading(async () => {
      if (selectedModelIds.length === 0) {
        throw new Error('Please select at least one model');
      }

      if (!inputText.trim()) {
        throw new Error('Please provide text to analyze');
      }

      setError('');
      
      // When adding to existing analysis, only process models that have successful results
      let modelsToProcess = selectedModelIds;
      let existingResults = multiModelResults;
      
      if (addToExisting) {
        // Filter to only models with successful existing results
        modelsToProcess = selectedModelIds.filter(modelId => 
          multiModelResults[modelId]?.results != null
        );
        
        if (modelsToProcess.length === 0) {
          throw new Error('No successful models found to add to existing analysis');
        }
      } else {
        // For new analysis, clear existing results and conversation history
        resetAnalysisState();
        existingResults = {};
      }

      setProcessingStep(
        generateProgressMessage({
          modelsTotal: modelsToProcess.length,
          completed: 0,
          retries: []
        })
      );

      const results = { ...existingResults };
      let completed = 0;
      let currentRetries: string[] = [];

      // Run all models in parallel
      const promises = modelsToProcess.map(async (modelId) => {
        const startTime = Date.now();
        try {
          // Create callback to update retry info
          const updateRetryCallback = (retryMessage: string) => {
            const modelName = modelId.split(':')[0];
            const retryInfo = `${modelName}(${retryMessage.match(/retry (\d+)\/(\d+)/)?.[1]}/${retryMessage.match(/retry (\d+)\/(\d+)/)?.[2]})`;
            
            // Update retry tracking
            currentRetries = currentRetries.filter(r => !r.startsWith(modelName));
            currentRetries.push(retryInfo);
            
            setProcessingStep(
              generateProgressMessage({
                modelsTotal: modelsToProcess.length,
                completed,
                retries: currentRetries
              })
            );
          };
          
          // For merging, use this specific model's existing results
          const existingModelResults = addToExisting ? existingResults[modelId]?.results : null;
          const result = await analyzeSingleModel(modelId, inputText, addToExisting, existingModelResults, updateRetryCallback);
          results[modelId] = {
            results: result,
            processingTime: Date.now() - startTime
          };
          
          // Clear retries for this model and update progress
          const modelName = modelId.split(':')[0];
          currentRetries = currentRetries.filter(r => !r.startsWith(modelName));
          completed++;
          setProcessingStep(
            generateProgressMessage({
              modelsTotal: modelsToProcess.length,
              completed,
              retries: currentRetries
            })
          );
          
        } catch (error) {
          results[modelId] = {
            results: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: Date.now() - startTime
          };
          
          // Clear retries for this model and update progress
          const modelName = modelId.split(':')[0];
          currentRetries = currentRetries.filter(r => !r.startsWith(modelName));
          completed++; // Count failed models as completed for progress tracking
          setProcessingStep(
            generateProgressMessage({
              modelsTotal: modelsToProcess.length,
              completed,
              retries: currentRetries
            })
          );
        }
      });

      await Promise.all(promises);
      setMultiModelResults(results);
      
      // Auto-select first successful result
      const firstSuccessResult = autoSelectFirstSuccess(results);
      if (firstSuccessResult) {
        setSelectedResults(firstSuccessResult);
        // Find the model ID for the selected result
        const selectedModelIdEntry = Object.entries(results).find(
          ([_, result]) => result.results === firstSuccessResult
        );
        if (selectedModelIdEntry) {
          setSelectedModelId(selectedModelIdEntry[0]);
        }
      }

      const successCount = getSuccessCount(results);
      const totalModels = addToExisting ? modelsToProcess.length : selectedModelIds.length;
      
      showSuccess(
        `${successCount}/${totalModels} models completed successfully`,
        addToExisting ? 'Analysis Added' : 'Analysis Complete'
      );
      
      return results;
    });

    if (!result) {
      setError('Analysis failed');
    }
  }, [selectedModelIds, analyzeSingleModel, multiModelResults, withLoading, setError, resetAnalysisState, generateProgressMessage, setProcessingStep, setMultiModelResults, autoSelectFirstSuccess, setSelectedResults, setSelectedModelId, getSuccessCount, showSuccess]);

  // Batch analysis for multi-page documents with multi-model support
  const analyzeBatchText = useCallback(async (inputText: string, processBatches = false, addFirstPageToExisting = false) => {
    const result = await withLoading(async () => {
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
        // Find the model ID for the selected result
        const selectedModelIdEntry = Object.entries(results).find(
          ([_, result]) => result.results === firstSuccessResult
        );
        if (selectedModelIdEntry) {
          setSelectedModelId(selectedModelIdEntry[0]);
        }
      }
      
      return results;
    });

    if (!result) {
      setError('Batch analysis failed');
    }
  }, [selectedModelIds, analyzeSingleModel, withLoading, processBatchText, processingStep, setProcessingStep, setBatchProgress, setMultiModelResults, autoSelectFirstSuccess, setSelectedResults, setSelectedModelId, setError]);




  const validateAndFixRelations = useCallback(async (validationIssues: any[]) => {
    try {
      if (!selectedResults || validationIssues.length === 0) {
        setError('No results available for fixing relations');
        return;
      }

      if (!selectedModelId) {
        setError('No selected model found for fixing relations');
        return;
      }

      const result = await withLoading(async () => {
        setProcessingStep('Fixing entity-relation matches...');
        setError('');
        
        const session = conversationService.getSession(selectedModelId, selectedModelId, systemPrompt);
        
        const entityList = selectedResults.entities.map(e => `- ${e.name}`).join('\n');
        const issuesList = validationIssues.map(issue => `- "${issue.endpoint}"`).join('\n');

        const prompt = replaceTemplateVars(validationPrompt, {
          '${entityList}': entityList,
          '${validationIssues}': issuesList
        });

        const response = await session.sendMessage(prompt, modelOptions, undefined, timeout);
        
        if (!response?.data?.message) {
          throw new Error('Invalid response from LLM service for validation');
        }


        const responseText = response.data.message;
        
        // Parse JSON response with proper error handling
        let parsedResult;
        try {
          const cleanedResponse = responseText.trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '');
          
          const jsonStart = cleanedResponse.indexOf('{');
          const jsonEnd = cleanedResponse.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            parsedResult = JSON.parse(jsonStr);
          } else {
            parsedResult = JSON.parse(cleanedResponse);
          }
        } catch (parseError) {
          throw new Error(`Failed to parse validation response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        let updatedRelations = [...selectedResults.relations];
        let fixCount = 0;

        // Process renamings
        if (parsedResult?.renamings && Array.isArray(parsedResult.renamings)) {
          parsedResult.renamings.forEach((renaming: any) => {
            if (renaming.oldName && renaming.newName) {
              const { oldName, newName } = renaming;
              updatedRelations = updatedRelations.map(relation => ({
                ...relation,
                source: relation.source === oldName ? newName : relation.source,
                target: relation.target === oldName ? newName : relation.target
              }));
              fixCount++;
            }
          });
        }

        // Process deletions
        if (parsedResult?.deletions && Array.isArray(parsedResult.deletions)) {
          parsedResult.deletions.forEach((deletionName: string) => {
            if (deletionName) {
              updatedRelations = updatedRelations.filter(relation => 
                relation.source !== deletionName && relation.target !== deletionName
              );
              fixCount++;
            }
          });
        }

        // Update the selected results with fixed relations
        const updatedResults = {
          ...selectedResults,
          relations: updatedRelations
        };
        
        setSelectedResults(updatedResults);
        
        // Update the multi-model results as well
        const updatedMultiModelResults = {
          ...multiModelResults,
          [selectedModelId]: {
            ...multiModelResults[selectedModelId],
            results: updatedResults
          }
        };
        setMultiModelResults(updatedMultiModelResults);

        showSuccess(
          `Applied ${fixCount} fix(es) using ${selectedModelId.split(':')[0]}`,
          'Relations Fixed'
        );
        
        return updatedResults;
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Validation failed: ${errorMessage}`);
      console.error('Validation error:', error);
    }
  }, [selectedResults, selectedModelId, multiModelResults, systemPrompt, validationPrompt, modelOptions, timeout, withLoading, setProcessingStep, setError, replaceTemplateVars, setSelectedResults, setMultiModelResults, showSuccess]);

  // Abort all active LLM requests
  const abortAllRequests = useCallback(async () => {
    await conversationService.abortAllRequests();
    setError(''); // Clear any existing errors
  }, [setError]);

  return {
    processing,
    processingStep,
    results: selectedResults,
    multiModelResults,
    selectedModelId,
    error,
    batchProgress,
    analyzeText,
    analyzeBatchText,
    selectModelResult,
    performCausalQuery: (queryType: string, sourceVariable: string, targetVariable: string) => 
      performCausalQuery(selectedResults, queryType, sourceVariable, targetVariable),
    validateAndFixRelations,
    setResults: setSelectedResults,
    setError,
    abortAllRequests
  };
};

export default useMedicalAnalysis;