import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { Container, Stack, Loader, Center } from '@mantine/core';
import { useMedicalAnalysis } from '@/features/medical-analysis/analysis/hooks';
import { useModelManagement } from '@/features/medical-analysis/llm-config/hooks';
import { useDataExport } from '@/features/medical-analysis/results/hooks';
import { useFileUpload } from '@/features/medical-analysis/input/hooks';
import { usePromptContext } from '@/features/medical-analysis/prompts';
import { IModelOptions } from '@root/server/src/interfaces';

import { TextInput } from '@/features/medical-analysis/input/components';
import { AnalysisHeader } from './AnalysisHeader';
import { ModelConfigurationPanel } from '@/features/medical-analysis/llm-config/components';
import { ErrorBoundary } from '@/shared/components';
import { validateEntityRelationMatching } from '@/features/medical-analysis/analysis/utils';

// Lazy load heavy analysis components
const MultiModelResultsPanel = React.lazy(() => import('@/features/medical-analysis/results/components/MultiModelResultsPanel').then(module => ({ default: module.MultiModelResultsPanel })));
const AnalysisResultsPanel = React.lazy(() => import('@/features/medical-analysis/results/components/AnalysisResultsPanel').then(module => ({ default: module.AnalysisResultsPanel })));

export const MedicalCausalAnalyzer: React.FC = React.memo(() => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('entities');
  const [error, setError] = useState('');
  const [parametersOpen, setParametersOpen] = useState(false);

  const [timeout, setTimeout] = useState(300000);
  const [modelOptions, setModelOptions] = useState<IModelOptions>({
    stream: true,
    // Use undefined to let each LLM provider use their own defaults
    temperature: undefined,
    top_p: undefined,
    presence_penalty: undefined,
    frequency_penalty: undefined,
    seed: undefined,
  });

  // Custom hooks for state management
  const { models, selectedModels, modelsLoading, handleModelsChange } = useModelManagement();
  const { uploadedFile, handleFileUpload } = useFileUpload();
  const {
    systemPrompt,
    entityPrompt,
    relationPrompt,
    probabilityPrompt,
    entityMergePrompt,
    relationMergePrompt,
    probabilityMergePrompt,
    validationPrompt
  } = usePromptContext();
  const { exportEntities, exportRelations, exportDAG } = useDataExport();

  const {
    processing,
    processingStep,
    results,
    multiModelResults,
    selectedModelId,
    error: analysisError,
    batchProgress,
    analyzeText,
    analyzeBatchText,
    selectModelResult,
    performCausalQuery,
    validateAndFixRelations,
    abortAllRequests
  } = useMedicalAnalysis(selectedModels, timeout, systemPrompt, entityPrompt, relationPrompt, probabilityPrompt, entityMergePrompt, relationMergePrompt, probabilityMergePrompt, validationPrompt, modelOptions);


  // File upload handler
  const onFileUpload = useCallback((file: File | null) => {
    handleFileUpload(file, setInputText, setError);
  }, [handleFileUpload]);

  // Analysis handlers
  const handleAnalyze = useCallback((addToExisting?: boolean) => {
    analyzeText(inputText, addToExisting || false);
  }, [analyzeText, inputText]);

  const handleAnalyzeBatch = useCallback((processBatches: boolean, addFirstPageToExisting?: boolean) => {
    analyzeBatchText(inputText, processBatches, addFirstPageToExisting);
  }, [analyzeBatchText, inputText]);

  // Export handlers
  const handleExportEntities = useCallback(() => {
    if (results) exportEntities(results.entities);
  }, [results, exportEntities]);

  const handleExportRelations = useCallback(() => {
    if (results) exportRelations(results.relations);
  }, [results, exportRelations]);

  const handleExportDAG = useCallback(() => {
    if (results) exportDAG(results);
  }, [results, exportDAG]);

  // Validation logic (simplified)
  const validationIssues = useMemo(() => {
    return results ? validateEntityRelationMatching(results.entities, results.relations) : [];
  }, [results]);

  // Parameter panel handlers
  const handleParametersChange = useCallback((newOptions: IModelOptions & { timeout?: number }) => {
    const { timeout: newTimeout, ...restOptions } = newOptions;
    if (newTimeout !== undefined) {
      setTimeout(newTimeout);
    }
    setModelOptions(restOptions);
  }, []);

  const handleParametersToggle = useCallback(() => {
    setParametersOpen(!parametersOpen);
  }, [parametersOpen]);

  // Combined error display
  const displayError = error || analysisError;


  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <AnalysisHeader />

        <ModelConfigurationPanel
          models={models}
          selectedModels={selectedModels}
          onModelsChange={handleModelsChange}
          modelsLoading={modelsLoading}
          modelOptions={modelOptions}
          timeout={timeout}
          onParametersChange={handleParametersChange}
          parametersOpen={parametersOpen}
          onParametersToggle={handleParametersToggle}
        />

        {/* Input Section */}
        <TextInput
          inputText={inputText}
          onTextChange={setInputText}
          onFileUpload={onFileUpload}
          onAnalyze={handleAnalyze}
          onAnalyzeBatch={handleAnalyzeBatch}
          onStop={abortAllRequests}
          processing={processing}
          processingStep={processingStep}
          error={displayError}
          batchProgress={batchProgress}
          uploadedFile={uploadedFile}
          hasExistingResults={!!results}
        />

        {/* Multi-Model Results Panel */}
        {Object.keys(multiModelResults).length > 1 && (
          <ErrorBoundary>
            <Suspense fallback={<Center p="xl"><Loader size="md" /></Center>}>
              <MultiModelResultsPanel
                multiModelResults={multiModelResults}
                models={models}
                selectedModelId={selectedModelId ?? undefined}
                onSelectResult={selectModelResult}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {results && (
          <ErrorBoundary>
            <Suspense fallback={<Center p="xl"><Loader size="md" /></Center>}>
              <AnalysisResultsPanel
                results={results}
                validationIssues={validationIssues}
                activeTab={activeTab}
                processing={processing}
                onSetActiveTab={setActiveTab}
                onFixRelations={validateAndFixRelations}
                onExportEntities={handleExportEntities}
                onExportRelations={handleExportRelations}
                onExportDAG={handleExportDAG}
                onQueryExecute={performCausalQuery}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </Stack>
    </Container>
  );
});