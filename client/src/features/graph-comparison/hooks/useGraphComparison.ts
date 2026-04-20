/**
 * useGraphComparison Hook
 *
 * Main hook for managing graph comparison state and logic.
 * Handles both gold and test graphs, node mappings, and metric calculations.
 *
 * Architecture:
 * 1. Raw data layer: goldData, testData (unchanged GraphData format)
 * 2. User modifications: skippedNodes, skippedRelations, nodeMappings
 * 3. Preprocessing: preprocessGraph() produces ComparisonGraph
 * 4. Metrics: calculateGED() and future metrics consume ComparisonGraph
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GraphData, NodeMappings, ComparisonGraph } from '../types';
import { preprocessGraph } from '../utils/graphUtils';
import { calculateGED, GEDResults } from '../metrics/ged';

/**
 * Initial sample data for demonstration
 * Includes a transitive connection example: age → metabolism → BMI
 */
const initialData: GraphData = {
  entities: [
    {
      name: 'age',
      type: 'EXPOSURE',
      description: 'Patient age',
      textEvidence: 'During aging the average changes while the average minute volume remains the same.',
    },
    {
      name: 'sex',
      type: 'EXPOSURE',
      description: 'Patient sex',
      textEvidence:
        'In order to simulate the lung mechanics of healthy, resting, recumbent subjects as a function of age, sex and height.',
    },
    {
      name: 'height',
      type: 'EXPOSURE',
      description: 'Patient height',
      textEvidence:
        "Additionally, the influence of height should be considered, as the average depends on the person's height and increases with rising age.",
    },
    {
      name: 'metabolism',
      type: 'MEDIATOR',
      description: 'Metabolic rate',
      textEvidence: 'Metabolic rate decreases with age and varies by sex, affecting body composition.',
    },
    {
      name: 'body-mass-index (BMI)',
      type: 'OUTCOME',
      description: 'Body Mass Index',
      textEvidence:
        'Pelosi et al. proposed a relationship between the body-mass-index (BMI), so that sex and age dependencies are considered.',
    },
  ],
  relations: [
    {
      source: 'age',
      target: 'metabolism',
      directed: true,
      type: 'CAUSAL',
      strength: 'STRONG',
      direction: 'FORWARD',
      textEvidence: 'Age affects metabolic rate.',
      confidence: 0.9,
    },
    {
      source: 'metabolism',
      target: 'body-mass-index (BMI)',
      directed: true,
      type: 'CAUSAL',
      strength: 'STRONG',
      direction: 'FORWARD',
      textEvidence: 'Metabolic rate affects BMI.',
      confidence: 0.85,
    },
    {
      source: 'sex',
      target: 'metabolism',
      directed: true,
      type: 'CAUSAL',
      strength: 'MODERATE',
      direction: 'FORWARD',
      textEvidence: 'Sex affects metabolic rate.',
      confidence: 0.8,
    },
    {
      source: 'height',
      target: 'body-mass-index (BMI)',
      directed: true,
      type: 'CAUSAL',
      strength: 'MODERATE',
      direction: 'FORWARD',
      textEvidence: 'Height is used in BMI calculation.',
      confidence: 0.9,
    },
  ],
};

