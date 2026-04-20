import React from 'react';
import { Stack } from '@mantine/core';
import { ModelSelector } from '@/features/medical-analysis/llm-config/components/ModelSelector';
import { LLMParametersPanel } from '@/features/medical-analysis/llm-config/components/LLMParametersPanel';
import { IModelOptions } from '@root/server/src/interfaces';

interface ModelConfigurationPanelProps {
  models: any[];
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  modelsLoading: boolean;
  modelOptions: IModelOptions;
  timeout: number;
  onParametersChange: (options: IModelOptions & { timeout?: number }) => void;
  parametersOpen: boolean;
  onParametersToggle: () => void;
}

export const ModelConfigurationPanel: React.FC<ModelConfigurationPanelProps> = React.memo(({
  models,
  selectedModels,
  onModelsChange,
  modelsLoading,
  modelOptions,
  timeout,
  onParametersChange,
  parametersOpen,
  onParametersToggle,
}) => {
  return (
    <Stack gap="md">
      <ModelSelector
        models={models}
        selectedModels={selectedModels}
        onModelsChange={onModelsChange}
        loading={modelsLoading}
      />

      <LLMParametersPanel
        modelOptions={{ ...modelOptions, timeout }}
        onOptionsChange={onParametersChange}
        isOpen={parametersOpen}
        onToggle={onParametersToggle}
      />
    </Stack>
  );
});