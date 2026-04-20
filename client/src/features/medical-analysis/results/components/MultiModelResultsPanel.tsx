import React from 'react';
import { Card, Title, Text, Stack, Group, Button, Grid } from '@mantine/core';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';

interface MultiModelResult {
  results: CausalAnalysisResults | null;
  error?: string;
  processingTime: number;
  modelInfo?: { provider: string; model: string };
}

interface MultiModelResultsPanelProps {
  multiModelResults: Record<string, MultiModelResult>;
  models: Array<{ id: string; provider: string; model: string }>;
  selectedModelId?: string;
  onSelectResult: (modelId: string) => void;
}

export const MultiModelResultsPanel: React.FC<MultiModelResultsPanelProps> = ({
  multiModelResults,
  models,
  selectedModelId,
  onSelectResult
}) => {
  const getModelInfo = (modelId: string) => {
    return models.find(m => m.id === modelId) || { provider: 'Unknown', model: 'Unknown' };
  };


  const getStatusIcon = (result: MultiModelResult) => {
    if (result.results) return <CheckCircle size={16} color="green" />;
    if (result.error) return <XCircle size={16} color="red" />;
    return <Clock size={16} color="gray" />;
  };

  const sortedResults = Object.entries(multiModelResults).sort(([, a], [, b]) => {
    // Successful results first, then by model name
    if (a.results && !b.results) return -1;
    if (!a.results && b.results) return 1;
    return 0;
  });

  if (Object.keys(multiModelResults).length === 0) {
    return null;
  }

  return (
    <Card withBorder shadow="sm" radius="md" p="md">
      <Title order={4} mb="md">
        Multi-Model Results ({Object.keys(multiModelResults).length} models)
      </Title>

      <Grid>
        {sortedResults.map(([modelId, result]) => {
          const modelInfo = getModelInfo(modelId);
          const isSelected = selectedModelId === modelId;
          
          return (
            <Grid.Col span={4} key={modelId}>
              <Card 
                withBorder 
                radius="sm" 
                p="sm"
                style={{ 
                  borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
                  borderWidth: isSelected ? 2 : 1
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600} size="sm">
                        {modelInfo.provider}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {modelInfo.model}
                      </Text>
                    </div>
                    {getStatusIcon(result)}
                  </Group>

                  {result.results && (
                    <div>
                      <Text size="xs" c="dimmed" mb="xs">
                        {result.results.entities.length} entities, {result.results.relations.length} relations
                      </Text>
                      
                      <Button
                        size="xs"
                        variant={isSelected ? "filled" : "outline"}
                        onClick={() => onSelectResult(modelId)}
                        leftSection={isSelected ? <CheckCircle size={12} /> : <Zap size={12} />}
                        fullWidth
                      >
                        {isSelected ? 'Selected' : 'Use'}
                      </Button>
                    </div>
                  )}

                  {result.error && (
                    <Text size="xs" c="red" truncate>
                      Error: {result.error}
                    </Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>
    </Card>
  );
};