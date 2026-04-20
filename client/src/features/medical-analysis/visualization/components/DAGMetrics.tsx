import React from 'react';
import { Card, Title, Text, Grid } from '@mantine/core';
import type { CausalAnalysisResults } from '@/features/medical-analysis/types';

interface DAGMetricsProps {
  results: CausalAnalysisResults;
}

export const DAGMetrics: React.FC<DAGMetricsProps> = React.memo(({ results }) => {
  if (!results.metrics) return null;

  const { dagValidation } = results.metrics;

  return (
    <Card withBorder mb="lg" p="md" bg="blue.0">
      <Title order={5} mb="sm">DAG Analysis:</Title>
      <Grid>
        <Grid.Col span={3}>
          <Text size="sm">
            <strong>Nodes:</strong> {dagValidation?.nodes || results.entities.length}
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm">
            <strong>Edges:</strong> {dagValidation?.edges || results.relations.length}
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm">
            <strong>Acyclic:</strong> {dagValidation?.isAcyclic ? 'Yes' : 'No'}
          </Text>
        </Grid.Col>
        <Grid.Col span={3}>
          <Text size="sm">
            <strong>Cycles:</strong> {dagValidation?.cycles?.length || 0}
          </Text>
        </Grid.Col>
      </Grid>
    </Card>
  );
});