/**
 * Graph Comparison Types
 *
 * Type definitions for the Graph Comparison Tool module.
 */

import { CausalEntity, CausalRelation } from '@/features/medical-analysis/types';

/**
 * Graph data structure for comparison (input format)
 */
export interface GraphData {
  entities: CausalEntity[];
  relations: CausalRelation[];
}

/**
 * Edge information (generic, used by all metrics)
 */
export interface EdgeInfo {
  source: string;
  target: string;
}

/**
 * Node mapping (test node -> gold node)
 */
export interface NodeMappings {
  [testNodeName: string]: string;
}

/**
 * Graph type identifier
 */
export type GraphType = 'gold' | 'test';

/**
 * Preprocessed graph for metric calculation.
 * Minimal structure containing only what metrics need.
 * This is the output of preprocessing and input to all metric calculators.
 */
export interface ComparisonGraph {
  nodes: Set<string>;
  edges: Map<string, EdgeInfo>;
  bridgedEdges: Set<string>;
}
