/**
 * AI Explanation Provider
 *
 * Context provider that manages AI explanations for all insight cards.
 * Wraps the Insights page and provides a shared hook instance.
 *
 * ARCHITECTURE:
 * - Single hook instance shared across all sections
 * - Centralized caching prevents duplicate requests
 * - Components access via useAIExplanations()
 */

import React, { createContext, useContext } from 'react';
import { useAIContext, ExplanationParams } from '@/hooks/insights/useAIContext';
import type { AIContextResponse } from '@/types/ai-context.contract';

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface AIExplanationContextValue {
  /** Get cached explanation for an insight */
  getExplanation: (insightId: string) => AIContextResponse | null;
  /** Check if an explanation is loading */
  isLoading: (insightId: string) => boolean;
  /** Get error for a specific insight */
  getError: (insightId: string) => string | null;
  /** Request an explanation (with caching) */
  requestExplanation: (insightId: string, params: ExplanationParams) => Promise<AIContextResponse>;
  /** Clear all cached explanations (e.g., when filters change) */
  clearAll: () => void;
}

const AIExplanationContext = createContext<AIExplanationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AIExplanationProviderProps {
  /** User ID for AI requests */
  userId: string;
  children: React.ReactNode;
}

export function AIExplanationProvider({ userId, children }: AIExplanationProviderProps) {
  const aiContext = useAIContext({ userId });

  // Note: intentionally not using useMemo here to ensure context updates propagate
  // The functions are already memoized in useAIContext
  const value: AIExplanationContextValue = {
    getExplanation: aiContext.getExplanation,
    isLoading: aiContext.isLoading,
    getError: aiContext.getError,
    requestExplanation: aiContext.requestExplanation,
    clearAll: aiContext.clearAll,
  };

  return (
    <AIExplanationContext.Provider value={value}>
      {children}
    </AIExplanationContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Access the AI explanation context.
 * Must be used within an AIExplanationProvider.
 */
export function useAIExplanations(): AIExplanationContextValue {
  const context = useContext(AIExplanationContext);
  
  if (!context) {
    // Return a no-op implementation if used outside provider
    // This allows components to work without AI features
    return {
      getExplanation: () => null,
      isLoading: () => false,
      getError: () => null,
      requestExplanation: async () => ({
        request_id: '',
        success: false,
        error: 'AI explanations not available',
      }),
      clearAll: () => {},
    };
  }
  
  return context;
}

// ============================================================================
// HELPER: Build params from card types
// ============================================================================

export type { ExplanationParams };
