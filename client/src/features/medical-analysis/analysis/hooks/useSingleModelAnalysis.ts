import { useCallback } from 'react';
import { conversationService } from '@/shared/services';
import { CausalAnalysisResults, CausalEntity, CausalRelation } from '@/features/medical-analysis/types';
import { IModelOptions } from '@root/server/src/interfaces';
import { CONFIG } from '@/features/medical-analysis/constants';
import { useResponseParser } from './useResponseParser';

export interface SingleModelAnalysisConfig {
  systemPrompt: string;
  entityPrompt: string;
  relationPrompt: string;
  probabilityPrompt: string;
  entityMergePrompt: string;
  relationMergePrompt: string;
  probabilityMergePrompt: string;
  timeout: number;
  modelOptions: IModelOptions;
}

export interface SingleModelAnalysisActions {
  analyzeSingleModel: (
    modelId: string,
    inputText: string,
    addToExisting?: boolean,
    mergeWithResults?: CausalAnalysisResults | null,
    updateStepCallback?: (step: string) => void
  ) => Promise<CausalAnalysisResults>;
  buildMetrics: (entities: CausalEntity[], relations: CausalRelation[]) => any;
  replaceTemplateVars: (template: string, vars: Record<string, string>) => string;
}

/**
 * Hook for single model analysis operations
 * Handles entity extraction, relation analysis, and merging with retry logic
 */
