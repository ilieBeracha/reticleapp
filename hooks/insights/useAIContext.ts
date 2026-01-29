/**
 * useAIContext Hook
 * 
 * Provides AI explanations for insights computed by the Insights Engine.
 * 
 * ARCHITECTURE:
 * 1. Insights Engine computes decided values (authoritative)
 * 2. This hook requests AI explanation (assistive)
 * 3. AI response is validated against guardrails
 * 4. UI renders both: engine data immediately, AI async
 * 
 * CACHING:
 * - Explanations are cached by a key derived from insight parameters
 * - Prevents duplicate API calls for the same insight
 * - Cache persists for the lifetime of the component using this hook
 * 
 * Usage:
 * ```tsx
 * const { getExplanation, requestExplanation, isLoading } = useAIContext({ userId });
 * 
 * // Check if explanation exists
 * const explanation = getExplanation(insightId);
 * 
 * // When user clicks "Why?" on a strength/weakness card:
 * requestExplanation(insightId, {
 *   insight_type: 'weakness',
 *   metric_type: 'accuracy',
 *   decided_values: { ... },
 *   context: { ... }
 * });
 * ```
 */

import { supabase } from '@/services/supabase';
import { useCallback, useState } from 'react';
import type {
  AIContextResponse,
  InsightCategory,
  MetricType
} from '@/types/ai-context.contract';
import { createAIContextRequest, createFallbackAIResponse } from '@/utils/ai-context';

// React Native global
declare const __DEV__: boolean;

interface UseAIContextOptions {
  /** User ID for the request */
  userId: string;
}

interface CachedExplanation {
  response: AIContextResponse;
  timestamp: number;
}

interface UseAIContextReturn {
  /** Get cached explanation for an insight (returns null if not cached) */
  getExplanation: (insightId: string) => AIContextResponse | null;
  /** Check if an explanation is currently loading */
  isLoading: (insightId: string) => boolean;
  /** Get error for a specific insight */
  getError: (insightId: string) => string | null;
  /** Request an AI explanation for decided values (with caching) */
  requestExplanation: (insightId: string, params: ExplanationParams) => Promise<AIContextResponse>;
  /** Clear all cached explanations */
  clearAll: () => void;
  /** Clear a specific cached explanation */
  clearOne: (insightId: string) => void;
}

export interface ExplanationParams {
  insight_type: InsightCategory;
  metric_type: MetricType;
  decided_values: {
    current_value: number;
    baseline_value: number;
    is_significant: boolean;
    direction: 'up' | 'down' | 'stable';
    confidence: 'high' | 'medium' | 'low';
    data_points: number;
    unit: '%' | 'cm' | 's' | '';
  };
  context: {
    filters_applied?: Record<string, string | undefined>;
    evidence_session_ids: string[];
    category_label?: string;
    engine_context?: string;
  };
}

export function useAIContext({ userId }: UseAIContextOptions): UseAIContextReturn {
  // Cache: insightId -> response (using state for proper reactivity)
  const [cache, setCache] = useState<Map<string, CachedExplanation>>(new Map());
  
  // Track loading state per insight
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  
  // Track errors per insight
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const getExplanation = useCallback((insightId: string): AIContextResponse | null => {
    const cached = cache.get(insightId);
    return cached?.response ?? null;
  }, [cache]);

  const isLoading = useCallback((insightId: string): boolean => {
    return loadingIds.has(insightId);
  }, [loadingIds]);

  const getError = useCallback((insightId: string): string | null => {
    return errors.get(insightId) ?? null;
  }, [errors]);

  const requestExplanation = useCallback(async (
    insightId: string,
    params: ExplanationParams
  ): Promise<AIContextResponse> => {
    // Check cache first
    const cached = cache.get(insightId);
    if (cached) {
      return cached.response;
    }
    
    // Mark as loading
    setLoadingIds(prev => new Set(prev).add(insightId));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(insightId);
      return next;
    });
    
    // Build the AIContextRequest
    const request = createAIContextRequest({
      user_id: userId,
      insight_type: params.insight_type,
      metric_type: params.metric_type,
      current_value: params.decided_values.current_value,
      baseline_value: params.decided_values.baseline_value,
      is_significant: params.decided_values.is_significant,
      direction: params.decided_values.direction,
      confidence: params.decided_values.confidence,
      data_points: params.decided_values.data_points,
      unit: params.decided_values.unit,
      evidence_session_ids: params.context.evidence_session_ids,
      filters_applied: params.context.filters_applied,
      category_label: params.context.category_label,
      engine_context: params.context.engine_context,
      response_type: 'explanation',
    });
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-insights', {
        body: {
          mode: 'explain_insight',
          request,
        },
      });
      
      if (fnError) {
        // Log only in development, not as ERROR
        if (__DEV__) {
          console.log('AI explanation unavailable:', fnError.message);
        }
        const fallback = createFallbackAIResponse(request.request_id);
        
        // Cache the fallback too (prevents retry spam)
        setCache(prev => new Map(prev).set(insightId, { response: fallback, timestamp: Date.now() }));
        setErrors(prev => new Map(prev).set(insightId, 'AI explanations not yet available'));
        
        return fallback;
      }
      
      const aiResponse = data as AIContextResponse;
      
      // Cache the response (state update triggers re-renders)
      setCache(prev => new Map(prev).set(insightId, { response: aiResponse, timestamp: Date.now() }));
      
      if (!aiResponse.success) {
        setErrors(prev => new Map(prev).set(insightId, aiResponse.error || 'Unknown error'));
      }
      
      return aiResponse;
      
    } catch (err) {
      // Log only in development
      if (__DEV__) {
        console.log('AI explanation request failed:', err instanceof Error ? err.message : 'Unknown error');
      }
      const fallback = createFallbackAIResponse(request.request_id);
      
      setCache(prev => new Map(prev).set(insightId, { response: fallback, timestamp: Date.now() }));
      setErrors(prev => new Map(prev).set(insightId, 'AI explanations not yet available'));
      
      return fallback;
      
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(insightId);
        return next;
      });
    }
  }, [userId, cache]);

  const clearAll = useCallback(() => {
    setCache(new Map());
    setErrors(new Map());
  }, []);

  const clearOne = useCallback((insightId: string) => {
    setCache(prev => {
      const next = new Map(prev);
      next.delete(insightId);
      return next;
    });
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(insightId);
      return next;
    });
  }, []);

  return {
    getExplanation,
    isLoading,
    getError,
    requestExplanation,
    clearAll,
    clearOne,
  };
}

