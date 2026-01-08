/**
 * Loadout Screen - User's Arsenal
 *
 * Clean card-based design with two-row weapon cards
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { getMyTeams } from '@/services/teamService';
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
import {
  ChevronRight,
  Plus,
  Star,
  Users,
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

function getCategoryAbbrev(category: WeaponCategory | null): string {
  switch (category) {
    case 'precision_rifle': return 'PR';
    case 'rifle': return 'RF';
    case 'carbine': return 'CB';
    case 'pistol': return 'PT';
    case 'shotgun': return 'SG';
    default: return 'WP';
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
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
}

function WeaponCard({ weapon, stats, isDefault, onPress, onSetDefault, colors }: WeaponCardProps) {
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const abbrev = getCategoryAbbrev(weapon.category);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Row 1: Badge + Name + Default */}
      <View style={styles.cardRow1}>
        <View style={[styles.badge, { backgroundColor: `${colors.text}08` }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{abbrev}</Text>
        </View>
        
        <View style={styles.cardTitleArea}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {weapon.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {categoryConfig?.label || 'Weapon'}{weapon.caliber ? ` · ${weapon.caliber}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.defaultBtn,
            { 
              backgroundColor: isDefault ? '#f59e0b12' : 'transparent',
              borderColor: isDefault ? '#f59e0b40' : `${colors.text}12`,
            }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSetDefault();
          }}
        >
          <Star
            size={16}
            color={isDefault ? '#f59e0b' : colors.textMuted}
            fill={isDefault ? '#f59e0b' : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Row 2: Stats */}
      <View style={[styles.cardRow2, { borderTopColor: `${colors.text}06` }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.total_sessions ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: `${colors.text}08` }]} />
        
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatNumber(stats?.total_rounds_fired ?? 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Bullets</Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: `${colors.text}08` }]} />
        
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.avg_accuracy_pct != null ? `${stats.avg_accuracy_pct}%` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
        </View>

        <ChevronRight size={18} color={colors.textMuted} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LoadoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [weaponStats, setWeaponStats] = useState<Map<string, WeaponStats>>(new Map());
  const [hasTeams, setHasTeams] = useState(false);
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
      setHasTeams(teamsData.length > 0);
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

  // Aggregate stats
  const totalStats = useMemo(() => {
    let sessions = 0;
    let rounds = 0;
    weaponStats.forEach((s) => {
      sessions += s.total_sessions;
      rounds += s.total_rounds_fired;
    });
    return { sessions, rounds };
  }, [weaponStats]);

  const handleWeaponPress = useCallback((weapon: UserWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Weapon pressed:', weapon.id);
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Loadout</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {weapons.length} weapon{weapons.length !== 1 ? 's' : ''} · {formatNumber(totalStats.rounds)} bullets fired
          </Text>
        </View>

        {/* Team Link */}
        {hasTeams && (
          <TouchableOpacity
            style={[styles.teamLink, { backgroundColor: colors.card }]}
            activeOpacity={0.7}
          >
            <Users size={18} color={colors.textMuted} />
            <Text style={[styles.teamLinkText, { color: colors.text }]}>Team Weapons</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Weapons */}
        {weapons.length > 0 ? (
          <View style={styles.cardList}>
            {weapons.map((weapon) => (
              <WeaponCard
                key={weapon.id}
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
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No weapons yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add your first weapon to start tracking
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleAddWeapon}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Weapon</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {weapons.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddWeapon}
          activeOpacity={0.9}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

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

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Team Link
  teamLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  teamLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  // Card List
  cardList: {
    gap: 12,
  },

  // Card
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitleArea: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '400',
  },
  defaultBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Row
  cardRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  stat: {
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
    height: 28,
  },
  chevron: {
    marginLeft: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
