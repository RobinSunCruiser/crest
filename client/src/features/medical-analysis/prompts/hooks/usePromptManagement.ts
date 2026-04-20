import { useState, useCallback } from 'react';
import { 
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_ENTITY_PROMPT, 
  DEFAULT_RELATION_PROMPT,
  DEFAULT_ENTITY_MERGE_PROMPT,
  DEFAULT_RELATION_MERGE_PROMPT,
  DEFAULT_VALIDATION_PROMPT
} from '@/features/medical-analysis/constants';

/**
 * Custom hook for managing prompt customization
 */
export const usePromptManagement = () => {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [entityPrompt, setEntityPrompt] = useState(DEFAULT_ENTITY_PROMPT);
  const [relationPrompt, setRelationPrompt] = useState(DEFAULT_RELATION_PROMPT);
  const [entityMergePrompt, setEntityMergePrompt] = useState(DEFAULT_ENTITY_MERGE_PROMPT);
  const [relationMergePrompt, setRelationMergePrompt] = useState(DEFAULT_RELATION_MERGE_PROMPT);
  const [validationPrompt, setValidationPrompt] = useState(DEFAULT_VALIDATION_PROMPT);

  const resetPrompts = useCallback(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setEntityPrompt(DEFAULT_ENTITY_PROMPT);
    setRelationPrompt(DEFAULT_RELATION_PROMPT);
    setEntityMergePrompt(DEFAULT_ENTITY_MERGE_PROMPT);
    setRelationMergePrompt(DEFAULT_RELATION_MERGE_PROMPT);
    setValidationPrompt(DEFAULT_VALIDATION_PROMPT);
  }, []);

  return {
    systemPrompt,
    entityPrompt,
    relationPrompt,
    entityMergePrompt,
    relationMergePrompt,
    validationPrompt,
    setSystemPrompt,
    setEntityPrompt,
    setRelationPrompt,
    setEntityMergePrompt,
    setRelationMergePrompt,
    setValidationPrompt,
    resetPrompts,
  };
};