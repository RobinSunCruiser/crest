import { useCallback } from 'react';
import * as d3 from 'd3';
import { DAG_SIMULATION_CONFIG } from '@/features/medical-analysis/visualization/config';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { DAGNode, DAGLink, calculateHierarchicalY } from './useDAGData';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const useDAGSimulation = () => {
  const createForceSimulation = useCallback((
    nodes: DAGNode[], 
    links: DAGLink[], 
    dimensions: CanvasDimensions, 
    results: CausalAnalysisResults
  ): d3.Simulation<DAGNode, undefined> => {
    const simulation = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(DAG_SIMULATION_CONFIG.CHARGE_STRENGTH))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide().radius(DAG_SIMULATION_CONFIG.COLLISION_RADIUS));

    if (links.length > 0) {
      simulation.force("link", d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(DAG_SIMULATION_CONFIG.LINK_DISTANCE)
        .strength(DAG_SIMULATION_CONFIG.LINK_STRENGTH));
    }

    // Hierarchical positioning
    simulation
      .force("y", d3.forceY()
        .y((d: any) => calculateHierarchicalY(d, dimensions.height, results))
        .strength(DAG_SIMULATION_CONFIG.Y_FORCE_STRENGTH))
      .force("x", d3.forceX(dimensions.width / 2).strength(DAG_SIMULATION_CONFIG.X_FORCE_STRENGTH));

    return simulation;
  }, []);

  return { createForceSimulation };
};