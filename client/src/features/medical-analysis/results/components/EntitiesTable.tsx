import React, { useMemo, useCallback } from 'react';
import { Card, Title, Text, Stack, Group, Button } from '@mantine/core';
import { Download } from 'lucide-react';
import { CausalEntity } from '@/features/medical-analysis/types';

interface EntitiesTableProps {
  entities: CausalEntity[];
  onExport: () => void;
}


export const EntitiesTable: React.FC<EntitiesTableProps> = React.memo(({ entities, onExport }) => {
  // Helper function to get all unique field keys across all entities
  const getAllFields = useMemo(() => {
    const fieldSet = new Set<string>();
    entities.forEach(entity => {
      Object.keys(entity).forEach(key => fieldSet.add(key));
    });
    // Always prioritize name and textEvidence
    const fields = Array.from(fieldSet);
    return fields.sort((a, b) => {
      if (a === 'name') return -1;
      if (b === 'name') return 1;
      if (a === 'textEvidence') return -1;
      if (b === 'textEvidence') return 1;
      return a.localeCompare(b);
    });
  }, [entities]);

  // Helper function to format field names for display
  const formatFieldName = (fieldName: string): string => {
    if (fieldName === 'textEvidence') return 'Evidence';
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Helper function to render field value
  const renderFieldValue = useCallback((entity: CausalEntity, fieldName: string, _index: number) => {
    const value = entity[fieldName];
    if (value === undefined || value === null) return null;

    if (fieldName === 'name') {
      return (
        <Text fw={600} size="lg" mb="sm">
          {String(value)}
        </Text>
      );
    }

    if (fieldName === 'textEvidence') {
      return (
        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }} mt="sm">
          <strong>Evidence:</strong> "{String(value)}"
        </Text>
      );
    }

    // Regular field
    return (
      <Text size="sm" c="dimmed" mb="xs">
        <strong>{formatFieldName(fieldName)}:</strong> {String(value)}
      </Text>
    );
  }, []);

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Group justify="space-between" mb="lg">
        <Title order={3}>
          Extracted Causal Entities ({entities.length})
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
        {useMemo(() => entities.map((entity, index) => (
          <Card key={`${entity.name}-${index}`} withBorder radius="sm" p="md">
            {getAllFields.map(fieldName => {
              const fieldValue = renderFieldValue(entity, fieldName, index);
              return fieldValue ? <div key={fieldName}>{fieldValue}</div> : null;
            }).filter(Boolean)}
          </Card>
        )), [entities, getAllFields, renderFieldValue])}
      </Stack>
    </Card>
  );
});