export function useGraphComparison() {
  // ===== RAW DATA LAYER =====
  const [goldData, setGoldData] = useState<GraphData | null>(null);
  const [testData, setTestData] = useState<GraphData | null>(null);

  // ===== USER MODIFICATIONS =====
  // Gold graph modifications
  const [goldSkippedNodes, setGoldSkippedNodes] = useState<Set<string>>(new Set());
  const [goldSkippedRelations, setGoldSkippedRelations] = useState<Set<string>>(new Set());

  // Test graph modifications
  const [testSkippedNodes, setTestSkippedNodes] = useState<Set<string>>(new Set());
  const [testSkippedRelations, setTestSkippedRelations] = useState<Set<string>>(new Set());

  // Node mappings (test → gold) - only applies to test graph
  const [nodeMappings, setNodeMappings] = useState<NodeMappings>({});

  // ===== METRIC RESULTS =====
  const [gedResults, setGedResults] = useState<GEDResults | null>(null);

  // ===== PREPROCESSING (MEMOIZED) =====
  // Preprocessed gold graph - no node mappings for gold
  const goldGraph: ComparisonGraph | null = useMemo(() => {
    if (!goldData) return null;
    return preprocessGraph(goldData, {
      skippedNodes: goldSkippedNodes,
      skippedRelations: goldSkippedRelations,
    });
  }, [goldData, goldSkippedNodes, goldSkippedRelations]);

  // Preprocessed test graph - with node mappings applied FIRST
  const testGraph: ComparisonGraph | null = useMemo(() => {
    if (!testData) return null;
    return preprocessGraph(testData, {
      skippedNodes: testSkippedNodes,
      skippedRelations: testSkippedRelations,
      nodeMappings,
    });
  }, [testData, testSkippedNodes, testSkippedRelations, nodeMappings]);

  // ===== DERIVED STATE FOR VISUALIZATION =====
  // Bridged edges for gold graph (for visualization)
  const goldBridgedEdges: Set<string> = useMemo(() => {
    return goldGraph?.bridgedEdges ?? new Set();
  }, [goldGraph]);

  // Bridged edges for test graph (for visualization)
  const testBridgedEdges: Set<string> = useMemo(() => {
    return testGraph?.bridgedEdges ?? new Set();
  }, [testGraph]);

  // ===== INITIALIZATION =====
  useEffect(() => {
    setGoldData(initialData);
    setTestData(initialData);
  }, []);

  // ===== METRIC CALCULATION =====
  // Calculate GED when preprocessed graphs change
  useEffect(() => {
    if (goldGraph && testGraph) {
      const results = calculateGED(goldGraph, testGraph);
      setGedResults(results);
    } else {
      setGedResults(null);
    }
  }, [goldGraph, testGraph]);

  // ===== ACTIONS =====
  // File upload handler
  const handleFileUpload = useCallback((file: File, setData: (data: GraphData) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.entities || !data.relations) {
          alert('Invalid graph format. Must have "entities" and "relations" fields.');
          return;
        }
        setData(data);
      } catch (error) {
        alert('Error parsing JSON file: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  }, []);

  // Toggle node skip state
  const toggleNodeSkip = useCallback((nodeName: string, isGold: boolean) => {
    const setSkipped = isGold ? setGoldSkippedNodes : setTestSkippedNodes;
    setSkipped((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeName)) {
        newSet.delete(nodeName);
      } else {
        newSet.add(nodeName);
      }
      return newSet;
    });
  }, []);

  // Toggle relation skip state
  const toggleRelationSkip = useCallback((source: string, target: string, isGold: boolean) => {
    const relKey = `${source}→${target}`;
    const setSkipped = isGold ? setGoldSkippedRelations : setTestSkippedRelations;
    setSkipped((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(relKey)) {
        newSet.delete(relKey);
      } else {
        newSet.add(relKey);
      }
      return newSet;
    });
  }, []);

  // Add/update node mapping
  const setNodeMapping = useCallback((testNode: string, goldNode: string) => {
    setNodeMappings((prev) => ({
      ...prev,
      [testNode]: goldNode,
    }));
  }, []);

  // Remove node mapping
  const removeNodeMapping = useCallback((testNode: string) => {
    setNodeMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[testNode];
      return newMappings;
    });
  }, []);

  // Clear all mappings
  const clearAllNodeMappings = useCallback(() => {
    setNodeMappings({});
  }, []);

  // Clear skipped nodes
  const clearSkippedNodes = useCallback((isGold: boolean) => {
    const setSkipped = isGold ? setGoldSkippedNodes : setTestSkippedNodes;
    setSkipped(new Set());
  }, []);

  // Clear skipped relations
  const clearSkippedRelations = useCallback((isGold: boolean) => {
    const setSkipped = isGold ? setGoldSkippedRelations : setTestSkippedRelations;
    setSkipped(new Set());
  }, []);

  return {
    // Raw data
    goldData,
    testData,

    // Metric results
    gedResults,

    // Gold graph state
    goldSkippedNodes,
    goldSkippedRelations,
    goldBridgedEdges,

    // Test graph state
    testSkippedNodes,
    testSkippedRelations,
    testBridgedEdges,

    // Node mappings
    nodeMappings,

    // Actions
    setGoldData,
    setTestData,
    handleFileUpload,
    toggleNodeSkip,
    toggleRelationSkip,
    setNodeMapping,
    removeNodeMapping,
    clearAllNodeMappings,
    clearSkippedNodes,
    clearSkippedRelations,
  };
}
