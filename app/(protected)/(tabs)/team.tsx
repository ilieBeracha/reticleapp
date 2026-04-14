/**
 * Team Tab - Management & Settings Hub
 *
 * Provides team info, management actions, training history,
 * and danger zone. Matches UnifiedHomePage/TeamHomePage design.
 */

import { NoTeamsEmptyState } from '@/components/teams/NoTeamsEmptyState';
import { styles } from '@/components/training/trainings.styles';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings } from '@/hooks/training/useTrainings';
import { useColors } from '@/hooks/ui/useColors';
import { deleteTeam, removeTeamMember } from '@/services/teamService';
import { useTeamStore } from '@/stores/teamStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { groupTrainingsByTimeframe } from '@/utils/trainings.helpers';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    AlertTriangle,
    BarChart3,
    ChevronRight,
    Clock,
    FileText,
    LogOut,
    Settings,
    Shield,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    activeTeam,
    activeTeamId,
    initialized,
    teamsLoading,
    canManage,
    activeTeamTrainings,
    members,
    memberStats,
    refreshing,
    loadingTeamTrainings,
    roleConfig,
    onRefresh,
    handleTrainingPress,
    handleOpenArmory,
    handleViewMembers,
    handleInviteMember,
    handleTeamSettings,
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
      <View style={[ts.headerContainer, { borderBottomColor: colors.border }]}>
        <View style={ts.headerRow}>
          <View>
            <Text style={[ts.headerGreeting, { color: colors.textMuted }]}>
              {t('navigation.team')}
            </Text>
            <Text style={[ts.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {activeTeam?.name ?? ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          ts.scrollContent,
          { paddingBottom: insets.bottom + 100 },
          loadingTeamTrainings && styles.contentCentered,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
        }
      >
        {loadingTeamTrainings ? (
          <View style={styles.switchingLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.switchingText, { color: colors.textMuted }]}>
              {t('teams.loadingTeamData')}
            </Text>
          </View>
        ) : (
          <TeamTabContent
            colors={colors}
            activeTeam={activeTeam}
            activeTeamId={activeTeamId}
            members={members}
            memberStats={memberStats}
            canManage={canManage}
            roleConfig={roleConfig}
            trainings={activeTeamTrainings}
            teams={teams}
            onTrainingPress={handleTrainingPress}
            onOpenArmory={handleOpenArmory}
            onViewMembers={handleViewMembers}
            onInviteMember={handleInviteMember}
            onTeamSettings={handleTeamSettings}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// TEAM TAB CONTENT
// ============================================================================
interface TeamTabContentProps {
  colors: ReturnType<typeof useColors>;
  activeTeam: any;
  activeTeamId: string | null;
  members: any[];
  memberStats: any;
  canManage: boolean;
  roleConfig: any;
  trainings: TrainingWithDetails[];
  teams: any[];
  onTrainingPress: (training: TrainingWithDetails) => void;
  onOpenArmory: () => void;
  onViewMembers: () => void;
  onInviteMember: () => void;
  onTeamSettings: () => void;
}

function TeamTabContent({
  colors,
  activeTeam,
  activeTeamId,
  members,
  memberStats,
  canManage,
  roleConfig,
  trainings,
  teams,
  onTrainingPress,
  onOpenArmory,
  onViewMembers,
  onInviteMember,
  onTeamSettings,
}: TeamTabContentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loadTeams, setActiveTeam } = useTeamStore();

  const isOwner = activeTeam?.my_role === 'owner';

  // Past trainings
  const grouped = useMemo(() => groupTrainingsByTimeframe(trainings), [trainings]);
  const pastTrainings = useMemo(
    () => grouped.past.filter((tr) => tr.status === 'finished'),
    [grouped.past]
  );
  const [showAllPast, setShowAllPast] = useState(false);

  // Navigate to training report
  const handleViewReport = useCallback((trainingId: string) => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId },
    });
  }, []);

  // Leave team handler
  const handleLeaveTeam = useCallback(() => {
    if (!activeTeamId || !user) return;

    if (isOwner) {
      Alert.alert(t('teams.cannotLeaveTitle'), t('teams.cannotLeaveMessage'), [
        { text: t('common.ok') },
      ]);
      return;
    }

    Alert.alert(
      t('teams.leaveTeamTitle'),
      t('teams.leaveTeamConfirm', { teamName: activeTeam?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teams.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await removeTeamMember(activeTeamId, user.id);
              await loadTeams();
              const remaining = teams.filter((tm) => tm.id !== activeTeamId);
              setActiveTeam(remaining.length > 0 ? remaining[0].id : null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                t('teams.leftTeamTitle'),
                t('teams.leftTeamMessage', { teamName: activeTeam?.name })
              );
            } catch (error) {
              console.error('Failed to leave team:', error);
              Alert.alert(t('common.error'), t('teams.failedLeaveTeam'));
            }
          },
        },
      ]
    );
  }, [activeTeamId, activeTeam, user, isOwner, teams, t, loadTeams, setActiveTeam]);

  // Delete team handler
  const handleDeleteTeam = useCallback(() => {
    if (!activeTeamId || !isOwner) return;

    Alert.alert(
      t('teams.deleteTeamTitle'),
      t('teams.deleteTeamConfirm', { teamName: activeTeam?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teams.deleteTeam'),
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteTeam(activeTeamId);
              await loadTeams();
              const remaining = teams.filter((tm) => tm.id !== activeTeamId);
              setActiveTeam(remaining.length > 0 ? remaining[0].id : null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Failed to delete team:', error);
              Alert.alert(t('common.error'), t('teams.failedDeleteTeam'));
            }
          },
        },
      ]
    );
  }, [activeTeamId, activeTeam, isOwner, teams, t, loadTeams, setActiveTeam]);

  return (
    <View style={ts.container}>
      {/* ── Team Info Section ── */}
      {activeTeam && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={[ts.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Team name + member count */}
            <View style={ts.infoTop}>
              <View style={ts.infoTopLeft}>
                <View style={[ts.teamIcon, { backgroundColor: colors.primary + '12' }]}>
                  <Users size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ts.infoTeamName, { color: colors.text }]} numberOfLines={1}>
                    {activeTeam.name}
                  </Text>
                  <Text style={[ts.infoMemberCount, { color: colors.textMuted }]}>
                    {t('teams.membersCount', { count: members.length })}
                  </Text>
                </View>
              </View>

              {/* Role badge */}
              {roleConfig && (
                <View style={[ts.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
                  <Text style={[ts.roleText, { color: roleConfig.color }]}>
                    {roleConfig.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Member status row */}
            <View style={[ts.infoDivider, { backgroundColor: colors.border }]} />
            <View style={ts.statusRow}>
              <View style={ts.memberAvatarStack}>
                {members.slice(0, 4).map((m, i) => (
                  <View
                    key={m.user_id}
                    style={[
                      ts.stackedAvatar,
                      {
                        backgroundColor: [colors.blue, colors.green, colors.indigo, colors.purple][
                          i % 4
                        ],
                        marginLeft: i > 0 ? -8 : 0,
                        zIndex: 4 - i,
                      },
                    ]}
                  >
                    <Text style={ts.stackedAvatarText}>
                      {(
                        m.profile?.full_name?.charAt(0) ||
                        m.profile?.email?.charAt(0) ||
                        '?'
                      ).toUpperCase()}
                    </Text>
                  </View>
                ))}
                {members.length > 4 && (
                  <View
                    style={[
                      ts.stackedAvatar,
                      { backgroundColor: colors.secondary, marginLeft: -8, borderWidth: 0 },
                    ]}
                  >
                    <Text style={[ts.stackedAvatarText, { color: colors.textMuted, fontSize: 9 }]}>
                      +{members.length - 4}
                    </Text>
                  </View>
                )}
              </View>

              <View style={ts.statusDots}>
                {memberStats.training > 0 && (
                  <View style={ts.statusDotItem}>
                    <View style={[ts.miniDot, { backgroundColor: colors.green }]} />
                    <Text style={[ts.statusDotText, { color: colors.textMuted }]}>
                      {memberStats.training}
                    </Text>
                  </View>
                )}
                <View style={ts.statusDotItem}>
                  <View style={[ts.miniDot, { backgroundColor: colors.blue }]} />
                  <Text style={[ts.statusDotText, { color: colors.textMuted }]}>
                    {memberStats.online}
                  </Text>
                </View>
                <View style={ts.statusDotItem}>
                  <View style={[ts.miniDot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                  <Text style={[ts.statusDotText, { color: colors.textMuted }]}>
                    {memberStats.offline}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Management Section (visible to all) ── */}
      <Animated.View entering={FadeIn.delay(50).duration(200)}>
        <Text style={[ts.sectionLabel, { color: colors.textMuted }]}>
          {t('teams.manage').toUpperCase()}
        </Text>
        <View style={[ts.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Members & Roles - all users */}
          <MenuItem
            icon={<Users size={15} color={colors.primary} />}
            iconBg={colors.primary + '12'}
            label={t('teams.membersAndRoles')}
            onPress={onViewMembers}
            colors={colors}
          />

          <View style={[ts.menuDivider, { backgroundColor: colors.border }]} />

          {/* Team Armory - all users */}
          <MenuItem
            icon={<Shield size={15} color={colors.blue} />}
            iconBg={colors.blue + '12'}
            label={t('teams.teamArmory')}
            onPress={onOpenArmory}
            colors={colors}
          />

          {/* Invite Member - commander only */}
          {canManage && (
            <>
              <View style={[ts.menuDivider, { backgroundColor: colors.border }]} />
              <MenuItem
                icon={<UserPlus size={15} color={colors.green} />}
                iconBg={colors.green + '12'}
                label="Invite Member"
                onPress={onInviteMember}
                colors={colors}
              />
            </>
          )}

          {/* Generate Report - commander only */}
          {canManage && (
            <>
              <View style={[ts.menuDivider, { backgroundColor: colors.border }]} />
              <MenuItem
                icon={<FileText size={15} color={colors.indigo} />}
                iconBg={colors.indigo + '18'}
                label={t('teams.generateReport')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/(protected)/generateTeamReport?teamId=${activeTeamId ?? ''}&teamName=${encodeURIComponent(activeTeam?.name ?? '')}` as any);
                }}
                colors={colors}
              />
            </>
          )}

          {/* Team Settings - commander only */}
          {canManage && (
            <>
              <View style={[ts.menuDivider, { backgroundColor: colors.border }]} />
              <MenuItem
                icon={<Settings size={15} color={colors.textMuted} />}
                iconBg={colors.secondary}
                label={t('navigation.settings')}
                onPress={onTeamSettings}
                colors={colors}
              />
            </>
          )}
        </View>
      </Animated.View>

      {/* ── Training History Section ── */}
      {pastTrainings.length > 0 && (
        <Animated.View entering={FadeIn.delay(100).duration(200)}>
          <View style={ts.sectionHeaderRow}>
            <Text style={[ts.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
              {t('training.completed').toUpperCase()}
            </Text>
            <Text style={[ts.sectionCount, { color: colors.textMuted }]}>
              {pastTrainings.length}
            </Text>
          </View>
          <View style={ts.trainingList}>
            {(showAllPast ? pastTrainings : pastTrainings.slice(0, 3)).map((training) => (
              <TouchableOpacity
                key={training.id}
                style={[
                  ts.trainingRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => onTrainingPress(training)}
                activeOpacity={0.7}
              >
                <View style={[ts.timeBadge, { backgroundColor: colors.secondary }]}>
                  <Clock size={10} color={colors.textMuted} />
                  <Text style={[ts.timeText, { color: colors.textMuted }]}>
                    {format(new Date(training.scheduled_at), 'MMM d')}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ts.trainingTitle, { color: colors.text }]} numberOfLines={1}>
                    {training.title}
                  </Text>
                  {(training.drill_count ?? 0) > 0 && (
                    <Text style={[ts.trainingMeta, { color: colors.textMuted }]}>
                      {t('training.drillsCount', { count: training.drill_count })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[ts.reportBtn, { backgroundColor: `${colors.green}12` }]}
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
              style={[ts.viewAllBtn, { borderColor: colors.border }]}
              onPress={() => setShowAllPast(!showAllPast)}
              activeOpacity={0.7}
            >
              <Text style={[ts.viewAllText, { color: colors.textMuted }]}>
                {showAllPast
                  ? t('common.showLess')
                  : t('training.viewAll', { count: pastTrainings.length })}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── Danger Zone (commander/owner only) ── */}
      {canManage && (
        <Animated.View entering={FadeIn.delay(150).duration(200)}>
          <Text style={[ts.sectionLabel, { color: colors.destructive + 'AA' }]}>
            {'DANGER ZONE'}
          </Text>
          <View
            style={[
              ts.menuCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.destructive + '30',
              },
            ]}
          >
            {/* Leave Team - non-owners */}
            {!isOwner && (
              <MenuItem
                icon={<LogOut size={15} color={colors.destructive} />}
                iconBg={colors.destructive + '12'}
                label={t('teams.leaveTeam')}
                onPress={handleLeaveTeam}
                colors={colors}
                danger
              />
            )}

            {/* Delete Team - owner only */}
            {isOwner && (
              <>
                <MenuItem
                  icon={<LogOut size={15} color={colors.orange} />}
                  iconBg={colors.orange + '12'}
                  label={t('teams.leaveTeam')}
                  onPress={handleLeaveTeam}
                  colors={colors}
                  danger
                />
                <View style={[ts.menuDivider, { backgroundColor: colors.destructive + '20' }]} />
                <MenuItem
                  icon={<Trash2 size={15} color={colors.destructive} />}
                  iconBg={colors.destructive + '12'}
                  label={t('teams.deleteTeam')}
                  onPress={handleDeleteTeam}
                  colors={colors}
                  danger
                />
              </>
            )}
          </View>

          {isOwner && (
            <View style={ts.dangerHint}>
              <AlertTriangle size={11} color={colors.destructive + '80'} />
              <Text style={[ts.dangerHintText, { color: colors.destructive + '80' }]}>
                Deleting the team removes all members, trainings, and data permanently.
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// MENU ITEM COMPONENT
// ============================================================================
interface MenuItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  danger?: boolean;
}

function MenuItem({ icon, iconBg, label, onPress, colors, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={ts.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[ts.menuIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Text
        style={[
          ts.menuItemText,
          { color: danger ? colors.destructive : colors.text },
        ]}
      >
        {label}
      </Text>
      <ChevronRight size={16} color={danger ? colors.destructive + '60' : colors.border} />
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const ts = StyleSheet.create({
  // Header
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerGreeting: {
    fontSize: 10,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    maxWidth: 200,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Container
  container: {
    gap: 20,
  },

  // Team Info Card
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  infoTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  teamIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTeamName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  infoMemberCount: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberAvatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  statusDots: {
    flexDirection: 'row',
    gap: 10,
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

  // Section
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginLeft: 2,
    marginRight: 2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Menu Card
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

  // Training List
  trainingList: {
    gap: 6,
  },
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  trainingTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  trainingMeta: {
    fontSize: 11,
  },
  reportBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Danger Zone
  dangerHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 6,
    marginLeft: 2,
    paddingRight: 8,
  },
  dangerHintText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    flex: 1,
  },
});
