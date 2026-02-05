/**
 * TeamLoadout Component
 *
 * Shows ALL team weapons for team mode (visible to all members):
 * - My Weapon (soldier only)
 * - Assigned weapons (with member name visible to everyone)
 * - Pool weapons (available to all)
 * - Unassigned weapons (commander only)
 */

import { CreateWeaponFlow } from '@/components/weapons/CreateWeaponFlow';
import { RequestWeaponModal } from '@/components/weapons/RequestWeaponModal';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useWeaponRealtime } from '@/hooks/realtime/weapon/useWeaponRealtime';
import { useColors } from '@/hooks/ui/useColors';
import { getCurrentUserId } from '@/services/authService';
import {
    cancelWeaponRequest,
    getArmoryOverview,
    getCategoryLabel,
    type ArmoryOverviewData,
    type TeamWeapon,
    type WeaponRequest,
} from '@/services/weaponService';
import { useTeamStore } from '@/stores/teamStore';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Clock, Crosshair, Plus, Shield, ShieldCheck, Star, Target, User, Users, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type TeamSourceFilter = 'all' | 'team_assigned' | 'team_pool';
type CardSource = 'team_assigned' | 'team_pool' | 'unassigned';

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryIcon(category: WeaponCategory | null, color: string) {
  const size = 15;
  switch (category) {
    case 'precision_rifle':
      return <Crosshair size={size} color={color} />;
    case 'rifle':
    case 'carbine':
      return <Target size={size} color={color} />;
    default:
      return <Zap size={size} color={color} />;
  }
}

function getSourceIcon(source: CardSource, color: string, size = 10) {
  switch (source) {
    case 'team_assigned':
      return <Star size={size} color={color} />;
    case 'team_pool':
      return <Users size={size} color={color} />;
    case 'unassigned':
      return <Shield size={size} color={color} />;
    default:
      return null;
  }
}

function getSourceConfig(source: CardSource, t: (key: string) => string, colors: ReturnType<typeof useColors>) {
  switch (source) {
    case 'team_assigned':
      return { label: t('loadout.filters.assigned'), color: colors.primary, bg: `${colors.primary}12` };
    case 'team_pool':
      return { label: t('loadout.filters.pool'), color: colors.textMuted, bg: `${colors.textMuted}10` };
    case 'unassigned':
      return { label: 'Unassigned', color: colors.textMuted, bg: `${colors.textMuted}08` };
    default:
      return { label: '', color: colors.textMuted, bg: `${colors.textMuted}10` };
  }
}

function getNavigationSource(weapon: TeamWeapon): string {
  if (weapon.assigned_to) return 'team_assigned';
  if (weapon.pool_available) return 'team_pool';
  return 'team_assigned';
}

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

// ============================================================================
// FILTER PILLS
// ============================================================================

interface SourceFilterPillsProps {
  selected: TeamSourceFilter;
  onChange: (filter: TeamSourceFilter) => void;
  counts: Record<TeamSourceFilter, number>;
  colors: ReturnType<typeof useColors>;
}

