import React from 'react';
import { Alert, Text } from '@mantine/core';
import { Info } from 'lucide-react';
import styles from '@/shared/styles/common.module.css';

export const PromptDocumentationAlert: React.FC = React.memo(() => {
  return (
    <Alert icon={<Info size={16} />} color="blue" mb="md">
      <Text size="sm" mb="xs">
        Customize the prompts used for entity and relation extraction. Use these available placeholders:
      </Text>
      <div className={styles.promptSection}>
        <Text size="xs" fw={600} mb="xs">Entity Extraction Prompt Tags:</Text>
        <Text size="xs" component="div" className={styles.monospaceWithLargeMargin}>
          • <code>{"${text}"}</code> - The input text to analyze
        </Text>
        
        <Text size="xs" fw={600} mb="xs" mt="sm">Relation Extraction Prompt Tags:</Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${text}"}</code> - The input text to analyze
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${entities}"}</code> - JSON array of extracted entities
        </Text>
        <Text size="xs" component="div" className={styles.monospace}>
          • <code>{"${entityList}"}</code> - Formatted numbered list of entity names
        </Text>
        
        <Text size="xs" fw={600} mb="xs" mt="sm">Merge Mode Template Tags (empty if no existing data):</Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${existingEntities}"}</code> - Complete JSON array of current entities with all fields
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${existingEntityList}"}</code> - Simple formatted list of existing entities
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${existingRelations}"}</code> - Complete JSON array of current relations with all fields
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${existingRelationList}"}</code> - Simple formatted list of existing relations
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${entityCount}"}</code> - Number of existing entities
        </Text>
        <Text size="xs" component="div" className={styles.monospaceWithMargin}>
          • <code>{"${relationCount}"}</code> - Number of existing relations
        </Text>
        <Text size="xs" component="div" className={styles.monospace}>
          • <code>{"${sourceTexts}"}</code> - Previously analyzed texts
        </Text>
      </div>
    </Alert>
  );
});