/**
 * AI Context Contract
 * 
 * This file defines the STRICT interface between:
 * - Insights Engine (authoritative, deterministic)
 * - AI Context Layer (assistive, explanatory)
 * 
 * CORE PRINCIPLE:
 * "Deterministic engine decides. AI explains and contextualizes."
 * 
 * RULES:
 * 1. AI NEVER decides strengths, weaknesses, or trends
 * 2. AI NEVER overrides thresholds or baselines
 * 3. AI NEVER invents metrics or evidence
 * 4. AI CAN explain, contextualize, and find similar patterns
 * 5. AI output is OPTIONAL - UI must work without it
 */

import type { ConfidenceLevel, MetricDirection } from './insights.types';

// ============================================================================
// INSIGHT TYPES (what the engine decided)
// ============================================================================

export type InsightCategory = 
  | 'strength'
  | 'weakness'
  | 'trend'
  | 'anomaly'
  | 'recommendation';

export type MetricType = 
  | 'accuracy'      // hits/shots % (engagement)
  | 'grouping'      // dispersion cm (grouping)
  | 'consistency'   // variance/CV
  | 'time'          // engagement time
  | 'stress'        // performance under stress;

// ============================================================================
// ENGINE → AI: Request Contract
// ============================================================================

/**
 * What the Insights Engine sends to AI for explanation.
 * All values are ALREADY COMPUTED and DECIDED.
 * AI cannot change these - only explain them.
 */
export interface AIContextRequest {
  /** Unique request ID for tracing */
  request_id: string;
  
  /** User ID for personalization context */
  user_id: string;
  
  /** What type of insight needs explanation */
  insight_type: InsightCategory;
  
  /** The specific metric being explained */
  metric_type: MetricType;
  
  /** 
   * The DECIDED values from the Insights Engine.
   * AI must reference these, not compute its own.
   */
  decided_values: {
    /** The current computed value */
    current_value: number;
    
    /** The baseline it was compared against */
    baseline_value: number;
    
    /** The computed delta (current - baseline) */
    delta: number;
    
    /** Whether the engine marked this as significant */
    is_significant: boolean;
    
    /** Direction decided by the engine */
    direction: MetricDirection;
    
    /** Confidence level from the engine */
    confidence: ConfidenceLevel;
    
    /** Number of data points used */
    data_points: number;
    
    /** Unit of measurement */
    unit: '%' | 'cm' | 's' | '';
  };
  
  /**
   * Context that AI can use for explanation.
   * AI can reference but not override.
   */
  context: {
    /** What filters were applied */
    filters_applied: {
      time?: string;
      position?: string;
      distance?: string;
      weapon?: string;
      drill_type?: string;
    };
    
    /** Session IDs that are evidence for this insight */
    evidence_session_ids: string[];
    
    /** Category label (e.g., "Prone", "100-200m", "Rifle") */
    category_label?: string;
    
    /** Human-readable context string from engine */
    engine_context?: string;
  };
  
  /**
   * What kind of AI response is needed.
   */
  response_type: 
    | 'explanation'      // Explain why this insight exists
    | 'similar_patterns' // Find similar historical patterns
    | 'widget_summary'   // Summarize for a widget
    | 'tip';             // Generate a tip (non-authoritative)
}

// ============================================================================
// AI → ENGINE: Response Contract
// ============================================================================

/**
 * What AI is ALLOWED to return.
 * Structurally constrained to prevent overreach.
 */
export interface AIContextResponse {
  /** Echo back the request ID */
  request_id: string;
  
  /** Whether AI successfully generated a response */
  success: boolean;
  
  /** Error message if success is false */
  error?: string;
  
  /**
   * The explanation content.
   * AI is NOT allowed to:
   * - Contradict decided_values
   * - Say "improving" if direction is "declining"
   * - Say "significant" if is_significant is false
   * - Invent metrics not in the request
   */
  explanation?: AIExplanation;
  
  /**
   * Similar patterns found (if Pinecone was used).
   * For context only - does not affect decisions.
   */
  similar_patterns?: AISimilarPattern[];
  
  /**
   * Confidence note about the AI response.
   * AI should be honest about uncertainty.
   */
  confidence_note?: string;
  
  /**
   * Token usage for cost tracking.
   */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * The actual explanation content.
 */
export interface AIExplanation {
  /**
   * Main explanation text.
   * Must reference the decided values, not contradict them.
   * 
   * ALLOWED: "Your accuracy dropped 12% compared to baseline, 
   *           which may correlate with the position change."
   * 
   * NOT ALLOWED: "Your accuracy improved significantly."
   *              (when direction is 'down')
   */
  text: string;
  
  /**
   * Possible contributing factors.
   * These are suggestions, not facts.
   * Must be labeled as possibilities.
   */
  possible_factors?: string[];
  
  /**
   * What the user might consider.
   * Phrased as options, not directives.
   * 
   * ALLOWED: "You might consider more prone practice."
   * NOT ALLOWED: "You should do prone drills." (directive)
   */
  considerations?: string[];
}

/**
 * A similar historical pattern found via Pinecone.
 */
export interface AISimilarPattern {
  /** How many similar sessions were found */
  session_count: number;
  
  /** Time range of similar sessions */
  time_range?: string;
  
  /** Common factors in similar sessions */
  common_factors?: string[];
  
