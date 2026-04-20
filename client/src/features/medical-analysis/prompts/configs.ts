export interface PromptConfig {
  key: string;
  title: string;
  description: string;
  placeholder: string;
}

export const PROMPT_CONFIGS: PromptConfig[] = [
  {
    key: 'entities',
    title: 'Entity Extraction Prompt',
    description: 'This prompt identifies causal entities in medical text. The system now supports dynamic entity properties - you can define any additional fields beyond the required name and textEvidence.',
    placeholder: 'Enter entity extraction prompt...'
  },
  {
    key: 'relations',
    title: 'Relation Extraction Prompt',
    description: 'This prompt is used to extract causal relationships between identified entities.',
    placeholder: 'Enter relation extraction prompt...'
  },
  {
    key: 'probability',
    title: 'Probability Extraction Prompt',
    description: 'This prompt extracts explicit probability values mentioned in the text for identified causal relations. Only extracts probabilities that are explicitly stated, supporting multiple estimates per relation from different sources.',
    placeholder: 'Enter probability extraction prompt...'
  },
  {
    key: 'entityMerge',
    title: 'Entity Merge Prompt',
    description: 'This prompt is used when merging new entities with existing analysis results.',
    placeholder: 'Enter entity merge prompt...'
  },
  {
    key: 'relationMerge',
    title: 'Relation Merge Prompt',
    description: 'This prompt is used when merging new relations with existing analysis results.',
    placeholder: 'Enter relation merge prompt...'
  },
  {
    key: 'probabilityMerge',
    title: 'Probability Merge Prompt',
    description: 'This prompt is used when merging new probability estimates with existing analysis results. New estimates are appended to maintain full traceability.',
    placeholder: 'Enter probability merge prompt...'
  },
  {
    key: 'system',
    title: 'System Prompt',
    description: 'The system prompt sets the overall context and behavior for the AI model.',
    placeholder: 'Enter system prompt...'
  },
  {
    key: 'validation',
    title: 'Entity-Relation Matching Prompt',
    description: 'This prompt is used to fix mismatched entity names in relations.',
    placeholder: 'Enter validation prompt...'
  }
];