/**
 * ActiveSquadSession
 *
 * Compact card showing active squad/group session status in trainingDetail.
 * Shows either lobby (waiting) or active session (with entry form).
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getEngagementParticipants, getParticipantCounts } from '@/services/session/participants';
import type { Engagement, EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ActiveEngagementData {
  engagement: Engagement;
  sessionId: string;
  drillName: string;
  distanceM: number | null;
  roundsPerShooter: number | null;
  engagementMode: 'squad' | 'group';
  hasStarted: boolean;
  participants: EngagementParticipant[];
}

interface ActiveSquadSessionProps {
  trainingId: string;
}

export function ActiveSquadSession({ trainingId }: ActiveSquadSessionProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [activeData, setActiveData] = useState<ActiveEngagementData | null>(null);

  // Load active engagement for this training
  const loadActiveEngagement = useCallback(async () => {
    try {
      const { data: engagements, error: engError } = await supabase
        .from('engagements')
        .select(`id, session_id, engagement_mode, status, shooter_id, started_at`)
        .eq('training_id', trainingId)
        .in('engagement_mode', ['squad', 'group'])
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (engError) throw engError;
      if (!engagements?.length) {
        setActiveData(null);
        setLoading(false);
        return;
      }

      const engagement = engagements[0];

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, custom_drill_config')
        .eq('id', engagement.session_id)
        .single();

      if (sessionError) throw sessionError;

      const participants = await getEngagementParticipants(engagement.id);
      const drillConfig = session.custom_drill_config as any;
      const isGroup = engagement.engagement_mode === 'group';

      setActiveData({
        engagement: engagement as Engagement,
        sessionId: session.id,
        drillName: drillConfig?.name || (isGroup ? t('training.groupEngagement') : t('training.squadEngagement')),
        distanceM: drillConfig?.distance_m || null,
        roundsPerShooter: drillConfig?.rounds_per_shooter || null,
        engagementMode: engagement.engagement_mode as 'squad' | 'group',
        hasStarted: !!engagement.started_at,
        participants,
      });
    } catch (error) {
      console.error('[ActiveSquadSession] Failed to load:', error);
      setActiveData(null);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    loadActiveEngagement();
  }, [loadActiveEngagement]);

  // Realtime subscription
  useEffect(() => {
    if (!trainingId) return;

    const channel = supabase
      .channel(`active-squad-${trainingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_participants' }, () =>
        loadActiveEngagement()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagements' }, () =>
        loadActiveEngagement()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, loadActiveEngagement]);

  if (loading || !activeData) return null;

  const { hasStarted, participants, engagementMode, drillName, distanceM } = activeData;
  const isGroup = engagementMode === 'group';
  const counts = getParticipantCounts(participants);
  const modeLabel = isGroup ? t('training.groupType') : t('training.squadType');

  const accentColor = hasStarted ? colors.green : colors.orange;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: accentColor + '12', borderColor: accentColor }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hasStarted) {
            // Session in progress - go to active session
            router.push({
              pathname: '/(protected)/activeSession',
              params: {
                sessionId: activeData.sessionId,
                engagementId: activeData.engagement.id,
                engagementMode: activeData.engagementMode,
                returnTo: 'trainingDetail',
                returnId: trainingId,
              },
            });
          } else {
            // Still in lobby - go to squad lobby
            router.push({
              pathname: '/(protected)/squadLobby',
              params: {
                engagementId: activeData.engagement.id,
                sessionId: activeData.sessionId,
                trainingId,
                engagementMode: activeData.engagementMode,
              },
            });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBadge, { backgroundColor: accentColor + '25' }]}>
          <Users size={16} color={accentColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {hasStarted ? t('training.sessionInProgress', { mode: modeLabel }) : t('training.lobbyActive', { mode: modeLabel })}
          </Text>
          <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
            {drillName}
            {distanceM ? ` · ${distanceM}m` : ''} · {t('training.joinedCount', { count: counts.joined })}
            {counts.pending > 0 && ` · ${t('training.pendingCount', { count: counts.pending })}`}
          </Text>
        </View>
        <View style={[styles.goBtn, { backgroundColor: accentColor + '20' }]}>
          <ChevronRight size={18} color={accentColor} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 12,
  },
  goBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
