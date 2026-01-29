/**
 * useWeaponRealtime
 *
 * Real-time hook for weapon-related updates:
 * - Weapon requests (soldier → commander)
 * - Weapon assignments (commander → soldier)
 *
 * Use Cases:
 * - Commander sees new weapon request instantly
 * - Soldier gets notified when request is approved/rejected
 * - Soldier gets notified when weapon is assigned/unassigned
 *
 * @example
 * ```tsx
 * // For commanders - watch for new requests
 * const { isConnected } = useWeaponRealtime({
 *   teamId: team.id,
 *   onNewRequest: (request) => {
 *     showToast('New weapon request!');
 *     refetchRequests();
 *   },
 * });
 *
 * // For soldiers - watch for assignment changes
 * const { isConnected } = useWeaponRealtime({
 *   teamId: team.id,
 *   userId: user.id,
 *   onRequestApproved: () => refetchWeapon(),
 *   onWeaponAssigned: (weapon) => showToast(`${weapon.name} assigned!`),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChangePayload } from '@/types/realtime.table';
import type { TeamWeaponRecord, WeaponRequestRecord } from '../records/weapon';
import type { UseWeaponRealtimeOptions, UseWeaponRealtimeReturn } from '@/types/realtime.weapon';

export function useWeaponRealtime(options: UseWeaponRealtimeOptions): UseWeaponRealtimeReturn {
  const {
    teamId,
    userId,
    onNewRequest,
    onRequestChange,
    onRequestApproved,
    onRequestRejected,
    onWeaponAssigned,
    onWeaponUnassigned,
    onWeaponChange,
    enabled = true,
  } = options;

  const isEnabled = enabled && !!teamId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleRequestData = useCallback(
    (payload: ChangePayload<WeaponRequestRecord>) => {
      console.log(`[WeaponRealtime] Request ${payload.eventType}:`, payload.new?.status || payload.old?.status);

      onRequestChange?.(payload);

      if (payload.eventType === 'INSERT') {
        onNewRequest?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;
        const requestUserId = payload.new?.user_id;

        // Only notify the user who made the request
        if (userId && requestUserId === userId) {
          if (newStatus === 'approved' && oldStatus === 'pending') {
            onRequestApproved?.(payload.new);
          }
          if (newStatus === 'rejected' && oldStatus === 'pending') {
            onRequestRejected?.(payload.new);
          }
        }
      }
    },
    [userId, onRequestChange, onNewRequest, onRequestApproved, onRequestRejected]
  );

  const handleWeaponData = useCallback(
    (payload: ChangePayload<TeamWeaponRecord>) => {
      console.log(`[WeaponRealtime] Weapon ${payload.eventType}:`, payload.new?.name || payload.old?.name);

      onWeaponChange?.(payload);

      if (payload.eventType === 'UPDATE' && userId) {
        const newAssignee = payload.new?.assigned_to;
        const oldAssignee = payload.old?.assigned_to;

        if (newAssignee === userId && oldAssignee !== userId) {
          onWeaponAssigned?.(payload.new);
        }
        if (oldAssignee === userId && newAssignee !== userId) {
          onWeaponUnassigned?.(payload.new);
        }
      }
    },
    [userId, onWeaponChange, onWeaponAssigned, onWeaponUnassigned]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    return [
      {
        table: 'weapon_requests',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleRequestData as (payload: ChangePayload) => void,
      },
      {
        table: 'team_weapons',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleWeaponData as (payload: ChangePayload) => void,
      },
    ];
  }, [isEnabled, teamId, handleRequestData, handleWeaponData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL
  // ═══════════════════════════════════════════════════════════════════════════

  const channelName = `weapons:${teamId || 'none'}`;

  const { status, isConnected, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
    onStatusChange: (newStatus) => {
      if (newStatus === 'SUBSCRIBED') {
        console.log(`[WeaponRealtime] ✓ Subscribed to team ${teamId} weapons`);
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
