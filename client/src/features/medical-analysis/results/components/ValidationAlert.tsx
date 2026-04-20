import React from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
import { AlertTriangle, Wrench } from 'lucide-react';
import { ValidationIssue } from '@/features/medical-analysis/analysis/utils/validationUtils';

interface ValidationAlertProps {
  validationIssues: ValidationIssue[];
  onFixRelations: () => void;
  processing: boolean;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  validationIssues,
  onFixRelations,
  processing
}) => {
  const uniqueEndpoints = Array.from(new Set(validationIssues.map(issue => issue.endpoint)));
  
  return (
    <Alert
      icon={<AlertTriangle size={16} />}
      color="orange"
      title="Entity-Relation Matching Issues"
      mb="md"
    >
      <Text size="sm" mb="sm">
        Found {validationIssues.length} relation endpoint(s) that don't match entity names:
      </Text>
      <Text size="xs" c="dimmed" mb="md" style={{ fontFamily: 'monospace' }}>
        {uniqueEndpoints.map(endpoint => `"${endpoint}"`).join(', ')}
      </Text>
      <Group>
        <Button
          size="sm"
          leftSection={<Wrench size={14} />}
          onClick={onFixRelations}
          loading={processing}
          disabled={processing}
        >
          Fix Relations
        </Button>
        <Text size="xs" c="dimmed">
          Uses LLM to match endpoints to entities or remove invalid relations
        </Text>
      </Group>
    </Alert>
  );
};