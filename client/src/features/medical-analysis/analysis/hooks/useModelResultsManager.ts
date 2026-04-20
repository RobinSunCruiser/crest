import { useCallback } from 'react';
import { CausalAnalysisResults, QueryResults } from '@/features/medical-analysis/types';
import { MultiModelResults } from './useAnalysisState';

export interface ModelResultsManager {
  autoSelectFirstSuccess: (results: MultiModelResults) => CausalAnalysisResults | null;
  performCausalQuery: (
    selectedResults: CausalAnalysisResults | null,
    queryType: string,
    sourceVariable: string,
    targetVariable: string
  ) => QueryResults | null;
  getSuccessCount: (results: MultiModelResults) => number;
}

/**
 * Hook for managing multi-model results selection and querying
 * Handles result selection logic and causal query operations
 */
export const useModelResultsManager = (): ModelResultsManager => {
  const autoSelectFirstSuccess = useCallback((results: MultiModelResults): CausalAnalysisResults | null => {
    const firstSuccess = Object.entries(results).find(([_, result]) => result.results);
    return firstSuccess ? firstSuccess[1].results : null;
  }, []);

  const performCausalQuery = useCallback((
    selectedResults: CausalAnalysisResults | null,
    queryType: string,
    sourceVariable: string,
    targetVariable: string
  ): QueryResults | null => {
    if (!selectedResults || !sourceVariable || !targetVariable || sourceVariable === targetVariable) {
      return null;
    }

    const directRelation = selectedResults.relations.find(rel => 
      rel.source === sourceVariable && rel.target === targetVariable
    );

    return {
      queryType,
      source: sourceVariable,
      target: targetVariable,
      directRelation,
      directPaths: directRelation ? [directRelation] : [],
      confounders: [],
      isIdentifiable: !!directRelation,
      recommendation: directRelation 
        ? `Direct ${directRelation.directed ? 'directed' : 'undirected'} relationship found`
        : 'No direct relationship found'
    };
  }, []);

  const getSuccessCount = useCallback((results: MultiModelResults): number => {
    return Object.values(results).filter(r => r.results).length;
  }, []);

  return {
    autoSelectFirstSuccess,
    performCausalQuery,
    getSuccessCount,
  };
};