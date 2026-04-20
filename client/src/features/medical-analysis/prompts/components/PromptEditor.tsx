import React, { useState, useMemo } from 'react';
import { Card, Title, Button, Group, Collapse, Tabs } from '@mantine/core';
import { ChevronDown, ChevronUp, Settings, RefreshCw } from 'lucide-react';
import { PromptDocumentationAlert } from './PromptDocumentationAlert';
import { PromptTabPanel } from './PromptTabPanel';
import { PROMPT_CONFIGS } from '@/features/medical-analysis/prompts/configs';
import { usePromptContext } from '@/features/medical-analysis/prompts/usePromptContext';

interface PromptEditorProps {
  disabled?: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  disabled = false
}) => {
  const {
    systemPrompt,
    entityPrompt,
    relationPrompt,
    probabilityPrompt,
    entityMergePrompt,
    relationMergePrompt,
    probabilityMergePrompt,
    validationPrompt,
    setSystemPrompt,
    setEntityPrompt,
    setRelationPrompt,
    setProbabilityPrompt,
    setEntityMergePrompt,
    setRelationMergePrompt,
    setProbabilityMergePrompt,
    setValidationPrompt,
    resetPrompts
  } = usePromptContext();
  const [opened, setOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('entities');

  // Map prompts and setters to a more manageable structure
  const promptData = useMemo(() => ({
    entities: { value: entityPrompt, onChange: setEntityPrompt },
    relations: { value: relationPrompt, onChange: setRelationPrompt },
    probability: { value: probabilityPrompt, onChange: setProbabilityPrompt },
    entityMerge: { value: entityMergePrompt, onChange: setEntityMergePrompt },
    relationMerge: { value: relationMergePrompt, onChange: setRelationMergePrompt },
    probabilityMerge: { value: probabilityMergePrompt, onChange: setProbabilityMergePrompt },
    system: { value: systemPrompt, onChange: setSystemPrompt },
    validation: { value: validationPrompt, onChange: setValidationPrompt }
  }), [
    entityPrompt, relationPrompt, probabilityPrompt, entityMergePrompt, relationMergePrompt, probabilityMergePrompt,
    systemPrompt, validationPrompt,
    setEntityPrompt, setRelationPrompt, setProbabilityPrompt, setEntityMergePrompt, setRelationMergePrompt, setProbabilityMergePrompt,
    setSystemPrompt, setValidationPrompt
  ]);

  return (
    <Card withBorder shadow="sm" radius="md" p={opened ? "lg" : "md"} mt="md">
      <Group justify="space-between" mb={opened ? "md" : 0}>
        <Group gap="xs">
          <Settings size={18} />
          <Title order={5}>Prompt Configuration</Title>
        </Group>
        <Button
          variant="subtle"
          size="sm"
          rightSection={opened ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          onClick={() => setOpened(!opened)}
          disabled={disabled}
        >
          {opened ? 'Hide' : 'Show'} Prompts
        </Button>
      </Group>

      <Collapse in={opened}>
        <PromptDocumentationAlert />

        <Group justify="flex-end" mb="md">
          <Button
            variant="outline"
            size="sm"
            leftSection={<RefreshCw size={14} />}
            onClick={resetPrompts}
            disabled={disabled}
          >
            Reset to Defaults
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="entities">Entity Extraction</Tabs.Tab>
            <Tabs.Tab value="relations">Relation Extraction</Tabs.Tab>
            <Tabs.Tab value="probability">Probability Extraction</Tabs.Tab>
            <Tabs.Tab value="entityMerge">Entity Merging</Tabs.Tab>
            <Tabs.Tab value="relationMerge">Relation Merging</Tabs.Tab>
            <Tabs.Tab value="probabilityMerge">Probability Merging</Tabs.Tab>
            <Tabs.Tab value="system">System Prompt</Tabs.Tab>
            <Tabs.Tab value="validation">Entity-Relation Matching</Tabs.Tab>
          </Tabs.List>

          {PROMPT_CONFIGS.map((config) => (
            <PromptTabPanel
              key={config.key}
              value={config.key}
              title={config.title}
              description={config.description}
              prompt={promptData[config.key as keyof typeof promptData].value}
              onPromptChange={promptData[config.key as keyof typeof promptData].onChange}
              placeholder={config.placeholder}
              disabled={disabled}
            />
          ))}
        </Tabs>
      </Collapse>
    </Card>
  );
};