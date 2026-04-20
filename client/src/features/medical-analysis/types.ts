// Types for medical causal analyzer
export interface CausalEntity {
  name: string;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic additional properties
}

export interface ProbabilityEstimate {
  value: number;          // 0.0 to 1.0 (e.g., 0.75 for 75%)
  effectDirection: 'positive' | 'negative' | 'neutral';  // positive = increases, negative = decreases, neutral = unclear/not specified
  source: string;         // Source identifier (e.g., "Page 3", "Study X")
  textEvidence: string;   // Exact quote supporting this probability
}

export interface CausalRelation {
  source: string;
  target: string;
  directed: boolean;
  textEvidence: string;
  probabilities?: ProbabilityEstimate[];  // Array of probability estimates
  [key: string]: any;  // Allow dynamic additional properties
}

export interface CausalAnalysisResults {
  entities: CausalEntity[];
  relations: CausalRelation[];
  metrics: {
    dagValidation: {
      isAcyclic: boolean;
      cycles: string[];
      nodes: number;
      edges: number;
    };
    causalPaths: any[];
    interventionQueries: any[];
  };
  sourceText: string;
}

export interface QueryResults {
  queryType: string;
  source: string;
  target: string;
  directRelation?: CausalRelation;
  directPaths: any[];
  confounders: string[];
  isIdentifiable: boolean;
  recommendation: string;
  associationType?: string;
  confoundingPresent?: boolean;
  backdoorCriterion?: any;
  requiredAdjustment?: string[];
  causalEffect?: string;
  structuralModel?: string;
  individualEffect?: boolean;
}

// Function to get consistent color for any string value using hash
export const getEntityColor = (entityType: string | undefined | null): string => {
  // Handle undefined/null types
  if (!entityType) {
    return '#3b82f6'; // Default blue color for causal entities
  }
  
  // Use consistent hex color based on string hash
  const colorPalette = [
    '#2563eb', // blue-600
    '#dc2626', // red-600  
    '#059669', // emerald-600
    '#7c3aed', // violet-600
    '#ea580c', // orange-600
    '#0891b2', // cyan-600
    '#65a30d', // lime-600
    '#ec4899', // pink-600
    '#f59e0b', // amber-500
    '#64748b'  // slate-500
  ];
  
  let hash = 0;
  for (let i = 0; i < entityType.length; i++) {
    hash = entityType.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
};


