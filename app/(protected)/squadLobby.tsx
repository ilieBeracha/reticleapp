/**
 * Squad Management Screen (Commander Only)
 *
 * This screen is for commanders to:
 * - View participants in the squad
 * - Start the squad session
 *
 * Non-commanders should not access this - they go directly to activeSession
 * when the engagement is active.
 *
 * Routes by engagementId:
 * /(protected)/squadLobby?engagementId=...
 */

import { useColors } from '@/hooks/ui/useColors';
import { useParticipantsRealtime } from '@/hooks/realtime';
import {
  getEngagement,
  getEngagementParticipants,
  getParticipantCounts,
  startEngagement,
} from '@/services/session/participants';
import { notifySquadEngagementStarting } from '@/services/pushService';
import { supabase } from '@/lib/supabase';
import type { Engagement, EngagementParticipant } from '@/services/session/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ChevronLeft,
  LogOut,
  Play,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SessionInfo {
  id: string;
  user_id: string;
  custom_drill_config: {
    name?: string;
    distance_m?: number;
    rounds_per_shooter?: number;
  } | null;
  training_id: string | null;
  team_id: string | null;
}

export default function SquadLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    engagementId: string;
    /** @deprecated Use engagementId. Kept for backwards compat. */
    sessionId?: string;
    trainingId?: string;
  }>();

  // Use engagementId as primary, fall back to sessionId for backwards compat
  const engagementId = params.engagementId;
  const legacySessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [participants, setParticipants] = useState<EngagementParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load engagement, session, and participants
  const loadData = useCallback(async () => {
    if (!engagementId && !legacySessionId) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      let eng: Engagement | null = null;

      if (engagementId) {
        // Primary path: load by engagementId
        eng = await getEngagement(engagementId);
      } else if (legacySessionId) {
        // Backwards compat: load engagement by session_id
        const { data } = await supabase
          .from('engagements')
          .select('*')
          .eq('session_id', legacySessionId)
          .single();
        eng = data;
      }

      if (!eng) {
        Alert.alert('Error', 'Engagement not found');
        return;
      }

      setEngagement(eng);

      // Get session info (include user_id to check commander)
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, user_id, custom_drill_config, training_id, team_id')
        .eq('id', eng.session_id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Get participants
      const participantsData = await getEngagementParticipants(eng.id);
      setParticipants(participantsData);
    } catch (error) {
      console.error('[SquadLobby] Failed to load:', error);
      Alert.alert('Error', 'Failed to load engagement data');
    } finally {
      setLoading(false);
    }
  }, [engagementId, legacySessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime participant updates
  useParticipantsRealtime({
    engagementId: engagement?.id,
    onParticipantAdded: loadData,
    onParticipantChanged: loadData,
    onParticipantRemoved: loadData,
  });

  const counts = getParticipantCounts(participants);
  const isCommander = !!(currentUserId && session?.user_id === currentUserId);
  
  // Find current user's participation
  const myParticipation = participants.find(p => p.user_id === currentUserId);
  const isParticipant = !!myParticipation;

  // Realtime: Subscribe to engagement status changes
  // When commander starts, participants should auto-navigate to active session
  useEffect(() => {
    if (!engagement?.id || !session?.id || isCommander) return;

    const channel = supabase
      .channel(`engagement-status-${engagement.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'engagements',
          filter: `id=eq.${engagement.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          console.log('[SquadLobby] Engagement status changed:', newStatus);
          
          if (newStatus === 'active') {
            // Commander started! Navigate to active session
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({
              pathname: '/(protected)/activeSession',
              params: {
                sessionId: session.id,
                engagementId: engagement.id,
                returnTo: params.trainingId ? 'trainingDetail' : undefined,
                returnId: params.trainingId,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagement?.id, session?.id, isCommander, params.trainingId]);

  // Start the engagement (commander can start even with 0 participants)
  const handleStartEngagement = async () => {
    if (!engagement || !session) return;

    setStarting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Update engagement status to active
      await startEngagement(engagement.id);

      // Notify all joined participants that we're starting
      const joinedUserIds = participants
        .filter((p) => p.state === 'joined')
        .map((p) => p.user_id);

      if (joinedUserIds.length > 0) {
        await notifySquadEngagementStarting(
          joinedUserIds,
          engagement.id,
          session?.custom_drill_config?.name || 'Squad Engagement'
        );
      }

      // Navigate to the actual session
      router.replace({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
          engagementId: engagement.id,
          returnTo: params.trainingId ? 'trainingDetail' : undefined,
          returnId: params.trainingId,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start engagement');
      setStarting(false);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    Alert.alert(
      'Cancel Squad Engagement?',
      'This will cancel the engagement and notify invited participants.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Cancel Engagement',
          style: 'destructive',
          onPress: async () => {
            // TODO: Cancel session and notify participants
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const drillName = session?.custom_drill_config?.name || 'Squad Engagement';
  const distance = session?.custom_drill_config?.distance_m;
  const rounds = session?.custom_drill_config?.rounds_per_shooter;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Manage Squad
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Drill Info Card */}
        <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.drillIcon}>
            <Users size={24} color={colors.primary} />
          </View>
          <View style={styles.drillInfo}>
            <Text style={[styles.drillName, { color: colors.text }]}>
              {drillName}
            </Text>
            <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
              {distance && `${distance}m`}
              {distance && rounds && ' · '}
              {rounds && `${rounds} shots`}
            </Text>
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {counts.total === 0 ? 'No participants yet' : `${counts.total} Participant${counts.total !== 1 ? 's' : ''}`}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
            {counts.total === 0 ? 'Add participants before starting' : 'Start when ready'}
          </Text>
        </View>

        {/* Participants List */}
        <View style={styles.participantsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            PARTICIPANTS
          </Text>

          <View style={[styles.participantsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {participants.map((participant, index) => (
              <View
                key={participant.id}
                style={[
                  styles.participantRow,
                  index < participants.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.participantInfo}>
                  <Text style={[styles.participantName, { color: colors.text }]}>
                    {participant.user_full_name || 'Unknown'}
                  </Text>
                  <View style={styles.participantStatus}>
                    {participant.state === 'joined' && (
                      <>
                        <Check size={12} color={colors.green} />
                        <Text style={[styles.statusText, { color: colors.green }]}>
                          In Squad
                        </Text>
                      </>
                    )}
                    {participant.state === 'left' && (
                      <>
                        <LogOut size={12} color={colors.textMuted} />
                        <Text style={[styles.statusText, { color: colors.textMuted }]}>
                          Removed
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Status indicator */}
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        participant.state === 'joined'
                          ? colors.green
                          : participant.state === 'left'
                          ? colors.textMuted
                          : colors.orange,
                    },
                  ]}
                />
              </View>
            ))}

            {participants.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No participants invited
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Hint */}
        {isCommander && counts.total === 0 && (
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            You can start now or add participants first using the + button on the training screen
          </Text>
        )}
      </ScrollView>

      {/* Bottom Action - Commander only can start */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
          {isCommander ? (
            // Commander: Start button - can start even with 0 participants (solo squad)
            <TouchableOpacity
              style={[
                styles.startButton,
                {
                  backgroundColor: colors.green,
                },
              ]}
              onPress={handleStartEngagement}
              disabled={starting}
              activeOpacity={0.85}
            >
              {starting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Play size={20} color="#fff" fill="#fff" />
                  <Text style={styles.startButtonText}>
                    Start Session{counts.total > 0 ? ` (${counts.total} participants)` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            // Non-commander shouldn't be here - redirect them
            <View style={[styles.waitingBar, { backgroundColor: colors.card }]}>
              <Users size={18} color={colors.textMuted} />
              <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                Only commanders can manage this session
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  drillIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  drillMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  participantsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  participantsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomBarInner: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // Participant action buttons (inline in row)
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom bar actions for participants
  participantBottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  bottomDeclineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bottomAcceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  waitingText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
