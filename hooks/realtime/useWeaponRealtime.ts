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
 *   onRequestApproved: () => {
 *     showToast('Weapon request approved!');
 *     refetchWeapon();
 *   },
 *   onWeaponAssigned: (weapon) => {
 *     showToast(`${weapon.name} assigned to you!`);
 *     refetchWeapon();
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

// ═══════════════════════════════════════════════════════════════════════════
// RECORD TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WeaponRequestRecord {
  id: string;
  team_id: string;
  user_id: string;
  weapon_category?: string | null;
  requested_weapon_id?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamWeaponRecord {
  id: string;
  team_id: string;
  name: string;
  category: string;
  caliber?: string | null;
  assigned_to?: string | null;
  pool_available: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

interface UseWeaponRealtimeOptions {
  /** Team ID to subscribe to */
  teamId: string | undefined | null;
  
  /** User ID - for filtering personal events */
  userId?: string | null;
  
  /** Called when a new weapon request is created (for commanders) */
  onNewRequest?: (request: WeaponRequestRecord) => void;
  
  /** Called when any request changes */
  onRequestChange?: (payload: ChangePayload<WeaponRequestRecord>) => void;
  
  /** Called when user's request is approved */
  onRequestApproved?: (request: WeaponRequestRecord) => void;
  
  /** Called when user's request is rejected */
  onRequestRejected?: (request: WeaponRequestRecord) => void;
  
  /** Called when a weapon is assigned to user */
  onWeaponAssigned?: (weapon: TeamWeaponRecord) => void;
  
  /** Called when a weapon is unassigned from user */
  onWeaponUnassigned?: (weapon: TeamWeaponRecord) => void;
  
  /** Called on any team weapon change */
  onWeaponChange?: (payload: ChangePayload<TeamWeaponRecord>) => void;
  
  /** Whether subscription is enabled */
  enabled?: boolean;
}

interface UseWeaponRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}

export function useWeaponRealtime(
  options: UseWeaponRealtimeOptions
): UseWeaponRealtimeReturn {
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

  // Effective enabled state
  const isEnabled = enabled && !!teamId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleRequestData = useCallback(
    (payload: ChangePayload<WeaponRequestRecord>) => {
      console.log(`[WeaponRealtime] Request ${payload.eventType}:`, payload.new?.status || payload.old?.status);
      
      onRequestChange?.(payload);

      if (payload.eventType === 'INSERT') {
        // New request created
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
        
        // Weapon assigned to this user
        if (newAssignee === userId && oldAssignee !== userId) {
          onWeaponAssigned?.(payload.new);
        }
        // Weapon unassigned from this user
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
      // Weapon requests for this team
      {
        table: 'weapon_requests',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleRequestData as (payload: ChangePayload) => void,
      },
      // Team weapons for this team
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
