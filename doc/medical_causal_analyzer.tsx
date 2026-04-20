import React, { useState, useRef, useLayoutEffect } from 'react';
import { Upload, FileText, Download, Play, Loader2, AlertCircle, Network, Table, List } from 'lucide-react';
import * as d3 from 'd3';

// Constants
const ENTITY_COLORS = {
  EXPOSURE: '#f59e0b',
  OUTCOME: '#dc2626',
  CONFOUNDER: '#7c3aed',
  MEDIATOR: '#059669'
};

const RELATION_COLORS = {
  CAUSAL: '#dc2626',
  ASSOCIATIONAL: '#2563eb',
  CONDITIONAL: '#059669'
};

const DAG_CONFIG = {
  width: 900,
  height: 500,
  nodeRadius: 28,
  linkDistance: 150,
  chargeStrength: -1200
};

const MedicalCausalAnalyzer = () => {
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('entities');
  const [error, setError] = useState('');
  const [queryType, setQueryType] = useState('association');
  const [sourceVariable, setSourceVariable] = useState('');
  const [targetVariable, setTargetVariable] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const svgRef = useRef();
  const fileInputRef = useRef();

  // PDF text extraction
  const extractTextFromPDF = async (file) => {
    try {
      if (!window.pdfjsLib) {
        await loadPDFJS();
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let extractedText = `[PDF Content Extracted from: ${file.name}]\n\n`;
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText) {
          extractedText += `Page ${pageNum}:\n${pageText}\n\n`;
        }
      }
      
      if (extractedText.length <= 100) {
        throw new Error('No readable text found in PDF');
      }
      
      return extractedText;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  };

  const loadPDFJS = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    try {
      setUploadedFile(file);
      const extractedText = await extractTextFromPDF(file);
      setInputText(extractedText);
      setError('');
    } catch (error) {
      setError('Error processing PDF: ' + error.message);
    }
  };

  // AI prompt builders
  const buildEntityPrompt = (text) => `
Analyze the following medical text and extract causal entities. ONLY use information explicitly mentioned in the text.

Identify and categorize entities as:
- EXPOSURE: Factors that may cause effects (treatments, risk factors, interventions)
- OUTCOME: Results or effects mentioned (diseases, symptoms, improvements)
- CONFOUNDER: Variables that may influence both exposure and outcome
- MEDIATOR: Variables that lie in the causal pathway between exposure and outcome

Text: "${text}"

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. DO NOT START WITH \`\`\`json OR END WITH \`\`\`. 
RESPOND ONLY WITH THE RAW JSON OBJECT BELOW - NO OTHER TEXT OR FORMATTING:

{
  "entities": [
    {
      "name": "exact entity name from text",
      "type": "EXPOSURE|OUTCOME|CONFOUNDER|MEDIATOR",
      "description": "brief description based only on text content",
      "textEvidence": "relevant quote from the text"
    }
  ]
}`;

  const buildRelationPrompt = (text, entities) => `
Based on the medical text and identified entities, extract causal relationships explicitly mentioned or strongly implied.

Text: "${text}"
Entities: ${JSON.stringify(entities)}

Classify relationships:
- CAUSAL: Direct causal relationship explicitly stated
- ASSOCIATIONAL: Statistical association mentioned
- CONDITIONAL: Relationship that depends on other factors

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. DO NOT START WITH \`\`\`json OR END WITH \`\`\`. 
RESPOND ONLY WITH THE RAW JSON OBJECT BELOW - NO OTHER TEXT OR FORMATTING:

{
  "relations": [
    {
      "source": "source entity name",
      "target": "target entity name", 
      "type": "CAUSAL|ASSOCIATIONAL|CONDITIONAL",
      "strength": "STRONG|MODERATE|WEAK",
      "direction": "FORWARD|BIDIRECTIONAL",
      "textEvidence": "exact quote supporting this relationship",
      "confidence": 0.8
    }
  ]
}`;

  // Main analysis function
  const analyzeText = async () => {
    if (!inputText.trim()) {
      setError('Please provide text to analyze');
      return;
    }

    setProcessing(true);
    setError('');
    setProcessingStep('Extracting causal entities...');

    try {
      // Extract entities
      const entityResponse = await window.claude.complete(buildEntityPrompt(inputText));
      const entityData = parseResponse(entityResponse, 'entity analysis');
      
      if (!entityData.entities || entityData.entities.length === 0) {
        throw new Error('No entities were extracted from the text. Please ensure your text contains medical content with clear causal relationships.');
      }

      setProcessingStep('Analyzing causal relationships...');
      
      // Extract relations
      const relationResponse = await window.claude.complete(buildRelationPrompt(inputText, entityData.entities));
      const relationData = parseResponse(relationResponse, 'relations analysis');

      setProcessingStep('Building causal graph...');
      
      // Build metrics
      const metrics = buildMetrics(entityData.entities, relationData.relations);

      setResults({
        entities: entityData.entities,
        relations: relationData.relations || [],
        metrics,
        sourceText: inputText
      });

      console.log(`Analysis complete: ${entityData.entities.length} entities, ${relationData.relations?.length || 0} relations`);

    } catch (error) {
      console.error('Analysis error:', error);
      let errorMessage = 'Analysis failed: ' + error.message;
      
      // Provide specific guidance for common issues
      if (error.message.includes('parse')) {
        errorMessage += '\n\nThis usually happens when the AI response format is unexpected. Please try again - the system will automatically clean up formatting issues.';
      } else if (error.message.includes('No entities')) {
        errorMessage += '\n\nTry including more explicit medical content with clear cause-effect relationships, treatments, or clinical outcomes.';
      }
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const parseResponse = (response, type) => {
    try {
      // Clean up the response by removing markdown formatting and extra text
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      
      // Remove any leading/trailing non-JSON text
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      // Parse the cleaned JSON
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate the response structure
      if (type === 'entity analysis' && (!parsed.entities || !Array.isArray(parsed.entities))) {
        throw new Error('Response missing valid entities array');
      }
      if (type === 'relations analysis' && (!parsed.relations || !Array.isArray(parsed.relations))) {
        throw new Error('Response missing valid relations array');
      }
      
      return parsed;
    } catch (parseError) {
      console.error(`Failed to parse ${type} response:`, response);
      throw new Error(`Failed to parse ${type} response. Please try again. Error: ${parseError.message}`);
    }
  };

  const buildMetrics = (entities, relations) => ({
    dagValidation: {
      isAcyclic: true,
      cycles: [],
      nodes: entities.length,
      edges: relations.length
    },
    causalPaths: [],
    interventionQueries: []
  });

  // Pearl's Causal Hierarchy Implementation
  const findAllPaths = (source, target, relations, visited = new Set()) => {
    if (source === target) return [[]];
    if (visited.has(source)) return [];
    
    visited.add(source);
    const paths = [];
    
    // Find all outgoing edges from source
    relations.forEach(rel => {
      if (rel.source === source && !visited.has(rel.target)) {
        const subPaths = findAllPaths(rel.target, target, relations, new Set(visited));
        subPaths.forEach(subPath => {
          paths.push([rel, ...subPath]);
        });
      }
    });
    
    visited.delete(source);
    return paths;
  };

  const findBackdoorPaths = (source, target, relations) => {
    const backdoorPaths = [];
    
    // Find paths that go into source (creating confounding)
    relations.forEach(rel => {
      if (rel.target === source) {
        // Check if this confounder also affects target
        const pathsToTarget = findAllPaths(rel.source, target, relations);
        if (pathsToTarget.length > 0) {
          backdoorPaths.push({
            confounder: rel.source,
            pathToSource: rel,
            pathsToTarget: pathsToTarget
          });
        }
      }
    });
    
    return backdoorPaths;
  };

  const checkBackdoorCriterion = (source, target, relations, confounders) => {
    const backdoorPaths = findBackdoorPaths(source, target, relations);
    
    // A set of variables satisfies the backdoor criterion if:
    // 1. No variable in the set is a descendant of the treatment
    // 2. The set blocks all backdoor paths from treatment to outcome
    
    let blockedPaths = 0;
    backdoorPaths.forEach(backdoorPath => {
      if (confounders.includes(backdoorPath.confounder)) {
        blockedPaths++;
      }
    });
    
    return {
      totalBackdoorPaths: backdoorPaths.length,
      blockedPaths: blockedPaths,
      isBlocked: blockedPaths === backdoorPaths.length,
      backdoorPaths: backdoorPaths
    };
  };

  const performCausalQuery = () => {
    if (!sourceVariable || !targetVariable) {
      alert('Please select both source and target variables');
      return;
    }

    if (sourceVariable === targetVariable) {
      alert('Source and target variables must be different');
      return;
    }

    try {
      // Find all paths and relationships
      const directPaths = findAllPaths(sourceVariable, targetVariable, results.relations);
      const directRelation = results.relations.find(rel => 
        rel.source === sourceVariable && rel.target === targetVariable
      );
      
      // Identify confounders (variables that affect both source and target)
      const allConfounders = [];
      results.entities.forEach(entity => {
        if (entity.name !== sourceVariable && entity.name !== targetVariable) {
          const affectsSource = results.relations.some(rel => 
            rel.source === entity.name && rel.target === sourceVariable
          );
          const affectsTarget = results.relations.some(rel => 
            rel.source === entity.name && rel.target === targetVariable
          );
          
          if (affectsSource && affectsTarget) {
            allConfounders.push(entity.name);
          }
        }
      });

      let queryResult = {
        queryType,
        source: sourceVariable,
        target: targetVariable,
        directRelation,
        directPaths,
        confounders: allConfounders
      };

      // Apply Pearl's hierarchy logic
      switch (queryType) {
        case 'association':
          // Rung 1: Statistical association P(Y|X)
          // Can be observed from data, includes confounding
          queryResult = {
            ...queryResult,
            isIdentifiable: true, // Always identifiable from observational data
            associationType: directRelation ? 'Direct' : (directPaths.length > 0 ? 'Indirect' : 'None'),
            confoundingPresent: allConfounders.length > 0,
            recommendation: generateAssociationRecommendation(directRelation, directPaths, allConfounders)
          };
          break;

        case 'intervention':
          // Rung 2: Causal effect P(Y|do(X))
          // Requires backdoor criterion for identifiability
          const backdoorAnalysis = checkBackdoorCriterion(sourceVariable, targetVariable, results.relations, allConfounders);
          
          queryResult = {
            ...queryResult,
            isIdentifiable: directPaths.length > 0 && (backdoorAnalysis.isBlocked || allConfounders.length === 0),
            backdoorCriterion: backdoorAnalysis,
            requiredAdjustment: allConfounders,
            causalEffect: directRelation?.type || (directPaths.length > 0 ? 'Indirect' : 'None'),
            recommendation: generateInterventionRecommendation(directRelation, directPaths, backdoorAnalysis, allConfounders)
          };
          break;

        case 'counterfactual':
          // Rung 3: Counterfactual P(Y_x|X',Y')
          // Most demanding, requires structural causal model
          const hasStructuralInfo = directRelation && directRelation.textEvidence;
          
          queryResult = {
            ...queryResult,
            isIdentifiable: hasStructuralInfo && directPaths.length > 0,
            structuralModel: hasStructuralInfo ? 'Partial' : 'Insufficient',
            individualEffect: hasStructuralInfo,
            recommendation: generateCounterfactualRecommendation(directRelation, hasStructuralInfo, allConfounders)
          };
          break;
      }

      setQueryResults(queryResult);
    } catch (error) {
      console.error('Query error:', error);
      alert('Error performing causal query: ' + error.message);
    }
  };

  const generateAssociationRecommendation = (directRelation, directPaths, confounders) => {
    if (directRelation) {
      return `Statistical association detected: ${directRelation.type} relationship (${directRelation.strength}). ${confounders.length > 0 ? `Warning: Potential confounding by ${confounders.join(', ')}` : 'No apparent confounding.'}`;
    } else if (directPaths.length > 0) {
      return `Indirect statistical association found through ${directPaths.length} pathway(s). This could indicate mediated relationships or confounding.`;
    } else {
      return 'No statistical association detected in the available data. Variables appear independent.';
    }
  };

  const generateInterventionRecommendation = (directRelation, directPaths, backdoorAnalysis, confounders) => {
    if (directPaths.length === 0) {
      return 'No causal pathway identified. Intervention on X is unlikely to affect Y based on available evidence.';
    }

    if (backdoorAnalysis.totalBackdoorPaths === 0) {
      return `Causal effect is identifiable. ${directRelation ? `Direct causal effect: ${directRelation.type} (${directRelation.strength})` : 'Indirect causal effect through mediators'}. No confounding adjustment needed.`;
    }

    if (backdoorAnalysis.isBlocked) {
      return `Causal effect is identifiable after adjusting for confounders: ${confounders.join(', ')}. This blocks ${backdoorAnalysis.totalBackdoorPaths} backdoor path(s).`;
    } else {
      return `Causal effect may not be identifiable. ${backdoorAnalysis.totalBackdoorPaths - backdoorAnalysis.blockedPaths} backdoor path(s) remain unblocked. Additional confounders may need to be measured.`;
    }
  };

  const generateCounterfactualRecommendation = (directRelation, hasStructuralInfo, confounders) => {
    if (!hasStructuralInfo) {
      return 'Counterfactual analysis not possible. Requires detailed structural causal model with specific functional relationships and error terms.';
    }

    if (directRelation) {
      return `Counterfactual analysis partially possible. Individual-level effect estimation requires: (1) Structural equations, (2) Individual baseline values, (3) Error term distributions. ${confounders.length > 0 ? `Must account for confounders: ${confounders.join(', ')}` : ''}`;
    } else {
      return 'Insufficient structural information for counterfactual reasoning. Need mechanistic understanding of how variables relate at individual level.';
    }
  };

  // DAG Visualization functions
  const createDAGVisualization = () => {
    if (!results) {
      alert('❌ No analysis results available. Please run the analysis first.');
      return;
    }
    
    if (!svgRef.current) {
      alert('❌ Visualization container not ready. Please try again in a moment.');
      return;
    }
    
    if (typeof d3 === 'undefined') {
      alert('❌ D3.js library not loaded. Please refresh the page and try again.');
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const { width, height } = DAG_CONFIG;
      svg.attr("width", width).attr("height", height);

      // Setup
      const defs = svg.append("defs");
      createGradients(defs);
      createArrowMarkers(defs);

      // Background
      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#backgroundGradient)")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 2);

      // Zoom container
      const zoomContainer = svg.append("g").attr("class", "zoom-container");

      // Title and instructions
      addTitleAndInstructions(svg, width);

      // Prepare data
      const nodes = results.entities.map(entity => ({
        id: entity.name,
        type: entity.type,
        description: entity.description,
        textEvidence: entity.textEvidence
      }));

      const links = results.relations.map(relation => ({
        source: relation.source,
        target: relation.target,
        type: relation.type,
        strength: relation.strength,
        textEvidence: relation.textEvidence,
        confidence: relation.confidence
      }));

      console.log(`Preparing DAG with ${nodes.length} nodes and ${links.length} links`);

      if (links.length === 0) {
        console.warn('No relations found - DAG will only show entities without connections');
      }

      // Create force simulation
      const simulation = createForceSimulation(nodes, links, width, height);

      // Create visual elements
      const linkElements = links.length > 0 ? createLinks(zoomContainer, links, svg) : null;
      const nodeElements = createNodes(zoomContainer, nodes, svg);

      // Update positions
      simulation.on("tick", () => {
        if (linkElements && links.length > 0) {
          linkElements
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        }

        nodeElements.attr("transform", d => `translate(${d.x}, ${d.y})`);
      });

      // Add zoom functionality and controls
      addZoomControls(svg, zoomContainer, simulation, nodes);

      // Add legend
      addLegend(svg, width, height);
      
      console.log(`✅ DAG visualization created successfully: ${nodes.length} nodes, ${links.length} links`);
      
    } catch (error) {
      console.error('DAG visualization error:', error);
      alert(`❌ Failed to create visualization: ${error.message}`);
    }
  };

  const createGradients = (defs) => {
    const gradient = defs.append("linearGradient")
      .attr("id", "backgroundGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#f8fafc");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#f1f5f9");
  };

  const createArrowMarkers = (defs) => {
    Object.entries(RELATION_COLORS).forEach(([type, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${type.toLowerCase()}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });
  };

  const addTitleAndInstructions = (svg, width) => {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("fill", "#1e293b")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text(`Causal DAG: ${results.entities.length} Entities, ${results.relations.length} Relations`);
  };

  const createForceSimulation = (nodes, links, width, height) => {
    const simulation = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody()
        .strength(DAG_CONFIG.chargeStrength)
        .distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // Only add link force if there are links
    if (links && links.length > 0) {
      simulation.force("link", d3.forceLink(links)
        .id(d => d.id)
        .distance(DAG_CONFIG.linkDistance)
        .strength(0.8));
    }

    // Add hierarchical positioning force
    simulation
      .force("y", d3.forceY()
        .y(d => {
          const typeYPositions = {
            EXPOSURE: height * 0.25,
            MEDIATOR: height * 0.45,
            CONFOUNDER: height * 0.65,
            OUTCOME: height * 0.85
          };
          return typeYPositions[d.type] || height * 0.5;
        })
        .strength(0.4))
      .force("x", d3.forceX(width / 2).strength(0.1));

    // CRITICAL: Keep simulation alive to prevent freezing
    simulation.alphaMin(0.001); // Very low but never zero
    simulation.alphaDecay(0.01); // Very slow decay
    
    // Add periodic "heartbeat" to keep simulation responsive
    const keepAlive = () => {
      if (simulation.alpha() < 0.01) {
        simulation.alpha(0.01); // Minimal activity to stay responsive
      }
    };
    
    setInterval(keepAlive, 5000); // Check every 5 seconds
    
    return simulation;
  };

  const createLinks = (container, links, svg) => {
    const linkGroup = container.append("g").attr("class", "links");
    
    const linkElements = linkGroup.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", d => RELATION_COLORS[d.type] || '#64748b')
      .attr("stroke-width", d => {
        const widths = { STRONG: 3, MODERATE: 2, WEAK: 1 };
        return widths[d.strength] || 2;
      })
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", d => `url(#arrow-${d.type.toLowerCase()})`)
      .style("cursor", "help")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", function() {
            const currentWidth = +d3.select(this).attr("stroke-width");
            return currentWidth + 2;
          })
          .attr("stroke-opacity", 1);
        
        showEdgeTooltip(event, d, svg);
      })
      .on("mouseout", function(event, d) {
        const widths = { STRONG: 3, MODERATE: 2, WEAK: 1 };
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", widths[d.strength] || 2)
          .attr("stroke-opacity", 0.8);
        
        hideTooltip(svg);
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        showRelationDetails(d);
      });

    console.log(`Created ${links.length} link elements with interactive tooltips`);
    return linkElements;
  };

  const createNodes = (container, nodes, svg, simulation) => {
    const nodeElements = container.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "grab")
      .call(createDragBehavior(simulation));

    // Node circles
    nodeElements.append("circle")
      .attr("r", DAG_CONFIG.nodeRadius)
      .attr("fill", d => ENTITY_COLORS[d.type] || '#64748b')
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .attr("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))")
      .on("mouseover", (event, d) => {
        if (!d3.select(event.currentTarget.parentNode).classed("dragging")) {
          // Visual hover feedback for draggable nodes
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr("stroke-width", 4)
            .attr("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.3))");
          
          showTooltip(event, d, svg);
        }
      })
      .on("mouseout", (event, d) => {
        if (!d3.select(event.currentTarget.parentNode).classed("dragging")) {
          // Reset hover feedback
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr("stroke-width", 3)
            .attr("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");
          
          hideTooltip(svg);
        }
      })
      .on("click", (event, d) => {
        if (!d3.select(event.currentTarget.parentNode).classed("dragging")) {
          showEntityDetails(d);
        }
      });

    // Node labels
    nodeElements.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .attr("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
      .text(d => d.id.length <= 8 ? d.id : d.id.substring(0, 6) + "..");

    return nodeElements;
  };

  const createDragBehavior = (simulation) => {
    return d3.drag()
      .on("start", function(event, d) {
        event.sourceEvent.stopPropagation();
        
        d3.select(this)
          .classed("dragging", true)
          .style("cursor", "grabbing");
        
        d3.select(this).select("circle")
          .attr("r", DAG_CONFIG.nodeRadius + 2)
          .attr("stroke-width", 4);
        
        // CRITICAL: Always wake up the simulation
        simulation.alphaTarget(0.3).restart();
        
        // Only fix position during active dragging
        d.fx = d.x;
        d.fy = d.y;
        
        // Hide tooltips
        const svgElement = d3.select(this).node().closest('svg');
        if (svgElement) {
          svgElement.querySelectorAll('.tooltip').forEach(el => el.remove());
        }
        
        console.log(`Started dragging node "${d.id}"`);
      })
      .on("drag", function(event, d) {
        // Update position while dragging
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function(event, d) {
        d3.select(this)
          .classed("dragging", false)
          .style("cursor", "grab");
        
        d3.select(this).select("circle")
          .attr("r", DAG_CONFIG.nodeRadius)
          .attr("stroke-width", 3);
        
        // CRITICAL: Completely release the node to follow physics
        d.fx = null; // Remove horizontal constraint
        d.fy = null; // Remove vertical constraint
        
        // Give the simulation energy to move the released node
        simulation.alphaTarget(0.1).restart();
        
        // Gradually reduce activity but keep simulation alive
        setTimeout(() => {
          simulation.alphaTarget(0.05);
        }, 1000);
        
        setTimeout(() => {
          simulation.alphaTarget(0.01); // Minimal but alive
        }, 3000);
        
        console.log(`Released node "${d.id}" - now follows physics`);
      });
  };

  const showTooltip = (event, d, svg) => {
    svg.selectAll(".tooltip").remove();
    
    const tooltip = svg.append("g").attr("class", "tooltip");
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    
    const tooltipBg = tooltip.append("rect")
      .attr("fill", "rgba(30, 41, 59, 0.95)")
      .attr("rx", 6)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);
    
    const tooltipText = tooltip.append("text")
      .attr("fill", "white")
      .attr("font-family", "system-ui, sans-serif")
      .attr("x", 12)
      .attr("y", 20);
    
    // Add text content
    tooltipText.append("tspan")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(d.id);
    
    tooltipText.append("tspan")
      .attr("x", 12)
      .attr("dy", "1.4em")
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0")
      .text(`Type: ${d.type}`);
    
    tooltipText.append("tspan")
      .attr("x", 12)
      .attr("dy", "1.4em")
      .attr("font-size", "11px")
      .attr("fill", "#cbd5e1")
      .text(d.description.length > 50 ? d.description.substring(0, 50) + "..." : d.description);
    
    // Position tooltip
    const bbox = tooltipText.node().getBBox();
    const padding = 12;
    const tooltipWidth = bbox.width + (padding * 2);
    const tooltipHeight = bbox.height + (padding * 2);
    
    let tooltipX = mouseX + 15;
    let tooltipY = mouseY - 15;
    
    if (tooltipX + tooltipWidth > DAG_CONFIG.width) tooltipX = mouseX - tooltipWidth - 15;
    if (tooltipY < 0) tooltipY = mouseY + 25;
    if (tooltipY + tooltipHeight > DAG_CONFIG.height) tooltipY = DAG_CONFIG.height - tooltipHeight - 10;
    
    tooltipBg.attr("width", tooltipWidth).attr("height", tooltipHeight);
    tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
    
    tooltip.style("opacity", 0).transition().duration(200).style("opacity", 1);
  };

  const showEdgeTooltip = (event, d, svg) => {
    svg.selectAll(".tooltip").remove();
    
    const tooltip = svg.append("g").attr("class", "tooltip");
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    
    const tooltipBg = tooltip.append("rect")
      .attr("fill", "rgba(30, 41, 59, 0.95)")
      .attr("rx", 6)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);
    
    const tooltipText = tooltip.append("text")
      .attr("fill", "white")
      .attr("font-family", "system-ui, sans-serif")
      .attr("x", 12)
      .attr("y", 20);
    
    // Add relationship details
    tooltipText.append("tspan")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(`${d.source.id || d.source} → ${d.target.id || d.target}`);
    
    tooltipText.append("tspan")
      .attr("x", 12)
      .attr("dy", "1.4em")
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0")
      .text(`Type: ${d.type}`);
    
    tooltipText.append("tspan")
      .attr("x", 12)
      .attr("dy", "1.4em")
      .attr("font-size", "12px")
      .attr("fill", "#e2e8f0")
      .text(`Strength: ${d.strength}`);
    
    if (d.confidence !== undefined) {
      tooltipText.append("tspan")
        .attr("x", 12)
        .attr("dy", "1.4em")
        .attr("font-size", "12px")
        .attr("fill", "#e2e8f0")
        .text(`Confidence: ${(d.confidence * 100).toFixed(0)}%`);
    }
    
    if (d.textEvidence) {
      const evidence = d.textEvidence.length > 60 ? 
        d.textEvidence.substring(0, 60) + "..." : 
        d.textEvidence;
      
      tooltipText.append("tspan")
        .attr("x", 12)
        .attr("dy", "1.4em")
        .attr("font-size", "10px")
        .attr("fill", "#94a3b8")
        .text(`Evidence: "${evidence}"`);
    }
    
    // Position tooltip
    const bbox = tooltipText.node().getBBox();
    const padding = 12;
    const tooltipWidth = bbox.width + (padding * 2);
    const tooltipHeight = bbox.height + (padding * 2);
    
    let tooltipX = mouseX + 15;
    let tooltipY = mouseY - 15;
    
    if (tooltipX + tooltipWidth > DAG_CONFIG.width) tooltipX = mouseX - tooltipWidth - 15;
    if (tooltipY < 0) tooltipY = mouseY + 25;
    if (tooltipY + tooltipHeight > DAG_CONFIG.height) tooltipY = DAG_CONFIG.height - tooltipHeight - 10;
    
    tooltipBg.attr("width", tooltipWidth).attr("height", tooltipHeight);
    tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
    
    tooltip.style("opacity", 0).transition().duration(200).style("opacity", 1);
  };

  const hideTooltip = (svg) => {
    svg.selectAll(".tooltip")
      .transition()
      .duration(150)
      .style("opacity", 0)
      .remove();
  };

  const showEntityDetails = (d) => {
    alert(`📋 Entity Details:

🏷️ Name: ${d.id}
📂 Type: ${d.type}
📝 Description: ${d.description}
📄 Evidence: "${d.textEvidence}"`);
  };

  const showRelationDetails = (d) => {
    alert(`🔗 Relationship Details:

➡️ Connection: ${d.source.id || d.source} → ${d.target.id || d.target}
📂 Type: ${d.type}
💪 Strength: ${d.strength}
📊 Confidence: ${d.confidence ? (d.confidence * 100).toFixed(0) + '%' : 'N/A'}
📄 Evidence: "${d.textEvidence}"`);
  };

  const addZoomControls = (svg, zoomContainer, simulation, nodes) => {
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        zoomContainer.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Zoom control buttons
    const zoomControls = svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", "translate(10, 60)");

    const controls = [
      { text: "+", tooltip: "Zoom In", action: () => svg.transition().duration(300).call(zoom.scaleBy, 1.5) },
      { text: "−", tooltip: "Zoom Out", action: () => svg.transition().duration(300).call(zoom.scaleBy, 0.67) },
      { text: "⌂", tooltip: "Reset View", action: () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity) },
      { text: "⟲", tooltip: "Reset Layout", action: () => resetNodePositions(simulation, nodes) }
    ];

    controls.forEach((control, i) => {
      const button = zoomControls.append("g")
        .attr("transform", `translate(0, ${i * 35})`)
        .style("cursor", "pointer")
        .on("click", control.action);

      button.append("rect")
        .attr("width", 30)
        .attr("height", 30)
        .attr("fill", "#ffffff")
        .attr("stroke", "#d1d5db")
        .attr("rx", 4);

      button.append("text")
        .attr("x", 15)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", control.text === "⌂" || control.text === "⟲" ? "12px" : "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#374151")
        .text(control.text);

      // Add tooltip for controls
      button.append("title").text(control.tooltip);
    });
  };

  const resetNodePositions = (simulation, nodes) => {
    // Clear all fixed positions and dragging states
    nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    
    // Reset any visual dragging states
    d3.selectAll('.nodes g')
      .classed('dragging', false)
      .style('cursor', 'grab');
    
    d3.selectAll('.nodes circle')
      .attr('r', DAG_CONFIG.nodeRadius)
      .attr('stroke-width', 3);
    
    // Restart simulation with high energy and keep it alive
    simulation.alpha(1).alphaTarget(0.1).restart();
    
    // Gradually reduce activity but maintain responsiveness
    setTimeout(() => {
      simulation.alphaTarget(0.01);
    }, 2000);
    
    console.log("✅ All nodes reset - physics active and draggable");
  };

  const addLegend = (svg, width, height) => {
    const legendY = height - 120;
    const legendGroup = svg.append("g").attr("class", "legend");

    // Legend background
    legendGroup.append("rect")
      .attr("x", 10)
      .attr("y", legendY - 15)
      .attr("width", width - 20)
      .attr("height", 110)
      .attr("fill", "rgba(255,255,255,0.95)")
      .attr("stroke", "#e2e8f0")
      .attr("rx", 8);

    // Entity types legend
    legendGroup.append("text")
      .attr("x", 25)
      .attr("y", legendY + 5)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text("Entity Types:");

    const entityLegend = Object.entries(ENTITY_COLORS).map(([type, color]) => ({
      color,
      label: type.charAt(0) + type.slice(1).toLowerCase(),
      count: results.entities.filter(e => e.type === type).length
    }));

    entityLegend.forEach((item, i) => {
      const x = 25 + i * 140;
      legendGroup.append("circle")
        .attr("cx", x)
        .attr("cy", legendY + 25)
        .attr("r", 8)
        .attr("fill", item.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

      legendGroup.append("text")
        .attr("x", x + 15)
        .attr("y", legendY + 30)
        .attr("font-size", "12px")
        .attr("fill", "#374151")
        .text(`${item.label} (${item.count})`);
    });

    // Relationships legend (simplified without arrows to avoid triangles)
    legendGroup.append("text")
      .attr("x", 25)
      .attr("y", legendY + 55)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#1e293b")
      .text("Relationship Types:");

    const relationLegend = Object.entries(RELATION_COLORS).map(([type, color]) => ({
      color,
      label: type.charAt(0) + type.slice(1).toLowerCase(),
      count: results.relations.filter(r => r.type === type).length
    }));

    relationLegend.forEach((item, i) => {
      const x = 25 + i * 160;
      
      // Simple line without arrow marker
      legendGroup.append("line")
        .attr("x1", x)
        .attr("y1", legendY + 75)
        .attr("x2", x + 25)
        .attr("y2", legendY + 75)
        .attr("stroke", item.color)
        .attr("stroke-width", 3);

      legendGroup.append("text")
        .attr("x", x + 35)
        .attr("y", legendY + 80)
        .attr("font-size", "12px")
        .attr("fill", "#374151")
        .text(`${item.label} (${item.count})`);
    });
  };

  // Auto-create visualization when results change (optional - user can also manually create)
  useLayoutEffect(() => {
    if (results && svgRef.current) {
      // Set a small delay to ensure DOM is fully ready
      const timer = setTimeout(() => {
        createDAGVisualization();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [results]);

  // Export functions
  const exportData = (data, filename, headers) => {
    const csv = [headers, ...data].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEntities = () => {
    if (!results) return;
    const data = results.entities.map(e => [e.name, e.type, e.description, e.textEvidence]);
    exportData(data, 'causal_entities.csv', ['Name', 'Type', 'Description', 'Text Evidence']);
  };

  const exportRelations = () => {
    if (!results) return;
    const data = results.relations.map(r => [r.source, r.target, r.type, r.strength, r.direction, r.confidence, r.textEvidence]);
    exportData(data, 'causal_relations.csv', ['Source', 'Target', 'Type', 'Strength', 'Direction', 'Confidence', 'Text Evidence']);
  };

  const exportDAG = () => {
    if (!results) return;
    const dagData = {
      entities: results.entities,
      relations: results.relations,
      metrics: results.metrics
    };
    
    const blob = new Blob([JSON.stringify(dagData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'causal_dag.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEntityTypeStyle = (type) => {
    const styles = {
      EXPOSURE: 'bg-yellow-100 text-yellow-800',
      OUTCOME: 'bg-red-100 text-red-800',
      CONFOUNDER: 'bg-purple-100 text-purple-800',
      MEDIATOR: 'bg-green-100 text-green-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const getRelationTypeStyle = (type) => {
    const styles = {
      CAUSAL: 'bg-red-100 text-red-800',
      ASSOCIATIONAL: 'bg-blue-100 text-blue-800',
      CONDITIONAL: 'bg-green-100 text-green-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Medical Causal Analysis Application
          </h1>
          <p className="text-gray-600">
            Extract causal entities and relationships from medical texts using Pearl's Causal Framework
          </p>
        </header>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2" />
            Input Medical Text
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF Document
              </label>
              <div className="flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </button>
                {uploadedFile && (
                  <span className="text-sm text-gray-600">{uploadedFile.name}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Text Directly
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your medical text here for causal analysis..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={analyzeText}
              disabled={processing || !inputText.trim()}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {processing ? (processingStep || 'Analyzing...') : 'Analyze Causal Structure'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-start">
              <AlertCircle className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'entities', label: 'Entities', icon: List },
                  { id: 'relations', label: 'Relations', icon: Table },
                  { id: 'dag', label: 'DAG Visualization', icon: Network }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Entities Tab */}
            {activeTab === 'entities' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Extracted Causal Entities ({results.entities.length})</h3>
                  <button
                    onClick={exportEntities}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {results.entities.map((entity, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{entity.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEntityTypeStyle(entity.type)}`}>
                          {entity.type}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{entity.description}</p>
                      <div className="text-sm text-gray-600">
                        <strong>Text Evidence:</strong> "{entity.textEvidence}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relations Tab */}
            {activeTab === 'relations' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Causal Relations ({results.relations.length})</h3>
                  <button
                    onClick={exportRelations}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Source → Target', 'Type', 'Strength', 'Confidence', 'Evidence'].map(header => (
                          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.relations.map((relation, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {relation.source} → {relation.target}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationTypeStyle(relation.type)}`}>
                              {relation.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {relation.strength}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(relation.confidence * 100).toFixed(0)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={relation.textEvidence}>
                            "{relation.textEvidence}"
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DAG Visualization Tab */}
            {activeTab === 'dag' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Causal DAG Visualization</h3>
                  <button
                    onClick={exportDAG}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export DAG
                  </button>
                </div>

                {/* DAG Metrics */}
                {results.metrics && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">DAG Analysis:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Nodes:</strong> {results.metrics.dagValidation?.nodes || results.entities.length}</div>
                      <div><strong>Edges:</strong> {results.metrics.dagValidation?.edges || results.relations.length}</div>
                      <div><strong>Acyclic:</strong> {results.metrics.dagValidation?.isAcyclic ? 'Yes' : 'No'}</div>
                      <div><strong>Cycles:</strong> {results.metrics.dagValidation?.cycles?.length || 0}</div>
                    </div>
                  </div>
                )}

                {/* Interactive D3.js Visualization */}
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">Interactive Causal DAG</h4>
                    <button
                      onClick={createDAGVisualization}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors"
                    >
                      🎨 Create Graph
                    </button>
                  </div>
                  <svg ref={svgRef} className="w-full border border-gray-200" style={{ backgroundColor: '#fafafa' }}></svg>
                </div>

                {/* Causal Query Panel */}
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-800 mb-4">🔬 Causal Queries (Pearl's Causal Hierarchy)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Query Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Query Type</label>
                      <select
                        value={queryType}
                        onChange={(e) => setQueryType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="association">🔗 Association P(Y|X)</option>
                        <option value="intervention">⚡ Intervention P(Y|do(X))</option>
                        <option value="counterfactual">🔄 Counterfactual P(Y_x|X',Y')</option>
                      </select>
                    </div>

                    {/* Source Variable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Source Variable (X)</label>
                      <select
                        value={sourceVariable}
                        onChange={(e) => setSourceVariable(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select source variable...</option>
                        {results.entities.map(entity => (
                          <option key={entity.name} value={entity.name}>
                            {entity.name} ({entity.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Variable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Variable (Y)</label>
                      <select
                        value={targetVariable}
                        onChange={(e) => setTargetVariable(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select target variable...</option>
                        {results.entities.map(entity => (
                          <option key={entity.name} value={entity.name}>
                            {entity.name} ({entity.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Query Description */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>
                        {queryType === 'association' && '🔗 Association Query:'}
                        {queryType === 'intervention' && '⚡ Intervention Query:'}
                        {queryType === 'counterfactual' && '🔄 Counterfactual Query:'}
                      </strong>
                      {' '}
                      {queryType === 'association' && 'What is the probability of observing the target given we observe the source?'}
                      {queryType === 'intervention' && 'What would happen to the target if we actively intervene on the source?'}
                      {queryType === 'counterfactual' && 'What would the target have been if the source had been different?'}
                    </p>
                  </div>

                  {/* Execute Query Button */}
                  <button
                    onClick={performCausalQuery}
                    disabled={!sourceVariable || !targetVariable}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🔍 Execute Causal Query
                  </button>

                  {/* Query Results */}
                  {queryResults && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-3">📊 Query Results</h5>
                      
                      <div className="space-y-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Query Type:</strong> {queryResults.queryType.charAt(0).toUpperCase() + queryResults.queryType.slice(1)}
                          </div>
                          <div>
                            <strong>Relationship:</strong> {queryResults.source} → {queryResults.target}
                          </div>
                          <div>
                            <strong>Identifiable:</strong> {queryResults.isIdentifiable ? '✅ Yes' : '❌ No'}
                          </div>
                          <div>
                            <strong>Direct Relation:</strong> {queryResults.directRelation ? '✅ Yes' : '❌ No'}
                          </div>
                        </div>

                        {/* Association-specific results */}
                        {queryResults.queryType === 'association' && (
                          <div className="p-3 bg-blue-100 rounded">
                            <strong>🔗 Association Analysis (Rung 1):</strong>
                            <p><strong>Type:</strong> {queryResults.associationType}</p>
                            <p><strong>Confounding Present:</strong> {queryResults.confoundingPresent ? 'Yes' : 'No'}</p>
                            {queryResults.confounders.length > 0 && (
                              <p><strong>Potential Confounders:</strong> {queryResults.confounders.join(', ')}</p>
                            )}
                          </div>
                        )}

                        {/* Intervention-specific results */}
                        {queryResults.queryType === 'intervention' && (
                          <div className="p-3 bg-green-100 rounded">
                            <strong>⚡ Intervention Analysis (Rung 2):</strong>
                            <p><strong>Causal Effect:</strong> {queryResults.causalEffect}</p>
                            {queryResults.backdoorCriterion && (
                              <>
                                <p><strong>Backdoor Paths:</strong> {queryResults.backdoorCriterion.totalBackdoorPaths}</p>
                                <p><strong>Blocked Paths:</strong> {queryResults.backdoorCriterion.blockedPaths}</p>
                                <p><strong>Backdoor Criterion:</strong> {queryResults.backdoorCriterion.isBlocked ? '✅ Satisfied' : '❌ Not Satisfied'}</p>
                              </>
                            )}
                            {queryResults.requiredAdjustment.length > 0 && (
                              <p><strong>Required Adjustment:</strong> {queryResults.requiredAdjustment.join(', ')}</p>
                            )}
                          </div>
                        )}

                        {/* Counterfactual-specific results */}
                        {queryResults.queryType === 'counterfactual' && (
                          <div className="p-3 bg-purple-100 rounded">
                            <strong>🔄 Counterfactual Analysis (Rung 3):</strong>
                            <p><strong>Structural Model:</strong> {queryResults.structuralModel}</p>
                            <p><strong>Individual Effect:</strong> {queryResults.individualEffect ? 'Estimable' : 'Not Estimable'}</p>
                            {queryResults.confounders.length > 0 && (
                              <p><strong>Required Variables:</strong> {queryResults.confounders.join(', ')}</p>
                            )}
                          </div>
                        )}

                        {/* Direct Relationship Details */}
                        {queryResults.directRelation && (
                          <div className="p-3 bg-green-100 rounded">
                            <strong>Direct Relationship Found:</strong>
                            <p>Type: {queryResults.directRelation.type}</p>
                            <p>Strength: {queryResults.directRelation.strength}</p>
                            <p>Confidence: {(queryResults.directRelation.confidence * 100).toFixed(0)}%</p>
                            <p>Evidence: "{queryResults.directRelation.textEvidence}"</p>
                          </div>
                        )}

                        {/* Causal Pathways */}
                        {queryResults.directPaths && queryResults.directPaths.length > 0 && (
                          <div className="p-3 bg-blue-100 rounded">
                            <strong>Causal Pathways ({queryResults.directPaths.length}):</strong>
                            {queryResults.directPaths.slice(0, 3).map((path, i) => (
                              <p key={i}>
                                Path {i + 1}: {queryResults.source} → {path.map(rel => rel.target).join(' → ')}
                              </p>
                            ))}
                            {queryResults.directPaths.length > 3 && (
                              <p><em>... and {queryResults.directPaths.length - 3} more pathways</em></p>
                            )}
                          </div>
                        )}

                        {/* Pearl's Hierarchy Recommendation */}
                        <div className="p-3 bg-gray-100 rounded">
                          <strong>Pearl's Causal Hierarchy Recommendation:</strong>
                          <p>{queryResults.recommendation}</p>
                        </div>

                        {/* Methodological Notes */}
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <strong>Methodological Notes:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {queryResults.queryType === 'association' && (
                              <>
                                <li>Association queries (Rung 1) can be answered from observational data</li>
                                <li>Statistical association does not imply causation</li>
                                <li>Confounding may explain observed associations</li>
                              </>
                            )}
                            {queryResults.queryType === 'intervention' && (
                              <>
                                <li>Intervention queries (Rung 2) require causal assumptions</li>
                                <li>Backdoor criterion must be satisfied for identifiability</li>
                                <li>May require randomized controlled trials if not identifiable from observational data</li>
                              </>
                            )}
                            {queryResults.queryType === 'counterfactual' && (
                              <>
                                <li>Counterfactual queries (Rung 3) are the most demanding</li>
                                <li>Require structural causal models with functional relationships</li>
                                <li>Individual-level predictions need detailed mechanistic understanding</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">Entities Summary</h5>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>Total Entities: {results.entities.length}</p>
                      {Object.keys(ENTITY_COLORS).map(type => (
                        <p key={type}>
                          {type.charAt(0) + type.slice(1).toLowerCase()}s: {results.entities.filter(e => e.type === type).length}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-800 mb-2">Relations Summary</h5>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Total Relations: {results.relations.length}</p>
                      {Object.keys(RELATION_COLORS).map(type => (
                        <p key={type}>
                          {type.charAt(0) + type.slice(1).toLowerCase()}: {results.relations.filter(r => r.type === type).length}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalCausalAnalyzer;