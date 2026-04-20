import React from 'react';
import { Box, Group, Text, Progress } from '@mantine/core';

interface ProgressBarProps {
  value: number;
  color: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  label: string;
  description: string;
  animated?: boolean;
  striped?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  value,
  color,
  size,
  label,
  description,
  animated = false,
  striped = false
}) => (
  <Box>
    <Group justify="space-between" mb="xs">
      <Text size="sm" fw={striped ? 600 : 500} c={striped ? color : undefined}>
        {label}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Group>
    <Progress 
      value={value} 
      color={color} 
      size={size} 
      radius="md" 
      animated={animated} 
      striped={striped} 
    />
  </Box>
));