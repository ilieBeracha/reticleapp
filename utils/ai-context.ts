/**
 * AI Context Utilities
 *
 * Runtime functions for AI context validation and creation.
 */

import type {
  AIContextRequest,
  AIContextResponse,
  AIResponseValidation,
  AIViolation,
  InsightCategory,
  MetricType,
} from '@/types/ai-context.contract';
import type { ConfidenceLevel, MetricDirection } from '@/types/insights';

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
