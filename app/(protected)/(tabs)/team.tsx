/**
 * Team Tab - Unified Team Workspace
 *
 * If an activeTeam is selected, the Team tab IS the team workspace.
 * There is NO additional "team page" required to see team content.
 */

import { NoTeamsEmptyState } from '@/components/teams/NoTeamsEmptyState';
import { TeamSwitcherPill, TeamSwitcherSheet } from '@/components/teams/TeamSwitcherSheet';
import { COLORS, PULSE_ANIMATION } from '@/constants/trainings';
import { groupTrainingsByTimeframe } from '@/utils/trainings.helpers';
import { styles } from '@/components/training/trainings.styles';
import { useTrainings } from '@/hooks/training/useTrainings';
import { RequestWeaponModal } from '@/components/weapons/RequestWeaponModal';
import { useColors } from '@/hooks/ui/useColors';
import {
  cancelWeaponRequest,
  getCategoryLabel,
  getMyPendingRequest,
  getPoolWeapons,
  getTeamWeaponForUser,
  type TeamWeapon,
  type WeaponRequest,
} from '@/services/weaponService';
import type { TrainingWithDetails } from '@/types/workspace';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Gift,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// PULSE DOT - Animated live indicator
// ============================================================================
function PulseDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: PULSE_ANIMATION.minOpacity,
          duration: PULSE_ANIMATION.duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: PULSE_ANIMATION.maxOpacity,
          duration: PULSE_ANIMATION.duration,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.pulseDotContainer}>
      <Animated.View style={[styles.pulseDotOuter, { backgroundColor: color, opacity: pulseAnim }]} />
      <View style={[styles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TeamScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    teamState,
    teams,
    activeTeamId,
    activeTeam,
    initialized,
    teamsLoading,
    canSchedule,
    canManage,
    activeTeamTrainings,
    liveTraining,
    members,
    memberStats,
    teamStats,
    refreshing,
    switcherOpen,
    loadingTeamTrainings,
    showSwitcher,
    roleConfig,
    onRefresh,
    handleTrainingPress,
    handleCreateTraining,
    handleOpenArmory,
    handleViewMembers,
    handleInviteMember,
    handleTeamSettings,
    setSwitcherOpen,
  } = useTrainings();

  // Loading state
  if (!initialized || (teamsLoading && teams.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // No teams - Empty State
  if (teamState === 'no_teams') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NoTeamsEmptyState />
      </View>
    );
  }

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: 'transparent' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>{t('navigation.team')}</Text>
          <View style={styles.headerRight}>
            {showSwitcher ? (
              <TeamSwitcherPill onPress={() => setSwitcherOpen(true)} />
            ) : (
              activeTeam && (
                <View style={[styles.singleTeamPill, { backgroundColor: colors.secondary }]}>
                  <Users size={14} color={colors.primary} />
                  <Text style={[styles.singleTeamName, { color: colors.text }]} numberOfLines={1}>
                    {activeTeam.name}
                  </Text>
                  {roleConfig && (
                    <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                      <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                    </View>
                  )}
                </View>
              )
            )}
          </View>
        </View>

      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, loadingTeamTrainings && styles.contentCentered]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {loadingTeamTrainings ? (
          <View style={styles.switchingLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.switchingText, { color: colors.textMuted }]}>{t('teams.loadingTeamData')}</Text>
          </View>
        ) : (
          <UnifiedTeamTab
            colors={colors}
            activeTeam={activeTeam}
            activeTeamId={activeTeamId}
            members={members}
            memberStats={memberStats}
            teamStats={teamStats}
            roleConfig={roleConfig}
            canManage={canManage}
            canSchedule={canSchedule}
            liveTraining={liveTraining}
            trainings={activeTeamTrainings}
            onTrainingPress={handleTrainingPress}
            onCreateTraining={handleCreateTraining}
            onOpenArmory={handleOpenArmory}
            onViewMembers={handleViewMembers}
            onInviteMember={handleInviteMember}
            onTeamSettings={handleTeamSettings}
          />
        )}
      </ScrollView>

      <TeamSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

