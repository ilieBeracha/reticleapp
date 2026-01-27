/**
 * SquadInvitationBanner
 *
 * Shows pending squad engagement invitations to soldiers in training detail.
 * When a commander starts a squad engagement and invites team members,
 * this banner appears for the invited users showing the invitation.
 *
 * Features:
 * - Loads pending invitations for the current user in this training
 * - Shows drill info (name, distance, rounds)
 * - Join/Decline buttons with haptic feedback
 * - Realtime subscription for invitation changes
 * - Navigates to activeSession on join
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { updateParticipantState } from '@/services/session/participants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, Target, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface ActiveEngagement {
  engagementId: string;
  sessionId: string; // Shared session
  drillName: string;
  distanceM: number | null;
  roundsPerShooter: number | null;
  commanderName: string | null;
  commanderId: string;
  hasStarted: boolean; // true if commander has started (started_at is set)
  engagementMode: 'squad' | 'group';
  participationState: 'pending' | 'joined' | 'declined' | 'left' | null; // null = not invited
  isCommander: boolean; // true if current user is the commander
}

interface SquadInvitationBannerProps {
  trainingId: string;
  userId: string;
  onInvitationChanged?: () => void;
}

export function SquadInvitationBanner({ trainingId, userId, onInvitationChanged }: SquadInvitationBannerProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [activeEngagement, setActiveEngagement] = useState<ActiveEngagement | null>(null);
  const [actionLoading, setActionLoading] = useState<'join' | 'decline' | null>(null);

  // Load active squad/group engagement in this training (visible to ALL team members)
  const loadActiveEngagement = useCallback(async () => {
    try {
      // Query for ANY active squad/group engagement in this training
      // This shows the banner to ALL team members, not just participants
      const { data: engagements, error: engError } = await supabase
        .from('engagements')
        .select(`
          id,
          session_id,
          training_id,
          engagement_mode,
          status,
          shooter_id,
          started_at
        `)
        .eq('training_id', trainingId)
        .in('engagement_mode', ['squad', 'group'])
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (engError) throw engError;
      
      console.log('[SquadInvitationBanner] Query result:', engagements?.length || 0, 'engagements found');
      
      if (!engagements?.length) {
        console.log('[SquadInvitationBanner] No active engagements, hiding banner');
        setActiveEngagement(null);
        return;
      }

      const engagement = engagements[0];
      console.log('[SquadInvitationBanner] Found engagement:', engagement.id, 'status:', engagement.status);
      const isCommander = engagement.shooter_id === userId;

      // Check if user is a participant and get their state
      const { data: participation } = await supabase
        .from('engagement_participants')
        .select('id, state')
        .eq('engagement_id', engagement.id)
        .eq('user_id', userId)
        .maybeSingle();

      const participationState = participation?.state as 'pending' | 'joined' | 'declined' | 'left' | null;

      // Don't show banner to commander (they manage from squadLobby or activeSession)
      if (isCommander) {
        setActiveEngagement(null);
        return;
      }
      
      // Don't show banner to users who declined or left
      if (participationState === 'declined' || participationState === 'left') {
        setActiveEngagement(null);
        return;
      }

      // Get session details for drill info
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, custom_drill_config, user_id')
        .eq('id', engagement.session_id)
        .single();

      if (sessionError) throw sessionError;

      // Get commander's name
      const { data: commanderProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user_id)
        .single();

      const drillConfig = session.custom_drill_config as any;
      const engagementMode = engagement.engagement_mode as 'squad' | 'group';
      const isGroup = engagementMode === 'group';

      setActiveEngagement({
        engagementId: engagement.id,
        sessionId: engagement.session_id,
        drillName: drillConfig?.name || (isGroup ? 'Group Engagement' : 'Squad Engagement'),
        distanceM: drillConfig?.distance_m || null,
        roundsPerShooter: drillConfig?.rounds_per_shooter || null,
        commanderName: commanderProfile?.full_name || null,
        commanderId: session.user_id,
        hasStarted: !!engagement.started_at,
        engagementMode,
        participationState,
        isCommander,
      });
    } catch (error) {
      console.error('[SquadInvitationBanner] Failed to load:', error);
      setActiveEngagement(null);
    } finally {
      setLoading(false);
    }
  }, [trainingId, userId]);

  useEffect(() => {
    loadActiveEngagement();
  }, [loadActiveEngagement]);

  // Realtime subscription for engagement changes (visible to all team members)
  // Uses debouncing to prevent rapid re-queries on burst updates
  useEffect(() => {
    if (!trainingId || !userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadActiveEngagement();
      }, 300); // 300ms debounce
    };

    const channelName = `squad-invite-${trainingId}-${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_participants',
        },
        debouncedLoad
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagements',
          filter: `training_id=eq.${trainingId}`,
        },
        debouncedLoad
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [trainingId, userId, loadActiveEngagement]);

  // Handle join/view - navigate based on state
  const handleJoinOrView = () => {
    if (!activeEngagement) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { hasStarted, participationState, engagementId, sessionId, engagementMode } = activeEngagement;
    const isPendingInvite = participationState === 'pending';
    const isJoinedParticipant = participationState === 'joined';

    // Navigate FIRST, then update state in background (prevents banner collapse before navigation)
    if (hasStarted) {
      // Session is in progress - go to active session
      router.push({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId,
          engagementId,
          engagementMode,
          returnTo: 'trainingDetail',
          returnId: trainingId,
          viewOnly: !isJoinedParticipant && !isPendingInvite ? 'true' : undefined,
        },
      });
    } else {
      // Session not started yet - go to lobby
      router.push({
        pathname: '/(protected)/squadLobby',
        params: {
          engagementId,
          sessionId,
          trainingId,
          engagementMode,
        },
      });
    }

    // Update state in background after navigation starts
    // If pending invite, accept it (change state to joined)
    if (isPendingInvite && !hasStarted) {
      updateParticipantState(engagementId, userId, 'joined').catch((err) => {
        console.error('[SquadInvitationBanner] Failed to accept invite:', err);
      });
    }
    // If not a participant at all and session hasn't started, self-join
    else if (!participationState && !hasStarted) {
      supabase
        .from('engagement_participants')
        .insert({
          engagement_id: engagementId,
          user_id: userId,
          state: 'joined',
          role: 'shooter',
          joined_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error && !error.message?.includes('duplicate')) {
            console.error('[SquadInvitationBanner] Failed to self-join:', error);
          }
        });
    }

    onInvitationChanged?.();
  };

  // Handle decline/leave (for pending or joined participants before session starts)
  const handleDecline = async () => {
    if (!activeEngagement || !activeEngagement.participationState) return;

    setActionLoading('decline');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Use 'declined' for pending invites, 'left' for joined participants
      const newState = activeEngagement.participationState === 'pending' ? 'declined' : 'left';
      await updateParticipantState(activeEngagement.engagementId, userId, newState);
      loadActiveEngagement(); // Refresh
      onInvitationChanged?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[SquadInvitationBanner] Failed to decline:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Don't render anything while loading or if no active engagement
  if (loading || !activeEngagement) {
    return null;
  }

  // Determine UI state
  const { hasStarted, participationState, engagementMode } = activeEngagement;
  const isInProgress = hasStarted;
  const isGroup = engagementMode === 'group';
  const modeLabel = isGroup ? 'Group' : 'Squad';
  const isPending = participationState === 'pending';
  const isJoined = participationState === 'joined';
  const hasParticipation = isPending || isJoined;

  // Button text based on state
  const getActionText = () => {
    if (isInProgress) {
      return isJoined ? 'Join Session' : 'View Progress';
    }
    if (isPending) return 'Accept & Join';
    if (isJoined) return 'Return to Lobby';
    return 'Join';
  };
  
  // Decline button text
  const getDeclineText = () => {
    if (isPending) return 'Decline';
    return 'Leave';
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: isInProgress ? colors.green + '10' : colors.primary + '10',
          borderColor: isInProgress ? colors.green : colors.primary,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isInProgress ? colors.green + '20' : colors.primary + '20' },
          ]}
        >
          <Users size={20} color={isInProgress ? colors.green : colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isInProgress
              ? `${modeLabel} Session In Progress`
              : isPending
                ? `${modeLabel} Invitation`
                : isJoined
                  ? `${modeLabel} Engagement Ready`
                  : `${modeLabel} Engagement Available`}
          </Text>
          {activeEngagement.commanderName && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isInProgress
                ? `${activeEngagement.commanderName}'s session`
                : isPending
                  ? `${activeEngagement.commanderName} invited you`
                  : `Started by ${activeEngagement.commanderName}`}
            </Text>
          )}
        </View>
      </View>

      {/* Drill Info */}
      <View style={[styles.drillInfo, { backgroundColor: colors.card }]}>
        <Target size={16} color={isInProgress ? colors.green : colors.primary} />
        <Text style={[styles.drillName, { color: colors.text }]}>{activeEngagement.drillName}</Text>
        {(activeEngagement.distanceM || activeEngagement.roundsPerShooter) && (
          <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
            {activeEngagement.distanceM && `${activeEngagement.distanceM}m`}
            {activeEngagement.distanceM && activeEngagement.roundsPerShooter && ' · '}
            {activeEngagement.roundsPerShooter && `${activeEngagement.roundsPerShooter} rds`}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Show decline/leave for pending or joined participants before session starts */}
        {!isInProgress && hasParticipation && (
          <TouchableOpacity
            style={[styles.declineBtn, { borderColor: colors.border }]}
            onPress={handleDecline}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'decline' ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <>
                <X size={16} color={isPending ? colors.red : colors.textMuted} />
                <Text style={[styles.declineText, { color: isPending ? colors.red : colors.textMuted }]}>
                  {getDeclineText()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.joinBtn, 
            { 
              backgroundColor: isPending ? colors.green : colors.primary, 
              flex: (!isInProgress && !hasParticipation) ? 1 : (isInProgress ? 1 : undefined) 
            }
          ]}
          onPress={handleJoinOrView}
          disabled={actionLoading !== null}
        >
          {actionLoading === 'join' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={16} color="#fff" />
              <Text style={styles.joinText}>{getActionText()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  drillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  drillName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  drillMeta: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
