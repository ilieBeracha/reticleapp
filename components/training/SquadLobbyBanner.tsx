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
import { useTableSubscription } from '@/hooks/realtime/table/useTableSubscription';
import { getCommanderActiveLobby, getEngagementParticipants, getParticipantCounts } from '@/services/session/participants';
import { getSessionTargetCount } from '@/services/session/queries';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface ActiveLobby {
  engagementId: string;
  sessionId: string;
  drillName: string;
  participantCount: number;
  hasStarted: boolean; // true if started_at is set
  engagementMode: 'squad' | 'group';
}

interface SquadLobbyBannerProps {
  trainingId: string;
  userId: string;
  onLobbyChanged?: () => void;
}

export function SquadLobbyBanner({ trainingId, userId, onLobbyChanged }: SquadLobbyBannerProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const [activeLobby, setActiveLobby] = useState<ActiveLobby | null>(null);

  // Load active lobby for this commander in this training
  const loadActiveLobby = useCallback(async () => {
    try {
      const engagement = await getCommanderActiveLobby(trainingId, userId);

      console.log('[SquadLobbyBanner] Query result:', engagement ? 1 : 0, 'engagements found');

      if (!engagement) {
        console.log('[SquadLobbyBanner] No active engagements, hiding banner');
        setActiveLobby(null);
        return;
      }

      console.log('[SquadLobbyBanner] Found engagement:', engagement.id, 'status:', engagement.status);
      const session = (engagement as any).sessions as any;

      // Check if this engagement has any targets (results)
      const targetCount = await getSessionTargetCount(session.id);

      // If started but no targets yet, show "in progress" banner
      // If not started and no targets, show "lobby" banner
      // If has targets, the engagement is done - don't show banner
      if (targetCount > 0 && !(engagement as any).started_at) {
        setActiveLobby(null);
        return;
      }

      // Get participant count
      const participants = await getEngagementParticipants(engagement.id);
      const counts = getParticipantCounts(participants);

      const drillConfig = session.custom_drill_config as any;

      const isGroup = engagement.engagement_mode === 'group';
      setActiveLobby({
        engagementId: engagement.id,
        sessionId: session.id,
        drillName: drillConfig?.name || (isGroup ? t('training.groupEngagement') : t('training.squadEngagement')),
        participantCount: counts.total,
        hasStarted: !!(engagement as any).started_at,
        engagementMode: engagement.engagement_mode as 'squad' | 'group',
      });
    } catch (error) {
      console.error('[SquadLobbyBanner] Failed to load:', error);
      setActiveLobby(null);
    }
  }, [trainingId, userId]);

  useEffect(() => {
    loadActiveLobby();
  }, [loadActiveLobby]);

  // Debounced reload for realtime updates
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadActiveLobby();
    }, 300);
  }, [loadActiveLobby]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Realtime subscription for engagements changes
  useTableSubscription({
    table: 'engagements',
    filter: `training_id=eq.${trainingId}`,
    onChange: debouncedLoad,
    enabled: !!trainingId && !!userId,
  });

  // Realtime subscription for engagement_participants changes
  useTableSubscription({
    table: 'engagement_participants',
    onChange: debouncedLoad,
    enabled: !!trainingId && !!userId,
  });

  // Navigate to lobby or active session
  const handleGoToLobby = () => {
    if (!activeLobby) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activeLobby.hasStarted) {
      // Session in progress - go to active session
      router.push({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: activeLobby.sessionId,
          engagementId: activeLobby.engagementId,
          engagementMode: activeLobby.engagementMode,
          returnTo: 'trainingDetail',
          returnId: trainingId,
        },
      });
    } else {
      // Still in lobby - go to squad/group lobby
      router.push({
        pathname: '/(protected)/squadLobby',
        params: {
          engagementId: activeLobby.engagementId,
          sessionId: activeLobby.sessionId,
          trainingId,
          engagementMode: activeLobby.engagementMode,
        },
      });
    }
  };

  // Don't render if no active lobby
  if (!activeLobby) {
    return null;
  }

  const isInProgress = activeLobby.hasStarted;
  const isGroup = activeLobby.engagementMode === 'group';
  const modeLabel = isGroup ? t('training.groupType') : t('training.squadType');
  const accentColor = isInProgress ? colors.green : colors.orange;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: accentColor + '15', borderColor: accentColor }]}
        onPress={handleGoToLobby}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: accentColor + '25' }]}>
          <Users size={20} color={accentColor} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isInProgress ? t('training.sessionInProgress', { mode: modeLabel }) : t('training.lobbyActive', { mode: modeLabel })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeLobby.drillName}
            {!isInProgress && activeLobby.participantCount > 0 && ` · ${t('training.waiting', { count: activeLobby.participantCount })}`}
          </Text>
        </View>

        <View style={[styles.chevronContainer, { backgroundColor: accentColor + '20' }]}>
          <ChevronRight size={18} color={accentColor} />
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
