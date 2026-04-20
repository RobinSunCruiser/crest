/**
 * GED-Specific Types
 */

import { EdgeInfo } from '../../types';

/**
 * Graph Edit Distance results
 */
export interface GEDResults {
  // Main metrics
  ged: number;
  normalizedGED: string;
  structuralSimilarity: string;

  // Node operations
  nodeInsertions: number;
  nodeDeletions: number;
  goldNodes: number;
  testNodes: number;
  missingNodes: number;
  extraNodes: number;
  missingNodesList: string[];
  extraNodesList: string[];

  // Edge operations
  edgeInsertions: number;
  edgeDeletions: number;
  edgeSubstitutions: number;
  totalGoldEdges: number;
  totalTestEdges: number;
  deletedEdgesList: EdgeInfo[];
  insertedEdgesList: EdgeInfo[];
  substitutedEdgesList: EdgeInfo[];
  correctEdgesList: EdgeInfo[];

  // Quality metrics
  precision: string;
  recall: string;
  f1Score: string;

  // Bridged edges
  bridgedEdges: Set<string>;
}
