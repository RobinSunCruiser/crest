import * as d3 from 'd3';
import {
  DAG_CANVAS_CONFIG,
  DAG_NODE_CONFIG,
  DAG_STYLES,
  DAG_GRADIENTS,
  DAG_ZOOM_CONTROLS_CONFIG,
  DAG_ZOOM_CONFIG
} from '@/features/medical-analysis/visualization/config';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { getEntityColor } from '@/features/medical-analysis/types';
import { EFFECT_DIRECTION_CONFIG } from '@/features/medical-analysis/constants';

export interface DAGNode {
  id: string;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface DAGLink {
  source: string | DAGNode;
  target: string | DAGNode;
  directed: boolean;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic properties from relations
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export class DAGRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: CanvasDimensions;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    this.svg = svg;
    this.dimensions = this.calculateDimensions();
  }

  setupCanvas(results: CausalAnalysisResults | null): void {
    this.svg.selectAll("*").remove();
    this.svg.attr("width", this.dimensions.width).attr("height", this.dimensions.height);

    // Setup definitions
    const defs = this.svg.append("defs");
    this.createGradients(defs);
    this.createArrowMarkers(defs);

    // Background
    this.svg.append("rect")
      .attr("width", this.dimensions.width)
      .attr("height", this.dimensions.height)
      .attr("fill", DAG_STYLES.BACKGROUND.fill)
      .attr("stroke", DAG_STYLES.BACKGROUND.stroke)
      .attr("stroke-width", DAG_STYLES.BACKGROUND.strokeWidth);

    // Title
    if (results) {
      this.svg.append("text")
        .attr("x", this.dimensions.width / 2)
        .attr("y", 25)
        .attr("text-anchor", DAG_STYLES.TITLE.textAnchor)
        .attr("fill", DAG_STYLES.TITLE.fill)
        .attr("font-size", DAG_STYLES.TITLE.fontSize)
        .attr("font-weight", DAG_STYLES.TITLE.fontWeight)
        .text(`Causal DAG: ${results.entities.length} Entities, ${results.relations.length} Relations`);
    }
  }

  createZoomContainer(): d3.Selection<SVGGElement, unknown, null, undefined> {
    return this.svg.append("g").attr("class", "zoom-container");
  }

  createLinks(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    links: DAGLink[],
    onHover: (element: SVGLineElement, event: any, d: DAGLink, isHover: boolean) => void
  ): d3.Selection<SVGLineElement, DAGLink, SVGGElement, unknown> | null {
    if (links.length === 0) return null;

    const linkGroup = container.append("g").attr("class", "links");

    return linkGroup.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", () => this.getStrokeWidth())
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", (d: DAGLink) => d.directed ? 'url(#arrow-directed)' : null)
      .style("cursor", "help")
      .on("mouseover", function(this: SVGLineElement, event: any, d: DAGLink) {
        onHover(this, event, d, true);
      })
      .on("mouseout", function(this: SVGLineElement, event: any, d: DAGLink) {
        onHover(this, event, d, false);
      });
  }

