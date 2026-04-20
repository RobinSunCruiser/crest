/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useCallback, ReactNode } from 'react';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_ENTITY_PROMPT,
  DEFAULT_RELATION_PROMPT,
  DEFAULT_PROBABILITY_PROMPT,
  DEFAULT_ENTITY_MERGE_PROMPT,
  DEFAULT_RELATION_MERGE_PROMPT,
  DEFAULT_PROBABILITY_MERGE_PROMPT,
  DEFAULT_VALIDATION_PROMPT
} from '@/features/medical-analysis/constants';

export interface PromptContextValue {
  // Prompt values
  systemPrompt: string;
  entityPrompt: string;
  relationPrompt: string;
  probabilityPrompt: string;
  entityMergePrompt: string;
  relationMergePrompt: string;
  probabilityMergePrompt: string;
  validationPrompt: string;
  
  // Prompt setters
  setSystemPrompt: (prompt: string) => void;
  setEntityPrompt: (prompt: string) => void;
  setRelationPrompt: (prompt: string) => void;
  setProbabilityPrompt: (prompt: string) => void;
  setEntityMergePrompt: (prompt: string) => void;
  setRelationMergePrompt: (prompt: string) => void;
  setProbabilityMergePrompt: (prompt: string) => void;
  setValidationPrompt: (prompt: string) => void;
  
  // Actions
  resetPrompts: () => void;
}

export const PromptContext = createContext<PromptContextValue | null>(null);

interface PromptProviderProps {
  children: ReactNode;
}

export const PromptProvider: React.FC<PromptProviderProps> = ({ children }) => {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [entityPrompt, setEntityPrompt] = useState(DEFAULT_ENTITY_PROMPT);
  const [relationPrompt, setRelationPrompt] = useState(DEFAULT_RELATION_PROMPT);
  const [probabilityPrompt, setProbabilityPrompt] = useState(DEFAULT_PROBABILITY_PROMPT);
  const [entityMergePrompt, setEntityMergePrompt] = useState(DEFAULT_ENTITY_MERGE_PROMPT);
  const [relationMergePrompt, setRelationMergePrompt] = useState(DEFAULT_RELATION_MERGE_PROMPT);
  const [probabilityMergePrompt, setProbabilityMergePrompt] = useState(DEFAULT_PROBABILITY_MERGE_PROMPT);
  const [validationPrompt, setValidationPrompt] = useState(DEFAULT_VALIDATION_PROMPT);
  
  const resetPrompts = useCallback(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setEntityPrompt(DEFAULT_ENTITY_PROMPT);
    setRelationPrompt(DEFAULT_RELATION_PROMPT);
    setProbabilityPrompt(DEFAULT_PROBABILITY_PROMPT);
    setEntityMergePrompt(DEFAULT_ENTITY_MERGE_PROMPT);
    setRelationMergePrompt(DEFAULT_RELATION_MERGE_PROMPT);
    setProbabilityMergePrompt(DEFAULT_PROBABILITY_MERGE_PROMPT);
    setValidationPrompt(DEFAULT_VALIDATION_PROMPT);
  }, []);

  const value: PromptContextValue = {
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
    resetPrompts,
  };

  return (
    <PromptContext.Provider value={value}>
      {children}
    </PromptContext.Provider>
  );
};

