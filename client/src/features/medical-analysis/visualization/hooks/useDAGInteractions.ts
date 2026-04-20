import { useCallback } from 'react';
import * as d3 from 'd3';
import { DAG_NODE_CONFIG, DAG_LINK_CONFIG, DAG_SIMULATION_CONFIG, DAG_ANIMATIONS } from '@/features/medical-analysis/visualization/config';
import { DAGNode, DAGLink } from './useDAGData';
import { TooltipManager, TooltipContent, EdgeTooltipData } from '@/features/medical-analysis/visualization/utils/TooltipManager';
import { DAGRenderer } from '@/features/medical-analysis/visualization/utils/DAGRenderer';

export const useDAGInteractions = () => {
  const createDragBehavior = useCallback((
    simulation: d3.Simulation<DAGNode, undefined>
  ): d3.DragBehavior<SVGGElement, DAGNode, unknown> => {
    return d3.drag<SVGGElement, DAGNode>()
      .on("start", function(event: any, d: DAGNode) {
        event.sourceEvent.stopPropagation();
        
        const selection = d3.select(this);
        selection
          .classed("dragging", true)
          .style("cursor", "grabbing");
        
        selection.select("circle")
          .attr("r", DAG_NODE_CONFIG.RADIUS + DAG_NODE_CONFIG.DRAG_RADIUS_OFFSET)
          .attr("stroke-width", DAG_NODE_CONFIG.HOVER_STROKE_WIDTH);
        
        simulation.alphaTarget(DAG_SIMULATION_CONFIG.ALPHA_TARGET.DRAG).restart();
        d.fx = d.x;
        d.fy = d.y;
        
        // Hide tooltips during drag
        const svgElement = selection.node()?.closest('svg');
        if (svgElement) {
          svgElement.querySelectorAll('.tooltip').forEach((el: any) => el.remove());
        }
      })
      .on("drag", function(event: any, d: DAGNode) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function(_event: any, d: DAGNode) {
        const selection = d3.select(this);
        selection
          .classed("dragging", false)
          .style("cursor", "grab");
        
        selection.select("circle")
          .attr("r", DAG_NODE_CONFIG.RADIUS)
          .attr("stroke-width", DAG_NODE_CONFIG.STROKE_WIDTH);
        
        d.fx = null;
        d.fy = null;
        simulation.alphaTarget(DAG_SIMULATION_CONFIG.ALPHA_TARGET.END);
      });
  }, []);

  const createNodeHoverHandler = useCallback((
    tooltipManager: TooltipManager
  ) => {
    return (event: any, d: DAGNode, isHover: boolean) => {
      const parentNode = d3.select(event.currentTarget.parentNode);
      const isDragging = parentNode.classed("dragging");
      
      if (isDragging) return;

      const circle = d3.select(event.currentTarget);
      
      if (isHover) {
        circle
          .transition()
          .duration(DAG_ANIMATIONS.HOVER_TRANSITION)
          .attr("stroke-width", DAG_NODE_CONFIG.HOVER_STROKE_WIDTH)
          .attr("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.3))");
        
        const tooltipContent: TooltipContent = {
          name: d.id,
          ...d  // Spread all dynamic properties from the DAG node including textEvidence
        };
        tooltipManager.showNodeTooltip(event, tooltipContent);
      } else {
        circle
          .transition()
          .duration(DAG_ANIMATIONS.HOVER_TRANSITION)
          .attr("stroke-width", DAG_NODE_CONFIG.STROKE_WIDTH)
          .attr("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");
        
        tooltipManager.hideTooltip();
      }
    };
  }, []);

  const createLinkHoverHandler = useCallback((
    tooltipManager: TooltipManager,
    renderer: DAGRenderer
  ) => {
    return (element: SVGLineElement, event: any, d: DAGLink, isHover: boolean) => {
      const selection = d3.select(element);
      
      if (isHover) {
        selection
          .transition()
          .duration(DAG_ANIMATIONS.LINK_HOVER)
          .attr("stroke-width", renderer.getStrokeWidth() + DAG_LINK_CONFIG.HOVER_WIDTH_OFFSET)
          .attr("stroke-opacity", 1);
        
        const edgeData: EdgeTooltipData = {
          ...d  // Spread all dynamic properties including source, target, directed, textEvidence
        };
        tooltipManager.showEdgeTooltip(event, edgeData);
      } else {
        selection
          .transition()
          .duration(DAG_ANIMATIONS.LINK_HOVER)
          .attr("stroke-width", renderer.getStrokeWidth())
          .attr("stroke-opacity", 0.8);
        
        tooltipManager.hideTooltip();
      }
    };
  }, []);

  return {
    createDragBehavior,
    createNodeHoverHandler,
    createLinkHoverHandler
  };
};