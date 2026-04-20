/**
 * GEDMetricsDisplay Component
 *
 * Displays Graph Edit Distance metrics and analysis results.
 */

import React, { useState } from 'react';
import { Card, Title, Grid, Text, Stack, Badge, Group, Alert, Collapse, Button } from '@mantine/core';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { NodeMappings } from '../../types';
import { GEDResults } from './types';

interface GEDMetricsDisplayProps {
  results: GEDResults;
  nodeMappings: NodeMappings;
  onClearAllMappings: () => void;
  onRemoveMapping: (testNode: string) => void;
}

export const GEDMetricsDisplay: React.FC<GEDMetricsDisplayProps> = ({
  results,
  nodeMappings,
  onClearAllMappings,
  onRemoveMapping,
}) => {
  const [showMissingNodes, setShowMissingNodes] = useState(true);
  const [showExtraNodes, setShowExtraNodes] = useState(true);
  const [showDeletedEdges, setShowDeletedEdges] = useState(true);
  const [showInsertedEdges, setShowInsertedEdges] = useState(true);
  const [showSubstitutedEdges, setShowSubstitutedEdges] = useState(true);
  const [showCorrectEdges, setShowCorrectEdges] = useState(false);

  return (
    <Card withBorder shadow="sm" padding="lg">
      <Stack gap="lg">
        <Title order={3}>📊 Graph Edit Distance Analysis</Title>

        {/* Summary Metrics */}
        <Grid>
          <Grid.Col span={3}>
            <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: '#eff6ff' }}>
              <Text size="xl" fw={700} c="blue">
                {results.ged}
              </Text>
              <Text size="sm" fw={600} c="blue" mt={4}>
                GED Score
              </Text>
              <Text size="xs" c="dimmed">
                Edit Operations
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: '#faf5ff' }}>
              <Text size="xl" fw={700} c="violet">
                {results.normalizedGED}%
              </Text>
              <Text size="sm" fw={600} c="violet" mt={4}>
                Normalized GED
              </Text>
              <Text size="xs" c="dimmed">
                Percentage Difference
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: '#f0fdf4' }}>
              <Text size="xl" fw={700} c="green">
                {results.structuralSimilarity}%
              </Text>
              <Text size="sm" fw={600} c="green" mt={4}>
                Similarity
              </Text>
              <Text size="xs" c="dimmed">
                How Similar
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={3}>
            <Card withBorder p="md" style={{ textAlign: 'center', backgroundColor: '#fffbeb' }}>
              <Text size="xl" fw={700} c="yellow">
                {results.f1Score}%
              </Text>
              <Text size="sm" fw={600} c="yellow" mt={4}>
                F1 Score
              </Text>
              <Text size="xs" c="dimmed">
                Overall Accuracy
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Detailed Metrics */}
        <Grid>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={700}>
                {results.precision}%
              </Text>
              <Text size="sm" c="dimmed">
                Precision
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={700}>
                {results.recall}%
              </Text>
              <Text size="sm" c="dimmed">
                Recall
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card withBorder p="sm" style={{ textAlign: 'center' }}>
              <Text size="lg" fw={700}>
                {results.totalGoldEdges}
              </Text>
              <Text size="sm" c="dimmed">
                Gold Edges
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Node Mappings */}
        {Object.keys(nodeMappings).length > 0 && (
          <Card withBorder p="md" style={{ backgroundColor: '#f0f9ff' }}>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  🔗 Node Mappings ({Object.keys(nodeMappings).length})
                </Text>
                <Button size="xs" color="red" variant="light" onClick={onClearAllMappings}>
                  Clear All
                </Button>
              </Group>
              <Group gap="xs">
                {Object.entries(nodeMappings).map(([testNode, goldNode]) => (
                  <Badge key={testNode} size="lg" color="blue" variant="light">
                    {testNode} → {goldNode}
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      ml="xs"
                      onClick={() => onRemoveMapping(testNode)}
                      style={{ padding: '0 4px', height: '16px', minHeight: '16px' }}
                    >
                      ✕
                    </Button>
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Card>
        )}

        {/* Detailed Results */}
        <Stack gap="md">
          <Text fw={600} size="md">
            Detailed Analysis Results
          </Text>

          {/* Missing Nodes (Node Deletions) */}
          {results.missingNodesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#fef2f2' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="red">
                      ❌ Missing Nodes ({results.missingNodesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Nodes in Gold but not in Test
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => setShowMissingNodes(!showMissingNodes)}
                    rightSection={showMissingNodes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showMissingNodes ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showMissingNodes}>
                  <Group gap="xs">
                    {results.missingNodesList.map((node) => (
                      <Badge key={node} size="md" color="red" variant="light">
                        {node}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}

          {/* Extra Nodes (Node Insertions) */}
          {results.extraNodesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#fff7ed' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="orange">
                      ➕ Extra Nodes ({results.extraNodesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Nodes in Test but not in Gold
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="orange"
                    onClick={() => setShowExtraNodes(!showExtraNodes)}
                    rightSection={showExtraNodes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showExtraNodes ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showExtraNodes}>
                  <Group gap="xs">
                    {results.extraNodesList.map((node) => (
                      <Badge key={node} size="md" color="orange" variant="light">
                        {node}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}

          {/* Deleted Edges */}
          {results.deletedEdgesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#fef2f2' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="red">
                      ❌ Missing Edges ({results.deletedEdgesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edges in Gold but not in Test
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => setShowDeletedEdges(!showDeletedEdges)}
                    rightSection={showDeletedEdges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showDeletedEdges ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showDeletedEdges}>
                  <Group gap="xs">
                    {results.deletedEdgesList.map((edge, idx) => (
                      <Badge key={idx} size="md" color="red" variant="light">
                        {edge.source} → {edge.target}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}

          {/* Inserted Edges */}
          {results.insertedEdgesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#fff7ed' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="orange">
                      ➕ Extra Edges ({results.insertedEdgesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edges in Test but not in Gold
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="orange"
                    onClick={() => setShowInsertedEdges(!showInsertedEdges)}
                    rightSection={showInsertedEdges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showInsertedEdges ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showInsertedEdges}>
                  <Group gap="xs">
                    {results.insertedEdgesList.map((edge, idx) => (
                      <Badge key={idx} size="md" color="orange" variant="light">
                        {edge.source} → {edge.target}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}

          {/* Substituted Edges */}
          {results.substitutedEdgesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#faf5ff' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="violet">
                      🔄 Modified Edges ({results.substitutedEdgesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edges with changed properties
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="violet"
                    onClick={() => setShowSubstitutedEdges(!showSubstitutedEdges)}
                    rightSection={showSubstitutedEdges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showSubstitutedEdges ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showSubstitutedEdges}>
                  <Group gap="xs">
                    {results.substitutedEdgesList.map((edge, idx) => (
                      <Badge key={idx} size="md" color="violet" variant="light">
                        {edge.source} → {edge.target}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}

          {/* Correct Edges */}
          {results.correctEdgesList.length > 0 && (
            <Card withBorder p="md" style={{ backgroundColor: '#f0fdf4' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600} size="sm" c="green">
                      ✓ Correct Edges ({results.correctEdgesList.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      Edges that match between Gold and Test
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="green"
                    onClick={() => setShowCorrectEdges(!showCorrectEdges)}
                    rightSection={showCorrectEdges ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {showCorrectEdges ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                <Collapse in={showCorrectEdges}>
                  <Group gap="xs">
                    {results.correctEdgesList.map((edge, idx) => (
                      <Badge key={idx} size="md" color="green" variant="light">
                        {edge.source} → {edge.target}
                      </Badge>
                    ))}
                  </Group>
                </Collapse>
              </Stack>
            </Card>
          )}
        </Stack>

        {/* Interpretation */}
        <Alert icon={<Info size={16} />} color="blue" variant="light">
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Understanding Graph Edit Distance (GED)
            </Text>
            <Text size="xs">
              <strong>GED = {results.ged}:</strong> Minimum number of edit operations needed to transform test graph
              into gold graph.
            </Text>
            {Object.keys(nodeMappings).length > 0 && (
              <Text size="xs" c="green">
                <strong>✓ Node Mappings Applied:</strong> {Object.keys(nodeMappings).length} test node(s) have been
                mapped to gold nodes.
              </Text>
            )}
            <Text size="xs">
              <strong>Perfect Match:</strong> GED = 0 means graphs are structurally identical with exact node and edge
              matches.
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Card>
  );
};
