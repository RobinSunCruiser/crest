import React, { useRef } from 'react';
import { Card, Title, Button, Group, ScrollArea } from '@mantine/core';
import { Download, Network } from 'lucide-react';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { useD3Visualization } from '@/features/medical-analysis/visualization/hooks/useD3Visualization';
import { DAGMetrics } from './DAGMetrics';
import { DAGSummaryCards } from './DAGSummaryCards';

interface DAGVisualizationProps {
  results: CausalAnalysisResults;
  onExport: () => void;
}

export const DAGVisualization: React.FC<DAGVisualizationProps> = ({ results, onExport }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { createDAGVisualization } = useD3Visualization(svgRef, results);

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Group justify="space-between" mb="lg">
        <Title order={3}>
          <Network size={20} style={{ marginRight: 8, display: 'inline' }} />
          Causal DAG Visualization
        </Title>
        <Button
          leftSection={<Download size={16} />}
          onClick={onExport}
          variant="outline"
        >
          Export DAG
        </Button>
      </Group>

      <DAGMetrics results={results} />

      {/* Interactive D3.js Visualization */}
      <Card withBorder mb="lg" p="md">
        <Group justify="space-between" mb="sm">
          <Title order={5}>Interactive Causal DAG</Title>
          <Button
            onClick={createDAGVisualization}
            size="xs"
            variant="outline"
            leftSection={<Network size={14} />}
          >
            Refresh Graph
          </Button>
        </Group>
        <ScrollArea>
          <svg 
            ref={svgRef} 
            style={{ 
              backgroundColor: '#fafafa', 
              border: '1px solid #e2e8f0',
              width: '100%',
              display: 'block'
            }} 
          />
        </ScrollArea>
      </Card>

      <DAGSummaryCards results={results} />
    </Card>
  );
};