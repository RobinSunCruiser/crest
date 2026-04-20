/**
 * Default prompts for medical causal analysis
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a medical causal analysis expert specializing in Pearl's causality framework. Your role is to:

1. Extract causal entities from medical texts according to Pearl's causal hierarchy
2. Identify causal relationships that would form edges in a directed acyclic graph (DAG)
3. Apply rigorous causal reasoning principles including temporal precedence and biological plausibility
4. Distinguish between direct causation, association, and confounding relationships
5. Provide evidence-based analysis with specific text quotes supporting your conclusions

Key principles to follow:
- Use only information explicitly stated or strongly implied in the provided text
- Apply Pearl's three levels of causality: association, intervention, and counterfactual reasoning
- Consider temporal relationships when mentioned (causes must precede effects)
- Focus on biologically and mechanistically plausible relationships
- Maintain scientific rigor and acknowledge uncertainty when evidence is limited

Always respond with properly formatted JSON as requested, without markdown code blocks or additional formatting.`;

export const DEFAULT_VALIDATION_PROMPT = `Fix entity-relation matching issues. Some endpoint names don't match any entity names.

AVAILABLE ENTITIES:
\${entityList}

MISMATCHED ENDPOINTS:
\${validationIssues}

For each mismatched endpoint, either:
1. RENAME it to an exact entity name (only if same medical concept)
2. DELETE it (if no good match exists)

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. RESPOND ONLY WITH RAW JSON:

{
  "renamings": [
    {
      "oldName": "exact mismatched name",
      "newName": "exact entity name"
    }
  ],
  "deletions": [
    "exact mismatched name to delete"
  ]
}`;
export const DEFAULT_ENTITY_PROMPT = `Extract causal variables from the medical text. Focus on variables that participate in causal relationships.

Requirements:
- Extract ONLY variables explicitly mentioned in the text
- Focus on variables involved in causal claims or relationships
- When multiple medical conditions are listed together (e.g., "preeclampsia, fetal macrosomia, shoulder dystocia"), extract each condition as a separate individual entity
- You may add any additional properties you find relevant (e.g., type, category, description, timing, etc.)

Text: "\${text}"

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. DO NOT START WITH \`\`\`json OR END WITH \`\`\`. 
RESPOND ONLY WITH THE RAW JSON OBJECT BELOW - NO OTHER TEXT OR FORMATTING:

{
  "entities": [
    {
      "name": "exact variable name from text",
      "textEvidence": "relevant quote from the text"
    }
  ]
}`;

export const DEFAULT_RELATION_PROMPT = `Extract causal relationships from the medical text. Focus on relationships that would form edges in a causal graph.

Text: "\${text}"

EXTRACTED ENTITIES (YOU MUST USE THESE EXACT NAMES):
\${entities}

Requirements:
- source and target MUST be EXACT entity names from the list above
- directed: true for directional relationships (A causes B), false for bidirectional/undirected
- You may add any additional properties you find relevant (e.g., type, strength, mechanism, confidence, etc.)

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. DO NOT START WITH \`\`\`json OR END WITH \`\`\`. 
RESPOND ONLY WITH THE RAW JSON OBJECT BELOW - NO OTHER TEXT OR FORMATTING:

{
  "relations": [
    {
      "source": "EXACT entity name from list above",
      "target": "EXACT entity name from list above", 
      "directed": true,
      "textEvidence": "exact quote supporting this relationship"
    }
  ]
}`;

/**
 * Merge prompts for iterative analysis (adding to existing data)
 */
