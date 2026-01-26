/**
 * Participants Realtime Types
 *
 * Hook options and return types for engagement participant subscriptions.
 */

import type { ParticipantRecord } from '../records';

export interface UseParticipantsRealtimeOptions {
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

export interface UseParticipantsRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}
