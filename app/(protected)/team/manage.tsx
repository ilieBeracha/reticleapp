import { BaseAvatar } from '@/components/BaseAvatar';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import type { TeamMemberWithProfile } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ChevronRight,
  Crown,
  Mail,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  Layout,
} from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const ROLE_CONFIG = {
  owner: {
    color: '#8B5CF6',
    bg: '#8B5CF615',
    bgSolid: '#8B5CF630',
    label: 'Owner',
    labelPlural: 'Owners',
    icon: Crown,
    description: 'Full team control',
    order: 0,
  },
  commander: {
    color: '#EF4444',
    bg: '#EF444415',
    bgSolid: '#EF444430',
    label: 'Commander',
    labelPlural: 'Commanders',
    icon: Crown,
    description: 'Manage trainings & members',
    order: 1,
  },
  squad_commander: {
    color: '#F59E0B',
    bg: '#F59E0B15',
    bgSolid: '#F59E0B30',
    label: 'Squad Commander',
    labelPlural: 'Squad Commanders',
    icon: Shield,
    description: 'Lead squad trainings',
    order: 2,
  },
  soldier: {
    color: '#10B981',
    bg: '#10B98115',
    bgSolid: '#10B98130',
    label: 'Soldier',
    labelPlural: 'Soldiers',
    icon: Target,
    description: 'Team member',
    order: 3,
  },
};

function getRoleConfig(role: string | undefined | null) {
  if (!role) return ROLE_CONFIG.soldier;
  return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.soldier;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function MemberCard({
  member,
  colors,
  onPress,
  isCurrentUser,
  index,
}: {
  member: TeamMemberWithProfile;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  isCurrentUser?: boolean;
  index: number;
}) {
  const roleConfig = getRoleConfig(member.role?.role);
  const RoleIcon = roleConfig.icon;
  const joinedAt = member.joined_at
    ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })
    : null;

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={[
          styles.memberCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatarContainer}>
          <BaseAvatar
            source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : undefined}
            fallbackText={member.profile?.full_name || 'UN'}
            size="sm"
            role={member.role?.role}
          />
          {isCurrentUser && (
            <View style={[styles.currentUserBadge, { backgroundColor: colors.primary }]}>
              <Sparkles size={6} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text
              style={[styles.memberName, { color: colors.text }]}
              numberOfLines={1}
            >
              {member.profile?.full_name || 'Unknown'}
            </Text>
            {isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.youBadgeText, { color: colors.primary }]}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.memberMeta}>
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.bgSolid }]}>
              <RoleIcon size={8} color={roleConfig.color} />
              <Text style={[styles.roleText, { color: roleConfig.color }]}>
                {roleConfig.label}
              </Text>
            </View>
            {joinedAt && (
              <Text style={[styles.joinedText, { color: colors.textMuted }]}>
                Joined {joinedAt}
              </Text>
            )}
          </View>
        </View>

        <ChevronRight size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function TeamManageScreen() {
  const colors = useColors();
  const { activeTeamId, activeTeam, members, loadMembers, membersLoading } = useTeamStore();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Get current user ID
  useEffect(() => {
    const init = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    init();
  }, []);

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
    router.push(`/(protected)/memberPreview?id=${memberId}` as any);
  }, []);

  const handleTeamSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/teamSettings' as any);
  }, []);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.profile?.full_name?.toLowerCase().includes(query) ||
        m.profile?.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Sort members by role priority, then by name
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      // First sort by role priority
      const roleA = a.role?.role || 'soldier';
      const roleB = b.role?.role || 'soldier';
      const orderA = ROLE_CONFIG[roleA as keyof typeof ROLE_CONFIG]?.order ?? 99;
      const orderB = ROLE_CONFIG[roleB as keyof typeof ROLE_CONFIG]?.order ?? 99;
      
      if (orderA !== orderB) return orderA - orderB;
      
      // Then sort by name
      const nameA = a.profile?.full_name || '';
      const nameB = b.profile?.full_name || '';
      return nameA.localeCompare(nameB);
    });
  }, [filteredMembers]);

  if (membersLoading && members.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading team members...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      >
        {/* ══════════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Team Members
              </Text>
              <View style={styles.headerMeta}>
                <Users size={14} color={colors.textMuted} />
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  {activeTeam?.name || 'Team'} • {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleTeamSettings}
            >
              <Settings size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            SEARCH BAR
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: searchFocused ? colors.primary : colors.border,
              },
            ]}
          >
            <Search size={18} color={searchFocused ? colors.primary : colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search members..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={[styles.clearBtn, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>


        {/* ══════════════════════════════════════════════════════════════════════
            INVITE BUTTON
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.delay(200)}>
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
            onPress={handleInviteMember}
            activeOpacity={0.7}
          >
            <View style={[styles.inviteIcon, { backgroundColor: colors.primary + '20' }]}>
              <UserPlus size={20} color={colors.primary} />
            </View>
            <View style={styles.inviteContent}>
              <Text style={[styles.inviteTitle, { color: colors.text }]}>
                Invite New Member
              </Text>
              <Text style={[styles.inviteDesc, { color: colors.textMuted }]}>
                Share invite code or send directly
              </Text>
            </View>
            <View style={[styles.inviteArrow, { backgroundColor: colors.primary + '20' }]}>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            EMPTY STATE
        ══════════════════════════════════════════════════════════════════════ */}
        {filteredMembers.length === 0 && searchQuery.length > 0 && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Search size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Try a different search term
            </Text>
          </Animated.View>
        )}

        {members.length === 0 && !searchQuery && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Users size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No members yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Invite members to start training together
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleInviteMember}
            >
              <Mail size={16} color="#FFF" />
              <Text style={styles.emptyBtnText}>Send Invite</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ALL MEMBERS
        ══════════════════════════════════════════════════════════════════════ */}
        {sortedMembers.length > 0 && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.membersList}>
            {sortedMembers.map((member, index) => (
              <MemberCard
                key={member.user_id}
                member={member}
                colors={colors}
                onPress={() => handleMemberPress(member.user_id)}
                isCurrentUser={member.user_id === currentUserId}
                index={index}
              />
            ))}
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Header
  header: { paddingTop: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  headerSubtitle: { fontSize: 14 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Search
  searchContainer: { marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  clearBtn: { fontSize: 13, fontWeight: '500' },


  // Invite Button
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 24,
  },
  inviteIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteContent: { flex: 1 },
  inviteTitle: { fontSize: 16, fontWeight: '600' },
  inviteDesc: { fontSize: 13, marginTop: 2 },
  inviteArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Members List
  membersList: { gap: 8 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  memberAvatarContainer: { position: 'relative' },
  currentUserBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  roleText: { fontSize: 10, fontWeight: '600' },
  joinedText: { fontSize: 10 },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: { fontSize: 9, fontWeight: '700' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
