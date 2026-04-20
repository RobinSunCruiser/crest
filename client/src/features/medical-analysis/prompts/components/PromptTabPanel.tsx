import React from 'react';
import { Text, Textarea, Tabs } from '@mantine/core';

interface PromptTabPanelProps {
  value: string;
  title: string;
  description: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export const PromptTabPanel: React.FC<PromptTabPanelProps> = ({
  value,
  title,
  description,
  prompt,
  onPromptChange,
  placeholder,
  disabled = false,
}) => {
  return (
    <Tabs.Panel value={value} pt="md">
      <Text size="sm" fw={500} mb="xs">
        {title}
      </Text>
      <Text size="xs" c="dimmed" mb="sm">
        {description}
      </Text>
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={placeholder}
        minRows={15}
        maxRows={25}
        autosize
        disabled={disabled}
        styles={{
          input: {
            fontFamily: 'monospace',
            fontSize: '12px'
          }
        }}
      />
    </Tabs.Panel>
  );
};