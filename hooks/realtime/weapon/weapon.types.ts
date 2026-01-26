/**
 * Weapon Realtime Types
 *
 * Hook options and return types for weapon subscriptions.
 */

import type { ChangePayload } from '../table';
import type { TeamWeaponRecord, WeaponRequestRecord } from '../records';

export interface UseWeaponRealtimeOptions {
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

export interface UseWeaponRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}
