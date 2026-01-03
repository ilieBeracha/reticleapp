/**
 * Equipment Screen - User's Arsenal
 *
 * Centralized view of all user weapons (personal + team)
 * with rich statistics for tracking maintenance and performance.
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { getMyTeams } from '@/services/teamService';
import {
    createUserWeapon,
    getUserWeapons,
    getWeaponStats,
    toggleUserWeaponFavorite,
    type GlobalWeapon,
    type UserWeapon,
    type WeaponStats,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
    Activity,
    Calendar,
    ChevronRight,
    Crosshair,
    Heart,
    Plus,
    Target,
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
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// ============================================================================
// WEAPON SILHOUETTES
// ============================================================================

function RifleSilhouette({ color, size = 60 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.35} viewBox="0 0 120 42">
      <Defs>
        <LinearGradient id="rifleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M2 21 L8 21 L8 18 L15 18 L15 16 L25 16 L25 14 L85 14 L85 12 L95 12 L95 14 L105 14 L108 14 L108 18 L118 18 L118 22 L108 22 L108 26 L95 26 L95 28 L85 28 L85 26 L35 26 L35 30 L30 34 L25 34 L25 30 L20 30 L20 26 L15 26 L15 24 L8 24 L8 21 Z"
        fill="url(#rifleGrad)"
      />
      <Path d="M45 10 L75 10 L75 14 L45 14 Z" fill={color} opacity="0.8" />
    </Svg>
  );
}

function PistolSilhouette({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 60 48">
      <Defs>
        <LinearGradient id="pistolGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M5 12 L10 12 L10 10 L45 10 L48 10 L48 8 L55 8 L55 14 L48 14 L48 18 L45 18 L45 20 L40 20 L40 24 L38 24 L38 44 L28 44 L28 46 L22 46 L22 44 L20 44 L20 24 L18 24 L18 20 L10 20 L10 16 L5 16 Z"
        fill="url(#pistolGrad)"
      />
    </Svg>
  );
}

function ShotgunSilhouette({ color, size = 60 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.3} viewBox="0 0 120 36">
      <Defs>
        <LinearGradient id="shotgunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M2 18 L8 18 L8 14 L20 14 L20 12 L95 12 L95 10 L115 10 L118 12 L118 16 L115 18 L115 22 L118 24 L118 28 L115 30 L95 30 L95 28 L35 28 L35 32 L30 34 L25 34 L25 30 L20 30 L20 28 L8 28 L8 24 L2 24 Z"
        fill="url(#shotgunGrad)"
      />
    </Svg>
  );
}

function CarbineSilhouette({ color, size = 50 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.4} viewBox="0 0 100 40">
      <Defs>
        <LinearGradient id="carbineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M2 20 L8 20 L8 16 L15 16 L15 14 L70 14 L70 12 L85 12 L88 12 L88 10 L95 10 L98 12 L98 18 L95 18 L95 22 L98 22 L98 28 L95 30 L88 30 L88 28 L85 28 L85 26 L30 26 L30 30 L28 32 L22 32 L22 30 L18 30 L18 26 L15 26 L15 24 L8 24 L8 20 Z"
        fill="url(#carbineGrad)"
      />
      <Path d="M35 26 L42 26 L42 38 L35 38 Z" fill={color} opacity="0.7" />
    </Svg>
  );
}

function GenericWeaponSilhouette({ color, size = 50 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.4} viewBox="0 0 100 40">
      <Defs>
        <LinearGradient id="genericGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      <Path
        d="M5 18 L10 18 L10 14 L80 14 L80 12 L95 14 L95 20 L95 26 L80 28 L80 26 L30 26 L30 30 L25 32 L20 32 L20 28 L10 28 L10 24 L5 24 Z"
        fill="url(#genericGrad)"
      />
    </Svg>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getWeaponSilhouette(category: WeaponCategory | null) {
  switch (category) {
    case 'precision_rifle':
    case 'rifle':
      return RifleSilhouette;
    case 'carbine':
      return CarbineSilhouette;
    case 'pistol':
      return PistolSilhouette;
    case 'shotgun':
      return ShotgunSilhouette;
    default:
      return GenericWeaponSilhouette;
  }
}

function formatLastUsed(date: string | null): string {
  if (!date) return 'Never used';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// WEAPON CARD COMPONENT
// ============================================================================

interface WeaponCardProps {
  weapon: UserWeapon;
  stats: WeaponStats | undefined;
  onPress: () => void;
  onFavorite: () => void;
}

function WeaponCard({ weapon, stats, onPress, onFavorite }: WeaponCardProps) {
  const colors = useColors();
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const Silhouette = getWeaponSilhouette(weapon.category);

  const handleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFavorite();
  }, [onFavorite]);

  return (
    <TouchableOpacity
      style={[styles.weaponCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top section with silhouette */}
      <View style={styles.cardTop}>
        <View style={[styles.silhouetteBox, { backgroundColor: colors.background }]}>
          <Silhouette color={colors.text} size={56} />
        </View>

        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart
            size={20}
            color={weapon.is_favorite ? '#ef4444' : colors.textMuted}
            fill={weapon.is_favorite ? '#ef4444' : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Weapon info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
          {weapon.name}
        </Text>
        <View style={styles.metaRow}>
          {categoryConfig && (
            <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                {categoryConfig.label}
              </Text>
            </View>
          )}
          {weapon.caliber && (
            <Text style={[styles.caliber, { color: colors.textMuted }]}>
              {weapon.caliber}
            </Text>
          )}
        </View>
      </View>

      {/* Stats grid */}
      <View style={[styles.statsGrid, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Target size={14} color={colors.textMuted} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.total_sessions ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Crosshair size={14} color={colors.textMuted} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.total_rounds_fired ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Activity size={14} color={colors.textMuted} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.avg_accuracy_pct != null ? `${stats.avg_accuracy_pct}%` : '-'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
        </View>
      </View>

      {/* Last used footer */}
      <View style={styles.cardFooter}>
        <View style={styles.lastUsedRow}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={[styles.lastUsedText, { color: colors.textMuted }]}>
            {formatLastUsed(stats?.last_used_at ?? weapon.last_used_at)}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EquipmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [weaponStats, setWeaponStats] = useState<Map<string, WeaponStats>>(new Map());
  const [hasTeams, setHasTeams] = useState(false);
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [weaponsData, statsData, teamsData] = await Promise.all([
        getUserWeapons(),
        getWeaponStats(),
        getMyTeams(),
      ]);

      setWeapons(weaponsData);
      setWeaponStats(statsData);
      setHasTeams(teamsData.length > 0);
    } catch (error) {
      console.error('[EquipmentScreen] Failed to load data:', error);
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

  // Split weapons by favorite
  const { favoriteWeapons, otherWeapons } = useMemo(() => {
    const favorites = weapons.filter((w) => w.is_favorite);
    const others = weapons.filter((w) => !w.is_favorite);
    return { favoriteWeapons: favorites, otherWeapons: others };
  }, [weapons]);

  // Total stats
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
    // TODO: Navigate to weapon detail screen
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Weapon pressed:', weapon.id);
  }, []);

  const handleToggleFavorite = useCallback(async (weaponId: string) => {
    try {
      await toggleUserWeaponFavorite(weaponId);
      setWeapons((prev) =>
        prev.map((w) => (w.id === weaponId ? { ...w, is_favorite: !w.is_favorite } : w))
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, []);

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
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
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
        contentContainerStyle={[
          styles.scrollContent,
          {  paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Equipment</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Your arsenal & statistics
          </Text>
        </View>

        {/* Stats overview */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {weapons.length}
              </Text>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>
                Weapons
              </Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {totalStats.sessions}
              </Text>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>
                Sessions
              </Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewItem}>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {totalStats.rounds.toLocaleString()}
              </Text>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>
                Rounds
              </Text>
            </View>
          </View>
        </View>

        {/* Team weapons hint */}
        {hasTeams && (
          <TouchableOpacity
            style={[styles.teamHint, { backgroundColor: colors.card }]}
            activeOpacity={0.7}
          >
            <View style={[styles.teamIconBox, { backgroundColor: colors.background }]}>
              <Users size={18} color={colors.text} />
            </View>
            <View style={styles.teamHintContent}>
              <Text style={[styles.teamHintTitle, { color: colors.text }]}>
                Team Weapons
              </Text>
              <Text style={[styles.teamHintSubtitle, { color: colors.textMuted }]}>
                View weapons assigned by your team
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Favorites section */}
        {favoriteWeapons.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Heart size={16} color="#ef4444" fill="#ef4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Favorites</Text>
            </View>
            {favoriteWeapons.map((weapon) => (
              <WeaponCard
                key={weapon.id}
                weapon={weapon}
                stats={weaponStats.get(weapon.id)}
                onPress={() => handleWeaponPress(weapon)}
                onFavorite={() => handleToggleFavorite(weapon.id)}
              />
            ))}
          </>
        )}

        {/* All weapons section */}
        <View style={styles.sectionHeader}>
          <Target size={16} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {favoriteWeapons.length > 0 ? 'All Weapons' : 'My Weapons'}
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {otherWeapons.length}
          </Text>
        </View>

        {otherWeapons.length > 0 ? (
          otherWeapons.map((weapon) => (
            <WeaponCard
              key={weapon.id}
              weapon={weapon}
              stats={weaponStats.get(weapon.id)}
              onPress={() => handleWeaponPress(weapon)}
              onFavorite={() => handleToggleFavorite(weapon.id)}
            />
          ))
        ) : weapons.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <GenericWeaponSilhouette color={colors.textMuted} size={80} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No weapons yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add your first weapon to start tracking
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.text }]}
              onPress={handleAddWeapon}
              activeOpacity={0.8}
            >
              <Plus size={18} color={colors.background} />
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>
                Add Weapon
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating add button */}
      {weapons.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.text }]}
          onPress={handleAddWeapon}
          activeOpacity={0.85}
        >
          <Plus size={24} color={colors.background} strokeWidth={2.5} />
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
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Overview card
  overviewCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },

  // Team hint
  teamHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  teamIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamHintContent: {
    flex: 1,
  },
  teamHintTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamHintSubtitle: {
    fontSize: 13,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },

  // Weapon card
  weaponCard: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  silhouetteBox: {
    width: 72,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  cardInfo: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  weaponName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  caliber: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0,
  },
  lastUsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastUsedText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
