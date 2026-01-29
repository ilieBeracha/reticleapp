/**
 * useAIExplanations Hook
 *
 * Access the AI explanation context.
 * Must be used within an AIExplanationProvider.
 */

import { useContext } from 'react';
import { AIExplanationContext } from '@/contexts/AIExplanationContext';
import type { AIExplanationContextValue, ExplanationParams } from '@/contexts/AIExplanationContext';

export type { AIExplanationContextValue, ExplanationParams };

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
