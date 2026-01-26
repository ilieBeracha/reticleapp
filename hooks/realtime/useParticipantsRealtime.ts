/**
 * useParticipantsRealtime
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Domain-specific hook for real-time participant updates.
 * Subscribe to changes on engagement_participants for a given engagement.
 *
 * Use Cases:
 * - Squad lobby showing live participant status
 * - ParticipatingView showing when others join/leave
 * - Engagement owner tracking who has joined
 *
 * @example
 * ```tsx
 * const { isConnected } = useParticipantsRealtime({
 *   engagementId: engagement.id,
 *   onParticipantAdded: (participant) => {
 *     // New participant invited
 *     refreshParticipants();
 *   },
 *   onParticipantChanged: (participant) => {
 *     // Participant state changed (pending -> joined/left)
 *     refreshParticipants();
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

/** Participant record from database */
export interface ParticipantRecord {
  id: string;
  engagement_id: string;
  /** @deprecated Use engagement_id. Will be removed after migration. */
  session_id?: string;
  user_id: string;
  state: 'pending' | 'joined' | 'left';
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseParticipantsRealtimeOptions {
  /** Engagement ID to subscribe to participants for */
  engagementId: string | undefined | null;
  /**
   * @deprecated Use engagementId instead.
   * Session ID is kept for backwards compatibility during migration.
   */
  sessionId?: string | undefined | null;

  /** Called when a participant is added */
  onParticipantAdded?: (participant: ParticipantRecord) => void;

  /** Called when a participant record is updated (state change) */
  onParticipantChanged?: (participant: ParticipantRecord) => void;

  /** Called when a participant is removed */
  onParticipantRemoved?: (participant: ParticipantRecord) => void;

  /** Whether subscription is enabled */
  enabled?: boolean;
}

interface UseParticipantsRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}

export function useParticipantsRealtime(
  options: UseParticipantsRealtimeOptions
): UseParticipantsRealtimeReturn {
  const {
    engagementId,
    sessionId, // deprecated, kept for backwards compat
    onParticipantAdded,
    onParticipantChanged,
    onParticipantRemoved,
    enabled = true,
  } = options;

  // Use engagementId if provided, fall back to sessionId for backwards compat
  const effectiveId = engagementId || sessionId;

  // Effective enabled state
  const isEnabled = enabled && !!effectiveId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleParticipantData = useCallback(
    (payload: ChangePayload<ParticipantRecord>) => {
      console.log(
        `[ParticipantsRealtime] ${payload.eventType}:`,
        payload.new?.id || payload.old?.id
      );

      switch (payload.eventType) {
        case 'INSERT':
          onParticipantAdded?.(payload.new);
          break;
        case 'UPDATE':
          onParticipantChanged?.(payload.new);
          break;
        case 'DELETE':
          onParticipantRemoved?.(payload.old);
          break;
      }
    },
    [onParticipantAdded, onParticipantChanged, onParticipantRemoved]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    // Use engagement_id filter (primary), fall back to session_id for backwards compat
    const filterColumn = engagementId ? 'engagement_id' : 'session_id';
    const filterValue = effectiveId;

    return [
      {
        table: 'engagement_participants',
        event: '*' as const,
        filter: `${filterColumn}=eq.${filterValue}`,
        onData: handleParticipantData as any,
      },
    ];
  }, [isEnabled, engagementId, effectiveId, handleParticipantData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL
  // ═══════════════════════════════════════════════════════════════════════════

  const channelName = `participants:${effectiveId || 'none'}`;

  const { status, isConnected, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
    onStatusChange: (newStatus) => {
      if (newStatus === 'SUBSCRIBED') {
        console.log(
          `[ParticipantsRealtime] Subscribed to engagement ${effectiveId}`
        );
      }
    },
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