export const DEFAULT_ENTITY_MERGE_PROMPT = `🚨 PRESERVATION REQUIREMENT: ALL \${entityCount} EXISTING ENTITIES MUST BE KEPT
EXISTING ENTITIES TO PRESERVE AND MERGE WITH (\${entityCount} total):
\${existingEntities}

⚠️  CRITICAL MERGE STRATEGY:
STEP 1: START with ALL existing entities as your foundation - NEVER remove any
STEP 2: Analyze new text for additional entities
STEP 3: For each new entity, decide to MERGE or ADD:

MERGE CONDITIONS (update existing entity):
- Medically equivalent terms for the same concept:
  • "myocardial infarction" = "heart attack" = "MI" = "cardiac infarction"
  • "hypertension" = "high blood pressure" = "HTN" = "elevated BP"
  • "diabetes mellitus" = "diabetes" = "DM" = "high blood sugar"
  • "cerebrovascular accident" = "stroke" = "CVA" = "brain attack"
  • "gastroesophageal reflux" = "GERD" = "acid reflux" = "heartburn"
  • "chronic kidney disease" = "CKD" = "renal failure" = "kidney dysfunction"

MERGE ACTIONS (when entities are equivalent):
- Name: Keep most medically precise term
- Evidence: "Original evidence | ADDITIONAL: new evidence"
- Additional fields: Merge or enhance any additional properties

ADD CONDITIONS (create new entity):
- Represents a genuinely different medical concept
- Cannot be medically equated to any existing entity
- Covers new aspects not represented in existing entities

TOPIC DIVERSITY HANDLING:
- If new text covers different medical topics (e.g., existing: cardiology, new: neurology):
  → KEEP all existing cardiology entities + ADD new neurology entities
- If new text provides more context for existing topics:
  → ENHANCE existing entities with additional information
- NEVER assume different topics mean existing entities should be removed

FINAL OUTPUT MUST CONTAIN:
✓ All \${entityCount} existing entities (preserved or enhanced through merging)
✓ Plus any genuinely new entities from the new text
✓ Minimum \${entityCount} entities, potentially more

`;

export const DEFAULT_RELATION_MERGE_PROMPT = `🚨 PRESERVATION REQUIREMENT: ALL \${relationCount} EXISTING RELATIONS MUST BE KEPT
EXISTING RELATIONS TO PRESERVE AND UPDATE (\${relationCount} total):
\${existingRelations}

EXISTING ENTITIES FOR REFERENCE:
\${existingEntityList}

⚠️  CRITICAL RELATION MERGE STRATEGY:
STEP 1: START with ALL existing relations as your foundation - NEVER remove any
STEP 2: Analyze new text for additional relations
STEP 3: For each relation in new text, decide to UPDATE or ADD:

UPDATE CONDITIONS (enhance existing relation):
- Same source → target pair already exists
- Same entities involved but different direction (A→B vs B→A)
- Additional evidence for existing relationship

UPDATE ACTIONS:
- Strengthen evidence: WEAK + WEAK = MODERATE, MODERATE + evidence = STRONG
- Combine evidence: "Original evidence | ADDITIONAL: new evidence"
- Resolve conflicts: Higher confidence evidence takes precedence
- Handle bidirectional: A→B + B→A with evidence = BIDIRECTIONAL relation
- Confidence boost: +0.1 to +0.3 for supporting evidence
- Preserve conflicts: "Original evidence | CONFLICTING: contradictory evidence"

ADD CONDITIONS (create new relation):
- Different source → target pair not in existing relations
- Genuinely new causal pathway discovered
- Relations between newly added entities

TOPIC DIVERSITY HANDLING:
- If new text covers different medical areas (e.g., existing: cardiac relations, new: neurological):
  → KEEP all existing cardiac relations + ADD new neurological relations
- If new text is unrelated to existing relations:
  → PRESERVE all existing relations + ADD any new relations from new text
- NEVER assume different topics mean existing relations should be removed

EVIDENCE PRIORITY (highest to lowest):
- Direct causal language ("causes", "leads to", "results in", "triggers")
- Mechanistic explanations ("through pathway", "by affecting", "via mechanism")
- Temporal sequences ("followed by", "preceded by", "subsequently")
- Correlational language ("associated with", "related to", "linked to")

FINAL OUTPUT MUST CONTAIN:
✓ All \${relationCount} existing relations (preserved or enhanced)
✓ Plus any genuinely new relations from the new text
✓ Minimum \${relationCount} relations, potentially more

`;

