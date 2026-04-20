import { useMemo } from 'react';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';

export interface DAGNode {
  id: string;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic properties from entities
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface DAGLink {
  source: string | DAGNode;
  target: string | DAGNode;
  directed: boolean;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic properties from relations
}

export interface DAGGraphData {
  nodes: DAGNode[];
  links: DAGLink[];
}

export const useDAGData = (results: CausalAnalysisResults | null): DAGGraphData => {
  return useMemo(() => {
    if (!results) {
      return { nodes: [], links: [] };
    }

    const nodes: DAGNode[] = results.entities.map(entity => ({
      id: entity.name,
      ...entity  // Spread all dynamic properties including textEvidence
    }));

    const links: DAGLink[] = results.relations.map(relation => ({
      ...relation  // Spread all dynamic properties including source, target, directed, textEvidence
    }));

    return { nodes, links };
  }, [results]);
};

export const calculateHierarchicalY = (
  entity: any, 
  height: number, 
  results: CausalAnalysisResults
): number => {
  // Handle null/undefined entities
  if (!entity || !entity.name) {
    return height * 0.5; // Center if no entity
  }
  
  // Simple even distribution for all entities since we don't have fixed types
  const entityIndex = results.entities.findIndex(e => e.name === entity.name);
  const totalEntities = results.entities.length;
  
  // Distribute entities evenly across the height with some padding
  const padding = 0.1; // 10% padding top and bottom
  const availableHeight = height * (1 - 2 * padding);
  const startY = height * padding;
  
  if (totalEntities <= 1) {
    return height * 0.5; // Center single entity
  }
  
  return startY + (entityIndex / (totalEntities - 1)) * availableHeight;
};