// ============================================================================
// UNIFIED TEAM TAB - Same for all roles, with role-conditional actions
// ============================================================================
interface UnifiedTeamTabProps {
  colors: ReturnType<typeof useColors>;
  activeTeam: any;
  activeTeamId: string | null;
  members: any[];
  memberStats: any;
  teamStats: any;
  roleConfig: any;
  canManage: boolean;
  canSchedule: boolean;
  liveTraining: TrainingWithDetails | undefined;
  trainings: TrainingWithDetails[];
  onTrainingPress: (training: TrainingWithDetails) => void;
  onCreateTraining: () => void;
  onOpenArmory: () => void;
  onViewMembers: () => void;
  onInviteMember: () => void;
  onTeamSettings: () => void;
}

function UnifiedTeamTab({
  colors,
  activeTeam,
  activeTeamId,
  members,
  memberStats,
  teamStats,
  roleConfig,
  canManage,
  canSchedule,
  liveTraining,
  trainings,
  onTrainingPress,
  onCreateTraining,
  onOpenArmory,
  onViewMembers,
  onInviteMember,
  onTeamSettings,
}: UnifiedTeamTabProps) {
  const { t } = useTranslation();
  const progressPct = Math.min(100, (teamStats.totalShots / teamStats.weeklyGoal) * 100);

  // Schedule data
  const grouped = useMemo(() => groupTrainingsByTimeframe(trainings), [trainings]);
  const upcomingTrainings = useMemo(
    () => [...grouped.live, ...grouped.today, ...grouped.tomorrow, ...grouped.thisWeek, ...grouped.upcoming],
    [grouped]
  );
  const pastTrainings = useMemo(() => grouped.past.filter((t) => t.status === 'finished'), [grouped.past]);
  const [showAllPast, setShowAllPast] = useState(false);

  const getTimeLabel = (training: TrainingWithDetails) => {
    const date = new Date(training.scheduled_at);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (training.status === 'ongoing') return t('time.now');
    if (date.toDateString() === now.toDateString()) return format(date, 'HH:mm');
    if (date.toDateString() === tomorrow.toDateString()) return `${t('time.tomorrow')}, ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  // Soldier weapon state
  const [myWeapon, setMyWeapon] = useState<TeamWeapon | null>(null);
  const [myPendingRequest, setMyPendingRequest] = useState<WeaponRequest | null>(null);
  const [poolWeapons, setPoolWeapons] = useState<TeamWeapon[]>([]);
  const [weaponLoading, setWeaponLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch soldier weapon data (only for non-commanders)
  useEffect(() => {
    // Reset weapon data when team changes to prevent showing stale data from different team
    setMyWeapon(null);
    setMyPendingRequest(null);
    setPoolWeapons([]);

    if (canManage || !activeTeamId) {
      return;
    }

    const fetchWeaponData = async () => {
      setWeaponLoading(true);
      try {
        const [weapon, pending, pool] = await Promise.all([
          getTeamWeaponForUser(activeTeamId),
          getMyPendingRequest(activeTeamId),
          getPoolWeapons(activeTeamId),
        ]);
        setMyWeapon(weapon);
        setMyPendingRequest(pending);
        setPoolWeapons(pool);
      } catch (err) {
        console.error('[SoldierWeapon] Failed to fetch weapon data:', err);
      } finally {
        setWeaponLoading(false);
      }
    };

    fetchWeaponData();
  }, [canManage, activeTeamId]);

  // Handle cancel request
  const handleCancelRequest = async () => {
    if (!myPendingRequest) return;
    try {
      setCancelling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cancelWeaponRequest(myPendingRequest.id);
      setMyPendingRequest(null);
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
    } finally {
      setCancelling(false);
    }
  };

  // Handle request success
  const handleRequestSuccess = async () => {
    if (!activeTeamId) return;
    const pending = await getMyPendingRequest(activeTeamId);
    setMyPendingRequest(pending);
    setShowRequestModal(false);
  };

  // Navigate to training report
  const handleViewReport = useCallback((trainingId: string) => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId },
    });
  }, []);

  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, any[]> = {
      commanders: [],
      squad_commanders: [],
      soldiers: [],
    };

    members.forEach((member) => {
      const role = member.role?.role || 'soldier';
      if (role === 'owner' || role === 'commander') {
        groups.commanders.push(member);
      } else if (role === 'squad_commander') {
        groups.squad_commanders.push(member);
      } else {
        groups.soldiers.push(member);
      }
    });

    return groups;
  }, [members]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: colors.purple, bg: colors.purple + '20' };
      case 'commander':
        return { label: 'Commander', color: colors.blue, bg: colors.blue + '20' };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: colors.indigo, bg: colors.indigo + '20' };
      default:
        return { label: 'Soldier', color: colors.textMuted, bg: colors.secondary };
    }
  };

  const renderMember = (member: any) => {
    const role = member.role?.role || 'soldier';
    const badge = getRoleBadge(role);
    const name = member.profile?.full_name || t('common.unknown');
    const squad = member.squad?.name;

    return (
      <View
        key={member.user_id}
        style={[unifiedStyles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[unifiedStyles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[unifiedStyles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={unifiedStyles.memberInfo}>
          <Text style={[unifiedStyles.memberName, { color: colors.text }]}>{name}</Text>
          <View style={unifiedStyles.memberMeta}>
            <View style={[unifiedStyles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[unifiedStyles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            {squad && <Text style={[unifiedStyles.squadName, { color: colors.textMuted }]}>• {squad}</Text>}
          </View>
        </View>
      </View>
    );
  };

  const renderMemberSection = (title: string, membersList: any[]) => {
    if (membersList.length === 0) return null;

    return (
      <View style={unifiedStyles.memberSection}>
        <Text style={[unifiedStyles.memberSectionTitle, { color: colors.textMuted }]}>
          {title.toUpperCase()} ({membersList.length})
        </Text>
        {membersList.map(renderMember)}
      </View>
    );
  };

  return (
    <View style={unifiedStyles.container}>
      {/* Live Session Banner - Visible to all */}
      {liveTraining && (
        <TouchableOpacity
          style={[unifiedStyles.liveBanner, { borderColor: COLORS.live + '40' }]}
          onPress={() => onTrainingPress(liveTraining)}
          activeOpacity={0.85}
        >
          <View style={unifiedStyles.liveBannerGlow} />
          <View style={unifiedStyles.liveIndicator}>
            <PulseDot color="#fff" />
            <Text style={unifiedStyles.liveLabel}>{t('training.live')}</Text>
          </View>
          <View style={unifiedStyles.liveBannerContent}>
            <Text style={unifiedStyles.liveBannerTitle} numberOfLines={1}>
              {liveTraining.title}
            </Text>
            <Text style={unifiedStyles.liveBannerMeta}>
              {t('teams.activeMembers', { count: memberStats.training })} • {t('teams.tapToView')}
            </Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* ========== SOLDIER WEAPON SECTION - Only visible to soldiers ========== */}
      {!canManage && (
        <>
          {/* My Weapon Assignment */}
          <View style={soldierStyles.section}>
            <View style={soldierStyles.sectionHeader}>
              <ShieldCheck size={14} color={colors.primary} />
              <Text style={[soldierStyles.sectionTitle, { color: colors.textMuted }]}>{t('teams.myWeapon')}</Text>
            </View>

            {weaponLoading ? (
              <View style={[soldierStyles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : myWeapon ? (
              <View style={[soldierStyles.weaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <View style={[soldierStyles.weaponBadge, { backgroundColor: colors.primary }]}>
                  <ShieldCheck size={14} color="#fff" />
                  <Text style={soldierStyles.weaponBadgeText}>{t('loadout.filters.assigned')}</Text>
                </View>
                <Text style={[soldierStyles.weaponName, { color: colors.text }]}>{myWeapon.name}</Text>
                <Text style={[soldierStyles.weaponMeta, { color: colors.textMuted }]}>
                  {getCategoryLabel(myWeapon.category)}
                  {myWeapon.caliber && ` • ${myWeapon.caliber}`}
                </Text>
              </View>
            ) : (
              <View style={[soldierStyles.noWeaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[soldierStyles.noWeaponIcon, { backgroundColor: colors.secondary }]}>
                  <Shield size={24} color={colors.textMuted} />
                </View>
                <Text style={[soldierStyles.noWeaponTitle, { color: colors.text }]}>{t('teams.weaponRequired')}</Text>
                <Text style={[soldierStyles.noWeaponHint, { color: colors.textMuted }]}>
                  {t('teams.requestWeaponToStart')}
                </Text>
              </View>
            )}
          </View>

          {/* Pending Request or Request Button */}
          {myPendingRequest ? (
            <View
              style={[soldierStyles.pendingCard, { backgroundColor: colors.yellow + '10', borderColor: colors.yellow }]}
            >
              <View style={soldierStyles.pendingHeader}>
                <Clock size={14} color={colors.yellow} />
                <Text style={[soldierStyles.pendingTitle, { color: colors.yellow }]}>{t('teams.requestPending')}</Text>
              </View>
              <Text style={[soldierStyles.pendingText, { color: colors.text }]}>
                {t('teams.awaitingCommanderReview')}
              </Text>
              {myPendingRequest.weapon_category && (
                <Text style={[soldierStyles.pendingPreference, { color: colors.textMuted }]}>
                  {t('teams.preferred')}: {getCategoryLabel(myPendingRequest.weapon_category)}
                </Text>
              )}
              <TouchableOpacity
                style={[soldierStyles.cancelBtn, { borderColor: colors.destructive }]}
                onPress={handleCancelRequest}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <>
                    <X size={14} color={colors.destructive} />
                    <Text style={[soldierStyles.cancelBtnText, { color: colors.destructive }]}>
                      {t('teams.cancelRequest')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : !myWeapon ? (
            <TouchableOpacity
              style={[soldierStyles.requestBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowRequestModal(true)}
            >
              <Plus size={18} color="#fff" />
              <Text style={soldierStyles.requestBtnText}>{t('teams.requestWeapon')}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Team Pool Weapons */}
          {poolWeapons.length > 0 && (
            <View style={soldierStyles.section}>
              <View style={soldierStyles.sectionHeader}>
                <Gift size={14} color={colors.yellow} />
                <Text style={[soldierStyles.sectionTitle, { color: colors.textMuted }]}>{t('teams.teamPool')}</Text>
                <View style={[soldierStyles.countBadge, { backgroundColor: colors.yellow }]}>
                  <Text style={soldierStyles.countText}>{poolWeapons.length}</Text>
                </View>
              </View>
              <Text style={[soldierStyles.poolHint, { color: colors.textMuted }]}>
                {t('teams.availableForAllMembers')}
              </Text>
              {poolWeapons.map((weapon) => (
                <View
                  key={weapon.id}
                  style={[soldierStyles.poolWeaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Gift size={16} color={colors.yellow} />
                  <View style={soldierStyles.poolWeaponInfo}>
                    <Text style={[soldierStyles.poolWeaponName, { color: colors.text }]}>{weapon.name}</Text>
                    <Text style={[soldierStyles.poolWeaponMeta, { color: colors.textMuted }]}>
                      {getCategoryLabel(weapon.category)}
                      {weapon.caliber && ` • ${weapon.caliber}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Commander Quick Actions - Only visible to commanders */}
      {canManage && (
        <View style={unifiedStyles.quickActions}>
          <TouchableOpacity
            style={[unifiedStyles.primaryAction, { backgroundColor: colors.text }]}
            onPress={onCreateTraining}
            activeOpacity={0.85}
          >
            <Plus size={18} color={colors.background} strokeWidth={2.5} />
            <Text style={[unifiedStyles.primaryActionText, { color: colors.background }]}>
              {t('training.createTraining')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[unifiedStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onOpenArmory}
            activeOpacity={0.7}
          >
            <Shield size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[unifiedStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onInviteMember}
            activeOpacity={0.7}
          >
            <UserPlus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Team Stats - Visible to commanders */}
      {canManage && (
        <View style={unifiedStyles.statsSection}>
          <View style={unifiedStyles.statsHeader}>
            <Text style={[unifiedStyles.statsSectionTitle, { color: colors.text }]}>{t('home.thisWeek')}</Text>
            <View
              style={[unifiedStyles.goalPill, { backgroundColor: progressPct >= 100 ? '#10B98115' : colors.secondary }]}
            >
              <Text style={[unifiedStyles.goalPillText, { color: progressPct >= 100 ? '#10B981' : colors.textMuted }]}>
                {t('teams.percentOfGoal', { percent: Math.round(progressPct) })}
              </Text>
            </View>
          </View>

          <View style={unifiedStyles.statsRow}>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Activity size={16} color={colors.blue} />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>{teamStats.sessionsThisWeek}</Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>{t('session.sessions')}</Text>
            </View>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Zap size={16} color={colors.textMuted} />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>
                {teamStats.totalShots >= 1000 ? `${(teamStats.totalShots / 1000).toFixed(1)}k` : teamStats.totalShots}
              </Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
            </View>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Target size={16} color={colors.green} />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>{teamStats.avgAccuracy}%</Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>{t('session.accuracy')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ═══ SCHEDULE SECTION ═══ */}
      <View style={unifiedStyles.scheduleSection}>
        <View style={unifiedStyles.scheduleSectionHeader}>
          <Text style={[unifiedStyles.menuSectionTitle, { color: colors.textMuted }]}>{t('training.schedule')}</Text>
          {canSchedule && (
            <TouchableOpacity onPress={onCreateTraining} activeOpacity={0.7}>
              <Plus size={17} color={colors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {upcomingTrainings.length === 0 ? (
          <View style={[unifiedStyles.scheduleEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
            <Text style={[unifiedStyles.scheduleEmptyText, { color: colors.textMuted }]}>
              {t('training.noTrainingsScheduled')}
            </Text>
          </View>
        ) : (
          <View style={unifiedStyles.scheduleList}>
            {upcomingTrainings.map((training) => {
              const isLive = training.status === 'ongoing';
              return (
                <TouchableOpacity
                  key={training.id}
                  style={[
                    unifiedStyles.scheduleRow,
                    { backgroundColor: colors.card, borderColor: isLive ? COLORS.live + '40' : colors.border },
                  ]}
                  onPress={() => onTrainingPress(training)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[unifiedStyles.scheduleTimeBadge, { backgroundColor: isLive ? COLORS.live : colors.secondary }]}
                  >
                    {isLive && <PulseDot color="#fff" />}
                    <Text style={[unifiedStyles.scheduleTimeText, { color: isLive ? '#fff' : colors.textMuted }]}>
                      {getTimeLabel(training)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[unifiedStyles.scheduleRowTitle, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    {(training.drill_count ?? 0) > 0 && (
                      <Text style={[unifiedStyles.scheduleRowMeta, { color: colors.textMuted }]}>
                        {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={16} color={colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Team Header - Visible to all */}
      {activeTeam && (
        <TouchableOpacity
          style={[unifiedStyles.teamHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onViewMembers}
          activeOpacity={0.7}
        >
          <View style={unifiedStyles.teamHeaderLeft}>
            <View style={unifiedStyles.memberAvatarStack}>
              {members.slice(0, 4).map((m, i) => (
                <View
                  key={m.user_id}
                  style={[
                    unifiedStyles.stackedAvatar,
                    {
                      backgroundColor: [colors.blue, colors.green, colors.indigo, colors.purple][i % 4],
                      marginLeft: i > 0 ? -10 : 0,
                      zIndex: 4 - i,
                    },
                  ]}
                >
                  <Text style={unifiedStyles.stackedAvatarText}>
                    {(m.profile?.full_name?.charAt(0) || m.profile?.email?.charAt(0) || '?').toUpperCase()}
                  </Text>
                </View>
              ))}
              {members.length > 4 && (
                <View
                  style={[
                    unifiedStyles.stackedAvatar,
                    unifiedStyles.moreAvatar,
                    { backgroundColor: colors.secondary, marginLeft: -10 },
                  ]}
                >
                  <Text style={[unifiedStyles.stackedAvatarText, { color: colors.textMuted, fontSize: 10 }]}>
                    +{members.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[unifiedStyles.teamCardTitle, { color: colors.text }]}>
                {t('teams.membersCount', { count: members.length })}
              </Text>
              <View style={unifiedStyles.statusDots}>
                {memberStats.training > 0 && (
                  <View style={unifiedStyles.statusDotItem}>
                    <View style={[unifiedStyles.miniDot, { backgroundColor: COLORS.training }]} />
                    <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>
                      {memberStats.training}
                    </Text>
                  </View>
                )}
                <View style={unifiedStyles.statusDotItem}>
                  <View style={[unifiedStyles.miniDot, { backgroundColor: COLORS.online }]} />
                  <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.online}</Text>
                </View>
                <View style={unifiedStyles.statusDotItem}>
                  <View style={[unifiedStyles.miniDot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                  <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.offline}</Text>
                </View>
              </View>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Members List - Visible to all */}
      {members.length > 0 ? (
        <>
          {renderMemberSection(t('teams.command'), groupedMembers.commanders)}
          {renderMemberSection(t('teams.squadCommanders'), groupedMembers.squad_commanders)}
          {renderMemberSection(t('teams.team'), groupedMembers.soldiers)}
        </>
      ) : (
        <View style={unifiedStyles.emptyState}>
          <Users size={40} color={colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[unifiedStyles.emptyText, { color: colors.textMuted }]}>{t('teams.noTeamMembersYet')}</Text>
          {canManage && (
            <TouchableOpacity
              style={[unifiedStyles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={onInviteMember}
            >
              <UserPlus size={16} color="#fff" />
              <Text style={unifiedStyles.emptyButtonText}>{t('teams.inviteMember')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Commander Settings Menu */}
      {canManage && (
        <View style={unifiedStyles.menuSection}>
          <Text style={[unifiedStyles.menuSectionTitle, { color: colors.textMuted }]}>{t('teams.manage')}</Text>
          <View style={[unifiedStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onViewMembers} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: colors.primary + '12' }]}>
                <Users size={15} color={colors.primary} />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>{t('teams.membersAndRoles')}</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={[unifiedStyles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onOpenArmory} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: '#F59E0B12' }]}>
                <Shield size={15} color="#F59E0B" />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>{t('teams.teamArmory')}</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={[unifiedStyles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onTeamSettings} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: colors.secondary }]}>
                <Settings size={15} color={colors.textMuted} />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>{t('navigation.settings')}</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Past / Completed Trainings */}
      {pastTrainings.length > 0 && (
        <View style={unifiedStyles.scheduleSection}>
          <View style={unifiedStyles.scheduleSectionHeader}>
            <Text style={[unifiedStyles.menuSectionTitle, { color: colors.textMuted }]}>{t('training.completed')}</Text>
            <Text style={[unifiedStyles.scheduleCount, { color: colors.textMuted }]}>{pastTrainings.length}</Text>
          </View>
          <View style={unifiedStyles.scheduleList}>
            {(showAllPast ? pastTrainings : pastTrainings.slice(0, 3)).map((training) => (
              <TouchableOpacity
                key={training.id}
                style={[unifiedStyles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onTrainingPress(training)}
                activeOpacity={0.7}
              >
                <View style={[unifiedStyles.scheduleTimeBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[unifiedStyles.scheduleTimeText, { color: colors.textMuted }]}>
                    {format(new Date(training.scheduled_at), 'MMM d')}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[unifiedStyles.scheduleRowTitle, { color: colors.text }]} numberOfLines={1}>
                    {training.title}
                  </Text>
                  {(training.drill_count ?? 0) > 0 && (
                    <Text style={[unifiedStyles.scheduleRowMeta, { color: colors.textMuted }]}>
                      {t('training.drillsCount', { count: training.drill_count })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[unifiedStyles.reportBtnSmall, { backgroundColor: `${colors.green}12` }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleViewReport(training.id);
                  }}
                  activeOpacity={0.7}
                >
                  <BarChart3 size={14} color={colors.green} />
                </TouchableOpacity>
                <ChevronRight size={16} color={colors.border} />
              </TouchableOpacity>
            ))}
          </View>
          {pastTrainings.length > 3 && (
            <TouchableOpacity
              style={[unifiedStyles.showMoreBtn, { borderColor: colors.border }]}
              onPress={() => setShowAllPast(!showAllPast)}
              activeOpacity={0.7}
            >
              <Text style={[unifiedStyles.showMoreText, { color: colors.textMuted }]}>
                {showAllPast ? t('common.showLess') : t('training.viewAll', { count: pastTrainings.length })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Team Identity Footer - Visible to all */}
      {activeTeam && roleConfig && (
        <View style={unifiedStyles.teamFooter}>
          <View style={[unifiedStyles.teamBadge, { backgroundColor: colors.card }]}>
            <Users size={14} color={colors.textMuted} />
            <Text style={[unifiedStyles.teamBadgeText, { color: colors.text }]}>{activeTeam.name}</Text>
            <View style={[unifiedStyles.rolePill, { backgroundColor: roleConfig.color + '15' }]}>
              <Text style={[unifiedStyles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Request Weapon Modal - For soldiers */}
      <RequestWeaponModal
        visible={showRequestModal}
        teamId={activeTeamId || ''}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />
    </View>
  );
}

// Unified Team Tab styles
const unifiedStyles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // Live Banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.live,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveBannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 11,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  liveBannerContent: {
    flex: 1,
  },
  liveBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  liveBannerMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 11,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats Section
  statsSection: {
    gap: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 11,
    gap: 5,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Team Header
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  moreAvatar: {
    borderWidth: 0,
  },
  teamCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 9,
  },
  statusDotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Member Section
  memberSection: {
    gap: 8,
  },
  memberSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 3,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  squadName: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 14,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Menu Section
  menuSection: {
    gap: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 3,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 11,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 53,
  },
  reportDate: {
    fontSize: 12,
    marginTop: 2,
  },

  // Schedule Section
  scheduleSection: {
    gap: 10,
  },
  scheduleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 3,
  },
  scheduleCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleList: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  scheduleTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    minWidth: 58,
    justifyContent: 'center',
  },
  scheduleTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  scheduleRowMeta: {
    fontSize: 12,
  },
  scheduleEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  scheduleEmptyText: {
    flex: 1,
    fontSize: 13,
  },
  reportBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Team Footer
  teamFooter: {
    alignItems: 'center',
    marginTop: 6,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});

// Soldier-specific styles
const soldierStyles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Weapon Card
  weaponCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  weaponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  weaponBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  weaponName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  weaponMeta: {
    fontSize: 14,
  },

  // No Weapon Card
  noWeaponCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  noWeaponIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWeaponTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noWeaponHint: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Pending Request Card
  pendingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 14,
  },
  pendingPreference: {
    fontSize: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Request Button
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  requestBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Pool Weapons
  poolHint: {
    fontSize: 12,
    marginTop: -4,
  },
  poolWeaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  poolWeaponInfo: {
    flex: 1,
    gap: 2,
  },
  poolWeaponName: {
    fontSize: 15,
    fontWeight: '600',
  },
  poolWeaponMeta: {
    fontSize: 13,
  },
});

// ============================================================================
// TEAM MEMBERS TAB (DEPRECATED - kept for backwards compatibility)
// ============================================================================
interface TeamMembersTabProps {
  colors: ReturnType<typeof useColors>;
  members: any[];
  activeTeam: any;
}

function TeamMembersTab({ colors, members, activeTeam }: TeamMembersTabProps) {
  const { t } = useTranslation();
  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, any[]> = {
      commanders: [],
      squad_commanders: [],
      soldiers: [],
    };

    members.forEach((member) => {
      // Role is nested: member.role.role
      const role = member.role?.role || 'soldier';
      if (role === 'owner' || role === 'commander') {
        groups.commanders.push(member);
      } else if (role === 'squad_commander') {
        groups.squad_commanders.push(member);
      } else {
        groups.soldiers.push(member);
      }
    });

    return groups;
  }, [members]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: colors.purple, bg: colors.purple + '20' };
      case 'commander':
        return { label: 'Commander', color: colors.blue, bg: colors.blue + '20' };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: colors.indigo, bg: colors.indigo + '20' };
      default:
        return { label: 'Soldier', color: colors.textMuted, bg: colors.secondary };
    }
  };

  const renderMember = (member: any) => {
    // Role is nested: member.role.role
    const role = member.role?.role || 'soldier';
    const badge = getRoleBadge(role);
    const name = member.profile?.full_name || t('common.unknown');
    const squad = member.squad?.name;

    return (
      <View
        key={member.user_id}
        style={[teamMembersStyles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[teamMembersStyles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[teamMembersStyles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={teamMembersStyles.memberInfo}>
          <Text style={[teamMembersStyles.memberName, { color: colors.text }]}>{name}</Text>
          <View style={teamMembersStyles.memberMeta}>
            <View style={[teamMembersStyles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[teamMembersStyles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            {squad && <Text style={[teamMembersStyles.squadName, { color: colors.textMuted }]}>• {squad}</Text>}
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (title: string, membersList: any[]) => {
    if (membersList.length === 0) return null;

    return (
      <View style={teamMembersStyles.section}>
        <Text style={[teamMembersStyles.sectionTitle, { color: colors.textMuted }]}>
          {title.toUpperCase()} ({membersList.length})
        </Text>
        {membersList.map(renderMember)}
      </View>
    );
  };

  return (
    <View style={teamMembersStyles.container}>
      {/* Team Header */}
      {activeTeam && (
        <View style={[teamMembersStyles.teamHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[teamMembersStyles.teamIcon, { backgroundColor: colors.primary + '15' }]}>
            <Users size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[teamMembersStyles.teamName, { color: colors.text }]}>{activeTeam.name}</Text>
            <Text style={[teamMembersStyles.memberCount, { color: colors.textMuted }]}>
              {t('teams.membersCount', { count: members.length })}
            </Text>
          </View>
        </View>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <View style={teamMembersStyles.emptyState}>
          <Users size={40} color={colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[teamMembersStyles.emptyText, { color: colors.textMuted }]}>{t('teams.noTeamMembersYet')}</Text>
        </View>
      ) : (
        <>
          {renderSection('Command', groupedMembers.commanders)}
          {renderSection('Squad Commanders', groupedMembers.squad_commanders)}
          {renderSection('Team', groupedMembers.soldiers)}
        </>
      )}
    </View>
  );
}

const teamMembersStyles = StyleSheet.create({
  container: {
    gap: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  memberCount: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 3,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  squadName: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 14,
  },
  emptyText: {
    fontSize: 14,
  },
});
