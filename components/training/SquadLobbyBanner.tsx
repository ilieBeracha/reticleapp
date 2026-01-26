/**
 * SquadLobbyBanner
 *
 * Shows when a commander has an active squad lobby for the current training.
 * Allows them to return to the lobby to manage participants or start the engagement.
 *
 * Features:
 * - Checks for pending squad engagements created by the current user
 * - Shows participant count
 * - Navigate back to squadLobby on tap
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { getEngagementParticipants, getParticipantCounts } from '@/services/session/participants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface ActiveLobby {
  engagementId: string;
  sessionId: string;
  drillName: string;
  participantCount: number;
}

interface SquadLobbyBannerProps {
  trainingId: string;
  userId: string;
  onLobbyChanged?: () => void;
}

export function SquadLobbyBanner({ trainingId, userId, onLobbyChanged }: SquadLobbyBannerProps) {
  const colors = useColors();

  const [activeLobby, setActiveLobby] = useState<ActiveLobby | null>(null);

  // Load active lobby for this commander in this training
  const loadActiveLobby = useCallback(async () => {
    try {
      // Find squad engagements for this training where user is the shooter (commander)
      // and engagement is in 'completed' status (our default, since we can't use 'pending')
      // We identify "active lobby" by: squad mode + no session targets yet
      const { data: engagements, error: engError } = await supabase
        .from('engagements')
        .select(`
          id,
          session_id,
          engagement_mode,
          status,
          created_at,
          sessions!inner (
            id,
            custom_drill_config,
            training_id,
            user_id
          )
        `)
        .eq('sessions.training_id', trainingId)
        .eq('sessions.user_id', userId)
        .eq('engagement_mode', 'squad')
        .order('created_at', { ascending: false })
        .limit(1);

      if (engError) throw engError;
      if (!engagements?.length) {
        setActiveLobby(null);
        return;
      }

      const engagement = engagements[0];
      const session = engagement.sessions as any;

      // Check if this engagement has any targets (results) - if so, it's already been executed
      const { count: targetCount } = await supabase
        .from('session_targets')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);

      // If there are targets, the engagement has been executed
      if (targetCount && targetCount > 0) {
        setActiveLobby(null);
        return;
      }

      // Get participant count
      const participants = await getEngagementParticipants(engagement.id);
      const counts = getParticipantCounts(participants);

      const drillConfig = session.custom_drill_config as any;

      setActiveLobby({
        engagementId: engagement.id,
        sessionId: session.id,
        drillName: drillConfig?.name || 'Squad Engagement',
        participantCount: counts.total,
      });
    } catch (error) {
      console.error('[SquadLobbyBanner] Failed to load:', error);
      setActiveLobby(null);
    }
  }, [trainingId, userId]);

  useEffect(() => {
    loadActiveLobby();
  }, [loadActiveLobby]);

  // Realtime subscription for engagement changes
  useEffect(() => {
    if (!trainingId || !userId) return;

    const channel = supabase
      .channel(`squad-lobby-${trainingId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagements',
        },
        () => {
          loadActiveLobby();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_participants',
        },
        () => {
          loadActiveLobby();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, userId, loadActiveLobby]);

  // Navigate to lobby
  const handleGoToLobby = () => {
    if (!activeLobby) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/squadLobby',
      params: {
        engagementId: activeLobby.engagementId,
        sessionId: activeLobby.sessionId,
        trainingId,
      },
    });
  };

  // Don't render if no active lobby
  if (!activeLobby) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.orange + '15', borderColor: colors.orange }]}
        onPress={handleGoToLobby}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.orange + '25' }]}>
          <Users size={20} color={colors.orange} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Squad Lobby Active</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeLobby.drillName}
            {activeLobby.participantCount > 0 && ` · ${activeLobby.participantCount} waiting`}
          </Text>
        </View>

        <View style={[styles.chevronContainer, { backgroundColor: colors.orange + '20' }]}>
          <ChevronRight size={18} color={colors.orange} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
