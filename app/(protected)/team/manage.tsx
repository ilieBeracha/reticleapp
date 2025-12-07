import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Team Manage Screen
 * 
 * Manage team members and settings
 */
export default function TeamManageScreen() {
  const colors = useColors();
  const { activeTeamId, activeTeam, members, loadMembers, loading } = useTeamStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (activeTeamId) {
        loadMembers();
      }
    }, [activeTeamId, loadMembers])
  );

  const onRefresh = useCallback(async () => {
    if (!activeTeamId) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMembers();
    setRefreshing(false);
  }, [activeTeamId, loadMembers]);

  const handleInviteMember = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteTeamMember' as any);
  }, []);

  const handleMemberPress = useCallback((memberId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/memberPreview?memberId=${memberId}` as any);
  }, []);

  if (loading && members.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team Members</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activeTeam?.name || 'Team'} • {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Invite Button */}
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={handleInviteMember}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.inviteBtnText}>Invite Member</Text>
        </TouchableOpacity>

        {/* Members List */}
        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No members yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Invite members to start training together
            </Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleMemberPress(member.user_id)}
                activeOpacity={0.7}
              >
                {member.profile?.avatar_url ? (
                  <Image 
                    source={{ uri: member.profile.avatar_url }} 
                    style={styles.memberAvatar} 
                  />
                ) : (
                  <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {(member.profile?.full_name?.[0] || member.profile?.email?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.textMuted }]}>
                    {member.role.replace('_', ' ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  inviteBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  membersList: { gap: 8 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '600' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 16, fontWeight: '500' },
  memberRole: { fontSize: 13, textTransform: 'capitalize' },
});

