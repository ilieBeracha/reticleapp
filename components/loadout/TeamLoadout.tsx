/**
 * TeamLoadout Component
 *
 * Shows team weapons for team mode:
 * - Team assigned weapons
 * - Team pool weapons
 */

import { CreateWeaponFlow } from '@/components/weapons/CreateWeaponFlow';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import {
    getAllAccessibleWeapons,
    getWeaponStats,
    type AccessibleWeapon,
    type WeaponSource,
    type WeaponStats,
} from '@/services/weaponService';
import { useTeamStore } from '@/stores/teamStore';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Plus, Shield, Star, Target, Users, Zap } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
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

function getSourceIcon(source: WeaponSource, color: string, size = 10) {
  switch (source) {
    case 'team_assigned':
      return <Star size={size} color={color} />;
    case 'team_pool':
      return <Users size={size} color={color} />;
    default:
      return null;
  }
}

function getSourceConfig(source: WeaponSource, t: (key: string) => string, colors: ReturnType<typeof useColors>) {
  switch (source) {
    case 'team_assigned':
      return { label: t('loadout.filters.assigned'), color: colors.primary, bg: `${colors.primary}12` };
    case 'team_pool':
      return { label: t('loadout.filters.pool'), color: colors.textMuted, bg: `${colors.textMuted}10` };
    default:
      return { label: '', color: colors.textMuted, bg: `${colors.textMuted}10` };
  }
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
  weaponCount: number;
  totalSessions: number;
  totalRounds: number;
  colors: ReturnType<typeof useColors>;
}

function StatsOverview({ weaponCount, totalSessions, totalRounds, colors }: StatsOverviewProps) {
  const { t } = useTranslation();
  return (
    <View style={[s.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{weaponCount}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.weapons')}</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{totalSessions}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('session.sessions')}</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{formatNumber(totalRounds)}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.rounds')}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// WEAPON CARD
// ============================================================================

interface WeaponCardProps {
  weapon: AccessibleWeapon;
  stats: WeaponStats | undefined;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponCard({ weapon, stats, onPress, colors }: WeaponCardProps) {
  const { t } = useTranslation();
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const sourceConfig = getSourceConfig(weapon.source, t, colors);

  const statsText = `${stats?.total_sessions ?? 0} ${t('loadout.sess')} · ${formatNumber(stats?.total_rounds_fired ?? 0)} ${t('loadout.rds')}`;

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
              {getSourceIcon(weapon.source, sourceConfig.color)}
              <Text style={[s.sourceBadgeText, { color: sourceConfig.color }]}>{sourceConfig.label}</Text>
            </View>
            <Text style={[s.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {categoryConfig?.label || t('weapons.weapon')}
              {weapon.caliber ? ` · ${weapon.caliber}` : ''}
            </Text>
          </View>
          <Text style={[s.cardDetail, { color: colors.textMuted }]} numberOfLines={1}>
            {statsText}
          </Text>
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
  const [weapons, setWeapons] = useState<AccessibleWeapon[]>([]);
  const [weaponStats, setWeaponStats] = useState<Map<string, WeaponStats>>(new Map());
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<TeamSourceFilter>('all');

  const loadData = useCallback(async () => {
    try {
      const [weaponsData, statsData] = await Promise.all([
        getAllAccessibleWeapons(),
        getWeaponStats(),
      ]);

      // Filter to team weapons only (for the active team)
      const teamWeapons = weaponsData.filter(
        (w) => (w.source === 'team_assigned' || w.source === 'team_pool') && w.teamId === activeTeamId
      );
      setWeapons(teamWeapons);
      setWeaponStats(statsData);
    } catch (error) {
      console.error('[TeamLoadout] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeamId]);

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
      all: weapons.length,
      team_assigned: 0,
      team_pool: 0,
    };
    weapons.forEach((w) => {
      if (w.source === 'team_assigned') counts.team_assigned++;
      else if (w.source === 'team_pool') counts.team_pool++;
    });
    return counts;
  }, [weapons]);

  // Filtered weapons
  const filteredWeapons = useMemo(() => {
    if (sourceFilter === 'all') return weapons;
    return weapons.filter((w) => w.source === sourceFilter);
  }, [weapons, sourceFilter]);

  // Aggregate stats
  const totalStats = useMemo(() => {
    let sessions = 0;
    let rounds = 0;
    filteredWeapons.forEach((w) => {
      const stats = weaponStats.get(w.id);
      if (stats) {
        sessions += stats.total_sessions;
        rounds += stats.total_rounds_fired;
      }
    });
    return { sessions, rounds };
  }, [filteredWeapons, weaponStats]);

  const handleWeaponPress = useCallback((weapon: AccessibleWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/weaponDetail',
      params: { weaponId: weapon.id, source: weapon.source },
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

        {/* Stats Overview */}
        <StatsOverview
          weaponCount={filteredWeapons.length}
          totalSessions={totalStats.sessions}
          totalRounds={totalStats.rounds}
          colors={colors}
        />

        {/* Source Filter Pills */}
        <SourceFilterPills selected={sourceFilter} onChange={setSourceFilter} counts={filterCounts} colors={colors} />

        {/* Section Header */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {sourceFilter === 'all' ? 'TEAM WEAPONS' : sourceFilter === 'team_assigned' ? 'ASSIGNED' : 'POOL'}
          </Text>
          {filteredWeapons.length > 0 && (
            <Text style={[s.sectionCount, { color: colors.textMuted }]}>{filteredWeapons.length}</Text>
          )}
        </View>

        {/* Weapons List */}
        {filteredWeapons.length > 0 ? (
          <View style={s.cardList}>
            {filteredWeapons.map((weapon) => (
              <WeaponCard
                key={`${weapon.source}-${weapon.id}`}
                weapon={weapon}
                stats={weaponStats.get(weapon.id)}
                onPress={() => handleWeaponPress(weapon)}
                colors={colors}
              />
            ))}
          </View>
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
  cardDetail: { fontSize: 10, fontWeight: '500' },
  teamIndicator: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default TeamLoadout;
