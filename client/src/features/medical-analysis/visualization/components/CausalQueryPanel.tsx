import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Title, Text, Select, Button, Alert, Grid, Badge } from '@mantine/core';
import { Search, Target } from 'lucide-react';
import { CausalAnalysisResults, QueryResults } from '@/features/medical-analysis/types';

interface CausalQueryPanelProps {
  results: CausalAnalysisResults;
  onQueryExecute: (queryType: string, source: string, target: string) => QueryResults | null;
}

export const CausalQueryPanel: React.FC<CausalQueryPanelProps> = React.memo(({ results, onQueryExecute }) => {
  const [queryType, setQueryType] = useState('association');
  const [sourceVariable, setSourceVariable] = useState('');
  const [targetVariable, setTargetVariable] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResults | null>(null);

  // Reset form when results change (when switching between different model results)
  useEffect(() => {
    setQueryType('association');
    setSourceVariable('');
    setTargetVariable('');
    setQueryResults(null);
  }, [results]);

  const handleQueryExecution = useCallback(() => {
    if (!sourceVariable || !targetVariable || sourceVariable === targetVariable) return;
    const result = onQueryExecute(queryType, sourceVariable, targetVariable);
    setQueryResults(result);
  }, [sourceVariable, targetVariable, queryType, onQueryExecute]);

  const entityOptions = useMemo(() => {
    if (!results || !results.entities || !Array.isArray(results.entities)) {
      return [];
    }
    
    return results.entities
      .filter(entity => entity && entity.name && entity.name.trim()) // Filter out invalid entities
      .map(entity => ({
        value: entity.name,
        label: entity.name
      }));
  }, [results]);

  const getQueryNotation = (type: string) => {
    const notations = {
      association: 'P(Y|X)',
      intervention: 'P(Y|do(X))', 
      counterfactual: 'P(Y_x|X\',Y\')'
    };
    return notations[type as keyof typeof notations];
  };

  const renderQueryResult = () => {
    if (!queryResults) return null;

    return (
      <Card withBorder mt="md" p="md" bg="gray.0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Text fw={600} size="sm">
            {getQueryNotation(queryResults.queryType)}: {queryResults.source} → {queryResults.target}
          </Text>
          <Badge color={queryResults.isIdentifiable ? 'green' : 'red'} size="sm">
            {queryResults.isIdentifiable ? 'Identifiable' : 'Not Identifiable'}
          </Badge>
        </div>

        {/* Rung-specific Analysis */}
        {queryResults.queryType === 'association' && (
          <Alert color="blue" p="sm" mb="sm">
            <Text size="xs" mb="xs">🔗 <strong>Rung 1: Association</strong></Text>
            <Text size="xs">Type: {queryResults.associationType}</Text>
            {queryResults.confoundingPresent && (
              <Text size="xs" c="orange">⚠️ Confounders: {queryResults.confounders.join(', ')}</Text>
            )}
          </Alert>
        )}

        {queryResults.queryType === 'intervention' && (
          <Alert color="green" p="sm" mb="sm">
            <Text size="xs" mb="xs">⚡ <strong>Rung 2: Intervention</strong></Text>
            <Text size="xs">Effect: {queryResults.causalEffect}</Text>
            {queryResults.backdoorCriterion && (
              <Text size="xs">
                Backdoor: {queryResults.backdoorCriterion.isBlocked ? '✅ Satisfied' : '❌ Blocked'} 
                ({queryResults.backdoorCriterion.totalBackdoorPaths} paths)
              </Text>
            )}
            {queryResults.requiredAdjustment && queryResults.requiredAdjustment.length > 0 && (
              <Text size="xs">Adjust for: {queryResults.requiredAdjustment.join(', ')}</Text>
            )}
          </Alert>
        )}

        {queryResults.queryType === 'counterfactual' && (
          <Alert color="grape" p="sm" mb="sm">
            <Text size="xs" mb="xs">🔄 <strong>Rung 3: Counterfactual</strong></Text>
            <Text size="xs">Structural Model: {queryResults.structuralModel}</Text>
            <Text size="xs">Individual Effect: {queryResults.individualEffect ? '✅ Estimable' : '❌ Not Estimable'}</Text>
          </Alert>
        )}

        {/* Direct Relationship - only if exists */}
        {queryResults.directRelation && (
          <Alert color="yellow" p="sm" mb="sm">
            <Text size="xs">
              <strong>Direct Link:</strong> {queryResults.directRelation.directed ? 'Directed' : 'Undirected'}
            </Text>
          </Alert>
        )}

        {/* Pearl's Recommendation */}
        <Text size="xs" fs="italic">{queryResults.recommendation}</Text>
      </Card>
    );
  };

  // Don't render if no valid entities are available
  if (entityOptions.length === 0) {
    return (
      <Card withBorder radius="md" p="md">
        <Title order={4} mb="md">
          <Target size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'text-bottom' }} />
          Pearl's Causal Hierarchy
        </Title>
        <Alert color="gray" p="sm">
          <Text size="sm">No entities available for causal queries. Please ensure your analysis results contain valid entities.</Text>
        </Alert>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="md">
      <Title order={4} mb="md">
        <Target size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'text-bottom' }} />
        Pearl's Causal Hierarchy
      </Title>

      <Grid mb="md">
        <Grid.Col span={4}>
          <Select
            label="Causal Rung"
            value={queryType}
            onChange={(value) => value && setQueryType(value)}
            data={[
              { value: 'association', label: `🔗 ${getQueryNotation('association')}` },
              { value: 'intervention', label: `⚡ ${getQueryNotation('intervention')}` },
              { value: 'counterfactual', label: `🔄 ${getQueryNotation('counterfactual')}` }
            ]}
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Source (X)"
            value={sourceVariable}
            onChange={(value) => value && setSourceVariable(value)}
            data={entityOptions}
            placeholder="Select X"
            searchable
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <Select
            label="Target (Y)"
            value={targetVariable}
            onChange={(value) => value && setTargetVariable(value)}
            data={entityOptions}
            placeholder="Select Y"
            searchable
            size="sm"
          />
        </Grid.Col>
      </Grid>

      <Button
        onClick={handleQueryExecution}
        disabled={!sourceVariable || !targetVariable || sourceVariable === targetVariable}
        fullWidth
        size="sm"
        leftSection={<Search size={14} />}
        variant="light"
      >
        Execute Query
      </Button>

      {renderQueryResult()}

      {/* Concise Framework Guide */}
      <Alert color="gray" p="sm" mt="md">
        <Text size="xs" mb="xs"><strong>Pearl's Three Rungs:</strong></Text>
        <Text size="xs">
          🔗 <strong>Association:</strong> Observational patterns P(Y|X)<br/>
          ⚡ <strong>Intervention:</strong> Active manipulation P(Y|do(X))<br/>
          🔄 <strong>Counterfactual:</strong> What-if scenarios P(Y_x|X',Y')
        </Text>
      </Alert>
    </Card>
  );
});