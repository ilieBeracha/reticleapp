/**
 * InviteParticipantsPanel
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Panel for selecting team members to invite to a squad engagement.
 * Works with local state - returns selected user IDs for parent to use
 * when creating the engagement via createEngagement() + addParticipant().
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/services/supabase';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Check, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TeamMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface InviteParticipantsPanelProps {
  /** Team ID for fetching eligible members */
  teamId: string;
  /** Currently invited user IDs (controlled) */
  invitedUserIds: string[];
  /** Called when invited list changes */
  onInvitedChange: (userIds: string[]) => void;
  /** User IDs to exclude from the list (e.g., already added participants) */
  excludeUserIds?: string[];
}

export function InviteParticipantsPanel({ teamId, invitedUserIds, onInvitedChange, excludeUserIds = [] }: InviteParticipantsPanelProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load team members (excluding current user / commander)
  const loadTeamMembers = useCallback(async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Get team members
      const { data: members, error } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId);

      if (error) throw error;
      if (!members?.length) {
        setTeamMembers([]);
        return;
      }

      // Filter out current user (commander) and any excluded users (already invited)
      const filteredMembers = members.filter(
        (m) => m.user_id !== user?.id && !excludeUserIds.includes(m.user_id)
      );
      if (!filteredMembers.length) {
        setTeamMembers([]);
        return;
      }

      // Get profiles
      const userIds = filteredMembers.map((m) => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Map to team members with profiles
      const eligibleMembers = filteredMembers.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          user_id: m.user_id,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          role: m.role,
        };
      });

      setTeamMembers(eligibleMembers);
    } catch (error) {
      console.error('[InviteParticipantsPanel] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId, excludeUserIds]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const handleToggleInvite = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (invitedUserIds.includes(userId)) {
      onInvitedChange(invitedUserIds.filter((id) => id !== userId));
    } else {
      onInvitedChange([...invitedUserIds, userId]);
    }
  };

  const invitedMembers = teamMembers.filter((m) => invitedUserIds.includes(m.user_id));
  const availableMembers = teamMembers.filter((m) => !invitedUserIds.includes(m.user_id));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('session.loadingTeamMembers')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('session.inviteSquadMembers')}</Text>
        {invitedUserIds.length > 0 && (
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {t('session.invitedCount', { count: invitedUserIds.length })}
          </Text>
        )}
      </View>

      {/* Invited Members */}
      {invitedMembers.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.listContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {invitedMembers.map((member) => (
              <View key={member.user_id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>{member.full_name || t('common.unknown')}</Text>
                  <View style={styles.statusContainer}>
                    <Check size={12} color={colors.green} />
                    <Text style={[styles.statusText, { color: colors.green }]}>{t('session.willBeInvited')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: colors.card }]}
                  onPress={() => handleToggleInvite(member.user_id)}
                  activeOpacity={0.7}
                >
                  <UserMinus size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Available Members */}
      {availableMembers.length > 0 && (
        <View style={styles.section}>
          {invitedMembers.length > 0 && (
            <Text style={[styles.subsectionLabel, { color: colors.textMuted }]}>{t('session.addMore')}</Text>
          )}
          <ScrollView
            style={[styles.listContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            showsVerticalScrollIndicator={false}
          >
            {availableMembers.map((member) => (
              <View key={member.user_id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>{member.full_name || t('common.unknown')}</Text>
                  <Text style={[styles.memberRole, { color: colors.textMuted }]}>{member.role}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleToggleInvite(member.user_id)}
                  activeOpacity={0.7}
                >
                  <UserPlus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty state */}
      {teamMembers.length === 0 && (
        <View style={styles.emptyState}>
          <Users size={32} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('session.noTeamMembersToInvite')}</Text>
        </View>
      )}

      {/* Hint */}
      {invitedUserIds.length === 0 && teamMembers.length > 0 && (
        <Text style={[styles.hintText, { color: colors.orange }]}>{t('session.selectAtLeastOneMember')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subsectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  listContainer: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
