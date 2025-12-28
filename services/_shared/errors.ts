/**
 * services/_shared/errors.ts
 *
 * Shared, non-domain-specific helpers for consistent service error handling.
 *
 * Rules:
 * - Services may import this module.
 * - Stores/components/hooks should NOT import this; they should handle thrown Errors.
 */

export type ServiceErrorContext = {
  service: string;
  action: string;
  meta?: Record<string, unknown>;
};

/**
 * Convert any unknown error into a safe Error with a message.
 * Keeps existing Error instances intact.
 */
export function toServiceError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(fallbackMessage);
}

/**
 * Central place to log service errors.
 * Intentionally conservative: console only.
 */
export function logServiceError(ctx: ServiceErrorContext, error: unknown) {
  // Keep the log format stable for future log scrapers.
  console.error(`[service:${ctx.service}] ${ctx.action}`, {
    ...ctx.meta,
    error,
  });
}











