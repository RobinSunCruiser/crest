import { useCallback } from 'react';

export interface ResponseParser {
  parseResponse: (response: string, type: string) => any;
}

/**
 * Hook for parsing LLM responses with consistent error handling
 * Handles JSON extraction, validation, and error reporting
 */
export const useResponseParser = (): ResponseParser => {

  const parseResponse = useCallback((response: string, type: string) => {
    try {
      let cleanedResponse = response.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
      
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate response structure based on type
      if (type === 'entity analysis' && (!parsed.entities || !Array.isArray(parsed.entities))) {
        throw new Error('Response missing valid entities array');
      }
      if (type === 'relations analysis' && (!parsed.relations || !Array.isArray(parsed.relations))) {
        throw new Error('Response missing valid relations array');
      }
      if (type === 'probability analysis' && (!parsed.relationProbabilities || !Array.isArray(parsed.relationProbabilities))) {
        throw new Error('Response missing valid relationProbabilities array');
      }
      if (type === 'validation' && (!parsed.renamings && !parsed.deletions)) {
        throw new Error('Response missing valid renamings or deletions arrays');
      }
      
      // Check for duplicates in entities
      if (type === 'entity analysis' && parsed.entities) {
        const entityNames = parsed.entities.map((e: any) => e.name?.toLowerCase().trim()).filter(Boolean);
        const uniqueNames = new Set(entityNames);
        if (entityNames.length !== uniqueNames.size) {
          const duplicates = entityNames.filter((name: string, index: number) => entityNames.indexOf(name) !== index);
          throw new Error(`Duplicate entities found: ${Array.from(new Set(duplicates)).join(', ')}`);
        }
      }
      
      // Check for duplicates in relations
      if (type === 'relations analysis' && parsed.relations) {
        const relationKeys = parsed.relations.map((r: any) => {
          if (!r.source || !r.target) return null;
          return `${r.source.toLowerCase().trim()}->${r.target.toLowerCase().trim()}`;
        }).filter(Boolean);
        const uniqueKeys = new Set(relationKeys);
        if (relationKeys.length !== uniqueKeys.size) {
          const duplicates = relationKeys.filter((key: string, index: number) => relationKeys.indexOf(key) !== index);
          throw new Error(`Duplicate relations found: ${Array.from(new Set(duplicates)).join(', ')}`);
        }
      }
      
      return parsed;
    } catch (parseError) {
      const errorMessage = `Failed to parse ${type} response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      throw new Error(errorMessage);
    }
  }, []);

  return {
    parseResponse,
  };
};