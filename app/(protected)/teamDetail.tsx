/**
 * Team Detail Screen
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * OWNERSHIP CONTRACT (DO NOT VIOLATE)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This screen is STATUS + CONTEXT only.
 * 
 * MAY SHOW:
 * - Team information (name, description, stats)
 * - Member roster
 * - Squad structure
 * - Scheduled sessions (as calendar/list entries)
 * - Live session status (informational only)
 * - Management actions (invite, schedule) for commanders
 * 
 * MUST NOT:
 * - Provide primary "Join" / "Start" / "Continue" CTAs
 * - Be the entry point for session execution
 * - Use action colors (green) + action icons (Play) for session entry
 * - Route directly to trainingLive (session execution)
 * 
 * Home owns session entry. Team pages explain what exists.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { BaseAvatar } from '@/components/BaseAvatar';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamMembers, getTeamWithMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamMemberWithProfile, TeamWithMembers, TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { differenceInMinutes, format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Layers,
  Plus,
  Shield,
  Target,
  UserPlus,
  Users
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BORDER_RADIUS = 10;

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  owner: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Owner', icon: Crown },
  commander: { color: '#F87171', bg: 'rgba(248,113,113,0.12)', label: 'Commander', icon: Crown },
  team_commander: { color: '#F87171', bg: 'rgba(248,113,113,0.12)', label: 'Commander', icon: Crown },
  squad_commander: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#34D399', bg: 'rgba(52,211,153,0.12)', label: 'Soldier', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE SESSION STATUS CARD (STATUS ONLY - NOT AN ACTION CTA)
// ═══════════════════════════════════════════════════════════════════════════

function LiveSessionStatus({ training, colors }: { training: TrainingWithDetails; colors: any }) {
  // Calculate duration
  const startedAt = training.started_at ? new Date(training.started_at) : new Date();
  const durationMins = differenceInMinutes(new Date(), startedAt);
  const durationStr = durationMins >= 60 
    ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
    : `${durationMins}m`;

  // Navigate to session details (read-only context), not session execution
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to trainingDetail for session context/status, NOT trainingLive
    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity
        style={[styles.liveStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Status indicator */}
        <View style={styles.liveStatusLeft}>
          <View style={[styles.liveStatusDot, { backgroundColor: colors.orange }]}>
            <View style={styles.liveStatusDotInner} />
          </View>
          <View style={styles.liveStatusContent}>
            <Text style={[styles.liveStatusLabel, { color: colors.textMuted }]}>SESSION IN PROGRESS</Text>
            <Text style={[styles.liveStatusTitle, { color: colors.text }]} numberOfLines={1}>
              {training.title}
            </Text>
            <View style={styles.liveStatusMeta}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={[styles.liveStatusMetaText, { color: colors.textMuted }]}>
                {durationStr} · {training.drill_count || 0} drill{(training.drill_count || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Secondary action - view details, not join */}
        <View style={[styles.liveStatusAction, { backgroundColor: colors.secondary }]}>
          <Eye size={14} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER ROW
// ═══════════════════════════════════════════════════════════════════════════

function MemberRow({ member, colors, isLast }: { 
  member: TeamMemberWithProfile; 
  colors: any;
  isLast: boolean;
}) {
  const roleConfig = getRoleConfig(member.role?.toString() || null);
  const name = member.profile?.full_name || 'Unknown';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/memberPreview?id=${member.user_id}` as any);
  };

  return (
    <TouchableOpacity 
      style={[styles.memberRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <BaseAvatar
        source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : undefined}
        fallbackText={name}
        size="sm"
        borderWidth={0}
      />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <View style={styles.memberRoleBadge}>
          <roleConfig.icon size={10} color={roleConfig.color} />
          <Text style={[styles.memberRoleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>
      </View>
      <ChevronRight size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULED SESSION ROW (navigates to details, not execution)
// ═══════════════════════════════════════════════════════════════════════════

function ScheduledSessionRow({ training, colors, index }: { 
  training: TrainingWithDetails; 
  colors: any;
  index: number;
}) {
  const scheduledDate = new Date(training.scheduled_at);
  const dateStr = format(scheduledDate, 'MMM d');
  const timeStr = format(scheduledDate, 'HH:mm');

  return (
    <Animated.View entering={FadeInUp.delay(100 + index * 40).springify()}>
      <TouchableOpacity
        style={[styles.trainingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Navigate to schedule details, not session execution
          router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.trainingRowIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Calendar size={16} color={colors.primary} />
        </View>
        <View style={styles.trainingRowContent}>
          <Text style={[styles.trainingRowTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
          <Text style={[styles.trainingRowMeta, { color: colors.textMuted }]}>
            {dateStr} at {timeStr}
            {training.drill_count && training.drill_count > 0 && ` · ${training.drill_count} drill${training.drill_count !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.border} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function TeamDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, setActiveTeam } = useTeamStore();
  const { teamTrainings, loadTeamTrainings } = useTrainingStore();

  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const teamFromStore = useMemo(() => teams.find((t) => t.id === id), [teams, id]);
  const myRole = teamFromStore?.my_role;
  const canManage = myRole !== 'soldier' && myRole !== null;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setActiveTeam(id);
      
      const [teamData, membersData] = await Promise.all([
        getTeamWithMembers(id),
        getTeamMembers(id),
      ]);
      if (teamData) setTeam(teamData);
      setMembers(membersData);
      loadTeamTrainings(id);
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  }, [id, loadTeamTrainings, setActiveTeam]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const liveSession = useMemo(() => {
    return teamTrainings.find((t) => t.team_id === id && t.status === 'ongoing');
  }, [teamTrainings, id]);

  const upcomingScheduled = useMemo(() => {
    return teamTrainings
      .filter((t) => t.team_id === id && t.status === 'planned')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 4);
  }, [teamTrainings, id]);

  const completedCount = useMemo(() => {
    return teamTrainings.filter((t) => t.team_id === id && t.status === 'finished').length;
  }, [teamTrainings, id]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleInviteMember = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/inviteTeamMember?teamId=${id}` as any);
  };

  const handleScheduleSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/createTraining?teamId=${id}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayTeam = team || teamFromStore;
  if (!displayTeam) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Users size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Team not found</Text>
        <TouchableOpacity 
          style={[styles.errorBtn, { backgroundColor: colors.primary }]} 
          onPress={handleBack}
        >
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const squads = displayTeam.squads || [];
  const displayMembers = members.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        {canManage && (
          <TouchableOpacity
            style={[styles.headerAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleInviteMember}
            activeOpacity={0.7}
          >
            <UserPlus size={16} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
          />
        }
      >
        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.titleSection}>
          <View style={[styles.teamIcon, { backgroundColor: `${colors.primary}12` }]}>
            <Users size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{displayTeam.name}</Text>
          {displayTeam.description && (
            <Text style={[styles.description, { color: colors.textMuted }]}>{displayTeam.description}</Text>
          )}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeIn.delay(80).duration(300)} style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{members.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Members</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{squads.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Squads</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{upcomingScheduled.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Scheduled</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Done</Text>
          </View>
        </Animated.View>

        {/* Live Session Status (informational only, not action CTA) */}
        {liveSession && (
          <View style={styles.section}>
            <LiveSessionStatus training={liveSession} colors={colors} />
          </View>
        )}

        {/* Schedule New Session (management action - allowed) */}
        {canManage && (
          <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.section}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleScheduleSession}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.indigo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryActionInner}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.primaryActionText}>Schedule Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Users size={14} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Members</Text>
            </View>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{members.length}</Text>
          </View>

          {displayMembers.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {displayMembers.map((member, index) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  colors={colors}
                  isLast={index === displayMembers.length - 1}
                />
              ))}
              {members.length > 5 && (
                <TouchableOpacity 
                  style={styles.cardFooter} 
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(protected)/teamMembers?teamId=${id}` as any)}
                >
                  <Text style={[styles.cardFooterText, { color: colors.primary }]}>
                    View all {members.length} members
                  </Text>
                  <ChevronRight size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Users size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members yet</Text>
              {canManage && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { borderColor: colors.border }]}
                  onPress={handleInviteMember}
                >
                  <UserPlus size={14} color={colors.text} />
                  <Text style={[styles.emptyBtnText, { color: colors.text }]}>Invite Members</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Squads Section */}
        {squads.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Layers size={14} color={colors.textMuted} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Squads</Text>
              </View>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{squads.length}</Text>
            </View>

            <View style={styles.squadsGrid}>
              {squads.map((squad: any) => (
                <View
                  key={squad.id}
                  style={[styles.squadChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Layers size={12} color={colors.textMuted} />
                  <Text style={[styles.squadChipText, { color: colors.text }]} numberOfLines={1}>
                    {squad.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Scheduled Sessions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Scheduled</Text>
            </View>
            {upcomingScheduled.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/trainings' as any)}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcomingScheduled.length > 0 ? (
            <View style={styles.trainingsList}>
              {upcomingScheduled.map((training, index) => (
                <ScheduledSessionRow key={training.id} training={training} colors={colors} index={index} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Calendar size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sessions scheduled</Text>
              {canManage && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { borderColor: colors.border }]}
                  onPress={handleScheduleSession}
                >
                  <Plus size={14} color={colors.text} />
                  <Text style={[styles.emptyBtnText, { color: colors.text }]}>Schedule Session</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Footer Info */}
        <Animated.View entering={FadeIn.delay(200).duration(300)} style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Team created {formatDistanceToNow(new Date(displayTeam.created_at), { addSuffix: true })}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS,
    marginTop: 8,
  },
  errorBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Title
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  teamIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Live Session Status (informational, not action)
  liveStatusCard: {
    borderRadius: BORDER_RADIUS,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  liveStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  liveStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStatusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveStatusContent: {
    flex: 1,
  },
  liveStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  liveStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  liveStatusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  liveStatusMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  liveStatusAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Primary Action (management - allowed)
  primaryAction: {
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },
  primaryActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Card
  card: {
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cardFooterText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Member Row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberRoleText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Training Row
  trainingsList: {
    gap: 8,
  },
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  trainingRowIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingRowContent: {
    flex: 1,
  },
  trainingRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trainingRowMeta: {
    fontSize: 13,
  },

  // Squads
  squadsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  squadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadChipText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 100,
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
  },
});
