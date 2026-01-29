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

import { InviteParticipantsPanel } from '@/components/session/creation/InviteParticipantsPanel';
import { useParticipantsRealtime } from '@/hooks/realtime/participants/useParticipantsRealtime';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { notifySquadEngagementInvites, notifySquadEngagementStarting } from '@/services/pushService';
import { updateSession } from '@/services/session/mutations';
import {
  abortEngagement,
  acceptInvite,
  addParticipant,
  declineInvite,
  getEngagement,
  getEngagementParticipants,
  getParticipantCounts,
  startEngagement,
  updateParticipantRole,
} from '@/services/session/participants';
import type { Engagement, EngagementParticipant, EngagementRole } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronLeft, Clock, LogOut, Play, UserPlus, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
    /** Engagement mode: squad or group */
    engagementMode?: 'squad' | 'group';
  }>();

  // Use engagementId as primary, fall back to sessionId for backwards compat
  const engagementId = params.engagementId;
  const legacySessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null); // Shared session
  const [participants, setParticipants] = useState<EngagementParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Accept/decline state
  const [responding, setResponding] = useState(false);

  // Participant weapons: userId -> weapon name
  const [participantWeapons, setParticipantWeapons] = useState<Record<string, string>>({});

  // Load engagement, session, and participants
  const loadData = useCallback(async () => {
    if (!engagementId && !legacySessionId) return;

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      let eng: Engagement | null = null;

      if (engagementId) {
        // Primary path: load by engagementId
        eng = await getEngagement(engagementId);
      } else if (legacySessionId) {
        // Backwards compat: load engagement by session_id
        const { data } = await supabase.from('engagements').select('*').eq('session_id', legacySessionId).single();
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

  // Fetch participant weapons (favorite or most recently used)
  useEffect(() => {
    if (participants.length === 0) return;

    const fetchParticipantWeapons = async () => {
      const userIds = participants.map((p) => p.user_id);
      if (userIds.length === 0) return;

      try {
        // Fetch favorite or most recently used weapon for each participant
        const { data, error } = await supabase
          .from('user_weapons')
          .select('user_id, name, caliber, is_favorite, last_used_at')
          .in('user_id', userIds)
          .order('is_favorite', { ascending: false })
          .order('last_used_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.error('[SquadLobby] Failed to fetch weapons:', error);
          return;
        }

        // Build map: userId -> weapon display string (first match for each user)
        const weaponMap: Record<string, string> = {};
        for (const weapon of data || []) {
          if (!weaponMap[weapon.user_id]) {
            weaponMap[weapon.user_id] = weapon.name + (weapon.caliber ? ` (${weapon.caliber})` : '');
          }
        }
        setParticipantWeapons(weaponMap);
      } catch (error) {
        console.error('[SquadLobby] Error fetching participant weapons:', error);
      }
    };

    fetchParticipantWeapons();
  }, [participants]);

  const counts = getParticipantCounts(participants);
  const isCommander = !!(currentUserId && session?.user_id === currentUserId);

  // Calculate role-based counts
  const joinedShooters = participants.filter((p) => p.state === 'joined' && p.role === 'shooter').length;
  const joinedSpotters = participants.filter((p) => p.state === 'joined' && p.role === 'spotter').length;
  const pendingCount = participants.filter((p) => p.state === 'pending').length;
  const canStart = joinedShooters >= 2; // Minimum 2 shooters to start

  // Handle role change (commander only) - optimistic update for instant UI
  const handleRoleChange = async (userId: string, newRole: EngagementRole) => {
    if (!engagement) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update - update local state immediately
    const previousParticipants = participants;
    setParticipants((prev) => prev.map((p) => (p.user_id === userId ? { ...p, role: newRole } : p)));

    try {
      await updateParticipantRole(engagement.id, userId, newRole);
      // No need to reload - optimistic update already applied
    } catch (error: any) {
      console.error('[SquadLobby] Failed to update role:', error);
      // Revert on error
      setParticipants(previousParticipants);
      Alert.alert('Error', error.message || 'Failed to update role');
    }
  };

  // Handle accept invite (participant)
  const handleAcceptInvite = async () => {
    if (!engagement || !currentUserId) return;

    setResponding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await acceptInvite(engagement.id, currentUserId);
      loadData();
    } catch (error: any) {
      console.error('[SquadLobby] Failed to accept invite:', error);
      Alert.alert('Error', error.message || 'Failed to accept invite');
    } finally {
      setResponding(false);
    }
  };

  // Handle decline invite (participant)
  const handleDeclineInvite = async () => {
    if (!engagement || !currentUserId) return;

    Alert.alert('Decline Invitation?', 'You will be removed from this squad engagement.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setResponding(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          try {
            await declineInvite(engagement.id, currentUserId);
            // Navigate back after declining
            if (params.trainingId) {
              router.replace({
                pathname: '/(protected)/trainingDetail',
                params: { id: params.trainingId },
              });
            } else {
              router.replace('/(protected)/(tabs)');
            }
          } catch (error: any) {
            console.error('[SquadLobby] Failed to decline invite:', error);
            Alert.alert('Error', error.message || 'Failed to decline invite');
            setResponding(false);
          }
        },
      },
    ]);
  };

  // Realtime: Listen for commander starting the session (for participants)
  // Uses BOTH broadcast (fast) and postgres_changes (reliable fallback)
  useEffect(() => {
    if (!engagement?.id || !session?.id || isCommander) return;

    let hasNavigated = false;
    const navigateToSession = () => {
      if (hasNavigated) return;
      hasNavigated = true;
      console.log('[SquadLobby] Session started, navigating...');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
          engagementId: engagement.id,
          engagementMode: params.engagementMode || 'squad',
          returnTo: params.trainingId ? 'trainingDetail' : undefined,
          returnId: params.trainingId,
        },
      });
    };

    // Primary: Broadcast channel (fast)
    const broadcastChannel = supabase
      .channel(`squad-start-${engagement.id}`)
      .on('broadcast', { event: 'session_started' }, () => {
        console.log('[SquadLobby] Received broadcast: session_started');
        navigateToSession();
      })
      .subscribe((status) => {
        console.log('[SquadLobby] Broadcast subscription:', status);
      });

    // Fallback: Postgres changes (reliable but slower)
    const dbChannel = supabase
      .channel(`squad-db-${engagement.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'engagements',
          filter: `id=eq.${engagement.id}`,
        },
        (payload) => {
          // Check if engagement was started (started_at was set)
          if (payload.new?.started_at && !payload.old?.started_at) {
            console.log('[SquadLobby] Detected engagement start via DB change');
            navigateToSession();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [engagement?.id, session?.id, isCommander, params.trainingId, params.engagementMode, router]);

  // Find current user's participation
  const myParticipation = participants.find((p) => p.user_id === currentUserId);
  const isParticipant = !!myParticipation;

  // Start the engagement (commander can start even with 0 participants)
  const handleStartEngagement = async () => {
    if (!engagement || !session) return;

    setStarting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Mark engagement as started (closes invitations)
      // This also triggers postgres_changes for the fallback listener
      await startEngagement(engagement.id);

      // Broadcast to all participants in the lobby that we're starting
      const channelName = `squad-start-${engagement.id}`;
      const channel = supabase.channel(channelName);

      // Wait for subscription to be fully ready
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });
      });

      // Send broadcast multiple times for reliability
      for (let i = 0; i < 3; i++) {
        await channel.send({
          type: 'broadcast',
          event: 'session_started',
          payload: { engagementId: engagement.id },
        });
        if (i < 2) await new Promise((r) => setTimeout(r, 50));
      }

      // Small delay to ensure broadcast is delivered before cleanup
      await new Promise((resolve) => setTimeout(resolve, 150));
      supabase.removeChannel(channel);

      // Also send push notifications for participants not in the lobby
      const joinedUserIds = participants.filter((p) => p.state === 'joined').map((p) => p.user_id);

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
          engagementMode: params.engagementMode || 'squad',
          returnTo: params.trainingId ? 'trainingDetail' : undefined,
          returnId: params.trainingId,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start engagement');
      setStarting(false);
    }
  };

  // Go back without cancelling - lobby persists
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else if (params.trainingId) {
      router.replace({
        pathname: '/(protected)/trainingDetail',
        params: { id: params.trainingId },
      });
    } else {
      router.replace('/(protected)/(tabs)');
    }
  };

  // Cancel engagement - requires confirmation
  const handleCancelEngagement = () => {
    Alert.alert('Cancel Squad Engagement?', 'This will cancel the engagement and notify invited participants.', [
      { text: 'Keep Waiting', style: 'cancel' },
      {
        text: 'Cancel Engagement',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          try {
            // Cancel engagement in database
            if (engagement?.id) {
              await abortEngagement(engagement.id);
            }

            // Cancel the associated session
            if (session?.id) {
              await updateSession(session.id, { status: 'cancelled' });
            }

            console.log('[SquadLobby] Engagement cancelled:', engagement?.id);
          } catch (error) {
            console.error('[SquadLobby] Failed to cancel engagement:', error);
            // Continue with navigation even if cancel fails
          }

          // Navigate back
          if (params.trainingId) {
            router.replace({
              pathname: '/(protected)/trainingDetail',
              params: { id: params.trainingId },
            });
          } else {
            router.replace('/(protected)/(tabs)');
          }
        },
      },
    ]);
  };

  // Send invites to selected users
  const handleSendInvites = async () => {
    if (!engagement || invitedUserIds.length === 0) return;

    setSendingInvites(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Add all selected participants to the engagement
      for (const userId of invitedUserIds) {
        await addParticipant(engagement.id, userId);
      }

      // Get current user's profile for notification
      const { data: profile } = currentUserId
        ? await supabase.from('profiles').select('full_name').eq('id', currentUserId).single()
        : { data: null };

      // Get team name for notification
      const { data: team } = session?.team_id
        ? await supabase.from('teams').select('name').eq('id', session.team_id).single()
        : { data: null };

      // Send push notifications to invited participants
      if (invitedUserIds.length > 0 && params.trainingId) {
        await notifySquadEngagementInvites(
          invitedUserIds,
          session?.id || engagement.session_id,
          params.trainingId,
          session?.custom_drill_config?.name || 'Squad Engagement',
          profile?.full_name || 'Commander',
          team?.name || 'Team'
        );
      }

      // Clear selection and close modal
      setInvitedUserIds([]);
      setShowInviteModal(false);

      // Reload data to show new participants
      loadData();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[SquadLobby] Failed to send invites:', error);
      Alert.alert('Error', error.message || 'Failed to invite participants');
    } finally {
      setSendingInvites(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top,
          },
        ]}
      >
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isCommander ? (params.engagementMode === 'group' ? 'Group Lobby' : 'Squad Lobby') : 'Waiting Room'}
        </Text>
        {isCommander && session?.team_id ? (
          <TouchableOpacity
            style={[styles.inviteHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.7}
          >
            <UserPlus size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Drill Info Card */}
        <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.drillIcon}>
            <Users size={24} color={colors.primary} />
          </View>
          <View style={styles.drillInfo}>
            <Text style={[styles.drillName, { color: colors.text }]}>{drillName}</Text>
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
            {counts.total === 0
              ? 'No participants yet'
              : `${joinedShooters} Shooter${joinedShooters !== 1 ? 's' : ''} / ${joinedSpotters} Spotter${joinedSpotters !== 1 ? 's' : ''}`}
          </Text>
          <Text style={[styles.statusSubtitle, { color: pendingCount > 0 ? colors.orange : colors.textMuted }]}>
            {counts.total === 0
              ? 'Add participants before starting'
              : pendingCount > 0
                ? `${pendingCount} pending response${pendingCount !== 1 ? 's' : ''}`
                : canStart
                  ? 'Ready to start'
                  : `Need ${2 - joinedShooters} more shooter${2 - joinedShooters !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Participants List */}
        <View style={styles.participantsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PARTICIPANTS</Text>

          <View style={[styles.participantsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {participants.map((participant, index) => {
              const statusColor =
                participant.state === 'joined'
                  ? colors.green
                  : participant.state === 'pending'
                    ? colors.orange
                    : participant.state === 'declined'
                      ? colors.red || '#EF4444'
                      : colors.textMuted;
              const statusLabel =
                participant.state === 'joined'
                  ? 'Joined'
                  : participant.state === 'pending'
                    ? 'Pending'
                    : participant.state === 'declined'
                      ? 'Declined'
                      : 'Left';

              return (
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
                    <View style={styles.participantMeta}>
                      <View style={styles.participantStatus}>
                        {participant.state === 'joined' && <Check size={12} color={statusColor} />}
                        {participant.state === 'pending' && <Clock size={12} color={statusColor} />}
                        {participant.state === 'declined' && <X size={12} color={statusColor} />}
                        {participant.state === 'left' && <LogOut size={12} color={statusColor} />}
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      {/* Only show weapon for shooters */}
                      {participant.role === 'shooter' && participantWeapons[participant.user_id] && (
                        <>
                          <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>·</Text>
                          <Text style={[styles.participantWeapon, { color: colors.textMuted }]} numberOfLines={1}>
                            {participantWeapons[participant.user_id]}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Role toggle (commander only, for active participants) */}
                  {isCommander && (participant.state === 'joined' || participant.state === 'pending') ? (
                    <TouchableOpacity
                      style={[styles.roleToggle, { borderColor: colors.border }]}
                      onPress={() =>
                        handleRoleChange(participant.user_id, participant.role === 'shooter' ? 'spotter' : 'shooter')
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.roleText, { color: colors.text }]}>
                        {participant.role === 'shooter' ? 'Shooter' : 'Spotter'}
                      </Text>
                      <ChevronDown size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    /* Status dot for non-commander view */
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  )}
                </View>
              );
            })}

            {participants.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No participants invited</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hint */}
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {isCommander
            ? counts.total === 0
              ? 'Invite participants using the + button'
              : !canStart
                ? 'At least 2 shooters must accept before you can start'
                : 'You can leave and return to this lobby anytime'
            : myParticipation?.state === 'pending'
              ? 'Accept the invite to join the squad'
              : "You'll be notified when the commander starts the session"}
        </Text>
      </ScrollView>

      {/* Bottom Action - Commander or Participant */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
          {isCommander ? (
            // Commander: Cancel and Start buttons
            <View style={styles.commanderActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancelEngagement}
                disabled={starting}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.red || colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: canStart ? colors.green : colors.secondary }]}
                onPress={handleStartEngagement}
                disabled={starting || !canStart}
                activeOpacity={0.85}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Play
                      size={20}
                      color={canStart ? '#fff' : colors.textMuted}
                      fill={canStart ? '#fff' : colors.textMuted}
                    />
                    <Text style={[styles.startButtonText, { color: canStart ? '#fff' : colors.textMuted }]}>
                      {canStart
                        ? `Start (${joinedShooters + joinedSpotters})`
                        : `Need ${2 - joinedShooters} more shooter${2 - joinedShooters !== 1 ? 's' : ''}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : myParticipation?.state === 'pending' ? (
            // Participant with pending invite: Accept/Decline buttons
            <View style={styles.participantBottomActions}>
              <TouchableOpacity
                style={[styles.bottomDeclineBtn, { borderColor: colors.border }]}
                onPress={handleDeclineInvite}
                disabled={responding}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.red || colors.textMuted} />
                <Text style={[styles.bottomDeclineText, { color: colors.red || colors.textMuted }]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bottomAcceptBtn, { backgroundColor: colors.green }]}
                onPress={handleAcceptInvite}
                disabled={responding}
                activeOpacity={0.85}
              >
                {responding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.bottomAcceptText}>Accept Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Participant who accepted, waiting for commander to start
            <View
              style={[
                styles.waitingBar,
                { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1 },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.waitingText, { color: colors.text }]}>Waiting for commander to start...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Invite Participants Modal */}
      <Modal
        visible={showInviteModal}
        animationType="fade"
        transparent
        onRequestClose={() => !sendingInvites && setShowInviteModal(false)}
      >
        <Pressable style={styles.inviteModalOverlay} onPress={() => !sendingInvites && setShowInviteModal(false)}>
          <Pressable
            style={[styles.inviteModalContainer, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.inviteModalHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.inviteModalHeader}>
              <View style={[styles.inviteModalIcon, { backgroundColor: colors.primary + '15' }]}>
                <UserPlus size={24} color={colors.primary} />
              </View>
              <View style={styles.inviteModalHeaderText}>
                <Text style={[styles.inviteModalTitle, { color: colors.text }]}>Invite Squad Members</Text>
                <Text style={[styles.inviteModalSubtitle, { color: colors.textMuted }]}>
                  Select team members to join
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.inviteModalCloseBtn, { backgroundColor: colors.secondary }]}
                onPress={() => !sendingInvites && setShowInviteModal(false)}
                disabled={sendingInvites}
              >
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Invite Panel */}
            <View style={styles.inviteModalContent}>
              {session?.team_id ? (
                <InviteParticipantsPanel
                  teamId={session.team_id}
                  invitedUserIds={invitedUserIds}
                  onInvitedChange={setInvitedUserIds}
                  // Only exclude active participants (joined/pending) - allow re-inviting left/declined
                  excludeUserIds={participants
                    .filter((p) => p.state === 'joined' || p.state === 'pending')
                    .map((p) => p.user_id)}
                />
              ) : (
                <View style={styles.inviteModalEmpty}>
                  <Text style={[styles.inviteModalEmptyText, { color: colors.textMuted }]}>
                    No team context available
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={[styles.inviteModalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.inviteModalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowInviteModal(false)}
                disabled={sendingInvites}
              >
                <Text style={[styles.inviteModalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inviteModalConfirmBtn,
                  { backgroundColor: invitedUserIds.length > 0 ? colors.primary : colors.secondary },
                ]}
                onPress={handleSendInvites}
                disabled={sendingInvites || invitedUserIds.length === 0}
              >
                {sendingInvites ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.inviteModalConfirmText,
                      { color: invitedUserIds.length > 0 ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {invitedUserIds.length > 0 ? `Invite ${invitedUserIds.length}` : 'Select members'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    // paddingBottom: 12,
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
  participantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
  },
  metaSeparator: {
    fontSize: 12,
  },
  participantWeapon: {
    fontSize: 12,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
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
    flex: 1,
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
  // Commander bottom actions
  commanderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Header invite button
  inviteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Invite modal styles
  inviteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  inviteModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  inviteModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  inviteModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteModalHeaderText: {
    flex: 1,
    gap: 2,
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  inviteModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  inviteModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteModalContent: {
    paddingHorizontal: 20,
    maxHeight: 300,
  },
  inviteModalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  inviteModalEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inviteModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
    marginTop: 16,
  },
  inviteModalCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  inviteModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteModalConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  inviteModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