export const useSingleModelAnalysis = (
  config: SingleModelAnalysisConfig
): SingleModelAnalysisActions => {
  const { parseResponse } = useResponseParser();

  const buildMetrics = useCallback((entities: CausalEntity[], relations: CausalRelation[]) => ({
    dagValidation: {
      isAcyclic: true,
      cycles: [],
      nodes: entities.length,
      edges: relations.length
    },
    causalPaths: [],
    interventionQueries: []
  }), []);

  const replaceTemplateVars = useCallback((template: string, vars: Record<string, string>): string => {
    let result = template;
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replaceAll(key, value);
    });
    return result;
  }, []);

  const analyzeSingleModel = useCallback(async (
    modelId: string,
    inputText: string,
    addToExisting: boolean = false,
    mergeWithResults?: CausalAnalysisResults | null,
    updateStepCallback?: (step: string) => void
  ): Promise<CausalAnalysisResults> => {
    // Helper to create batch context with analysis step
    const createBatchContext = (analysisStep: 'entity' | 'relation' | 'probability' | 'validation') => {
      const pageMatches = inputText.match(/Page (\d+):/g);
      const pages = pageMatches?.map(match => {
        const pageNumber = match.match(/Page (\d+):/);
        return pageNumber ? parseInt(pageNumber[1], 10) : 0;
      }).filter(p => p > 0) || [];

      return {
        isMerge: addToExisting,
        pages: pages.length > 0 ? pages : undefined,
        analysisStep,
      };
    };
    const {
      systemPrompt,
      entityPrompt,
      relationPrompt,
      probabilityPrompt,
      entityMergePrompt,
      relationMergePrompt,
      probabilityMergePrompt,
      timeout,
      modelOptions
    } = config;

    const session = conversationService.getSession(modelId, modelId, systemPrompt);

    // Entity extraction with optional merge instructions
    let finalEntityPrompt = entityPrompt.replace('${text}', inputText);
    
    if (addToExisting && mergeWithResults) {
      const entityListFormatted = mergeWithResults.entities.map((e, i) => `${i + 1}. "${e.name}"`).join('\n');
      const mergeVars = {
        '${existingEntityList}': entityListFormatted,
        '${entityCount}': mergeWithResults.entities.length.toString(),
        '${existingEntities}': JSON.stringify(mergeWithResults.entities, null, 2),
        '${sourceTexts}': mergeWithResults.sourceText
      };
      const processedMergePrompt = replaceTemplateVars(entityMergePrompt, mergeVars);
      finalEntityPrompt = processedMergePrompt + "\n\n" + finalEntityPrompt;
    }

    let entityData;
    
    // Entity analysis with retry logic
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const entityResponse = await session.sendMessage(finalEntityPrompt, modelOptions, createBatchContext('entity'), timeout);
        
        if (!entityResponse?.data?.message) {
          throw new Error('Invalid response from LLM service');
        }
        
        entityData = parseResponse(entityResponse.data.message, 'entity analysis');
        break;
      } catch (error) {
        if (attempt === CONFIG.MAX_RETRY_ATTEMPTS) {
          throw error;
        }
        // Show retry attempt in frontend
        const modelName = modelId.split(':')[0];
        const retryMessage = `Entity analysis retry ${attempt + 1}/${CONFIG.MAX_RETRY_ATTEMPTS} for ${modelName}`;
        if (updateStepCallback) {
          updateStepCallback(retryMessage);
        }
      }
    }
    
    if (!entityData.entities || entityData.entities.length === 0) {
      throw new Error('No entities extracted');
    }

    // Relation extraction with optional merge instructions
    const entityListFormatted = entityData.entities
      .map((entity: CausalEntity, index: number) => `${index + 1}. "${entity.name}"`)
      .join('\n');
    
    let finalRelationPrompt = relationPrompt
      .replace('${text}', inputText)
      .replace('${entities}', JSON.stringify(entityData.entities))
      .replace('${entityList}', entityListFormatted);
      
    if (addToExisting && mergeWithResults) {
      const existingRelationList = mergeWithResults.relations.map((r, i) => 
        `${i + 1}. ${r.source} ${r.directed ? '→' : '↔'} ${r.target}`).join('\n');
      const existingEntityList = mergeWithResults.entities.map((e, i) => `${i + 1}. "${e.name}"`).join('\n');
      
      const mergeVars = {
        '${existingRelationList}': existingRelationList,
        '${existingEntityList}': existingEntityList,
        '${relationCount}': mergeWithResults.relations.length.toString(),
        '${existingRelations}': JSON.stringify(mergeWithResults.relations, null, 2),
        '${existingEntities}': JSON.stringify(mergeWithResults.entities, null, 2),
        '${sourceTexts}': mergeWithResults.sourceText
      };
      const processedMergePrompt = replaceTemplateVars(relationMergePrompt, mergeVars);
      finalRelationPrompt = processedMergePrompt + "\n\n" + finalRelationPrompt;
    }

    let relationData!: { relations: CausalRelation[] };

    // Relations analysis with retry logic
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const relationResponse = await session.sendMessage(finalRelationPrompt, modelOptions, createBatchContext('relation'), timeout);

        if (!relationResponse?.data?.message) {
          throw new Error('Invalid response from LLM service for relations');
        }

        relationData = parseResponse(relationResponse.data.message, 'relations analysis');
        break;
      } catch (error) {
        if (attempt === CONFIG.MAX_RETRY_ATTEMPTS) {
          throw error;
        }
        // Show retry attempt in frontend
        const modelName = modelId.split(':')[0];
        const retryMessage = `Relations analysis retry ${attempt + 1}/${CONFIG.MAX_RETRY_ATTEMPTS} for ${modelName}`;
        if (updateStepCallback) {
          updateStepCallback(retryMessage);
        }
      }
    }

    // ===== STEP 3: PROBABILITY EXTRACTION =====
    // Format relation list for prompt
    const relationListFormatted = (relationData.relations || [])
      .map((rel: CausalRelation, index: number) =>
        `${index + 1}. ${rel.source} ${rel.directed ? '→' : '↔'} ${rel.target}`)
      .join('\n');

    let finalProbabilityPrompt = probabilityPrompt
      .replace('${text}', inputText)
      .replace('${relationList}', relationListFormatted)
      .replace('${relations}', JSON.stringify(relationData.relations));

    if (addToExisting && mergeWithResults && mergeWithResults.relations.length > 0) {
      const existingRelationsFormatted = mergeWithResults.relations
        .map((r, i) => {
          const probInfo = r.probabilities && r.probabilities.length > 0
            ? ` [${r.probabilities.length} probability estimates]`
            : '';
          return `${i + 1}. ${r.source} ${r.directed ? '→' : '↔'} ${r.target}${probInfo}`;
        })
        .join('\n');

      const mergeVars = {
        '${existingRelations}': JSON.stringify(mergeWithResults.relations, null, 2),
        '${existingRelationList}': existingRelationsFormatted,
        '${relationCount}': mergeWithResults.relations.length.toString(),
      };
      const processedMergePrompt = replaceTemplateVars(probabilityMergePrompt, mergeVars);
      finalProbabilityPrompt = processedMergePrompt + "\n\n" + finalProbabilityPrompt;
    }

    let probabilityData;

    // Probability analysis with retry logic
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const probabilityResponse = await session.sendMessage(
          finalProbabilityPrompt,
          modelOptions,
          createBatchContext('probability'),
          timeout
        );

        if (!probabilityResponse?.data?.message) {
          throw new Error('Invalid response from LLM service for probabilities');
        }

        probabilityData = parseResponse(probabilityResponse.data.message, 'probability analysis');
        break;
      } catch (error) {
        if (attempt === CONFIG.MAX_RETRY_ATTEMPTS) {
          throw error;
        }
        // Show retry attempt in frontend
        const modelName = modelId.split(':')[0];
        const retryMessage = `Probability analysis retry ${attempt + 1}/${CONFIG.MAX_RETRY_ATTEMPTS} for ${modelName}`;
        if (updateStepCallback) {
          updateStepCallback(retryMessage);
        }
      }
    }

    // Merge probability data into relations
    if (probabilityData.relationProbabilities && probabilityData.relationProbabilities.length > 0) {
      probabilityData.relationProbabilities.forEach((probRel: any) => {
        const matchingRelation = relationData.relations.find(
          (r: CausalRelation) => r.source === probRel.source && r.target === probRel.target
        );

        if (matchingRelation && probRel.probabilities && probRel.probabilities.length > 0) {
          if (addToExisting && matchingRelation.probabilities) {
            // Merge mode: append new probabilities to existing array
            matchingRelation.probabilities = [
              ...matchingRelation.probabilities,
              ...probRel.probabilities
            ];
          } else {
            // New analysis: set probabilities
            matchingRelation.probabilities = probRel.probabilities;
          }
        }
      });
    }
    // ===== END STEP 3 =====

    const metrics = buildMetrics(entityData.entities, relationData.relations || []);

    const finalResult = {
      entities: entityData.entities,
      relations: relationData.relations || [],
      metrics,
      sourceText: addToExisting && mergeWithResults
        ? `${mergeWithResults.sourceText}\n\n--- ADDITIONAL TEXT ---\n\n${inputText}`
        : inputText
    };

    return finalResult;
  }, [config, parseResponse, buildMetrics, replaceTemplateVars]);

  return {
    analyzeSingleModel,
    buildMetrics,
    replaceTemplateVars,
  };
};