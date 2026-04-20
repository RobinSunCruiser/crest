/**
 * GraphComparisonPage Component
 *
 * Main page component for the Graph Comparison Tool.
 * Displays side-by-side graph visualizations with GED metrics.
 */

import React, { useState } from 'react';
import { Container, Title, Card, Text, Group, Button, Stack, FileButton, Badge } from '@mantine/core';
import { Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGraphComparison } from '../hooks';
import { GraphVisualization } from './GraphVisualization';
import { NodeOperationsModal } from './NodeOperationsModal';
import { GEDMetricsDisplay } from '../metrics/ged';

export const GraphComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    goldData,
    testData,
    gedResults,
    goldSkippedNodes,
    goldSkippedRelations,
    goldBridgedEdges,
    testSkippedNodes,
    testSkippedRelations,
    testBridgedEdges,
    nodeMappings,
    setGoldData,
    setTestData,
    handleFileUpload,
    toggleNodeSkip,
    toggleRelationSkip,
    setNodeMapping,
    removeNodeMapping,
    clearAllNodeMappings,
  } = useGraphComparison();

  const [selectedTestNode, setSelectedTestNode] = useState<string | null>(null);
  const [selectedGoldNode, setSelectedGoldNode] = useState<string | null>(null);

  // Handle node clicks
  const handleTestNodeClick = (nodeName: string) => {
    setSelectedTestNode(nodeName);
  };

  const handleGoldNodeClick = (nodeName: string) => {
    setSelectedGoldNode(nodeName);
  };

  // Handle edge clicks
  const handleEdgeClick = (source: string, target: string, isGold: boolean) => {
    toggleRelationSkip(source, target, isGold);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
              Back to Analysis
            </Button>
            <Title order={2}>Graph Comparison Tool</Title>
          </Group>
        </Group>

        <Text size="sm" c="dimmed">
          Compare two causal graphs using Graph Edit Distance (GED) metrics. Upload graphs, skip nodes/edges, and
          map nodes for semantic equivalence.
        </Text>

        {/* Graph Visualizations */}
        <Stack gap="md">
          {/* Gold Graph */}
          <Card withBorder shadow="sm" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Group>
                  <Text fw={700} size="lg">
                    🏆 Gold Standard
                  </Text>
                </Group>
                <FileButton onChange={(file) => file && handleFileUpload(file, setGoldData)} accept=".json">
                  {(props) => (
                    <Button {...props} size="xs" leftSection={<Upload size={14} />} variant="light" color="yellow">
                      Upload
                    </Button>
                  )}
                </FileButton>
              </Group>

              <Text size="xs" c="dimmed">
                <strong>Click:</strong> nodes to skip, edges to remove •{' '}
                <Text span c="blue">
                  <strong>Blue:</strong> bridged
                </Text>
              </Text>

              {goldData && (
                <GraphVisualization
                  data={goldData}
                  graphType="gold"
                  skippedNodes={goldSkippedNodes}
                  skippedRelations={goldSkippedRelations}
                  bridgedEdges={goldBridgedEdges}
                  onNodeClick={handleGoldNodeClick}
                  onEdgeClick={(source, target) => handleEdgeClick(source, target, true)}
                />
              )}

              {goldData && (
                <Stack gap="xs">
                  <Group gap="xs" justify="space-between">
                    <Text size="xs" c="dimmed">
                      <strong>Nodes:</strong> {goldData.entities.length}
                    </Text>
                    <Text size="xs" c="dimmed">
                      <strong>Edges:</strong> {goldData.relations.length}
                    </Text>
                  </Group>

                  {/* Skipped Nodes */}
                  {goldSkippedNodes.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="red">
                        Skipped Nodes ({goldSkippedNodes.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(goldSkippedNodes).map((node) => (
                          <Badge
                            key={node}
                            size="sm"
                            color="red"
                            variant="light"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleNodeSkip(node, true)}
                          >
                            {node} ✕
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}

                  {/* Skipped Edges */}
                  {goldSkippedRelations.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="red">
                        Skipped Edges ({goldSkippedRelations.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(goldSkippedRelations).map((edgeKey) => {
                          const [source, target] = edgeKey.split('→');
                          return (
                            <Badge
                              key={edgeKey}
                              size="sm"
                              color="red"
                              variant="light"
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleRelationSkip(source, target, true)}
                            >
                              {source} → {target} ✕
                            </Badge>
                          );
                        })}
                      </Group>
                    </Stack>
                  )}

                  {/* Bridged Edges */}
                  {goldBridgedEdges.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="blue">
                        Bridged Edges ({goldBridgedEdges.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(goldBridgedEdges).map((edgeKey) => {
                          const [source, target] = edgeKey.split('→');
                          return (
                            <Badge key={edgeKey} size="sm" color="blue" variant="light">
                              {source} → {target}
                            </Badge>
                          );
                        })}
                      </Group>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Test Graph */}
          <Card withBorder shadow="sm" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Group>
                  <Text fw={700} size="lg">
                    🧪 Test / Predicted
                  </Text>
                </Group>
                <FileButton onChange={(file) => file && handleFileUpload(file, setTestData)} accept=".json">
                  {(props) => (
                    <Button {...props} size="xs" leftSection={<Upload size={14} />} variant="light" color="blue">
                      Upload
                    </Button>
                  )}
                </FileButton>
              </Group>

              <Text size="xs" c="dimmed">
                <strong>Click:</strong> nodes for options, edges to remove •{' '}
                <Text span c="blue">
                  <strong>Blue:</strong> bridged
                </Text>
              </Text>

              {testData && (
                <GraphVisualization
                  data={testData}
                  graphType="test"
                  skippedNodes={testSkippedNodes}
                  skippedRelations={testSkippedRelations}
                  bridgedEdges={testBridgedEdges}
                  nodeMappings={nodeMappings}
                  onNodeClick={handleTestNodeClick}
                  onEdgeClick={(source, target) => handleEdgeClick(source, target, false)}
                />
              )}

              {testData && (
                <Stack gap="xs">
                  <Group gap="xs" justify="space-between">
                    <Text size="xs" c="dimmed">
                      <strong>Nodes:</strong> {testData.entities.length}
                    </Text>
                    <Text size="xs" c="dimmed">
                      <strong>Edges:</strong> {testData.relations.length}
                    </Text>
                  </Group>

                  {/* Node Mappings */}
                  {Object.keys(nodeMappings).length > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="blue">
                        Node Mappings ({Object.keys(nodeMappings).length}):
                      </Text>
                      <Group gap="xs">
                        {Object.entries(nodeMappings).map(([testNode, goldNode]) => (
                          <Badge
                            key={testNode}
                            size="sm"
                            color="blue"
                            variant="light"
                            style={{ cursor: 'pointer' }}
                            onClick={() => removeNodeMapping(testNode)}
                          >
                            {testNode} → {goldNode} ✕
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}

                  {/* Skipped Nodes */}
                  {testSkippedNodes.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="red">
                        Skipped Nodes ({testSkippedNodes.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(testSkippedNodes).map((node) => (
                          <Badge
                            key={node}
                            size="sm"
                            color="red"
                            variant="light"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleNodeSkip(node, false)}
                          >
                            {node} ✕
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}

                  {/* Skipped Edges */}
                  {testSkippedRelations.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="red">
                        Skipped Edges ({testSkippedRelations.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(testSkippedRelations).map((edgeKey) => {
                          const [source, target] = edgeKey.split('→');
                          return (
                            <Badge
                              key={edgeKey}
                              size="sm"
                              color="red"
                              variant="light"
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleRelationSkip(source, target, false)}
                            >
                              {source} → {target} ✕
                            </Badge>
                          );
                        })}
                      </Group>
                    </Stack>
                  )}

                  {/* Bridged Edges */}
                  {testBridgedEdges.size > 0 && (
                    <Stack gap={4}>
                      <Text size="xs" fw={600} c="blue">
                        Bridged Edges ({testBridgedEdges.size}):
                      </Text>
                      <Group gap="xs">
                        {Array.from(testBridgedEdges).map((edgeKey) => {
                          const [source, target] = edgeKey.split('→');
                          return (
                            <Badge key={edgeKey} size="sm" color="blue" variant="light">
                              {source} → {target}
                            </Badge>
                          );
                        })}
                      </Group>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        </Stack>

        {/* GED Metrics */}
        {gedResults && (
          <GEDMetricsDisplay
            results={gedResults}
            nodeMappings={nodeMappings}
            onClearAllMappings={clearAllNodeMappings}
            onRemoveMapping={removeNodeMapping}
          />
        )}
      </Stack>

      {/* Modals */}
      {selectedTestNode && goldData && (
        <NodeOperationsModal
          nodeName={selectedTestNode}
          graphType="test"
          isSkipped={testSkippedNodes.has(selectedTestNode)}
          goldData={goldData}
          currentMapping={nodeMappings[selectedTestNode]}
          onClose={() => setSelectedTestNode(null)}
          onSkipToggle={() => {
            toggleNodeSkip(selectedTestNode, false);
            setSelectedTestNode(null);
          }}
          onMapNode={(goldNode: string) => {
            setNodeMapping(selectedTestNode, goldNode);
            setSelectedTestNode(null);
          }}
          onRemoveMapping={() => {
            removeNodeMapping(selectedTestNode);
            setSelectedTestNode(null);
          }}
        />
      )}

      {selectedGoldNode && (
        <NodeOperationsModal
          nodeName={selectedGoldNode}
          graphType="gold"
          isSkipped={goldSkippedNodes.has(selectedGoldNode)}
          onClose={() => setSelectedGoldNode(null)}
          onSkipToggle={() => {
            toggleNodeSkip(selectedGoldNode, true);
            setSelectedGoldNode(null);
          }}
        />
      )}
    </Container>
  );
};
