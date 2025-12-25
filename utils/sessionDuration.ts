/**
 * Session Duration Utilities
 * 
 * Handles safe duration display for sessions, with caps and formatting.
 * Prevents displaying absurd durations (e.g., 18000+ seconds from orphaned sessions).
 */

/** Maximum reasonable session duration in seconds (4 hours) */
export const MAX_REASONABLE_DURATION_SECONDS = 4 * 60 * 60;

/** Threshold at which we display "X+ hours" instead of exact time */
export const DURATION_CAP_THRESHOLD_SECONDS = 2 * 60 * 60; // 2 hours

/**
 * Get a display-safe duration in seconds for a session.
 * 
 * - For completed sessions: returns capped duration based on ended_at - started_at
 * - For active sessions: returns 0 (live timer should be used instead)
 */
export function getSafeSessionDuration(session: {
  status?: string;
  started_at?: string | null;
  ended_at?: string | null;
}): number {
  // Active sessions should use live timer, not this function
  if (session.status === 'active') {
    return 0;
  }

  if (!session.ended_at || !session.started_at) {
    return 0;
  }

  const startMs = new Date(session.started_at).getTime();
  const endMs = new Date(session.ended_at).getTime();
  const durationSeconds = Math.max(0, (endMs - startMs) / 1000);

  // Cap at maximum reasonable duration
  return Math.min(durationSeconds, MAX_REASONABLE_DURATION_SECONDS);
}

/**
 * Format duration in seconds to a human-readable string.
 * 
 * @param seconds - Duration in seconds
 * @param options - Formatting options
 */
export function formatSessionDuration(
  seconds: number,
  options: {
    /** Show "+" suffix if capped (default: true) */
    showCapped?: boolean;
    /** Compact format "1h 23m" vs "1 hour 23 minutes" (default: true) */
    compact?: boolean;
  } = {}
): string {
  const { showCapped = true, compact = true } = options;

  // Handle edge cases
  if (seconds <= 0) return compact ? '0m' : '0 minutes';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  // Check if duration was capped
  const wasCapped = showCapped && seconds >= MAX_REASONABLE_DURATION_SECONDS;
  const suffix = wasCapped ? '+' : '';

  if (compact) {
    if (hours > 0) {
      return `${hours}h ${minutes}m${suffix}`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  } else {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (secs > 0 && hours === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
    return parts.join(' ') + suffix || '0 minutes';
  }
}

/**
 * Check if a session duration is suspiciously long (possible orphan).
 */
export function isDurationSuspicious(seconds: number): boolean {
  return seconds > DURATION_CAP_THRESHOLD_SECONDS;
}

/**
 * Format a live timer (for active sessions).
 * No capping since user is actively watching.
 */
export function formatLiveTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

