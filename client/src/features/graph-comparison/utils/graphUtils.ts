/**
 * Generic Graph Utilities
 *
 * Reusable graph manipulation functions that can be used by any metric.
 */

import { GraphData, NodeMappings, ComparisonGraph, EdgeInfo } from '../types';

/**
 * Options for preprocessing a graph before metric calculation.
 */
export interface PreprocessingOptions {
  skippedNodes: Set<string>;
  skippedRelations: Set<string>;
  nodeMappings?: NodeMappings;
}

/**
 * Preprocess a graph for metric calculation.
 *
 * This is the main preprocessing function that produces a ComparisonGraph
 * suitable for any metric calculator (GED, SHD, etc.).
 *
 * Order of operations:
 * 1. Apply node mappings (name normalization) - mappings applied FIRST
 * 2. Remove skipped nodes and their incident relations
 * 3. Remove explicitly skipped relations
 * 4. Calculate bridged edges through skipped nodes
 *
 * @param data - Raw graph data
 * @param options - Preprocessing options (skipped nodes/relations, mappings)
 * @returns ComparisonGraph ready for metric calculation
 */
export function preprocessGraph(
  data: GraphData,
  options: PreprocessingOptions
): ComparisonGraph {
  const { skippedNodes, skippedRelations, nodeMappings = {} } = options;

  // Step 1: Apply node mappings to get mapped names
  // This creates a mapping from original name to final name
  const getMappedName = (name: string): string => nodeMappings[name] || name;

  // Step 2: Build the set of active nodes (after mapping, excluding skipped)
  const nodes = new Set<string>();
  for (const entity of data.entities) {
    const mappedName = getMappedName(entity.name);
    if (!skippedNodes.has(entity.name)) {
      nodes.add(mappedName);
    }
  }

  // Step 3: Build edges map, applying mappings and filtering skipped
  const edges = new Map<string, EdgeInfo>();
  const bridgedEdges = new Set<string>();

  for (const rel of data.relations) {
    const relKey = `${rel.source}→${rel.target}`;

    // Skip if relation is explicitly skipped
    if (skippedRelations.has(relKey)) continue;

    // Skip if either endpoint is skipped
    if (skippedNodes.has(rel.source) || skippedNodes.has(rel.target)) continue;

    // Apply mappings to get final edge
    const mappedSource = getMappedName(rel.source);
    const mappedTarget = getMappedName(rel.target);
    const mappedKey = `${mappedSource}→${mappedTarget}`;

    // Add edge (Map handles deduplication automatically)
    if (!edges.has(mappedKey)) {
      edges.set(mappedKey, { source: mappedSource, target: mappedTarget });
    }
  }

  // Step 4: Calculate bridged edges for skipped nodes
  // Note: bridgedEdges uses ORIGINAL node names for visualization compatibility,
  // while edges map uses MAPPED names for metric calculation
  for (const skippedNode of skippedNodes) {
    // Find parents (nodes pointing TO the skipped node) - store both original and mapped
    const parents: Array<{ original: string; mapped: string }> = [];
    for (const rel of data.relations) {
      const relKey = `${rel.source}→${rel.target}`;
      if (
        rel.target === skippedNode &&
        !skippedRelations.has(relKey) &&
        !skippedNodes.has(rel.source)
      ) {
        parents.push({ original: rel.source, mapped: getMappedName(rel.source) });
      }
    }

    // Find children (nodes the skipped node points TO) - store both original and mapped
    const children: Array<{ original: string; mapped: string }> = [];
    for (const rel of data.relations) {
      const relKey = `${rel.source}→${rel.target}`;
      if (
        rel.source === skippedNode &&
        !skippedRelations.has(relKey) &&
        !skippedNodes.has(rel.target)
      ) {
        children.push({ original: rel.target, mapped: getMappedName(rel.target) });
      }
    }

    // Create bridged edges from each parent to each child
    for (const parent of parents) {
      for (const child of children) {
        // Check using mapped names for node existence
        if (!nodes.has(parent.mapped) || !nodes.has(child.mapped)) continue;

        // Use mapped names for edges map (metric calculation)
        const mappedKey = `${parent.mapped}→${child.mapped}`;

        // Check if this bridged edge would be explicitly skipped
        const wouldBeSkipped = skippedRelations.has(`${parent.original}→${child.original}`);

        if (!wouldBeSkipped && !edges.has(mappedKey)) {
          edges.set(mappedKey, { source: parent.mapped, target: child.mapped });
          // Use ORIGINAL names for bridgedEdges set (visualization compatibility)
          bridgedEdges.add(`${parent.original}→${child.original}`);
        }
      }
    }
  }

  return { nodes, edges, bridgedEdges };
}
