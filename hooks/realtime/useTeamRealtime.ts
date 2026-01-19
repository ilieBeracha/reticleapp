/**
 * useTeamRealtime
 * 
 * Domain-specific hook for real-time team updates.
 * Subscribes to team member changes, invitation status updates, and training changes.
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
 *   onMemberJoined: (member) => {
 *     // New member joined the team
 *     refetchMembers();
 *   },
 *   onInviteAccepted: (invite) => {
 *     // Invite was used
 *     refetchInvites();
 *   },
 *   onTrainingCreated: (training) => {
 *     // New training created
 *     refetchTrainings();
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

// ═══════════════════════════════════════════════════════════════════════════
// TEAM-SPECIFIC RECORD TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TeamMemberRecord {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  squad_id?: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitationRecord {
  id: string;
  team_id: string;
  invite_code: string;
  team_role: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invited_by: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamTrainingRecord {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'scheduled' | 'ongoing' | 'finished' | 'cancelled';
  scheduled_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

interface UseTeamRealtimeOptions {
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

interface UseTeamRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}

export function useTeamRealtime(
  options: UseTeamRealtimeOptions
): UseTeamRealtimeReturn {
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

  // Effective enabled state
  const isEnabled = enabled && !!teamId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleMemberData = useCallback(
    (payload: ChangePayload<TeamMemberRecord>) => {
      console.log(`[TeamRealtime] Member ${payload.eventType}:`, payload.new?.user_id || payload.old?.user_id);
      
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
      console.log(`[TeamRealtime] Invite ${payload.eventType}:`, payload.new?.status);
      
      onInviteChange?.(payload);

      if (payload.eventType === 'INSERT') {
        onInviteCreated?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;
        
        // Status changed to accepted
        if (newStatus === 'accepted' && oldStatus !== 'accepted') {
          onInviteAccepted?.(payload.new);
        }
        // Status changed to cancelled
        if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
          onInviteCancelled?.(payload.new);
        }
      }
    },
    [onInviteChange, onInviteCreated, onInviteAccepted, onInviteCancelled]
  );

  const handleTrainingData = useCallback(
    (payload: ChangePayload<TeamTrainingRecord>) => {
      console.log(`[TeamRealtime] Training ${payload.eventType}:`, payload.new?.name || payload.old?.name);
      
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
      // Team member changes
      {
        table: 'team_members',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleMemberData as (payload: ChangePayload<TeamMemberRecord>) => void,
      },
      // Invitation changes
      {
        table: 'team_invitations',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleInviteData as (payload: ChangePayload<TeamInvitationRecord>) => void,
      },
      // Training changes
      {
        table: 'trainings',
        event: '*' as const,
        filter: `team_id=eq.${teamId}`,
        onData: handleTrainingData as (payload: ChangePayload<TeamTrainingRecord>) => void,
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
    onStatusChange: (newStatus) => {
      if (newStatus === 'SUBSCRIBED') {
        console.log(`[TeamRealtime] ✓ Subscribed to team ${teamId}`);
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
