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
import { updateParticipantState, getEngagementParticipants } from '@/services/session/participants';
import type { EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, Target, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface PendingInvitation {
  engagementId: string;
  sessionId: string;
  drillName: string;
  distanceM: number | null;
  roundsPerShooter: number | null;
  commanderName: string | null;
}

interface SquadInvitationBannerProps {
  trainingId: string;
  userId: string;
  onInvitationChanged?: () => void;
}

export function SquadInvitationBanner({ trainingId, userId, onInvitationChanged }: SquadInvitationBannerProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [actionLoading, setActionLoading] = useState<'join' | 'decline' | null>(null);

  // Load pending invitation for this user in this training
  const loadInvitation = useCallback(async () => {
    try {
      // Find engagements for this training where user is a participant with state='joined' (async consent model)
      // Actually, we need to find engagements where user is a participant with state='pending' for invitations
      // But our current model uses 'joined' directly when adding participants
      
      // Query engagement_participants for this user
      const { data: participations, error: partError } = await supabase
        .from('engagement_participants')
        .select(`
          engagement_id,
          state,
          engagements!inner (
            id,
            session_id,
            training_id,
            engagement_mode,
            status,
            shooter_id
          )
        `)
        .eq('user_id', userId)
        .eq('engagements.training_id', trainingId)
        .eq('engagements.engagement_mode', 'squad')
        .eq('state', 'joined'); // In our async consent model, 'joined' means invited

      if (partError) throw partError;
      if (!participations?.length) {
        setInvitation(null);
        return;
      }

      // Get the first pending squad engagement for this user
      const participation = participations[0];
      const engagement = participation.engagements as any;
      
      // Don't show banner if user is the commander (shooter)
      if (engagement.shooter_id === userId) {
        setInvitation(null);
        return;
      }

      // Get session details for drill info
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, drill_config, user_id')
        .eq('id', engagement.session_id)
        .single();

      if (sessionError) throw sessionError;

      // Get commander's name
      const { data: commanderProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user_id)
        .single();

      const drillConfig = session.drill_config as any;
      
      setInvitation({
        engagementId: engagement.id,
        sessionId: engagement.session_id,
        drillName: drillConfig?.name || 'Squad Engagement',
        distanceM: drillConfig?.distance_m || null,
        roundsPerShooter: drillConfig?.rounds_per_shooter || null,
        commanderName: commanderProfile?.full_name || null,
      });
    } catch (error) {
      console.error('[SquadInvitationBanner] Failed to load:', error);
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  }, [trainingId, userId]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  // Realtime subscription for invitation changes
  useEffect(() => {
    if (!trainingId || !userId) return;

    const channel = supabase
      .channel(`squad-invites-${trainingId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadInvitation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, userId, loadInvitation]);

  // Handle join
  const handleJoin = async () => {
    if (!invitation) return;

    setActionLoading('join');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Navigate to the active session
      router.push({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: invitation.sessionId,
          engagementId: invitation.engagementId,
          returnTo: 'trainingDetail',
          returnId: trainingId,
        },
      });

      onInvitationChanged?.();
    } catch (error: any) {
      console.error('[SquadInvitationBanner] Failed to join:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle decline
  const handleDecline = async () => {
    if (!invitation) return;

    setActionLoading('decline');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await updateParticipantState(invitation.engagementId, userId, 'left');
      setInvitation(null);
      onInvitationChanged?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[SquadInvitationBanner] Failed to decline:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Don't render anything while loading or if no invitation
  if (loading || !invitation) {
    return null;
  }

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)} 
      exiting={FadeOutUp.duration(200)}
      style={[styles.container, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Users size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Squad Engagement Invite</Text>
          {invitation.commanderName && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {invitation.commanderName} invited you
            </Text>
          )}
        </View>
      </View>

      {/* Drill Info */}
      <View style={[styles.drillInfo, { backgroundColor: colors.card }]}>
        <Target size={16} color={colors.primary} />
        <Text style={[styles.drillName, { color: colors.text }]}>{invitation.drillName}</Text>
        {(invitation.distanceM || invitation.roundsPerShooter) && (
          <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
            {invitation.distanceM && `${invitation.distanceM}m`}
            {invitation.distanceM && invitation.roundsPerShooter && ' · '}
            {invitation.roundsPerShooter && `${invitation.roundsPerShooter} rds`}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: colors.border }]}
          onPress={handleDecline}
          disabled={actionLoading !== null}
        >
          {actionLoading === 'decline' ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <>
              <X size={16} color={colors.textMuted} />
              <Text style={[styles.declineText, { color: colors.textMuted }]}>Decline</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.joinBtn, { backgroundColor: colors.green }]}
          onPress={handleJoin}
          disabled={actionLoading !== null}
        >
          {actionLoading === 'join' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={16} color="#fff" />
              <Text style={styles.joinText}>Join Squad</Text>
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
