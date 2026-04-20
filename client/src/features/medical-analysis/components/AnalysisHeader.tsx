import React from 'react';
import { Title, Text, Group, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';

export const AnalysisHeader: React.FC = React.memo(() => {
  const navigate = useNavigate();

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Title order={1}>
          Medical Causal Analysis Application
        </Title>
        <Button
          leftSection={<GitCompare size={16} />}
          onClick={() => navigate('/graph-comparison')}
          variant="light"
          size="sm"
        >
          Compare Graphs
        </Button>
      </Group>
      <Text size="lg" c="dimmed">
        Extract causal entities and relationships from medical texts using Pearl's Causal Framework
      </Text>
    </div>
  );
});