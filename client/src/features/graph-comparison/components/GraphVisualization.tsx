/**
 * GraphVisualization Component
 *
 * D3.js-based interactive graph visualization.
 * Renders nodes and edges with support for:
 * - Draggable nodes
 * - Clickable nodes and edges
 * - Zoom and pan
 * - Different visual states (skipped, bridged, mapped)
 */

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphType, NodeMappings } from '../types';

interface GraphVisualizationProps {
  data: GraphData;
  graphType: GraphType;
  skippedNodes: Set<string>;
  skippedRelations: Set<string>;
  bridgedEdges: Set<string>;
  nodeMappings?: NodeMappings;
  onNodeClick: (nodeName: string) => void;
  onEdgeClick: (source: string, target: string) => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  graphType,
  skippedNodes,
  skippedRelations,
  bridgedEdges,
  nodeMappings = {},
  onNodeClick,
  onEdgeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Dynamic canvas sizing based on node count
    const BASE_WIDTH = 600;
    const MAX_WIDTH = 1400;
    const nodeCount = data.entities.length;
    // Scale width: +30px per additional node beyond base of 5 nodes
    const dynamicWidth = Math.min(MAX_WIDTH, BASE_WIDTH + Math.max(0, (nodeCount - 5)) * 30);

    const width = dynamicWidth;
    const height = 630; // Increased by 20% from 525px

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);

    // Define arrow markers
    const defs = svg.append('defs');

    // Standard arrow
    defs
      .append('marker')
      .attr('id', `arrowhead-${graphType}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Skipped edge arrow
    defs
      .append('marker')
      .attr('id', `arrowhead-skipped-${graphType}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#dc2626');

    // Bridged edge arrow
    defs
      .append('marker')
      .attr('id', `arrowhead-bridged-${graphType}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3b82f6');

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Prepare nodes and links
    const visibleNodes = data.entities.filter((e) => !skippedNodes.has(e.name));
    const nodes = visibleNodes.map((e) => {
      // Restore previous position if it exists to prevent graph from restarting
      const savedPosition = nodePositionsRef.current.get(e.name);
      return {
        id: e.name,
        label: e.name,
        evidence: e.textEvidence,
        x: savedPosition?.x,
        y: savedPosition?.y,
      };
    });

    const links: Array<{
      source: string;
      target: string;
      evidence?: string;
      bridged: boolean;
    }> = [];

    // Add regular relations
    data.relations.forEach((r) => {
      if (!skippedNodes.has(r.source) && !skippedNodes.has(r.target)) {
        links.push({
          source: r.source,
          target: r.target,
          evidence: r.textEvidence,
          bridged: false,
        });
      }
    });

    // Add bridged edges
    bridgedEdges.forEach((edgeKey) => {
      const [source, target] = edgeKey.split('→');
      links.push({
        source,
        target,
        evidence: 'Bridged connection through skipped node(s)',
        bridged: true,
      });
    });

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(120)
          .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(40))
      .force('bounds', () => {
        // Keep nodes within canvas bounds to prevent drifting
        nodes.forEach((node: any) => {
          const padding = 50;
          node.x = Math.max(padding, Math.min(width - padding, node.x));
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        });
      });

    // Edge styling helpers
    const getEdgeColor = (d: any) => {
      const edgeKey = `${d.source.id}→${d.target.id}`;
      if (skippedRelations.has(edgeKey)) return '#dc2626';
      if (d.bridged || bridgedEdges.has(edgeKey)) return '#3b82f6';
      return '#94a3b8';
    };

    const getEdgeMarker = (d: any) => {
      const edgeKey = `${d.source.id}→${d.target.id}`;
      if (skippedRelations.has(edgeKey)) return `url(#arrowhead-skipped-${graphType})`;
      if (d.bridged || bridgedEdges.has(edgeKey)) return `url(#arrowhead-bridged-${graphType})`;
      return `url(#arrowhead-${graphType})`;
    };

    const getEdgeOpacity = (d: any) => {
      const edgeKey = `${d.source.id}→${d.target.id}`;
      if (skippedRelations.has(edgeKey)) return 0.4;
      if (d.bridged || bridgedEdges.has(edgeKey)) return 0.8;
      return 0.6;
    };

    const getEdgeStrokeDasharray = (d: any) => {
      const edgeKey = `${d.source.id}→${d.target.id}`;
      if (skippedRelations.has(edgeKey)) return '5,5';
      return 'none';
    };

    // Create edges container
    const linkGroup = g.append('g');

    // Create visible edges
    const link = linkGroup
      .selectAll('path.visible-edge')
      .data(links)
      .join('path')
      .attr('class', 'visible-edge')
      .attr('fill', 'none')
      .attr('stroke', getEdgeColor)
      .attr('stroke-width', (d: any) => {
        const edgeKey = `${d.source.id}→${d.target.id}`;
        if (d.bridged || bridgedEdges.has(edgeKey)) return 3;
        return 2;
      })
      .attr('opacity', getEdgeOpacity)
      .attr('stroke-dasharray', getEdgeStrokeDasharray)
      .attr('marker-end', getEdgeMarker)
      .style('pointer-events', 'none'); // Let the invisible overlay handle clicks

    // Create invisible wider edges for easier clicking
    const linkClickArea = linkGroup
      .selectAll('path.click-area')
      .data(links)
      .join('path')
      .attr('class', 'click-area')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 12) // Much wider clickable area
      .style('cursor', 'pointer')
      .on('click', function (event, d: any) {
        event.stopPropagation();
        onEdgeClick(d.source.id, d.target.id);
      });

    // Drag behavior
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, _d: any) {
      if (!event.active) simulation.alphaTarget(0);
    }

    // Create node groups
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Node styling helpers
    const getNodeFill = (d: any) => {
      if (skippedNodes.has(d.id)) return '#ef4444';
      if (nodeMappings[d.id]) return '#3b82f6';
      return '#6b7280';
    };

    const getNodeStroke = (d: any) => {
      if (skippedNodes.has(d.id)) return '#991b1b';
      return '#374151';
    };

    // Node circles
    node
      .append('circle')
      .attr('r', 18)
      .attr('fill', getNodeFill)
      .attr('stroke', getNodeStroke)
      .attr('stroke-width', 2);

    // X mark for skipped nodes
    node
      .filter((d: any) => skippedNodes.has(d.id))
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none')
      .text('✕');

    // Node click handler
    node.on('click', function (event, d: any) {
      event.stopPropagation();
      onNodeClick(d.id);
    });

    // Node labels
    node
      .append('text')
      .attr('dy', 30)
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', '#1f2937')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text((d: any) => {
        if (graphType === 'test' && nodeMappings[d.id]) {
          return `${d.label} → ${nodeMappings[d.id]}`;
        }
        return d.label;
      })
      .each(function (d: any) {
        const text = d3.select(this);
        const displayLabel =
          graphType === 'test' && nodeMappings[d.id] ? `${d.label} → ${nodeMappings[d.id]}` : d.label;
        const words = displayLabel.split(/\s+/);
        if (words.length > 1) {
          text.text('');
          words.forEach((word: string, i: number) => {
            text
              .append('tspan')
              .attr('x', 0)
              .attr('dy', i === 0 ? 30 : 12)
              .text(word);
          });
        }
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      const pathData = (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      };

      // Update both visible edge and click area
      link.attr('d', pathData);
      linkClickArea.attr('d', pathData);

      node.attr('transform', (d: any) => {
        // Save node positions to prevent graph from restarting on repaint
        nodePositionsRef.current.set(d.id, { x: d.x, y: d.y });
        return `translate(${d.x},${d.y})`;
      });
    });
  }, [data, skippedNodes, skippedRelations, bridgedEdges, nodeMappings, graphType]); // Removed onNodeClick, onEdgeClick to prevent repainting on clicks

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '630px', // Increased by 20% from 525px
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
      }}
    />
  );
};
