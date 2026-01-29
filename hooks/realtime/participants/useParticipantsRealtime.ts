/**
 * useParticipantsRealtime
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
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
 *   onParticipantAdded: (participant) => refreshParticipants(),
 *   onParticipantChanged: (participant) => refreshParticipants(),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChangePayload } from '@/types/realtime.table';
import type { ParticipantRecord } from '../records/participant';
import type { UseParticipantsRealtimeOptions, UseParticipantsRealtimeReturn } from '@/types/realtime.participants';

export function useParticipantsRealtime(options: UseParticipantsRealtimeOptions): UseParticipantsRealtimeReturn {
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
  const isEnabled = enabled && !!effectiveId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleParticipantData = useCallback(
    (payload: ChangePayload<ParticipantRecord>) => {
      console.log(`[ParticipantsRealtime] ${payload.eventType}:`, payload.new?.id || payload.old?.id);

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
        console.log(`[ParticipantsRealtime] ✓ Subscribed to engagement ${effectiveId}`);
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