  /** Similarity score (0-1) */
  similarity_score?: number;
}

// ============================================================================
// GUARDRAIL TYPES (enforce constraints)
// ============================================================================

/**
 * Validation result for AI responses.
 * Used to detect and reject invalid AI output.
 */
export interface AIResponseValidation {
  is_valid: boolean;
  violations: AIViolation[];
}

/**
 * A specific guardrail violation.
 */
export interface AIViolation {
  rule: GuardrailRule;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Guardrail rules that AI must follow.
 */
export type GuardrailRule =
  | 'NO_DIRECTION_CONTRADICTION'   // Can't say "improving" when declining
  | 'NO_SIGNIFICANCE_OVERRIDE'     // Can't say "significant" when not
  | 'NO_METRIC_INVENTION'          // Can't reference metrics not in request
  | 'NO_DIRECTIVE_LANGUAGE'        // Can't use "should", "must"
  | 'MUST_REFERENCE_EVIDENCE'      // Must reference decided_values
  | 'NO_NUMERIC_CLAIMS'            // Can't claim different numbers
  | 'NO_RANKING_CLAIMS';           // Can't rank strengths/weaknesses

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates an AI response against guardrails.
 * Call this before using any AI response.
 */
export function validateAIResponse(
  request: AIContextRequest,
  response: AIContextResponse
): AIResponseValidation {
  const violations: AIViolation[] = [];
  
  if (!response.success || !response.explanation) {
    return { is_valid: true, violations: [] };
  }
  
  const text = response.explanation.text.toLowerCase();
  const { decided_values } = request;
  
  // Rule: NO_DIRECTION_CONTRADICTION
  if (decided_values.direction === 'down' || decided_values.delta < 0) {
    if (text.includes('improving') || text.includes('increased') || text.includes('better')) {
      // Exception: for grouping, "decreased" dispersion IS improvement
      if (request.metric_type !== 'grouping') {
        violations.push({
          rule: 'NO_DIRECTION_CONTRADICTION',
          message: `AI said "improving" but direction is ${decided_values.direction}`,
          severity: 'error',
        });
      }
    }
  }
  
  if (decided_values.direction === 'up' || decided_values.delta > 0) {
    if (text.includes('declining') || text.includes('decreased') || text.includes('worse')) {
      // Exception: for grouping, "increased" dispersion IS decline
      if (request.metric_type !== 'grouping') {
        violations.push({
          rule: 'NO_DIRECTION_CONTRADICTION',
          message: `AI said "declining" but direction is ${decided_values.direction}`,
          severity: 'error',
        });
      }
    }
  }
  
  // Rule: NO_SIGNIFICANCE_OVERRIDE
  if (!decided_values.is_significant) {
    if (text.includes('significant') || text.includes('major') || text.includes('substantial')) {
      violations.push({
        rule: 'NO_SIGNIFICANCE_OVERRIDE',
        message: 'AI claimed significance but is_significant is false',
        severity: 'error',
      });
    }
  }
  
  // Rule: NO_DIRECTIVE_LANGUAGE
  const directiveWords = ['you should', 'you must', 'you need to', 'do this', 'stop doing'];
  for (const directive of directiveWords) {
    if (text.includes(directive)) {
      violations.push({
        rule: 'NO_DIRECTIVE_LANGUAGE',
        message: `AI used directive language: "${directive}"`,
        severity: 'warning',
      });
    }
  }
  
  // Rule: NO_RANKING_CLAIMS
  const rankingWords = ['best', 'worst', 'most important', 'top priority', 'main weakness'];
  for (const ranking of rankingWords) {
    if (text.includes(ranking)) {
      violations.push({
        rule: 'NO_RANKING_CLAIMS',
        message: `AI made ranking claim: "${ranking}"`,
        severity: 'warning',
      });
    }
  }
  
  return {
    is_valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates an AI context request from an insight.
 * Use this to ensure consistent request format.
 */
export function createAIContextRequest(params: {
  user_id: string;
  insight_type: InsightCategory;
  metric_type: MetricType;
  current_value: number;
  baseline_value: number;
  is_significant: boolean;
  direction: MetricDirection;
  confidence: ConfidenceLevel;
  data_points: number;
  unit: '%' | 'cm' | 's' | '';
  evidence_session_ids: string[];
  filters_applied?: AIContextRequest['context']['filters_applied'];
  category_label?: string;
  engine_context?: string;
  response_type?: AIContextRequest['response_type'];
}): AIContextRequest {
  const delta = params.current_value - params.baseline_value;
  
  return {
    request_id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: params.user_id,
    insight_type: params.insight_type,
    metric_type: params.metric_type,
    decided_values: {
      current_value: params.current_value,
      baseline_value: params.baseline_value,
      delta,
      is_significant: params.is_significant,
      direction: params.direction,
      confidence: params.confidence,
      data_points: params.data_points,
      unit: params.unit,
    },
    context: {
      filters_applied: params.filters_applied || {},
      evidence_session_ids: params.evidence_session_ids,
      category_label: params.category_label,
      engine_context: params.engine_context,
    },
    response_type: params.response_type || 'explanation',
  };
}

/**
 * Creates an empty/fallback AI response.
 * Use when AI is unavailable or disabled.
 */
export function createFallbackAIResponse(request_id: string): AIContextResponse {
  return {
    request_id,
    success: false,
    error: 'AI context unavailable',
  };
}
