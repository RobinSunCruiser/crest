import { useLayoutEffect, useCallback, RefObject } from 'react';
import * as d3 from 'd3';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { useDAGData } from './useDAGData';
import { useDAGSimulation } from './useDAGSimulation';
import { useDAGInteractions } from './useDAGInteractions';
import { DAGRenderer } from '@/features/medical-analysis/visualization/utils/DAGRenderer';
import { TooltipManager } from '@/features/medical-analysis/visualization/utils/TooltipManager';

export const useD3Visualization = (
  svgRef: RefObject<SVGSVGElement>,
  results: CausalAnalysisResults | null
) => {
  const { nodes, links } = useDAGData(results);
  const { createForceSimulation } = useDAGSimulation();
  const { createDragBehavior, createNodeHoverHandler, createLinkHoverHandler } = useDAGInteractions();
  
  // ===== MAIN VISUALIZATION CREATION =====
  const createDAGVisualization = useCallback(() => {
    if (!results || !svgRef.current || nodes.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      
      // Clean up any existing tooltips before clearing
      svg.selectAll(".tooltip").remove();
      
      const renderer = new DAGRenderer(svg);
      const dimensions = renderer.getDimensions();
      const tooltipManager = new TooltipManager(svg, dimensions);
      
      // Setup canvas
      renderer.setupCanvas(results);
      const zoomContainer = renderer.createZoomContainer();
      
      // Create simulation
      const simulation = createForceSimulation(nodes, links, dimensions, results);
      
      // Create interaction handlers
      const dragBehavior = createDragBehavior(simulation);
      const nodeHoverHandler = createNodeHoverHandler(tooltipManager);
      const linkHoverHandler = createLinkHoverHandler(tooltipManager, renderer);
      
      // Render visual elements
      const linkElements = renderer.createLinks(zoomContainer, links, linkHoverHandler);
      const edgeLabelElements = renderer.createEdgeLabels(zoomContainer, links);
      const nodeElements = renderer.createNodes(zoomContainer, nodes, dragBehavior, nodeHoverHandler);

      // Update positions on simulation tick
      simulation.on("tick", () => {
        if (linkElements && links.length > 0) {
          // Update visible links
          linkElements
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

          // Update hover links (invisible wider lines)
          zoomContainer.selectAll("line.hover-link")
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        }

        if (edgeLabelElements && links.length > 0) {
          edgeLabelElements
            .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
            .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
        }

        nodeElements.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
      });

      // Add interactive controls
      renderer.addZoomControls(zoomContainer);
      
    } catch (error) {
      console.error('DAG visualization error:', error);
    }
  }, [results, nodes, links, createForceSimulation, createDragBehavior, createNodeHoverHandler, createLinkHoverHandler, svgRef]);

  // ===== LIFECYCLE HOOKS =====
  
  // Auto-create visualization when results change
  useLayoutEffect(() => {
    if (results && svgRef.current && nodes.length > 0) {
      const timer = setTimeout(() => {
        createDAGVisualization();
      }, 50); // Reduced delay for better responsiveness
      
      return () => clearTimeout(timer);
    }
  }, [results, nodes, links, createDAGVisualization, svgRef]);

  // Add resize observer to handle container size changes
  useLayoutEffect(() => {
    if (!svgRef.current) return;

    let resizeTimer: NodeJS.Timeout;
    
    const resizeObserver = new ResizeObserver(() => {
      if (results) {
        // Clear any existing timer
        if (resizeTimer) clearTimeout(resizeTimer);
        
        // Debounce the resize
        resizeTimer = setTimeout(() => {
          createDAGVisualization();
        }, 200);
      }
    });

    const svgElement = svgRef.current;
    const container = svgElement.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
    };
  }, [results, createDAGVisualization, svgRef]);

  return { createDAGVisualization };
};