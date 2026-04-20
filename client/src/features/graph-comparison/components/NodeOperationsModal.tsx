/**
 * NodeOperationsModal Component
 *
 * Unified modal for node operations on both gold and test graphs:
 * - Skip/unskip node (both gold and test)
 * - Map to gold node (test only)
 * - Remove mapping (test only)
 */

import React from 'react';
import { Modal, Button, Stack, Text, Group, ScrollArea, Divider, Alert } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { GraphData } from '../types';

interface NodeOperationsModalProps {
  nodeName: string;
  graphType: 'gold' | 'test';
  isSkipped: boolean;
  goldData?: GraphData;
  currentMapping?: string;
  onClose: () => void;
  onSkipToggle: () => void;
  onMapNode?: (goldNode: string) => void;
  onRemoveMapping?: () => void;
}

export const NodeOperationsModal: React.FC<NodeOperationsModalProps> = ({
  nodeName,
  graphType,
  isSkipped,
  goldData,
  currentMapping,
  onClose,
  onSkipToggle,
  onMapNode,
  onRemoveMapping,
}) => {
  const isGold = graphType === 'gold';
  const title = isGold ? `Gold Node Options: ${nodeName}` : `Node Options: ${nodeName}`;
  const size = isGold ? 'sm' : 'md';

  return (
    <Modal opened={true} onClose={onClose} title={title} size={size}>
      <Stack gap="md">
        {/* Skip/Unskip Button */}
        <Button
          fullWidth
          color={isSkipped ? 'green' : 'red'}
          variant="light"
          onClick={onSkipToggle}
        >
          {isSkipped ? '✓ Unskip Node (Show Again)' : '🚫 Skip Node (Hide & Bridge Connections)'}
        </Button>

        {/* Gold node warning */}
        {isGold && (
          <Alert icon={<AlertCircle size={16} />} color="yellow" variant="light">
            <Text size="sm">
              <strong>Note:</strong> Skipping nodes in the gold graph will affect the GED calculation.
            </Text>
          </Alert>
        )}

        {/* Node Mapping Section (Test nodes only) */}
        {!isGold && goldData && onMapNode && (
          <>
            <Divider label="Node Mapping" />

            <Text size="sm" fw={500}>
              Map this test node to a gold standard node:
            </Text>

            <ScrollArea h={300}>
              <Stack gap="xs">
                {goldData.entities.map((entity) => (
                  <Button
                    key={entity.name}
                    variant={currentMapping === entity.name ? 'filled' : 'light'}
                    color={currentMapping === entity.name ? 'blue' : 'blue'}
                    onClick={() => onMapNode(entity.name)}
                    fullWidth
                    style={{ textAlign: 'left', height: 'auto', padding: '12px' }}
                  >
                    <Stack gap={4} style={{ width: '100%' }}>
                      <Text fw={600} size="sm" c={currentMapping === entity.name ? 'white' : 'inherit'}>
                        {entity.name}
                      </Text>
                      {entity.textEvidence && (
                        <Text size="xs" c={currentMapping === entity.name ? 'white' : 'dimmed'} lineClamp={2}>
                          {entity.textEvidence}
                        </Text>
                      )}
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </ScrollArea>
          </>
        )}

        {/* Footer Buttons */}
        <Group justify="space-between">
          <Button variant="default" onClick={onClose} fullWidth={isGold || !currentMapping}>
            Cancel
          </Button>
          {!isGold && currentMapping && onRemoveMapping && (
            <Button color="red" variant="light" onClick={onRemoveMapping}>
              Remove Mapping
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};
