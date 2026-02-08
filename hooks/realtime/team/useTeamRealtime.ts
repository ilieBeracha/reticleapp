/**
 * useTeamRealtime
 *
 * Subscribe to team member changes, invitation status updates, and training changes.
 *
 * Use Cases:
 * - Commander sees new member when invite is accepted
 * - Invite list updates when invite is used/cancelled
 * - Team roster live updates
 * - Training list updates when training is created/updated
 *
 * @example
 * ```tsx
 * const { isConnected } = useTeamRealtime({
 *   teamId: team.id,
 *   onMemberJoined: (member) => refetchMembers(),
 *   onInviteAccepted: (invite) => refetchInvites(),
 *   onTrainingCreated: (training) => refetchTrainings(),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { TeamInvitationRecord, TeamMemberRecord, TeamTrainingRecord } from '../records/team';
import type { ChangePayload } from '@/types/realtime.table';
import type { UseTeamRealtimeOptions, UseTeamRealtimeReturn } from '@/types/realtime.team';

export function useTeamRealtime(options: UseTeamRealtimeOptions): UseTeamRealtimeReturn {
  const {
    teamId,
    onMemberJoined,
    onMemberLeft,
    onMemberUpdated,
    onInviteAccepted,
    onInviteCreated,
    onInviteCancelled,
    onInviteChange,
    onTrainingCreated,
    onTrainingUpdated,
    onTrainingDeleted,
    onTrainingChange,
    enabled = true,
  } = options;

  const isEnabled = enabled && !!teamId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleMemberData = useCallback(
    (payload: ChangePayload<TeamMemberRecord>) => {
      if (payload.eventType === 'INSERT') {
        onMemberJoined?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        onMemberUpdated?.(payload.new);
      } else if (payload.eventType === 'DELETE') {
        onMemberLeft?.(payload.old as TeamMemberRecord);
      }
    },
    [onMemberJoined, onMemberUpdated, onMemberLeft]
  );

  const handleInviteData = useCallback(
    (payload: ChangePayload<TeamInvitationRecord>) => {
      onInviteChange?.(payload);

      if (payload.eventType === 'INSERT') {
        onInviteCreated?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;

        if (newStatus === 'accepted' && oldStatus !== 'accepted') {
          onInviteAccepted?.(payload.new);
        }
        if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
          onInviteCancelled?.(payload.new);
        }
      }
    },
    [onInviteChange, onInviteCreated, onInviteAccepted, onInviteCancelled]
  );

  const handleTrainingData = useCallback(
    (payload: ChangePayload<TeamTrainingRecord>) => {
      onTrainingChange?.(payload);

      if (payload.eventType === 'INSERT') {
        onTrainingCreated?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        onTrainingUpdated?.(payload.new);
      } else if (payload.eventType === 'DELETE') {
        onTrainingDeleted?.(payload.old as TeamTrainingRecord);
      }
    },
    [onTrainingChange, onTrainingCreated, onTrainingUpdated, onTrainingDeleted]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    return [
      {
        table: 'team_members',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleMemberData as any,
      },
      {
        table: 'team_invitations',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleInviteData as any,
      },
      {
        table: 'trainings',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleTrainingData as any,
      },
    ];
  }, [isEnabled, teamId, handleMemberData, handleInviteData, handleTrainingData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL
  // ═══════════════════════════════════════════════════════════════════════════

  const channelName = `team:${teamId || 'none'}`;

  const { status, isConnected, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
    onStatusChange: (newStatus) => {},
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
