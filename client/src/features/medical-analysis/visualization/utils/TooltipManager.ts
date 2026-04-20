import * as d3 from 'd3';
import { DAG_TOOLTIP_CONFIG, DAG_STYLES } from '@/features/medical-analysis/visualization/config';
import { EFFECT_DIRECTION_CONFIG } from '@/features/medical-analysis/constants';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipContent {
  name: string;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic additional properties
}

export interface EdgeTooltipData {
  source: string | { id: string };
  target: string | { id: string };
  directed: boolean;
  textEvidence: string;
  [key: string]: any;  // Allow dynamic additional properties
}

export class TooltipManager {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: { width: number; height: number };

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    dimensions: { width: number; height: number }
  ) {
    this.svg = svg;
    this.dimensions = dimensions;
  }

  showNodeTooltip(event: any, content: TooltipContent): void {
    // Force cleanup of any existing tooltips first
    this.svg.selectAll(".tooltip").remove();
    
    const tooltip = this.svg.append("g").attr("class", "tooltip");
    const [mouseX, mouseY] = d3.pointer(event, this.svg.node());
    
    const tooltipBg = tooltip.append("rect")
      .attr("fill", DAG_STYLES.TOOLTIP.fill)
      .attr("rx", DAG_STYLES.TOOLTIP.rx)
      .attr("stroke", DAG_STYLES.TOOLTIP.stroke)
      .attr("stroke-width", DAG_STYLES.TOOLTIP.strokeWidth);
    
    const tooltipText = tooltip.append("text")
      .attr("fill", "white")
      .attr("font-family", DAG_STYLES.TOOLTIP.fontFamily)
      .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
      .attr("y", 20);
    
    this.addNodeTooltipContent(tooltipText, content);
    this.positionTooltip(tooltip, tooltipBg, tooltipText, mouseX, mouseY);
  }

  showEdgeTooltip(event: any, data: EdgeTooltipData): void {
    // Force cleanup of any existing tooltips first
    this.svg.selectAll(".tooltip").remove();
    
    const tooltip = this.svg.append("g").attr("class", "tooltip");
    const [mouseX, mouseY] = d3.pointer(event, this.svg.node());
    
    const tooltipBg = tooltip.append("rect")
      .attr("fill", DAG_STYLES.TOOLTIP.fill)
      .attr("rx", DAG_STYLES.TOOLTIP.rx)
      .attr("stroke", DAG_STYLES.TOOLTIP.stroke)
      .attr("stroke-width", DAG_STYLES.TOOLTIP.strokeWidth);
    
    const tooltipText = tooltip.append("text")
      .attr("fill", "white")
      .attr("font-family", DAG_STYLES.TOOLTIP.fontFamily)
      .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
      .attr("y", 20);
    
    this.addEdgeTooltipContent(tooltipText, data);
    this.positionTooltip(tooltip, tooltipBg, tooltipText, mouseX, mouseY);
  }

  hideTooltip(): void {
    // Immediate cleanup for better responsiveness
    const tooltips = this.svg.selectAll(".tooltip");
    if (!tooltips.empty()) {
      tooltips
        .transition()
        .duration(DAG_TOOLTIP_CONFIG.ANIMATION_DURATION)
        .style("opacity", 0)
        .remove();
    }
  }

  private addNodeTooltipContent(
    textElement: d3.Selection<SVGTextElement, unknown, null, undefined>,
    content: TooltipContent
  ): void {
    // Name (Title) - always first
    textElement.append("tspan")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(content.name);
    
    // Get all fields except name, textEvidence, and internal DAG properties
    const internalDagFields = ['id', 'x', 'y', 'fx', 'fy', 'index', 'vx', 'vy'];
    const dynamicFields = Object.keys(content).filter(
      key => key !== 'name' && 
             key !== 'textEvidence' && 
             !internalDagFields.includes(key)
    );
    
    // Add dynamic fields
    dynamicFields.forEach(fieldKey => {
      const value = content[fieldKey];
      if (value !== undefined && value !== null && value !== '') {
        const fieldLabel = fieldKey === 'type' ? 'Type' : 
          fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1');
        
        textElement.append("tspan")
          .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
          .attr("dy", "1.4em")
          .attr("font-size", "12px")
          .attr("fill", "#e2e8f0")
          .text(`${fieldLabel}: ${String(value)}`);
      }
    });
    
    // Text Evidence - always last with text wrapping
    if (content.textEvidence) {
      this.addWrappedText(
        textElement, 
        `Evidence: "${content.textEvidence}"`, 
        DAG_TOOLTIP_CONFIG.TEXT_WRAP_LENGTH.DESCRIPTION, 
        "#94a3b8", 
        "10px"
      );
    }
  }

  private addEdgeTooltipContent(
    textElement: d3.Selection<SVGTextElement, unknown, null, undefined>,
    data: EdgeTooltipData
  ): void {
    const sourceId = typeof data.source === 'string' ? data.source : data.source.id;
    const targetId = typeof data.target === 'string' ? data.target : data.target.id;

    // Relationship with direction indicator
    textElement.append("tspan")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(`${sourceId} ${data.directed ? '→' : '↔'} ${targetId}`);
    
    // Direction type
    textElement.append("tspan")
      .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
      .attr("dy", "1.4em")
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0")
      .text(`Direction: ${data.directed ? 'Directed' : 'Undirected'}`);
    
    // Get all fields except core required ones and internal properties
    const coreFields = ['source', 'target', 'directed', 'textEvidence', 'probabilities'];
    const internalDagFields = ['id', 'x', 'y', 'fx', 'fy', 'index', 'vx', 'vy'];
    const dynamicFields = Object.keys(data).filter(
      key => !coreFields.includes(key) &&
             !internalDagFields.includes(key) &&
             data[key] !== undefined &&
             data[key] !== null &&
             data[key] !== ''
    );

    // Add dynamic fields
    dynamicFields.forEach(fieldKey => {
      const value = data[fieldKey];
      const fieldLabel = fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1');

      let displayValue = String(value);
      if (typeof value === 'number' && fieldKey.toLowerCase().includes('confidence')) {
        displayValue = `${(value * 100).toFixed(0)}%`;
      }

      textElement.append("tspan")
        .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
        .attr("dy", "1.4em")
        .attr("font-size", "12px")
        .attr("fill", "#e2e8f0")
        .text(`${fieldLabel}: ${displayValue}`);
    });

    // Evidence with text wrapping
    if (data.textEvidence) {
      this.addWrappedText(
        textElement,
        `Evidence: "${data.textEvidence}"`,
        DAG_TOOLTIP_CONFIG.TEXT_WRAP_LENGTH.EVIDENCE,
        "#94a3b8",
        "10px"
      );
    }

    // Add probability estimates (at the bottom)
    if (data.probabilities && Array.isArray(data.probabilities) && data.probabilities.length > 0) {
      textElement.append("tspan")
        .attr("x", DAG_TOOLTIP_CONFIG.PADDING)
        .attr("dy", "1.4em")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#fbbf24")
        .text(`Probabilities (${data.probabilities.length}):`);

      data.probabilities.forEach((prob: any, idx: number) => {
        // Get effect config from centralized configuration
        const effectConfig = EFFECT_DIRECTION_CONFIG[prob.effectDirection as keyof typeof EFFECT_DIRECTION_CONFIG] || EFFECT_DIRECTION_CONFIG.neutral;

        // Probability value
        textElement.append("tspan")
          .attr("x", DAG_TOOLTIP_CONFIG.PADDING + 10)
          .attr("dy", "1.2em")
          .attr("font-size", "11px")
          .attr("fill", "#e2e8f0")
          .text(`[${idx + 1}] ${(prob.value * 100).toFixed(1)}% `);

        // Effect direction with color (symbol + label, seamlessly integrated)
        textElement.append("tspan")
          .attr("font-size", "11px")
          .attr("fill", effectConfig.color)
          .text(`${effectConfig.symbol} ${effectConfig.label} `);

        // Source
        textElement.append("tspan")
          .attr("font-size", "11px")
          .attr("fill", "#e2e8f0")
          .text(`(${prob.source})`);

        // Show full text evidence with wrapping (same indent, color, and font size)
        this.addWrappedText(
          textElement,
          `     "${prob.textEvidence}"`,
          DAG_TOOLTIP_CONFIG.TEXT_WRAP_LENGTH.EVIDENCE,
          "#e2e8f0",
          "11px",
          DAG_TOOLTIP_CONFIG.PADDING + 10
        );
      });
    }
  }

  private addWrappedText(
    textElement: d3.Selection<SVGTextElement, unknown, null, undefined>,
    text: string,
    maxLineLength: number,
    color: string,
    fontSize: string,
    xOffset: number = DAG_TOOLTIP_CONFIG.PADDING
  ): void {
    const words = text.split(' ');
    let line = '';
    let isFirstLine = true;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      if (testLine.length > maxLineLength && line) {
        textElement.append("tspan")
          .attr("x", xOffset)
          .attr("dy", isFirstLine ? "1.4em" : "1.2em")
          .attr("font-size", fontSize)
          .attr("fill", color)
          .text(line);
        line = word;
        isFirstLine = false;
      } else {
        line = testLine;
      }
    }

    // Add the last line
    if (line) {
      textElement.append("tspan")
        .attr("x", xOffset)
        .attr("dy", isFirstLine ? "1.4em" : "1.2em")
        .attr("font-size", fontSize)
        .attr("fill", color)
        .text(line);
    }
  }

  private positionTooltip(
    tooltip: d3.Selection<SVGGElement, unknown, null, undefined>,
    tooltipBg: d3.Selection<SVGRectElement, unknown, null, undefined>,
    tooltipText: d3.Selection<SVGTextElement, unknown, null, undefined>,
    mouseX: number,
    mouseY: number
  ): void {
    const bbox = tooltipText.node()!.getBBox();
    const tooltipWidth = Math.min(
      bbox.width + (DAG_TOOLTIP_CONFIG.PADDING * 2), 
      this.dimensions.width * DAG_TOOLTIP_CONFIG.MAX_WIDTH_RATIO
    );
    const tooltipHeight = bbox.height + (DAG_TOOLTIP_CONFIG.PADDING * 2);
    
    const position = this.calculateTooltipPosition(mouseX, mouseY, tooltipWidth, tooltipHeight);
    
    tooltipBg.attr("width", tooltipWidth).attr("height", tooltipHeight);
    tooltip.attr("transform", `translate(${position.x}, ${position.y})`);
    
    tooltip.style("opacity", 0)
      .transition()
      .duration(DAG_TOOLTIP_CONFIG.ANIMATION_DURATION)
      .style("opacity", 1);
  }

  private calculateTooltipPosition(
    mouseX: number,
    mouseY: number,
    tooltipWidth: number,
    tooltipHeight: number
  ): TooltipPosition {
    let x = mouseX + DAG_TOOLTIP_CONFIG.OFFSET;
    let y = mouseY - DAG_TOOLTIP_CONFIG.OFFSET;
    
    // Horizontal positioning
    if (x + tooltipWidth > this.dimensions.width - DAG_TOOLTIP_CONFIG.MARGIN) {
      x = mouseX - tooltipWidth - DAG_TOOLTIP_CONFIG.OFFSET;
    }
    if (x < DAG_TOOLTIP_CONFIG.MARGIN) {
      x = DAG_TOOLTIP_CONFIG.MARGIN;
    }
    
    // Vertical positioning
    if (y < DAG_TOOLTIP_CONFIG.MARGIN) {
      y = mouseY + DAG_TOOLTIP_CONFIG.OFFSET * 2;
    }
    if (y + tooltipHeight > this.dimensions.height - DAG_TOOLTIP_CONFIG.MARGIN) {
      y = this.dimensions.height - tooltipHeight - DAG_TOOLTIP_CONFIG.MARGIN;
    }
    
    return { x, y };
  }
}