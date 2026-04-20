import React, { useMemo } from 'react';
import { Card, Title, Text, Button, Group, Stack } from '@mantine/core';
import { Download } from 'lucide-react';
import { CausalRelation, ProbabilityEstimate } from '@/features/medical-analysis/types';
import { EFFECT_DIRECTION_CONFIG } from '@/features/medical-analysis/constants';

interface RelationsTableProps {
  relations: CausalRelation[];
  onExport: () => void;
}

const formatFieldName = (fieldName: string): string => {
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
};

export const RelationsTable: React.FC<RelationsTableProps> = React.memo(({ relations, onExport }) => {
  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Group justify="space-between" mb="lg">
        <Title order={3}>
          Causal Relations ({relations.length})
        </Title>
        <Button
          leftSection={<Download size={16} />}
          onClick={onExport}
          variant="outline"
        >
          Export CSV
        </Button>
      </Group>

      <Stack gap="md">
        {useMemo(() => relations.map((relation, index) => {
          // Get all fields except the core required ones and internal properties
          const coreFields = ['source', 'target', 'directed', 'textEvidence', 'probabilities'];
          const dynamicFields = Object.keys(relation).filter(
            key => !coreFields.includes(key) &&
                   relation[key] !== undefined &&
                   relation[key] !== null &&
                   relation[key] !== ''
          );

          return (
            <Card key={index} withBorder radius="sm" p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="lg">
                  {relation.source} {relation.directed ? '→' : '↔'} {relation.target}
                </Text>
                <Text size="sm" c="dimmed">
                  {relation.directed ? 'Directed' : 'Undirected'}
                </Text>
              </Group>

              {/* Dynamic fields display */}
              {dynamicFields.length > 0 && (
                <Stack gap="xs" mb="sm">
                  {dynamicFields.map(fieldName => {
                    const value = relation[fieldName];
                    if (typeof value === 'number' && fieldName.toLowerCase().includes('confidence')) {
                      return (
                        <Text key={fieldName} size="sm" c="dimmed">
                          <strong>{formatFieldName(fieldName)}:</strong> {(value * 100).toFixed(0)}%
                        </Text>
                      );
                    }
                    return (
                      <Text key={fieldName} size="sm" c="dimmed">
                        <strong>{formatFieldName(fieldName)}:</strong> {String(value)}
                      </Text>
                    );
                  })}
                </Stack>
              )}

              {/* Probability estimates display */}
              {relation.probabilities && Array.isArray(relation.probabilities) && relation.probabilities.length > 0 && (
                <Stack gap="xs" mb="sm">
                  <Text size="sm" c="dimmed" fw={600}>
                    Probability Estimates ({relation.probabilities.length}):
                  </Text>
                  {relation.probabilities.map((prob: ProbabilityEstimate, idx: number) => {
                    // Get effect config from centralized configuration
                    const effectConfig = EFFECT_DIRECTION_CONFIG[prob.effectDirection as keyof typeof EFFECT_DIRECTION_CONFIG] || EFFECT_DIRECTION_CONFIG.neutral;

                    return (
                      <Card key={idx} withBorder radius="xs" p="xs" bg="gray.0">
                        <Text size="xs" c="dimmed">
                          <strong>Value:</strong> {(prob.value * 100).toFixed(1)}%
                        </Text>
                        <Text size="xs" c="dimmed">
                          <strong>Effect:</strong>{' '}
                          <Text span c={effectConfig.color} inherit>
                            {effectConfig.symbol} {effectConfig.label}
                          </Text>
                        </Text>
                        <Text size="xs" c="dimmed">
                          <strong>Source:</strong> {prob.source}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                          <strong>Evidence:</strong> "{prob.textEvidence}"
                        </Text>
                      </Card>
                    );
                  })}
                </Stack>
              )}

              <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                <strong>Evidence:</strong> "{relation.textEvidence || 'No evidence provided'}"
              </Text>
            </Card>
          );
        }), [relations])}
      </Stack>
    </Card>
  );
});