/**
 * ActiveSquadEngagementsCard
 *
 * Shows active squad engagements for a training.
 * - All team members can see and join
 * - Commanders can invite more participants
 */

import { InviteParticipantsPanel } from '@/components/session/creation';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { addParticipant } from '@/services/session/participants';
import { notifySquadEngagementInvites } from '@/services/pushService';
import { getCurrentUser } from '@/services/authService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Play, UserPlus, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActiveEngagement {
  id: string;
  session_id: string;
  engagement_mode: 'solo' | 'squad';
  status: string;
  session: {
    id: string;
    user_id: string;
    custom_drill_config: {
      name?: string;
      distance_m?: number;
      rounds_per_shooter?: number;
    } | null;
  };
  commander_name: string | null;
  participant_count: number;
}

interface ActiveSquadEngagementsCardProps {
  trainingId: string;
  teamId: string;
  userId: string;
  canManageTraining: boolean;
  teamName?: string;
}

export function ActiveSquadEngagementsCard({
  trainingId,
  teamId,
  userId,
  canManageTraining,
  teamName,
}: ActiveSquadEngagementsCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<ActiveEngagement[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  
  // Invite modal state
  const [inviteEngagement, setInviteEngagement] = useState<ActiveEngagement | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  const loadEngagements = useCallback(async () => {
    try {
      // Get sessions for this training
      const { data: sessions, error: sessError } = await supabase
        .from('sessions')
        .select('id, user_id, custom_drill_config')
        .eq('training_id', trainingId);

      if (sessError) throw sessError;
      if (!sessions?.length) {
        setEngagements([]);
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      // Get active/pending squad engagements for these sessions
      const { data: engs, error: engError } = await supabase
        .from('engagements')
        .select('id, session_id, engagement_mode, status')
        .in('session_id', sessionIds)
        .eq('engagement_mode', 'squad')
        .in('status', ['pending', 'active']);

      if (engError) throw engError;
      if (!engs?.length) {
        setEngagements([]);
        return;
      }

      // Get participant counts
      const engIds = engs.map((e) => e.id);
      const { data: participants } = await supabase
        .from('engagement_participants')
        .select('engagement_id')
        .in('engagement_id', engIds);

      const countMap = new Map<string, number>();
      participants?.forEach((p) => {
        countMap.set(p.engagement_id, (countMap.get(p.engagement_id) || 0) + 1);
      });

      // Get commander profiles
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));
      const commanderIds = [...new Set(sessions.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', commanderIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      // Build active engagements list
      const activeEngs: ActiveEngagement[] = engs.map((eng) => {
        const session = sessionMap.get(eng.session_id);
        return {
          id: eng.id,
          session_id: eng.session_id,
          engagement_mode: eng.engagement_mode,
          status: eng.status,
          session: {
            id: session?.id || '',
            user_id: session?.user_id || '',
            custom_drill_config: session?.custom_drill_config as any,
          },
          commander_name: profileMap.get(session?.user_id || '') || null,
          participant_count: countMap.get(eng.id) || 0,
        };
      });

      setEngagements(activeEngs);
    } catch (error) {
      console.error('[ActiveSquadEngagements] Error:', error);
      setEngagements([]);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`squad-active-${trainingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagements',
        },
        () => loadEngagements()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_participants',
        },
        () => loadEngagements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, loadEngagements]);

  const handleJoin = async (engagement: ActiveEngagement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoiningId(engagement.id);

    const isCommander = engagement.session.user_id === userId;

    try {
      // If engagement is PENDING, only commander can manage it
      if (engagement.status === 'pending') {
        if (isCommander) {
          // Commander goes to lobby to manage & start
          router.push({
            pathname: '/(protected)/squadLobby',
            params: { engagementId: engagement.id },
          });
        } else {
          Alert.alert('Not Started', 'This session hasn\'t been started yet. Wait for the commander to start it.');
          setJoiningId(null);
        }
        return;
      }

      // If engagement is ACTIVE, go directly to activeSession
      // Add user as participant if not already
      const { data: existing } = await supabase
        .from('engagement_participants')
        .select('id, state')
        .eq('engagement_id', engagement.id)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // Add as participant (they're joining an active session)
        await addParticipant(engagement.id, userId);
      }

      // Navigate directly to active session
      router.push({
        pathname: '/(protected)/activeSession',
        params: { sessionId: engagement.session_id },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join');
      setJoiningId(null);
    }
  };

  const handleOpenInvite = (engagement: ActiveEngagement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInviteEngagement(engagement);
    setInvitedUserIds([]);
  };

  const handleSendInvites = async () => {
    if (!inviteEngagement || !invitedUserIds.length) return;

    setSendingInvites(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Add all selected participants
      await Promise.all(
        invitedUserIds.map((uid) => addParticipant(inviteEngagement.id, uid))
      );

      // Send push notifications
      const currentUser = await getCurrentUser();
      await notifySquadEngagementInvites(
        invitedUserIds,
        inviteEngagement.id,
        currentUser?.user_metadata?.full_name || 'Commander',
        inviteEngagement.session.custom_drill_config?.name || 'Squad Engagement',
        trainingId,
        teamName
      );

      Alert.alert('Invites Sent', `${invitedUserIds.length} team members invited`);
      setInviteEngagement(null);
      loadEngagements();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  };

  if (loading) {
    return null; // Don't show loading state, just hide until loaded
  }

  if (engagements.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Users size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Active Squad Engagements
          </Text>
        </View>

        {engagements.map((eng) => {
          const isCommander = eng.session.user_id === userId;
          const drillName = eng.session.custom_drill_config?.name || 'Squad Engagement';
          const distance = eng.session.custom_drill_config?.distance_m;
          const isJoining = joiningId === eng.id;
          const isPending = eng.status === 'pending';
          const isActive = eng.status === 'active';

          // Determine button text based on status and role
          let buttonText = 'Join';
          if (isCommander) {
            buttonText = isPending ? 'Manage' : 'Open';
          } else {
            buttonText = isActive ? 'Join' : 'Waiting...';
          }

          // Non-commanders can't click on pending sessions
          const canClick = isCommander || isActive;

          return (
            <View
              key={eng.id}
              style={[
                styles.engagementCard, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: isActive ? colors.green + '60' : colors.orange + '40',
                }
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: isActive ? colors.green + '20' : colors.orange + '20' }
                  ]}>
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: isActive ? colors.green : colors.orange }
                    ]} />
                    <Text style={[
                      styles.statusText, 
                      { color: isActive ? colors.green : colors.orange }
                    ]}>
                      {isActive ? 'Active' : 'Not Started'}
                    </Text>
                  </View>
                  <Text style={[styles.participantCount, { color: colors.textMuted }]}>
                    {eng.participant_count} participant{eng.participant_count !== 1 ? 's' : ''}
                  </Text>
                </View>

                <Text style={[styles.drillName, { color: colors.text }]}>
                  {drillName}
                </Text>
                
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {distance && `${distance}m • `}
                  Created by {isCommander ? 'you' : eng.commander_name || 'Commander'}
                </Text>
              </View>

              <View style={styles.cardActions}>
                {/* Invite button - only for commanders when pending */}
                {canManageTraining && isPending && (
                  <TouchableOpacity
                    style={[styles.inviteBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => handleOpenInvite(eng)}
                  >
                    <UserPlus size={18} color={colors.text} />
                  </TouchableOpacity>
                )}

                {/* Join/Open/Manage button */}
                <TouchableOpacity
                  style={[
                    styles.joinBtn, 
                    { 
                      backgroundColor: canClick ? colors.green : colors.secondary,
                      opacity: canClick ? 1 : 0.6,
                    }
                  ]}
                  onPress={() => handleJoin(eng)}
                  disabled={isJoining || !canClick}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Play size={16} color="#fff" fill="#fff" />
                      <Text style={styles.joinText}>
                        {buttonText}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Invite Modal */}
      <Modal
        visible={!!inviteEngagement}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInviteEngagement(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.card }]}
              onPress={() => setInviteEngagement(null)}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Invite to Squad
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.modalContent}>
            <InviteParticipantsPanel
              teamId={teamId}
              invitedUserIds={invitedUserIds}
              onInvitedChange={setInvitedUserIds}
            />
          </View>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: invitedUserIds.length > 0 ? colors.primary : colors.secondary },
              ]}
              onPress={handleSendInvites}
              disabled={invitedUserIds.length === 0 || sendingInvites}
            >
              {sendingInvites ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <UserPlus size={18} color={invitedUserIds.length > 0 ? '#fff' : colors.textMuted} />
                  <Text
                    style={[
                      styles.sendBtnText,
                      { color: invitedUserIds.length > 0 ? '#fff' : colors.textMuted },
                    ]}
                  >
                    Send {invitedUserIds.length > 0 ? `${invitedUserIds.length} ` : ''}Invites
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  engagementCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  participantCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  drillName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  joinText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
