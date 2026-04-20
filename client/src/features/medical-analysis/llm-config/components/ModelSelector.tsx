import React, { useMemo, useCallback } from 'react';
import { MultiSelect, Text, Box, Stack } from '@mantine/core';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';

interface ModelSelectorProps {
  models: IModelInfo[];
  selectedModels: string[];
  onModelsChange: (modelIds: string[]) => void;
  loading?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModels,
  onModelsChange,
  loading = false
}) => {
  // Group models by adapter for better organization
  const modelsByAdapter = useMemo(() => {
    const grouped: Record<string, IModelInfo[]> = {};
    models.forEach(model => {
      if (!grouped[model.adapterID]) {
        grouped[model.adapterID] = [];
      }
      grouped[model.adapterID].push(model);
    });
    return grouped;
  }, [models]);

  // Create grouped options for MultiSelect
  const modelOptions = useMemo(() => {
    const groupedData: Array<{ group: string; items: Array<{ value: string; label: string }> }> = [];
    
    // Sort providers alphabetically
    const sortedProviders = Object.keys(modelsByAdapter).sort();
    
    sortedProviders.forEach(providerId => {
      const providerModels = modelsByAdapter[providerId];
      const providerName = providerId;
      
      // Sort models within each provider
      const sortedModels = providerModels
        .sort((a, b) => a.model.localeCompare(b.model))
        .map(model => ({
          value: model.id,
          label: model.model
        }));
      
      groupedData.push({
        group: providerName,
        items: sortedModels
      });
    });
    
    return groupedData;
  }, [modelsByAdapter]);


  const handleModelsChange = useCallback((modelIds: string[]) => {
    onModelsChange(modelIds);
  }, [onModelsChange]);


  return (
    <Box>
      <Text size="sm" fw={500} mb={8}>
        Select LLM Models for Analysis ({selectedModels.length} selected)
      </Text>
      
      <Stack gap="sm">
        <MultiSelect
          value={selectedModels}
          onChange={handleModelsChange}
          data={modelOptions}
          placeholder="Choose models from different providers..."
          disabled={loading || models.length === 0}
          searchable
          clearable
          size="md"
          maxDropdownHeight={400}
          styles={{
            dropdown: {
              overflowY: 'auto'
            },
            groupLabel: {
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--mantine-color-body)',
              zIndex: 10,
              fontWeight: 600,
              fontSize: '14px',
              padding: '8px 12px',
              borderBottom: '2px solid var(--mantine-color-blue-5)',
              marginBottom: '4px',
              marginTop: '8px',
              color: 'var(--mantine-color-blue-7)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }
          }}
        />
      </Stack>
      
      {models.length === 0 && !loading && (
        <Text size="xs" c="dimmed" mt={4}>
          No models available. Please check server connection.
        </Text>
      )}
      {loading && (
        <Text size="xs" c="dimmed" mt={4}>
          Loading models...
        </Text>
      )}
    </Box>
  );
};