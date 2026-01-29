/**
 * Team Realtime Types
 *
 * Hook options and return types for team subscriptions.
 */

import type { ChangePayload } from '../table/table.types';
import type { TeamInvitationRecord, TeamMemberRecord, TeamTrainingRecord } from '../records/team';

export interface UseTeamRealtimeOptions {
  /** Team ID to subscribe to */
  teamId: string | undefined | null;

  /** Called when a new member joins the team */
  onMemberJoined?: (member: TeamMemberRecord) => void;

  /** Called when a member leaves the team */
  onMemberLeft?: (member: TeamMemberRecord) => void;

  /** Called when a member's role/squad changes */
  onMemberUpdated?: (member: TeamMemberRecord) => void;

  /** Called when an invite is accepted */
  onInviteAccepted?: (invite: TeamInvitationRecord) => void;

  /** Called when an invite is created */
  onInviteCreated?: (invite: TeamInvitationRecord) => void;

  /** Called when an invite is cancelled */
  onInviteCancelled?: (invite: TeamInvitationRecord) => void;

  /** Called on any invite change */
  onInviteChange?: (payload: ChangePayload<TeamInvitationRecord>) => void;

  /** Called when a new training is created */
  onTrainingCreated?: (training: TeamTrainingRecord) => void;

  /** Called when a training is updated */
  onTrainingUpdated?: (training: TeamTrainingRecord) => void;

  /** Called when a training is deleted */
  onTrainingDeleted?: (training: TeamTrainingRecord) => void;

  /** Called on any training change */
  onTrainingChange?: (payload: ChangePayload<TeamTrainingRecord>) => void;

  /** Whether subscription is enabled */
  enabled?: boolean;
}

export interface UseTeamRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}