/**
 * Helper to build explanation params from a StrengthCard or WeaknessCard
 */
export function buildExplanationParams(
  card: {
    category: string;
    metric: string;
    value: number;
    delta?: number;
    baseline?: number;
    confidence: 'high' | 'medium' | 'low';
    sessionCount: number;
    evidenceIds?: string[];
  },
  type: 'strength' | 'weakness'
): ExplanationParams {
  const isGrouping = card.metric.toLowerCase().includes('grouping') || 
                     card.metric.toLowerCase().includes('dispersion');
  
  const metricType: MetricType = isGrouping ? 'grouping' : 'accuracy';
  const unit: '%' | 'cm' = isGrouping ? 'cm' : '%';
  
  // Determine direction
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (card.delta !== undefined && card.delta !== 0) {
    if (isGrouping) {
      // For grouping, negative delta (tighter) is good
      direction = card.delta < 0 ? 'down' : 'up';
    } else {
      // For accuracy, positive delta is good
      direction = card.delta > 0 ? 'up' : 'down';
    }
  }
  
  return {
    insight_type: type,
    metric_type: metricType,
    decided_values: {
      current_value: card.value,
      baseline_value: card.baseline ?? card.value,
      is_significant: Math.abs(card.delta ?? 0) > (isGrouping ? 1 : 5),
      direction,
      confidence: card.confidence,
      data_points: card.sessionCount,
      unit,
    },
    context: {
      evidence_session_ids: card.evidenceIds || [],
      category_label: card.category,
    },
  };
}

/**
 * Helper to build explanation params from a TrendData item
 */
export function buildTrendExplanationParams(
  trend: {
    metric: string;
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
    currentValue: number;
    previousValue: number;
    dataPoints: number;
    confidence: 'high' | 'medium' | 'low';
    evidenceIds?: string[];
  }
): ExplanationParams {
  const isGrouping = trend.metric.toLowerCase().includes('grouping') || 
                     trend.metric.toLowerCase().includes('dispersion');
  
  const metricType: MetricType = isGrouping ? 'grouping' : 'accuracy';
  const unit: '%' | 'cm' = isGrouping ? 'cm' : '%';
  
  // Map trend direction to metric direction
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (trend.direction === 'improving') {
    direction = isGrouping ? 'down' : 'up'; // For grouping, improving = tighter = down
  } else if (trend.direction === 'declining') {
    direction = isGrouping ? 'up' : 'down';
  }
  
  return {
    insight_type: 'trend',
    metric_type: metricType,
    decided_values: {
      current_value: trend.currentValue,
      baseline_value: trend.previousValue,
      is_significant: Math.abs(trend.changePercent) > 10,
      direction,
      confidence: trend.confidence,
      data_points: trend.dataPoints,
      unit,
    },
    context: {
      evidence_session_ids: trend.evidenceIds || [],
      engine_context: `${trend.metric} trend: ${trend.direction} by ${Math.abs(trend.changePercent).toFixed(1)}%`,
    },
  };
}
