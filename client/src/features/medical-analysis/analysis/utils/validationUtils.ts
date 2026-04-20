import { CausalEntity, CausalRelation } from '@/features/medical-analysis/types';

/**
 * Validation issue for entity-relation matching
 */
export interface ValidationIssue {
  relationIndex: number;
  endpoint: string;
  endpointType: 'source' | 'target';
  relation: CausalRelation;
}

/**
 * Validates if all relation endpoints have matching entities
 * @param entities - Array of extracted causal entities
 * @param relations - Array of causal relations
 * @returns Array of validation issues (empty if no issues found)
 */
export const validateEntityRelationMatching = (
  entities: CausalEntity[], 
  relations: CausalRelation[]
): ValidationIssue[] => {
  const entityNames = new Set(entities.map(entity => entity.name));
  const validationIssues: ValidationIssue[] = [];

  relations.forEach((relation, index) => {
    if (!entityNames.has(relation.source)) {
      validationIssues.push({
        relationIndex: index,
        endpoint: relation.source,
        endpointType: 'source',
        relation
      });
    }

    if (!entityNames.has(relation.target)) {
      validationIssues.push({
        relationIndex: index,
        endpoint: relation.target,
        endpointType: 'target',
        relation
      });
    }
  });

  return validationIssues;
};