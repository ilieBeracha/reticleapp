/**
 * Loadout Screen - User's Weapon Knowledge Base
 *
 * Shows all weapons the user has a relationship with:
 * - Personal weapons they own
 * - Team weapons assigned to them or used in sessions
 * 
 * Can filter by "All" or specific team context
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { getMyTeams, type Team } from '@/services/teamService';
import {
  createUserWeapon,
  getDefaultWeaponId,
  getUserWeapons,
  getWeaponStats,
  setDefaultWeaponId,
  type GlobalWeapon,
  type UserWeapon,
  type WeaponStats,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ChevronRight,
  Crosshair,
  Plus,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
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

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
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
  return (
    <View style={[s.statsRow, { backgroundColor: colors.card }]}>
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{weaponCount}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>Weapons</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{totalSessions}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>Sessions</Text>
      </View>
      <View style={[s.statDivider, { backgroundColor: colors.border }]} />
      <View style={s.statItem}>
        <Text style={[s.statValue, { color: colors.text }]}>{formatNumber(totalRounds)}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>Rounds</Text>
      </View>
    </View>
  );
}

// ============================================================================
// WEAPON CARD COMPONENT
// ============================================================================

interface WeaponCardProps {
  weapon: UserWeapon;
  stats: WeaponStats | undefined;
  isDefault: boolean;
  onPress: () => void;
  onSetDefault: () => void;
  colors: ReturnType<typeof useColors>;
  showSource?: boolean;
}

function WeaponCard({ weapon, stats, isDefault, onPress, onSetDefault, colors, showSource = true }: WeaponCardProps) {
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  
  // Determine weapon source
  const isTeamWeapon = !!weapon.team_weapon_id;
  const teamName = weapon.team_weapon?.team?.name;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: isDefault ? '#f59e0b40' : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.cardMain}>
        {/* Category Icon */}
        <View style={[s.cardIcon, { backgroundColor: isTeamWeapon ? `${colors.blue}12` : `${colors.primary}12` }]}>
          {isTeamWeapon ? (
            <Users size={14} color={colors.blue} />
          ) : (
            getCategoryIcon(weapon.category, colors.primary)
          )}
        </View>

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
            <Text style={[s.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {categoryConfig?.label || 'Weapon'}{weapon.caliber ? ` · ${weapon.caliber}` : ''}
            </Text>
            {showSource && isTeamWeapon && teamName && (
              <View style={[s.sourceBadge, { backgroundColor: `${colors.blue}12` }]}>
                <Text style={[s.sourceText, { color: colors.blue }]}>{teamName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats inline */}
        <View style={s.cardStats}>
          <Text style={[s.cardStatText, { color: colors.textMuted }]}>
            {stats?.total_sessions ?? 0} sess · {formatNumber(stats?.total_rounds_fired ?? 0)} rds
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[s.starBtn, { backgroundColor: isDefault ? '#f59e0b15' : 'transparent' }]}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSetDefault();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Star
            size={14}
            color={isDefault ? '#f59e0b' : colors.textMuted}
            fill={isDefault ? '#f59e0b' : 'none'}
          />
        </TouchableOpacity>

        <ChevronRight size={14} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Team filter segment type
type TeamFilter = 'all' | string; // 'all' or team_id

export default function LoadoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [weaponStats, setWeaponStats] = useState<Map<string, WeaponStats>>(new Map());
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<TeamFilter>('all');
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [defaultWeaponId, setDefaultWeaponIdState] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [weaponsData, statsData, teamsData, storedDefaultId] = await Promise.all([
        getUserWeapons(),
        getWeaponStats(),
        getMyTeams(),
        getDefaultWeaponId(),
      ]);

      setWeapons(weaponsData);
      setWeaponStats(statsData);
      setTeams(teamsData);
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

  // Filter weapons by selected team
  const filteredWeapons = useMemo(() => {
    if (selectedFilter === 'all') {
      return weapons;
    }
    if (selectedFilter === 'personal') {
      // Show only personal weapons (no team_weapon_id)
      return weapons.filter(w => !w.team_weapon_id);
    }
    // Filter to show weapons from selected team
    return weapons.filter(w => w.team_weapon?.team_id === selectedFilter);
  }, [weapons, selectedFilter]);

  // Get unique team IDs from user's weapons for the filter tabs
  const teamsWithWeapons = useMemo(() => {
    const teamIds = new Set<string>();
    weapons.forEach(w => {
      if (w.team_weapon?.team_id) {
        teamIds.add(w.team_weapon.team_id);
      }
    });
    return teams.filter(t => teamIds.has(t.id));
  }, [weapons, teams]);

  // Aggregate stats for filtered weapons
  const totalStats = useMemo(() => {
    let sessions = 0;
    let rounds = 0;
    filteredWeapons.forEach((w) => {
      const s = weaponStats.get(w.id);
      if (s) {
        sessions += s.total_sessions;
        rounds += s.total_rounds_fired;
      }
    });
    return { sessions, rounds };
  }, [filteredWeapons, weaponStats]);

  const handleFilterChange = useCallback((filter: TeamFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filter);
  }, []);

  const handleWeaponPress = useCallback((weapon: UserWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/weaponDetail',
      params: { weaponId: weapon.id },
    } as any);
  }, []);

  const handleSetDefault = useCallback(async (weaponId: string) => {
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
  }, [defaultWeaponId]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={[s.title, { color: colors.text }]}>Loadout</Text>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddWeapon}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs - Only show if user has team weapons */}
        {teamsWithWeapons.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={s.filterScroll}
            contentContainerStyle={s.filterContainer}
          >
            <TouchableOpacity
              style={[
                s.filterTab,
                { 
                  backgroundColor: selectedFilter === 'all' ? colors.primary : colors.card,
                  borderColor: selectedFilter === 'all' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => handleFilterChange('all')}
              activeOpacity={0.7}
            >
              <Text style={[
                s.filterTabText,
                { color: selectedFilter === 'all' ? '#fff' : colors.text }
              ]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.filterTab,
                { 
                  backgroundColor: selectedFilter === 'personal' ? colors.primary : colors.card,
                  borderColor: selectedFilter === 'personal' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => handleFilterChange('personal')}
              activeOpacity={0.7}
            >
              <Text style={[
                s.filterTabText,
                { color: selectedFilter === 'personal' ? '#fff' : colors.text }
              ]}>
                Personal
              </Text>
            </TouchableOpacity>
            {teamsWithWeapons.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  s.filterTab,
                  { 
                    backgroundColor: selectedFilter === team.id ? colors.blue : colors.card,
                    borderColor: selectedFilter === team.id ? colors.blue : colors.border,
                  }
                ]}
                onPress={() => handleFilterChange(team.id)}
                activeOpacity={0.7}
              >
                <Users size={12} color={selectedFilter === team.id ? '#fff' : colors.blue} />
                <Text 
                  style={[
                    s.filterTabText,
                    { color: selectedFilter === team.id ? '#fff' : colors.text }
                  ]}
                  numberOfLines={1}
                >
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats Overview */}
        <StatsOverview
          weaponCount={filteredWeapons.length}
          totalSessions={totalStats.sessions}
          totalRounds={totalStats.rounds}
          colors={colors}
        />

        {/* Section Header */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {selectedFilter === 'all' ? 'All Weapons' : selectedFilter === 'personal' ? 'Personal Weapons' : 'Team Weapons'}
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
                key={weapon.id}
                weapon={weapon}
                stats={weaponStats.get(weapon.id)}
                isDefault={defaultWeaponId === weapon.id}
                onPress={() => handleWeaponPress(weapon)}
                onSetDefault={() => handleSetDefault(weapon.id)}
                colors={colors}
                showSource={selectedFilter === 'all'}
              />
            ))}
          </View>
        ) : (
          <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Target size={24} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {selectedFilter === 'all' ? 'No weapons yet' : 'No weapons in this view'}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              {selectedFilter === 'all' 
                ? 'Add your first weapon to start tracking performance'
                : 'Use weapons in training sessions to see them here'}
            </Text>
            {selectedFilter === 'all' && (
              <TouchableOpacity
                style={[s.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleAddWeapon}
              >
                <Plus size={16} color="#fff" />
                <Text style={s.emptyButtonText}>Add Weapon</Text>
              </TouchableOpacity>
            )}
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
        <CreateWeaponFlow
          onComplete={handleWeaponCreated}
          onCancel={() => setShowAddWeapon(false)}
        />
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

  // Filter Tabs
  filterScroll: {
    marginBottom: 12,
    marginHorizontal: -16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
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
    gap: 1,
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
  cardMeta: {
    fontSize: 11,
    fontWeight: '400',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '600',
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
