/**
 * Storage keys for localStorage persistence
 * Centralized to avoid typos and make refactoring easier
 */
export const STORAGE_KEYS = {
  /** JWT authentication token */
  AUTH_TOKEN: 'crest-token',
  /** Selected LLM models for analysis */
  SELECTED_MODELS: 'selectedModels',
  /** Analysis results and multi-model data */
  ANALYSIS_STATE: 'crest-analysis-state',
} as const;
