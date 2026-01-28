/**
 * Loadout Screen - Unified Arsenal
 *
 * Shows ALL weapons accessible to the user in one list:
 * - Personal weapons
 * - Team-assigned weapons
 * - Team pool weapons
 *
 * Uses source filters instead of separate routes.
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import {
  createUserWeapon,
  getAllAccessibleWeapons,
  getDefaultWeaponId,
  getWeaponStats,
  setDefaultWeaponId,
  type AccessibleWeapon,
  type GlobalWeapon,
  type UserWeapon,
  type WeaponSource,
  type WeaponStats,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Plus, Star, Target, User, Users, Zap } from 'lucide-react-native';
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

type SourceFilter = 'all' | 'personal' | 'team_assigned' | 'team_pool';

function getSourceFilterConfig(t: (key: string) => string): Record<SourceFilter, { label: string; shortLabel: string }> {
  return {
    all: { label: t('loadout.filters.all'), shortLabel: t('loadout.filters.all') },
    personal: { label: t('loadout.filters.personal'), shortLabel: t('loadout.filters.mine') },
    team_assigned: { label: t('loadout.filters.assigned'), shortLabel: t('loadout.filters.assigned') },
    team_pool: { label: t('loadout.filters.teamPool'), shortLabel: t('loadout.filters.pool') },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryIcon(category: WeaponCategory | null, color: string) {
  const size = 14;
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
    case 'personal':
      return <User size={size} color={color} />;
    case 'team_assigned':
      return <Star size={size} color={color} />;
    case 'team_pool':
      return <Users size={size} color={color} />;
  }
}

function getSourceConfig(source: WeaponSource, t: (key: string) => string) {
  switch (source) {
    case 'personal':
      return { label: t('loadout.filters.personal'), color: '#10B981', bg: '#10B98115' };
    case 'team_assigned':
      return { label: t('loadout.filters.assigned'), color: '#3B82F6', bg: '#3B82F615' };
    case 'team_pool':
      return { label: t('loadout.filters.pool'), color: '#8B5CF6', bg: '#8B5CF615' };
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

// ============================================================================
// FILTER PILLS COMPONENT
// ============================================================================

interface SourceFilterPillsProps {
  selected: SourceFilter;
  onChange: (filter: SourceFilter) => void;
  counts: Record<SourceFilter, number>;
  colors: ReturnType<typeof useColors>;
}

function SourceFilterPills({ selected, onChange, counts, colors }: SourceFilterPillsProps) {
  const { t } = useTranslation();
  const filters: SourceFilter[] = ['all', 'personal', 'team_assigned', 'team_pool'];
  const SOURCE_FILTER_CONFIG = getSourceFilterConfig(t);

  // Only show filters that have weapons (except 'all' which is always shown)
  const visibleFilters = filters.filter((f) => f === 'all' || counts[f] > 0);

  // If only personal weapons exist, don't show filters at all
  if (visibleFilters.length <= 2 && counts.personal === counts.all) {
    return null;
  }

  return (
    <View style={s.filterRow}>
      {visibleFilters.map((filter) => {
        const isSelected = selected === filter;
        const config = SOURCE_FILTER_CONFIG[filter];
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
              {config.shortLabel}
            </Text>
            {filter !== 'all' && count > 0 && (
              <View
                style={[s.filterCount, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.secondary }]}
              >
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
// STATS OVERVIEW COMPONENT
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
    <View style={[s.statsRow, { backgroundColor: colors.card }]}>
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
// WEAPON CARD COMPONENT
// ============================================================================

interface WeaponCardProps {
  weapon: AccessibleWeapon;
  stats: WeaponStats | undefined;
  isDefault: boolean;
  onPress: () => void;
  onSetDefault: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponCard({ weapon, stats, isDefault, onPress, onSetDefault, colors }: WeaponCardProps) {
  const { t } = useTranslation();
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const sourceConfig = getSourceConfig(weapon.source, t);
  const isTeamWeapon = weapon.source !== 'personal';

  // Use blue accent for team weapons, primary for personal
  const iconAccent = isTeamWeapon ? '#3B82F6' : colors.primary;
  const iconBg = isTeamWeapon ? '#3B82F615' : `${colors.primary}12`;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: isDefault ? '#f59e0b40' : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.cardMain}>
        {/* Category Icon - blue accent for team weapons */}
        <View style={[s.cardIcon, { backgroundColor: iconBg }]}>{getCategoryIcon(weapon.category, iconAccent)}</View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
              {weapon.name}
            </Text>
            {isDefault && (
              <View style={s.defaultBadge}>
                <Star size={10} color="#f59e0b" fill="#f59e0b" />
              </View>
            )}
          </View>
          <View style={s.cardMetaRow}>
            {/* Source badge - only show for team weapons to reduce noise */}
            {isTeamWeapon && (
              <View style={[s.sourceBadge, { backgroundColor: sourceConfig.bg }]}>
                {getSourceIcon(weapon.source, sourceConfig.color)}
                <Text style={[s.sourceBadgeText, { color: sourceConfig.color }]}>{sourceConfig.label}</Text>
              </View>
            )}
            <Text style={[s.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {categoryConfig?.label || t('weapons.weapon')}
              {weapon.caliber ? ` · ${weapon.caliber}` : ''}
            </Text>
          </View>
          {/* Team name for team weapons */}
          {weapon.teamName && (
            <Text style={[s.teamNameText, { color: sourceConfig.color }]} numberOfLines={1}>
              {weapon.teamName}
            </Text>
          )}
        </View>

        {/* Stats inline */}
        <View style={s.cardStats}>
          <Text style={[s.cardStatText, { color: colors.textMuted }]}>
            {stats?.total_sessions ?? 0} {t('loadout.sess')} · {formatNumber(stats?.total_rounds_fired ?? 0)} {t('loadout.rds')}
          </Text>
        </View>

        {/* Actions - only show star for personal weapons */}
        {weapon.source === 'personal' ? (
          <TouchableOpacity
            style={[s.starBtn, { backgroundColor: isDefault ? '#f59e0b15' : 'transparent' }]}
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSetDefault();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Star size={14} color={isDefault ? '#f59e0b' : colors.textMuted} fill={isDefault ? '#f59e0b' : 'none'} />
          </TouchableOpacity>
        ) : (
          /* Team indicator icon for team weapons */
          <View style={[s.teamIndicator, { backgroundColor: sourceConfig.bg }]}>
            <Users size={12} color={sourceConfig.color} />
          </View>
        )}

        <ChevronRight size={14} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoadoutScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weapons, setWeapons] = useState<AccessibleWeapon[]>([]);
  const [weaponStats, setWeaponStats] = useState<Map<string, WeaponStats>>(new Map());
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [defaultWeaponId, setDefaultWeaponIdState] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const loadData = useCallback(async () => {
    try {
      const [weaponsData, statsData, storedDefaultId] = await Promise.all([
        getAllAccessibleWeapons(),
        getWeaponStats(),
        getDefaultWeaponId(),
      ]);

      setWeapons(weaponsData);
      setWeaponStats(statsData);
      setDefaultWeaponIdState(storedDefaultId);
    } catch (error) {
      console.error('[LoadoutScreen] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filter counts for pills
  const filterCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = {
      all: weapons.length,
      personal: 0,
      team_assigned: 0,
      team_pool: 0,
    };
    weapons.forEach((w) => {
      counts[w.source]++;
    });
    return counts;
  }, [weapons]);

  // Filtered weapons
  const filteredWeapons = useMemo(() => {
    if (sourceFilter === 'all') return weapons;
    return weapons.filter((w) => w.source === sourceFilter);
  }, [weapons, sourceFilter]);

  // Aggregate stats for filtered weapons
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

    // If weapon has a userWeapon (personal copy), use personal fetch
    // This includes team_assigned weapons that are linked to user_weapons
    if (weapon.userWeapon) {
      router.push({
        pathname: '/(protected)/weaponDetail',
        params: { weaponId: weapon.id, source: weapon.source },
      } as any);
    } else {
      // Pure team weapons (team_pool or unlinked team_assigned)
      router.push({
        pathname: '/(protected)/weaponDetail',
        params: { weaponId: weapon.id, source: weapon.source },
      } as any);
    }
  }, []);

  const handleSetDefault = useCallback(
    async (weaponId: string) => {
      try {
        const newDefaultId = defaultWeaponId === weaponId ? null : weaponId;
        await setDefaultWeaponId(newDefaultId);
        setDefaultWeaponIdState(newDefaultId);
        Haptics.notificationAsync(
          newDefaultId ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );
      } catch (error) {
        console.error('Failed to set default weapon:', error);
      }
    },
    [defaultWeaponId]
  );

  const handleAddWeapon = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddWeapon(true);
  }, []);

  const handleWeaponCreated = useCallback(async () => {
    setShowAddWeapon(false);
    await loadData();
  }, [loadData]);

  const handleWeaponSelected = useCallback(
    async (_weapon: UserWeapon) => {
      setShowWeaponPicker(false);
      await loadData();
    },
    [loadData]
  );

  const handleCatalogWeaponSelect = useCallback(
    async (catalogWeapon: GlobalWeapon) => {
      try {
        await createUserWeapon({
          name: catalogWeapon.name,
          base_weapon_id: catalogWeapon.id,
          category: catalogWeapon.category,
          caliber: catalogWeapon.caliber || undefined,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowWeaponPicker(false);
        await loadData();
      } catch {
        setShowWeaponPicker(false);
        setShowAddWeapon(true);
      }
    },
    [loadData]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

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
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddWeapon}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

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
            {sourceFilter === 'all' ? t('loadout.allWeapons') : getSourceFilterConfig(t)[sourceFilter].label}
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
                isDefault={defaultWeaponId === weapon.id}
                onPress={() => handleWeaponPress(weapon)}
                onSetDefault={() => handleSetDefault(weapon.id)}
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
              {sourceFilter === 'all'
                ? t('loadout.noWeaponsYet')
                : t('loadout.noFilterWeapons', { filter: getSourceFilterConfig(t)[sourceFilter].label })}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              {sourceFilter === 'all'
                ? t('loadout.addFirstWeaponMessage')
                : sourceFilter === 'personal'
                  ? t('loadout.createPersonalWeaponMessage')
                  : t('loadout.teamWeaponsMessage')}
            </Text>
            {sourceFilter === 'all' || sourceFilter === 'personal' ? (
              <TouchableOpacity style={[s.emptyButton, { backgroundColor: colors.primary }]} onPress={handleAddWeapon}>
                <Plus size={16} color="#fff" />
                <Text style={s.emptyButtonText}>{t('loadout.addWeapon')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <WeaponPicker
          selectedWeaponId={null}
          onSelect={handleWeaponSelected}
          onSelectCatalog={handleCatalogWeaponSelect}
          onAddNew={() => {
            setShowWeaponPicker(false);
            setShowAddWeapon(true);
          }}
          onClose={() => setShowWeaponPicker(false)}
        />
      </Modal>

      <Modal
        visible={showAddWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddWeapon(false)}
      >
        <CreateWeaponFlow onComplete={handleWeaponCreated} onCancel={() => setShowAddWeapon(false)} />
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter Pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Stats Overview
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Card List
  cardList: {
    gap: 8,
  },

  // Card
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  defaultBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '400',
  },
  teamNameText: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
  cardStats: {
    paddingHorizontal: 8,
  },
  cardStatText: {
    fontSize: 10,
    fontWeight: '500',
  },
  starBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamIndicator: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
