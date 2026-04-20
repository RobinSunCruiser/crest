import React, { useCallback } from 'react';
import { 
  Paper, 
  Text, 
  NumberInput, 
  Stack, 
  Group, 
  Collapse,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { IModelOptions } from '@root/server/src/interfaces';

interface LLMParametersPanelProps {
  modelOptions: IModelOptions & { timeout?: number };
  onOptionsChange: (options: IModelOptions & { timeout?: number }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const LLMParametersPanel: React.FC<LLMParametersPanelProps> = React.memo(({
  modelOptions,
  onOptionsChange,
  isOpen,
  onToggle
}) => {
  const handleParameterChange = useCallback((key: keyof (IModelOptions & { timeout?: number }), value: number | undefined) => {
    onOptionsChange({
      ...modelOptions,
      [key]: value
    });
  }, [modelOptions, onOptionsChange]);

  return (
    <Paper withBorder p="sm" bg="gray.0">
      <Group justify="space-between" mb={isOpen ? "sm" : 0}>
        <Group gap="xs">
          <Settings size={16} />
          <Text size="sm" fw={500}>
            LLM Parameters
          </Text>
        </Group>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={onToggle}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </ActionIcon>
      </Group>
      
      <Collapse in={isOpen}>
        <Stack gap="sm">
          <Group grow>
            <Tooltip label="Controls randomness. Higher = more creative, lower = more focused. Note: Anthropic supports 0-1.0 only">
              <NumberInput
                label="Temperature"
                value={modelOptions.temperature}
                onChange={(value) => handleParameterChange('temperature', typeof value === 'number' ? value : undefined)}
                min={0}
                max={2}
                step={0.1}
                decimalScale={1}
                size="xs"
              />
            </Tooltip>

            <Tooltip label="Nuclear sampling (0.0-1.0). Controls diversity. Don't use with temperature for Anthropic">
              <NumberInput
                label="Top P"
                value={modelOptions.top_p}
                onChange={(value) => handleParameterChange('top_p', typeof value === 'number' ? value : undefined)}
                min={0}
                max={1}
                step={0.1}
                decimalScale={1}
                size="xs"
              />
            </Tooltip>
          </Group>

          <Group grow>
            <Tooltip label="Reduces repetition. Note: Not supported by Anthropic. Perplexity requires ≥ 0">
              <NumberInput
                label="Presence Penalty"
                value={modelOptions.presence_penalty}
                onChange={(value) => handleParameterChange('presence_penalty', typeof value === 'number' ? value : undefined)}
                min={-2}
                max={2}
                step={0.1}
                decimalScale={1}
                size="xs"
              />
            </Tooltip>

            <Tooltip label="Reduces common words. Note: Not supported by Anthropic. Perplexity requires > 0">
              <NumberInput
                label="Frequency Penalty"
                value={modelOptions.frequency_penalty}
                onChange={(value) => handleParameterChange('frequency_penalty', typeof value === 'number' ? value : undefined)}
                min={-2}
                max={2}
                step={0.1}
                decimalScale={1}
                size="xs"
              />
            </Tooltip>
          </Group>

          <Group grow>
            <Tooltip label="Random seed for deterministic outputs. Note: Not supported by Anthropic/Perplexity">
              <NumberInput
                label="Seed"
                value={modelOptions.seed}
                onChange={(value) => handleParameterChange('seed', typeof value === 'number' ? value : undefined)}
                min={0}
                max={999999}
                step={1}
                size="xs"
              />
            </Tooltip>

            <Tooltip label="Request timeout (60-600 seconds). How long to wait for response">
              <NumberInput
                label="Timeout (ms)"
                value={modelOptions.timeout}
                onChange={(value) => handleParameterChange('timeout', typeof value === 'number' ? value : undefined)}
                min={60000}
                max={600000}
                step={10000}
                size="xs"
              />
            </Tooltip>
          </Group>
        </Stack>
      </Collapse>
    </Paper>
  );
});