  createEdgeLabels(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    links: DAGLink[]
  ): d3.Selection<SVGTextElement, DAGLink, SVGGElement, unknown> | null {
    if (links.length === 0) return null;

    const labelGroup = container.append("g").attr("class", "edge-labels");

    return labelGroup.selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "2px")
      .attr("paint-order", "stroke")
      .attr("pointer-events", "none")
      .style("user-select", "none")
      .each(function(d: DAGLink) {
        const textElement = d3.select(this);

        // Display all probabilities with color coding
        if (d.probabilities && Array.isArray(d.probabilities) && d.probabilities.length > 0) {
          textElement.text('[');

          d.probabilities.forEach((p: any, idx: number) => {
            const percentText = `${(p.value * 100).toFixed(0)}%`;
            const separator = idx < d.probabilities.length - 1 ? ', ' : '';

            // Get color from centralized config
            const effectConfig = EFFECT_DIRECTION_CONFIG[p.effectDirection as keyof typeof EFFECT_DIRECTION_CONFIG] || EFFECT_DIRECTION_CONFIG.neutral;

            // Create tspan for each probability with its color
            textElement.append('tspan')
              .attr('fill', effectConfig.color)
              .text(percentText + separator);
          });

          textElement.append('tspan')
            .attr('fill', '#1e40af')
            .text(']');
        }
      });
  }

  createNodes(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    nodes: DAGNode[],
    dragBehavior: d3.DragBehavior<SVGGElement, DAGNode, unknown>,
    onHover: (event: any, d: DAGNode, isHover: boolean) => void
  ): d3.Selection<SVGGElement, DAGNode, SVGGElement, unknown> {
    const nodeElements = container.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "grab")
      .call(dragBehavior);

    // Node circles
    nodeElements.append("circle")
      .attr("r", DAG_NODE_CONFIG.RADIUS)
      .attr("fill", () => getEntityColor(null))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", DAG_NODE_CONFIG.STROKE_WIDTH)
      .attr("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))")
      .on("mouseover", (event: any, d: DAGNode) => onHover(event, d, true))
      .on("mouseout", (event: any, d: DAGNode) => onHover(event, d, false));

    // Node labels
    nodeElements.append("text")
      .attr("text-anchor", DAG_STYLES.NODE_LABEL.textAnchor)
      .attr("dy", DAG_STYLES.NODE_LABEL.dy)
      .attr("font-size", DAG_STYLES.NODE_LABEL.fontSize)
      .attr("font-weight", DAG_STYLES.NODE_LABEL.fontWeight)
      .attr("fill", DAG_STYLES.NODE_LABEL.fill)
      .attr("pointer-events", DAG_STYLES.NODE_LABEL.pointerEvents)
      .attr("text-shadow", DAG_STYLES.NODE_LABEL.textShadow)
      .text((d: DAGNode) => this.truncateText(d.id, 8));

    return nodeElements;
  }

  addZoomControls(
    zoomContainer: d3.Selection<SVGGElement, unknown, null, undefined>
  ): void {
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(DAG_ZOOM_CONFIG.SCALE_EXTENT)
      .on("zoom", (event) => {
        zoomContainer.attr("transform", event.transform);
      });

    this.svg.call(zoom);

    // Zoom control buttons
    const zoomControls = this.svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${DAG_ZOOM_CONTROLS_CONFIG.POSITION.x}, ${DAG_ZOOM_CONTROLS_CONFIG.POSITION.y})`);

    const controls = [
      { 
        text: "+", 
        action: () => this.svg.transition()
          .duration(DAG_ZOOM_CONFIG.ANIMATION_DURATION.ZOOM)
          .call(zoom.scaleBy, DAG_ZOOM_CONFIG.SCALE_FACTOR.IN) 
      },
      { 
        text: "−", 
        action: () => this.svg.transition()
          .duration(DAG_ZOOM_CONFIG.ANIMATION_DURATION.ZOOM)
          .call(zoom.scaleBy, DAG_ZOOM_CONFIG.SCALE_FACTOR.OUT) 
      },
      { 
        text: "⌂", 
        action: () => this.svg.transition()
          .duration(DAG_ZOOM_CONFIG.ANIMATION_DURATION.RESET)
          .call(zoom.transform, d3.zoomIdentity) 
      }
    ];

    controls.forEach((control, i) => {
      const button = zoomControls.append("g")
        .attr("transform", `translate(0, ${i * DAG_ZOOM_CONTROLS_CONFIG.BUTTON_SPACING})`)
        .style("cursor", "pointer")
        .on("click", control.action);

      button.append("rect")
        .attr("width", DAG_ZOOM_CONTROLS_CONFIG.BUTTON_SIZE)
        .attr("height", DAG_ZOOM_CONTROLS_CONFIG.BUTTON_SIZE)
        .attr("fill", DAG_STYLES.ZOOM_CONTROLS.button.fill)
        .attr("stroke", DAG_STYLES.ZOOM_CONTROLS.button.stroke)
        .attr("rx", DAG_ZOOM_CONTROLS_CONFIG.BORDER_RADIUS);

      button.append("text")
        .attr("x", DAG_ZOOM_CONTROLS_CONFIG.BUTTON_SIZE / 2)
        .attr("y", 20)
        .attr("text-anchor", DAG_STYLES.ZOOM_CONTROLS.text.textAnchor)
        .attr("font-size", DAG_STYLES.ZOOM_CONTROLS.text.fontSize)
        .attr("font-weight", DAG_STYLES.ZOOM_CONTROLS.text.fontWeight)
        .attr("fill", DAG_STYLES.ZOOM_CONTROLS.text.fill)
        .text(control.text);
    });
  }

  getDimensions(): CanvasDimensions {
    return this.dimensions;
  }

  getStrokeWidth(): number {
    return 2;  // Consistent stroke width for all relations
  }

  private calculateDimensions(): CanvasDimensions {
    if (!this.svg.node()) return { width: DAG_CANVAS_CONFIG.DEFAULT_WIDTH, height: DAG_CANVAS_CONFIG.DEFAULT_HEIGHT };
    
    const containerWidth = this.svg.node()!.parentElement?.clientWidth || DAG_CANVAS_CONFIG.DEFAULT_WIDTH;
    const width = Math.max(DAG_CANVAS_CONFIG.MIN_WIDTH, containerWidth - DAG_CANVAS_CONFIG.PADDING);
    const height = DAG_CANVAS_CONFIG.DEFAULT_HEIGHT;
    
    return { width, height };
  }

  private createGradients(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>): void {
    const gradient = defs.append("linearGradient")
      .attr("id", DAG_GRADIENTS.BACKGROUND.id)
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    
    DAG_GRADIENTS.BACKGROUND.stops.forEach(stop => {
      gradient.append("stop")
        .attr("offset", stop.offset)
        .attr("stop-color", stop.color);
    });
  }

  private createArrowMarkers(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>): void {
    // Create arrow marker for directed relations
    defs.append("marker")
      .attr("id", "arrow-directed")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#3b82f6");

    // No marker needed for undirected relations (they'll just be lines without arrows)
  }


  private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : text.substring(0, maxLength - 2) + "..";
  }
}