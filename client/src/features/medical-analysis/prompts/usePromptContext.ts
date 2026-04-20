import { useContext } from 'react';
import { PromptContext, PromptContextValue } from './PromptContext';

export const usePromptContext = (): PromptContextValue => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePromptContext must be used within a PromptProvider');
  }
  return context;
};