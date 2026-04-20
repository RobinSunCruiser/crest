/**
 * Graph Edit Distance (GED) Calculator
 *
 * Pure calculation function for computing GED between two preprocessed graphs.
 * Expects ComparisonGraph objects produced by preprocessGraph().
 */

import { ComparisonGraph, EdgeInfo } from '../../types';
import { GEDResults } from './types';

/**
 * Calculate Graph Edit Distance between two preprocessed graphs.
 *
 * GED measures the minimum number of edit operations to transform
 * the test graph into the gold graph:
 * - Node insertions: nodes in test but not in gold
 * - Node deletions: nodes in gold but not in test
 * - Edge insertions: edges in test but not in gold
 * - Edge deletions: edges in gold but not in test
 * - Edge substitutions: edges with reversed direction
 *
 * @param gold - Preprocessed gold standard graph
 * @param test - Preprocessed test graph
 * @returns GED results or null if invalid input
 */
export function calculateGED(
  gold: ComparisonGraph | null,
  test: ComparisonGraph | null
): GEDResults | null {
  try {
    if (!gold || !test) {
      console.error('Invalid graph data: gold or test is null');
      return null;
    }

    // Step 1: Calculate node-level metrics
    const goldNodes = gold.nodes;
    const testNodes = test.nodes;

    const missingInTest = [...goldNodes].filter((n) => !testNodes.has(n));
    const extraInTest = [...testNodes].filter((n) => !goldNodes.has(n));

    const nodeInsertions = extraInTest.length;
    const nodeDeletions = missingInTest.length;

    // Step 2: Use edge maps directly from ComparisonGraph
    const goldEdges = gold.edges;
    const testEdges = test.edges;

    // Step 3: Calculate edge-level metrics
    let edgeInsertions = 0;
    let edgeDeletions = 0;
    let edgeSubstitutions = 0;

    const deletedEdgesList: EdgeInfo[] = [];
    const insertedEdgesList: EdgeInfo[] = [];
    const substitutedEdgesList: EdgeInfo[] = [];
    const correctEdgesList: EdgeInfo[] = [];

    // Check each gold edge
    for (const [key, edge] of goldEdges) {
      const reverseKey = `${edge.target}→${edge.source}`;

      if (testEdges.has(key)) {
        // Exact match
        correctEdgesList.push({ source: edge.source, target: edge.target });
      } else if (testEdges.has(reverseKey)) {
        // Edge exists but in wrong direction
        edgeSubstitutions += 1;
        substitutedEdgesList.push({ source: edge.source, target: edge.target });
      } else {
        // Edge missing in test
        edgeDeletions += 1;
        deletedEdgesList.push({ source: edge.source, target: edge.target });
      }
    }

    // Check for extra edges in test
    for (const [key, edge] of testEdges) {
      const reverseKey = `${edge.target}→${edge.source}`;

      if (!goldEdges.has(key) && !goldEdges.has(reverseKey)) {
        edgeInsertions += 1;
        insertedEdgesList.push({ source: edge.source, target: edge.target });
      }
    }

    // Step 4: Calculate quality metrics
    const totalGED = nodeInsertions + nodeDeletions + edgeInsertions + edgeDeletions + edgeSubstitutions;

    const truePositives = correctEdgesList.length;
    const falsePositives = edgeInsertions;
    const falseNegatives = edgeDeletions + edgeSubstitutions;

    const precision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    // Normalization uses actual preprocessed graph sizes (consistent)
    const maxPossibleOps = goldNodes.size + testNodes.size + goldEdges.size + testEdges.size;
    const normalizedGED = maxPossibleOps > 0 ? totalGED / maxPossibleOps : 0;

    return {
      ged: totalGED,
      normalizedGED: (normalizedGED * 100).toFixed(2),
      nodeInsertions,
      nodeDeletions,
      edgeInsertions,
      edgeDeletions,
      edgeSubstitutions,
      totalGoldEdges: goldEdges.size,
      totalTestEdges: testEdges.size,
      deletedEdgesList,
      insertedEdgesList,
      substitutedEdgesList,
      correctEdgesList,
      goldNodes: goldNodes.size,
      testNodes: testNodes.size,
      missingNodes: missingInTest.length,
      extraNodes: extraInTest.length,
      missingNodesList: missingInTest,
      extraNodesList: extraInTest,
      precision: (precision * 100).toFixed(2),
      recall: (recall * 100).toFixed(2),
      f1Score: (f1Score * 100).toFixed(2),
      structuralSimilarity: ((1 - normalizedGED) * 100).toFixed(2),
      bridgedEdges: test.bridgedEdges,
    };
  } catch (error) {
    console.error('Error calculating GED:', error);
    return null;
  }
}