function SourceFilterPills({ selected, onChange, counts, colors }: SourceFilterPillsProps) {
  const { t } = useTranslation();
  const filters: TeamSourceFilter[] = ['all', 'team_assigned', 'team_pool'];

  const labels: Record<TeamSourceFilter, string> = {
    all: t('loadout.filters.all'),
    team_assigned: t('loadout.filters.assigned'),
    team_pool: t('loadout.filters.pool'),
  };

  // Only show filters if we have both types
  if (counts.team_assigned === 0 || counts.team_pool === 0) {
    return null;
  }

  return (
    <View style={s.filterRow}>
      {filters.map((filter) => {
        const isSelected = selected === filter;
        const count = counts[filter];

        return (
          <TouchableOpacity
            key={filter}
            style={[s.filterPill, { backgroundColor: isSelected ? colors.primary : colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(filter);
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.filterPillText, { color: isSelected ? '#fff' : colors.textMuted }]}>
              {labels[filter]}
            </Text>
            {filter !== 'all' && count > 0 && (
              <View style={[s.filterCount, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.secondary }]}>
                <Text style={[s.filterCountText, { color: isSelected ? '#fff' : colors.textMuted }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// STATS OVERVIEW
// ============================================================================

interface StatsOverviewProps {
  totalWeapons: number;
  assignedCount: number;
  poolCount: number;
  colors: ReturnType<typeof useColors>;
}

function StatsOverview({ totalWeapons, assignedCount, poolCount, colors }: StatsOverviewProps) {
  const { t } = useTranslation();
  return (
    <View style={[s.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{totalWeapons}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.weapons')}</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{assignedCount}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('loadout.filters.assigned')}</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{poolCount}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('loadout.filters.pool')}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// WEAPON CARD
// ============================================================================

interface WeaponCardProps {
  weapon: TeamWeapon;
  source: CardSource;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponCard({ weapon, source, onPress, colors }: WeaponCardProps) {
  const { t } = useTranslation();
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const sourceConfig = getSourceConfig(source, t, colors);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.cardMain}>
        {/* Category Icon */}
        <View style={[s.cardIcon, { backgroundColor: sourceConfig.bg }]}>
          {getCategoryIcon(weapon.category, sourceConfig.color)}
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {weapon.name}
          </Text>
          <View style={s.cardMetaRow}>
            <View style={[s.sourceBadge, { backgroundColor: sourceConfig.bg }]}>
              {getSourceIcon(source, sourceConfig.color)}
              <Text style={[s.sourceBadgeText, { color: sourceConfig.color }]}>{sourceConfig.label}</Text>
            </View>
            <Text style={[s.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {categoryConfig?.label || t('weapons.weapon')}
              {weapon.caliber ? ` · ${weapon.caliber}` : ''}
            </Text>
          </View>
          {/* Show assigned user for assigned weapons */}
          {weapon.assigned_user && (
            <View style={s.assignedUserRow}>
              <User size={10} color={colors.primary} />
              <Text style={[s.assignedUserText, { color: colors.primary }]} numberOfLines={1}>
                {weapon.assigned_user.full_name}
              </Text>
            </View>
          )}
        </View>

        {/* Team indicator */}
        <View style={[s.teamIndicator, { backgroundColor: sourceConfig.bg }]}>
          <Users size={12} color={sourceConfig.color} />
        </View>

        <ChevronRight size={14} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// CONTEXT HEADER
// ============================================================================

interface TeamContextHeaderProps {
  teamName?: string;
  isCommander: boolean;
  memberCount: number;
  colors: ReturnType<typeof useColors>;
}

function TeamContextHeader({ teamName, isCommander, memberCount, colors }: TeamContextHeaderProps) {
  return (
    <View style={[s.contextHeader, { borderColor: colors.border }]}>
      <View style={[s.contextIcon, { backgroundColor: `${colors.textMuted}10` }]}>
        <Users size={12} color={colors.textMuted} />
      </View>
      <Text style={[s.contextTeamName, { color: colors.text }]} numberOfLines={1}>
        {teamName || 'Team'} Loadout
      </Text>
      {isCommander && (
        <View style={[s.cmdBadge, { backgroundColor: `${colors.textMuted}15` }]}>
          <Shield size={9} color={colors.textMuted} />
          <Text style={[s.cmdBadgeText, { color: colors.textMuted }]}>CMD</Text>
        </View>
      )}
      <Text style={[s.memberCount, { color: colors.textMuted }]}>
        {memberCount} members
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamLoadout() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Team state
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const members = useTeamStore((s) => s.members);
  const myRole = useTeamStore((state) => {
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
  const isCommander = myRole === 'owner' || myRole === 'commander';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [armoryData, setArmoryData] = useState<ArmoryOverviewData | null>(null);
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<TeamSourceFilter>('all');
  const [cancelling, setCancelling] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID for realtime filtering
  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  // Load team armory data
  const loadData = useCallback(async () => {
    if (!activeTeamId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getArmoryOverview(activeTeamId);
      setArmoryData(data);
    } catch (error) {
      console.error('[TeamLoadout] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeamId]);

  // Derived data from armory overview
  const myWeapon = armoryData?.myAssignment ?? null;
  const myPendingRequest = armoryData?.myPendingRequest ?? null;
  const assignedWeapons = armoryData?.assignedWeapons ?? [];
  const poolWeapons = armoryData?.poolWeapons ?? [];
  const unassignedWeapons = armoryData?.unassignedWeapons ?? [];

  // Realtime updates — all handlers refresh the full armory view
  useWeaponRealtime({
    teamId: activeTeamId || undefined,
    userId: currentUserId,
    enabled: !!activeTeamId,
    onRequestApproved: useCallback(() => {
      loadData();
    }, [loadData]),
    onRequestRejected: useCallback(() => {
      loadData();
    }, [loadData]),
    onWeaponAssigned: useCallback(() => {
      loadData();
    }, [loadData]),
    onWeaponUnassigned: useCallback(() => {
      loadData();
    }, [loadData]),
  });

  // Handle cancel weapon request
  const handleCancelRequest = async () => {
    if (!myPendingRequest) return;
    try {
      setCancelling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cancelWeaponRequest(myPendingRequest.id);
      await loadData();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
    } finally {
      setCancelling(false);
    }
  };

  // Handle weapon request success
  const handleRequestSuccess = async () => {
    setShowRequestModal(false);
    await loadData();
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<TeamSourceFilter, number> = {
      all: assignedWeapons.length + poolWeapons.length,
      team_assigned: assignedWeapons.length,
      team_pool: poolWeapons.length,
    };
    return counts;
  }, [assignedWeapons, poolWeapons]);

  // Total weapon count (including unassigned for commanders)
  const totalWeapons = assignedWeapons.length + poolWeapons.length + unassignedWeapons.length;

  const handleWeaponPress = useCallback((weapon: TeamWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/weaponDetail',
      params: { weaponId: weapon.id, source: getNavigationSource(weapon) },
    } as any);
  }, []);

  const handleAddWeapon = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddWeapon(true);
  }, []);

  const handleWeaponCreated = useCallback(async () => {
    setShowAddWeapon(false);
    await loadData();
  }, [loadData]);

  // Determine which sections to show based on filter
  const showAssigned = sourceFilter === 'all' || sourceFilter === 'team_assigned';
  const showPool = sourceFilter === 'all' || sourceFilter === 'team_pool';
  const hasAnyWeapons = totalWeapons > 0;

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={[s.title, { color: colors.text }]}>{t('navigation.loadout')}</Text>
            {isCommander && (
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddWeapon}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Context Header */}
        <TeamContextHeader
          teamName={activeTeam?.name}
          isCommander={isCommander}
          memberCount={members?.length || 0}
          colors={colors}
        />

        {/* Soldier Weapon Section - only for non-commanders */}
        {!isCommander && (
          <View style={sw.section}>
            <View style={sw.sectionHeader}>
              <ShieldCheck size={14} color={colors.primary} />
              <Text style={[sw.sectionTitle, { color: colors.textMuted }]}>{t('teams.myWeapon')}</Text>
            </View>

            {myWeapon ? (
              <View style={[sw.weaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <View style={[sw.weaponBadge, { backgroundColor: colors.primary }]}>
                  <ShieldCheck size={14} color="#fff" />
                  <Text style={sw.weaponBadgeText}>{t('loadout.filters.assigned')}</Text>
                </View>
                <Text style={[sw.weaponName, { color: colors.text }]}>{myWeapon.name}</Text>
                <Text style={[sw.weaponMeta, { color: colors.textMuted }]}>
                  {getCategoryLabel(myWeapon.category)}
                  {myWeapon.caliber && ` • ${myWeapon.caliber}`}
                </Text>
              </View>
            ) : (
              <View style={[sw.noWeaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[sw.noWeaponIcon, { backgroundColor: colors.secondary }]}>
                  <Shield size={24} color={colors.textMuted} />
                </View>
                <Text style={[sw.noWeaponTitle, { color: colors.text }]}>{t('teams.weaponRequired')}</Text>
                <Text style={[sw.noWeaponHint, { color: colors.textMuted }]}>
                  {t('teams.requestWeaponToStart')}
                </Text>
              </View>
            )}

            {/* Pending Request or Request Button */}
            {myPendingRequest ? (
              <View style={[sw.pendingCard, { backgroundColor: colors.blue + '10', borderColor: colors.blue }]}>
                <View style={sw.pendingHeader}>
                  <Clock size={14} color={colors.blue} />
                  <Text style={[sw.pendingTitle, { color: colors.blue }]}>{t('teams.requestPending')}</Text>
                </View>
                <Text style={[sw.pendingText, { color: colors.text }]}>
                  {t('teams.awaitingCommanderReview')}
                </Text>
                {myPendingRequest.weapon_category && (
                  <Text style={[sw.pendingPreference, { color: colors.textMuted }]}>
                    {t('teams.preferred')}: {getCategoryLabel(myPendingRequest.weapon_category)}
                  </Text>
                )}
                <TouchableOpacity
                  style={[sw.cancelBtn, { borderColor: colors.destructive }]}
                  onPress={handleCancelRequest}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={colors.destructive} />
                  ) : (
                    <>
                      <X size={14} color={colors.destructive} />
                      <Text style={[sw.cancelBtnText, { color: colors.destructive }]}>
                        {t('teams.cancelRequest')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : !myWeapon ? (
              <TouchableOpacity
                style={[sw.requestBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowRequestModal(true)}
              >
                <Plus size={18} color="#fff" />
                <Text style={sw.requestBtnText}>{t('teams.requestWeapon')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Stats Overview */}
        <StatsOverview
          totalWeapons={totalWeapons}
          assignedCount={assignedWeapons.length}
          poolCount={poolWeapons.length}
          colors={colors}
        />

        {/* Source Filter Pills */}
        <SourceFilterPills selected={sourceFilter} onChange={setSourceFilter} counts={filterCounts} colors={colors} />

        {/* Weapons Sections */}
        {hasAnyWeapons ? (
          <>
            {/* Assigned Weapons Section */}
            {showAssigned && assignedWeapons.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    {t('loadout.filters.assigned').toUpperCase()}
                  </Text>
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{assignedWeapons.length}</Text>
                </View>
                <View style={s.cardList}>
                  {assignedWeapons.map((weapon) => (
                    <WeaponCard
                      key={weapon.id}
                      weapon={weapon}
                      source="team_assigned"
                      onPress={() => handleWeaponPress(weapon)}
                      colors={colors}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Pool Weapons Section */}
            {showPool && poolWeapons.length > 0 && (
              <>
                <View style={[s.sectionHeader, showAssigned && assignedWeapons.length > 0 ? s.sectionSpacing : undefined]}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    {t('loadout.filters.pool').toUpperCase()}
                  </Text>
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{poolWeapons.length}</Text>
                </View>
                <View style={s.cardList}>
                  {poolWeapons.map((weapon) => (
                    <WeaponCard
                      key={weapon.id}
                      weapon={weapon}
                      source="team_pool"
                      onPress={() => handleWeaponPress(weapon)}
                      colors={colors}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Unassigned Weapons Section - commander only */}
            {isCommander && unassignedWeapons.length > 0 && (
              <>
                <View style={[s.sectionHeader, s.sectionSpacing]}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>UNASSIGNED</Text>
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{unassignedWeapons.length}</Text>
                </View>
                <View style={s.cardList}>
                  {unassignedWeapons.map((weapon) => (
                    <WeaponCard
                      key={weapon.id}
                      weapon={weapon}
                      source="unassigned"
                      onPress={() => handleWeaponPress(weapon)}
                      colors={colors}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Target size={24} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {t('loadout.noTeamWeapons')}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              {isCommander
                ? t('loadout.addTeamWeaponsMessage')
                : t('loadout.contactCommanderMessage')}
            </Text>
            {isCommander && (
              <TouchableOpacity style={[s.emptyButton, { backgroundColor: colors.primary }]} onPress={handleAddWeapon}>
                <Plus size={16} color="#fff" />
                <Text style={s.emptyButtonText}>{t('loadout.addWeapon')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Weapon Modal (commander only) */}
      {isCommander && (
        <Modal
          visible={showAddWeapon}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddWeapon(false)}
        >
          <CreateWeaponFlow onComplete={handleWeaponCreated} onCancel={() => setShowAddWeapon(false)} />
        </Modal>
      )}

      {/* Request Weapon Modal (soldier only) */}
      {!isCommander && (
        <RequestWeaponModal
          visible={showRequestModal}
          teamId={activeTeamId || ''}
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: { marginBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Context header
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  contextIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  contextTeamName: { fontSize: 13, fontWeight: '600', flex: 1 },
  cmdBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  cmdBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  memberCount: { fontSize: 11, fontWeight: '500' },

  // Filter Pills
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  filterCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 20, alignItems: 'center' },
  filterCountText: { fontSize: 10, fontWeight: '600' },

  // Stats Overview
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 24 },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  sectionCount: { fontSize: 12, fontWeight: '500' },
  sectionSpacing: { marginTop: 20 },

  // Card List
  cardList: { gap: 8 },

  // Card
  card: { borderRadius: 12, borderWidth: 1, padding: 12, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  sourceBadgeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.2 },
  cardMeta: { fontSize: 11, fontWeight: '400', flexShrink: 1 },
  assignedUserRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assignedUserText: { fontSize: 11, fontWeight: '500' },
  teamIndicator: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

// Soldier weapon styles
const sw = StyleSheet.create({
  section: { gap: 10, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  weaponCard: { padding: 16, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  weaponBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  weaponBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  weaponName: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  weaponMeta: { fontSize: 14 },
  noWeaponCard: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 1, gap: 8 },
  noWeaponIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noWeaponTitle: { fontSize: 16, fontWeight: '600' },
  noWeaponHint: { fontSize: 13, textAlign: 'center' },
  pendingCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 10 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingTitle: { fontSize: 14, fontWeight: '600' },
  pendingText: { fontSize: 14 },
  pendingPreference: { fontSize: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  requestBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default TeamLoadout;
