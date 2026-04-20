import React, { useMemo } from 'react';
import { Card, Title, Text, Grid } from '@mantine/core';
import { type CausalAnalysisResults } from '@/features/medical-analysis/types';

interface DAGSummaryCardsProps {
  results: CausalAnalysisResults;
}

export const DAGSummaryCards: React.FC<DAGSummaryCardsProps> = React.memo(({ results }) => {
  // Get dynamic grouping fields from entities
  const entityGroups = useMemo(() => {
    const groupingField = ['type', 'category', 'kind', 'class'].find(field =>
      results.entities.some(e => e[field])
    );
    
    if (!groupingField) return [];
    
    const groups = Array.from(new Set(
      results.entities.map(e => e[groupingField]).filter(Boolean)
    ));
    
    return groups.map(group => ({
      name: group,
      count: results.entities.filter(e => e[groupingField] === group).length
    }));
  }, [results.entities]);

  return (
    <Grid>
      <Grid.Col span={6}>
        <Card withBorder p="md" bg="blue.0">
          <Title order={5} mb="sm" c="blue.8">Entities Summary</Title>
          <Text size="sm" c="blue.7">Total Entities: {results.entities.length}</Text>
          {entityGroups.map(group => (
            <Text key={group.name} size="sm" c="blue.7">
              {group.name.charAt(0).toUpperCase() + group.name.slice(1).toLowerCase()}: {group.count}
            </Text>
          ))}
        </Card>
      </Grid.Col>
      <Grid.Col span={6}>
        <Card withBorder p="md" bg="green.0">
          <Title order={5} mb="sm" c="green.8">Relations Summary</Title>
          <Text size="sm" c="green.7">Total Relations: {results.relations.length}</Text>
          <Text size="sm" c="green.7">
            Directed: {results.relations.filter(r => r.directed).length}
          </Text>
          <Text size="sm" c="green.7">
            Undirected: {results.relations.filter(r => !r.directed).length}
          </Text>
        </Card>
      </Grid.Col>
    </Grid>
  );
});