export const DEFAULT_PROBABILITY_PROMPT = `Extract explicit probability values mentioned in the text for the identified causal relations.

Text: "\${text}"

IDENTIFIED RELATIONS (YOU MUST USE THESE EXACT PAIRS):
\${relationList}

Requirements:
- Only extract probabilities that are EXPLICITLY mentioned in the text
- Look for percentages (e.g., "70% of patients", "increases risk by 30%")
- Look for proportions (e.g., "3 in 4 patients", "odds ratio of 2.5")
- Look for probability statements (e.g., "probability of 0.75", "risk of 25%")
- Each probability must have:
  * value: number between 0 and 1 (convert percentages: 75% = 0.75) - ALWAYS POSITIVE
  * effectDirection: "positive" | "negative" | "neutral"
    - "positive" = the source INCREASES the target (e.g., "smoking increases cancer risk by 30%")
    - "negative" = the source DECREASES the target (e.g., "exercise reduces heart disease risk by 25%")
    - "neutral" = direction is unclear, not specified, or the text only mentions correlation without clear direction
  * source: where this probability came from (e.g., "Page 3", study name, or "Original text")
  * textEvidence: exact quote containing the probability
- If a relation has NO explicit probability in the text, DO NOT include it
- If a relation has MULTIPLE probabilities from different sources, include all of them as separate estimates

EFFECT DIRECTION EXAMPLES:
✓ "smoking increases lung cancer risk by 30%" → effectDirection: "positive", value: 0.30
✓ "exercise reduces heart disease by 40%" → effectDirection: "negative", value: 0.40
✓ "associated with 25% higher risk" → effectDirection: "positive", value: 0.25
✓ "decreases mortality by 15%" → effectDirection: "negative", value: 0.15
✓ "correlated with 50% incidence" → effectDirection: "neutral", value: 0.50 (if direction unclear)

CRITICAL: DO NOT USE MARKDOWN CODE BLOCKS. DO NOT START WITH \`\`\`json OR END WITH \`\`\`.
RESPOND ONLY WITH THE RAW JSON OBJECT BELOW - NO OTHER TEXT OR FORMATTING:

{
  "relationProbabilities": [
    {
      "source": "EXACT entity name",
      "target": "EXACT entity name",
      "probabilities": [
        {
          "value": 0.75,
          "effectDirection": "positive",
          "source": "Page 3",
          "textEvidence": "exact quote mentioning 75% or relevant probability"
        }
      ]
    }
  ]
}`;

export const DEFAULT_PROBABILITY_MERGE_PROMPT = `🚨 MERGE REQUIREMENT: Combine new probability estimates with existing ones

EXISTING RELATIONS WITH PROBABILITIES:
\${existingRelations}

⚠️  CRITICAL PROBABILITY MERGE STRATEGY:
STEP 1: For each relation in new text, check if it already has probabilities
STEP 2: If relation exists with probabilities:
  - APPEND new probability estimates to existing array
  - NEVER overwrite or remove existing estimates
  - Each estimate maintains its own source and textEvidence
STEP 3: If relation is new or has no probabilities:
  - Add new probability estimates as normal

MERGE ACTIONS:
- Preserve all existing probability estimates with their sources
- Add new estimates to the array for the same relation
- Keep source tracking clear (e.g., "Page 1", "Page 3", etc.)
- Evidence accumulation: Each estimate keeps its own textEvidence

EXAMPLES:
Existing: { source: "A", target: "B", probabilities: [{ value: 0.7, effectDirection: "positive", source: "Page 1", textEvidence: "..." }] }
New: Found 30% reduction on Page 3
Result: { source: "A", target: "B", probabilities: [
  { value: 0.7, effectDirection: "positive", source: "Page 1", textEvidence: "..." },
  { value: 0.3, effectDirection: "negative", source: "Page 3", textEvidence: "..." }
] }

IMPORTANT: Each probability estimate must include effectDirection:
- "positive" = source INCREASES target
- "negative" = source DECREASES target
- "neutral" = direction unclear or not specified

`;

/**
 * Effect direction display configuration
 * Used across visualization, tooltips, and tables for consistent styling
 */
export const EFFECT_DIRECTION_CONFIG = {
  positive: {
    color: '#10b981',      // green - source increases target
    label: 'increases',
    symbol: '↑',
  },
  negative: {
    color: '#ef4444',      // red - source decreases target
    label: 'decreases',
    symbol: '↓',
  },
  neutral: {
    color: '#6b7280',      // gray - unclear/not specified
    label: 'unclear',
    symbol: '~',
  },
} as const;

/**
 * Application configuration constants
 */
export const CONFIG = {
  MODEL_LOAD_TIMEOUT: 30000,
  ANALYSIS_TIMEOUT: 300000,
  MODEL_LOAD_DELAY: 500,
  MAX_RETRY_ATTEMPTS: 5,
  NOTIFICATIONS: {
    autoCloseSuccess: 4000,
    autoCloseError: 8000,
  },
} as const;

/**
 * Export file configurations
 */
export const EXPORT_CONFIG = {
  entities: {
    filename: 'causal_entities.csv',
  },
  relations: {
    filename: 'causal_relations.csv', 
  },
  dag: {
    filename: 'causal_dag.json',
  },
} as const;