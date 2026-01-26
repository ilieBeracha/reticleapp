/**
 * SquadInvitationBanner
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Shows pending squad engagement invitations for the current user.
 * Allows them to join or decline.
 *
 * NOTE: This component should be used in engagement-related screens,
 * NOT in training detail. Training should not contain squad logic.
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { updateParticipantState } from '@/services/session/participants';
import { notifySquadParticipantJoined, notifySquadParticipantDeclined } from '@/services/pushService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, Clock, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PendingInvitation {
  engagement_id: string;
  session_id: string;
  engagement: {
    id: string;
  };
  session: {
    id: string;
    user_id: string;
    drill_config: {
      name?: string;
      distance_m?: number;
      rounds_per_shooter?: number;
    } | null;
  };
  commander_name: string | null;
}

interface SquadInvitationBannerProps {
  /** User ID to check for pending invitations */
  userId: string;
  /** Optional training ID filter */
  trainingId?: string;
  onInvitationChanged?: () => void;
}

export function SquadInvitationBanner({
  userId,
  trainingId,
  onInvitationChanged,
}: SquadInvitationBannerProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [joining, setJoining] = useState(false);
  const [declining, setDeclining] = useState(false);

  // Load pending invitations for this user
  const loadInvitation = useCallback(async () => {
    try {
      console.log('[SquadInvitationBanner] Loading for user:', userId, 'training:', trainingId);

      // Get pending participation records for this user
      // Query both engagement_id and session_id for backwards compatibility
      const { data: participations, error: partError } = await supabase
        .from('engagement_participants')
        .select('engagement_id, session_id, state')
        .eq('user_id', userId)
        .eq('state', 'pending');

      console.log('[SquadInvitationBanner] Participations:', participations, partError);

      if (partError) throw partError;
      if (!participations?.length) {
        console.log('[SquadInvitationBanner] No pending participations found');
        setInvitation(null);
        return;
      }

      // Try engagement-based lookup first
      const engagementIds = participations
        .map((p) => p.engagement_id)
        .filter((id): id is string => !!id);

      console.log('[SquadInvitationBanner] Engagement IDs:', engagementIds);

      if (engagementIds.length > 0) {
        // New flow: query by engagement_id
        const { data: engagements, error: engError } = await supabase
          .from('engagements')
          .select('id, session_id, engagement_mode, status')
          .in('id', engagementIds)
          .eq('engagement_mode', 'squad')
          .eq('status', 'pending');

        console.log('[SquadInvitationBanner] Engagements:', engagements, engError);

        if (!engError && engagements?.length) {
          // Get sessions for these engagements
          const sessionIds = engagements.map((e) => e.session_id);
          let sessionsQuery = supabase
            .from('sessions')
            .select('id, user_id, custom_drill_config, training_id')
            .in('id', sessionIds);

          if (trainingId) {
            sessionsQuery = sessionsQuery.eq('training_id', trainingId);
          }

          const { data: sessions, error: sessError } = await sessionsQuery;
          console.log('[SquadInvitationBanner] Sessions:', sessions, sessError);

          if (!sessError && sessions?.length) {
            const session = sessions[0];
            const engagement = engagements.find((e) => e.session_id === session.id);

            if (engagement) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user_id)
                .single();

              console.log('[SquadInvitationBanner] Found invitation via engagement');
              setInvitation({
                engagement_id: engagement.id,
                session_id: session.id,
                engagement: { id: engagement.id },
                session: {
                  id: session.id,
                  user_id: session.user_id,
                  drill_config: session.custom_drill_config as any,
                },
                commander_name: profile?.full_name || null,
              });
              return;
            }
          }
        }
      }

      // Fallback: try session-based lookup (backwards compatibility)
      const sessionIds = participations
        .map((p) => p.session_id)
        .filter((id): id is string => !!id);

      console.log('[SquadInvitationBanner] Fallback session IDs:', sessionIds);

      if (sessionIds.length > 0) {
        let sessionsQuery = supabase
          .from('sessions')
          .select('id, user_id, custom_drill_config, training_id, engagement_mode')
          .in('id', sessionIds)
          .eq('engagement_mode', 'squad');

        if (trainingId) {
          sessionsQuery = sessionsQuery.eq('training_id', trainingId);
        }

        const { data: sessions, error: sessError } = await sessionsQuery;
        console.log('[SquadInvitationBanner] Fallback sessions:', sessions, sessError);

        if (!sessError && sessions?.length) {
          const session = sessions[0];

          // Try to find or create engagement reference
          const { data: engagement } = await supabase
            .from('engagements')
            .select('id')
            .eq('session_id', session.id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user_id)
            .single();

          console.log('[SquadInvitationBanner] Found invitation via session fallback');
          setInvitation({
            engagement_id: engagement?.id || session.id, // Use engagement if found, else session as fallback
            session_id: session.id,
            engagement: { id: engagement?.id || session.id },
            session: {
              id: session.id,
              user_id: session.user_id,
              drill_config: session.custom_drill_config as any,
            },
            commander_name: profile?.full_name || null,
          });
          return;
        }
      }

      console.log('[SquadInvitationBanner] No invitations found');
      setInvitation(null);
    } catch (error) {
      console.error('[SquadInvitationBanner] Error loading:', error);
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  }, [userId, trainingId]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  // Subscribe to realtime changes on engagement_participants
  useEffect(() => {
    const channel = supabase
      .channel(`squad-invite-${userId}`)
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
  }, [userId, loadInvitation]);

  const handleJoin = async () => {
    if (!invitation) return;

    setJoining(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Update participant state to 'joined' using engagement_id
      await updateParticipantState(invitation.engagement_id, userId, 'joined');

      // Notify the commander
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await notifySquadParticipantJoined(
        invitation.session.user_id,
        invitation.engagement_id, // Use engagementId for notifications
        profile?.full_name || 'A team member',
        invitation.session.drill_config?.name || 'Squad Engagement'
      );

      // Navigate to the squad lobby (by engagementId)
      router.push({
        pathname: '/(protected)/squadLobby',
        params: {
          engagementId: invitation.engagement_id,
        },
      });

      onInvitationChanged?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join');
      setJoining(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    Alert.alert(
      'Decline Invitation?',
      'You can be re-invited by the commander if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              // Update participant state to 'left' using engagement_id
              await updateParticipantState(invitation.engagement_id, userId, 'left');

              // Notify the commander
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .single();

              await notifySquadParticipantDeclined(
                invitation.session.user_id,
                invitation.engagement_id, // Use engagementId for notifications
                profile?.full_name || 'A team member',
                invitation.session.drill_config?.name || 'Squad Engagement'
              );

              setInvitation(null);
              onInvitationChanged?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline');
            } finally {
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  // Don't show anything while loading or if no invitation
  if (loading || !invitation) {
    return null;
  }

  const drillName = invitation.session.drill_config?.name || 'Squad Engagement';
  const distance = invitation.session.drill_config?.distance_m;
  const rounds = invitation.session.drill_config?.rounds_per_shooter;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.green }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.green}20` }]}>
          <Users size={18} color={colors.green} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            Squad Engagement Invite
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {invitation.commander_name || 'Commander'} invited you
          </Text>
        </View>
      </View>

      {/* Drill Info */}
      <View style={[styles.drillInfo, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.drillName, { color: colors.text }]}>
          {drillName}
        </Text>
        <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
          {distance && `${distance}m`}
          {distance && rounds && ' · '}
          {rounds && `${rounds} shots`}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.declineButton, { borderColor: colors.border }]}
          onPress={handleDecline}
          disabled={declining || joining}
          activeOpacity={0.7}
        >
          {declining ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <>
              <X size={16} color={colors.textMuted} />
              <Text style={[styles.declineText, { color: colors.textMuted }]}>
                Decline
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: colors.green }]}
          onPress={handleJoin}
          disabled={joining || declining}
          activeOpacity={0.85}
        >
          {joining ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={16} color="#fff" />
              <Text style={styles.joinText}>Join Squad</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  drillInfo: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  drillName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  drillMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  joinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
