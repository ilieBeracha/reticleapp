/**
 * PersonalLoadout Component
 *
 * Shows only personal weapons for solo mode.
 */

import { CreateWeaponFlow } from '@/components/weapons/CreateWeaponFlow';
import { WeaponPicker } from '@/components/weapons/WeaponPicker';
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
    type WeaponStats,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Plus, Star, Target, User, Zap } from 'lucide-react-native';
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

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
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
  isDefault: boolean;
  onPress: () => void;
  onSetDefault: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponCard({ weapon, stats, isDefault, onPress, onSetDefault, colors }: WeaponCardProps) {
  const { t } = useTranslation();
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;

  const statsText = `${stats?.total_sessions ?? 0} ${t('loadout.sess')} · ${formatNumber(stats?.total_rounds_fired ?? 0)} ${t('loadout.rds')}`;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: isDefault ? `${colors.primary}40` : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.cardMain}>
        {/* Category Icon */}
        <View style={[s.cardIcon, { backgroundColor: `${colors.green}15` }]}>
          {getCategoryIcon(weapon.category, colors.green)}
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
              {weapon.name}
            </Text>
            {isDefault && (
              <View style={[s.defaultBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Star size={10} color={colors.primary} fill={colors.primary} />
              </View>
            )}
          </View>
          <Text style={[s.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {categoryConfig?.label || t('weapons.weapon')}
            {weapon.caliber ? ` · ${weapon.caliber}` : ''}
          </Text>
          <Text style={[s.cardDetail, { color: colors.textMuted }]} numberOfLines={1}>
            {statsText}
          </Text>
        </View>

        {/* Default Star */}
        <TouchableOpacity
          style={[s.starBtn, { backgroundColor: isDefault ? `${colors.primary}15` : 'transparent' }]}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSetDefault();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Star
            size={14}
            color={isDefault ? colors.primary : colors.textMuted}
            fill={isDefault ? colors.primary : 'none'}
          />
        </TouchableOpacity>

        <ChevronRight size={14} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// CONTEXT HEADER
// ============================================================================

function PersonalContextHeader({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[s.contextHeader, { borderColor: colors.border }]}>
      <View style={[s.contextIcon, { backgroundColor: `${colors.textMuted}10` }]}>
        <User size={12} color={colors.textMuted} />
      </View>
      <Text style={[s.contextLabel, { color: colors.textMuted }]}>PERSONAL LOADOUT</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PersonalLoadout() {
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

  const loadData = useCallback(async () => {
    try {
      const [weaponsData, statsData, storedDefaultId] = await Promise.all([
        getAllAccessibleWeapons(),
        getWeaponStats(),
        getDefaultWeaponId(),
      ]);

      // Filter to personal weapons only
      const personalWeapons = weaponsData.filter((w) => w.source === 'personal');
      setWeapons(personalWeapons);
      setWeaponStats(statsData);
      setDefaultWeaponIdState(storedDefaultId);
    } catch (error) {
      console.error('[PersonalLoadout] Failed to load data:', error);
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
    weapons.forEach((w) => {
      const stats = weaponStats.get(w.id);
      if (stats) {
        sessions += stats.total_sessions;
        rounds += stats.total_rounds_fired;
      }
    });
    return { sessions, rounds };
  }, [weapons, weaponStats]);

  const handleWeaponPress = useCallback((weapon: AccessibleWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/weaponDetail',
      params: { weaponId: weapon.id, source: weapon.source },
    } as any);
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
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddWeapon}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Context Header */}
        <PersonalContextHeader colors={colors} />

        {/* Stats Overview */}
        <StatsOverview
          weaponCount={weapons.length}
          totalSessions={totalStats.sessions}
          totalRounds={totalStats.rounds}
          colors={colors}
        />

        {/* Section Header */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('loadout.filters.personal')}</Text>
          {weapons.length > 0 && (
            <Text style={[s.sectionCount, { color: colors.textMuted }]}>{weapons.length}</Text>
          )}
        </View>

        {/* Weapons List */}
        {weapons.length > 0 ? (
          <View style={s.cardList}>
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
          <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Target size={24} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('loadout.noWeaponsYet')}</Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              {t('loadout.addFirstWeaponMessage')}
            </Text>
            <TouchableOpacity style={[s.emptyButton, { backgroundColor: colors.primary }]} onPress={handleAddWeapon}>
              <Plus size={16} color="#fff" />
              <Text style={s.emptyButtonText}>{t('loadout.addWeapon')}</Text>
            </TouchableOpacity>
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
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  contextIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  contextLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  // Stats Overview
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 24 },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionCount: { fontSize: 12, fontWeight: '500' },

  // Card List
  cardList: { gap: 8 },

  // Card
  card: { borderRadius: 12, borderWidth: 1, padding: 12, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 },
  defaultBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { fontSize: 11, fontWeight: '400' },
  cardDetail: { fontSize: 10, fontWeight: '500' },
  starBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default PersonalLoadout;
