/**
 * Session Realtime Types
 *
 * Hook options and return types for session subscriptions.
 */

import type { SessionRecord, SessionTargetRecord } from '../records';

export interface UseSessionRealtimeOptions {
  /** Session ID to subscribe to */
  sessionId: string | undefined | null;

  /** Called when session is updated */
  onSessionUpdate?: (session: SessionRecord) => void;

  /** Called when session status specifically changes */
  onStatusChange?: (status: SessionRecord['status'], session: SessionRecord) => void;

  /** Called when a target is added */
  onTargetAdded?: (target: SessionTargetRecord) => void;

  /** Called when a target is updated */
  onTargetUpdated?: (target: SessionTargetRecord) => void;

  /** Called when a target is deleted */
  onTargetDeleted?: (target: SessionTargetRecord) => void;

  /** Whether subscription is enabled */
  enabled?: boolean;
}

export interface UseSessionRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}
