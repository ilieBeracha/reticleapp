/**
 * TeamLoadout Component
 *
 * Simple flat list of ALL team weapons.
 * Each weapon shows who it's assigned to.
 * If not assigned → team weapon (all can use).
 * Soldiers can request a weapon. Commanders can add weapons.
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
} from '@/services/weaponService';
import { useTeamStore } from '@/stores/teamStore';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    ChevronRight,
    Clock,
    Crosshair,
    Plus,
    Shield,
    ShieldCheck,
    Target,
    User,
    Users,
    X,
    Zap,
} from 'lucide-react-native';
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

// ============================================================================
// WEAPON ROW
// ============================================================================

interface WeaponRowProps {
  weapon: TeamWeapon;
  isMyWeapon: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponRow({ weapon, isMyWeapon, onPress, colors }: WeaponRowProps) {
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const isAssigned = !!weapon.assigned_to;
  const isPool = weapon.pool_available && !isAssigned;

  return (
    <TouchableOpacity
      style={[
        s.weaponRow,
        { borderBottomColor: colors.border },
        isMyWeapon && { backgroundColor: colors.primary + '06' },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Icon */}
      <View style={[s.weaponIcon, { backgroundColor: isAssigned ? colors.primary + '10' : colors.secondary }]}>
        {getCategoryIcon(weapon.category, isAssigned ? colors.primary : colors.textMuted)}
      </View>

      {/* Info */}
      <View style={s.weaponInfo}>
        <Text style={[s.weaponName, { color: colors.text }]} numberOfLines={1}>
          {weapon.name}
        </Text>
        <Text style={[s.weaponMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {categoryConfig?.label || 'Weapon'}
          {weapon.caliber ? ` · ${weapon.caliber}` : ''}
        </Text>
      </View>

      {/* Assignment */}
      <View style={s.assignmentCol}>
        {isAssigned && weapon.assigned_user ? (
          <View style={s.assignedBadge}>
            <User size={10} color={colors.primary} />
            <Text style={[s.assignedName, { color: colors.primary }]} numberOfLines={1}>
              {isMyWeapon ? 'You' : weapon.assigned_user.full_name}
            </Text>
          </View>
        ) : isPool ? (
          <View style={s.poolBadge}>
            <Users size={10} color={colors.textMuted} />
            <Text style={[s.poolText, { color: colors.textMuted }]}>Team</Text>
          </View>
        ) : (
          <Text style={[s.unassignedText, { color: colors.textMuted }]}>—</Text>
        )}
      </View>

      <ChevronRight size={13} color={colors.border} />
    </TouchableOpacity>
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
  const myRole = useTeamStore((state) => {
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
  const isCommander = myRole === 'owner' || myRole === 'commander';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [armoryData, setArmoryData] = useState<ArmoryOverviewData | null>(null);
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  const loadData = useCallback(async () => {
    if (!activeTeamId) {
      console.warn('[TeamLoadout] No activeTeamId, skipping load');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      console.log('[TeamLoadout] Loading armory data for team:', activeTeamId);
      const data = await getArmoryOverview(activeTeamId);
      console.log('[TeamLoadout] Armory data loaded:', {
        assigned: data.assignedWeapons.length,
        pool: data.poolWeapons.length,
        unassigned: data.unassignedWeapons.length,
        pendingRequests: data.pendingRequests.length,
        myAssignment: !!data.myAssignment,
        myPendingRequest: !!data.myPendingRequest,
      });
      setArmoryData(data);
    } catch (error) {
      console.error('[TeamLoadout] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeamId]);

  // Derived
  const myWeapon = armoryData?.myAssignment ?? null;
  const myPendingRequest = armoryData?.myPendingRequest ?? null;

  // Flat list: all weapons in one array, sorted: assigned first, then pool, then unassigned
  const allWeapons = useMemo(() => {
    if (!armoryData) return [];
    const assigned = armoryData.assignedWeapons || [];
    const pool = armoryData.poolWeapons || [];
    const unassigned = isCommander ? (armoryData.unassignedWeapons || []) : [];
    return [...assigned, ...pool, ...unassigned];
  }, [armoryData, isCommander]);

  // Realtime
  useWeaponRealtime({
    teamId: activeTeamId || undefined,
    userId: currentUserId,
    enabled: !!activeTeamId,
    onRequestApproved: useCallback(() => loadData(), [loadData]),
    onRequestRejected: useCallback(() => loadData(), [loadData]),
    onWeaponAssigned: useCallback(() => loadData(), [loadData]),
    onWeaponUnassigned: useCallback(() => loadData(), [loadData]),
  });

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

  const handleRequestSuccess = async () => {
    setShowRequestModal(false);
    await loadData();
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleWeaponPress = useCallback((weapon: TeamWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const source = weapon.assigned_to ? 'team_assigned' : weapon.pool_available ? 'team_pool' : 'team_assigned';
    router.push({ pathname: '/(protected)/weaponDetail', params: { weaponId: weapon.id, source } } as any);
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

  const assignedCount = (armoryData?.assignedWeapons || []).length;
  const teamCount = (armoryData?.poolWeapons || []).length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerLabel, { color: colors.textMuted }]}>{activeTeam?.name}</Text>
            <Text style={[s.title, { color: colors.text }]}>{t('navigation.loadout')}</Text>
          </View>
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

        {/* My Weapon (soldier only) */}
        {!isCommander && (
          <View style={s.myWeaponSection}>
            {myWeapon ? (
              <TouchableOpacity
                style={[s.myWeaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => handleWeaponPress(myWeapon)}
                activeOpacity={0.7}
              >
                <View style={[s.myWeaponBadge, { backgroundColor: colors.primary }]}>
                  <ShieldCheck size={12} color="#fff" />
                  <Text style={s.myWeaponBadgeText}>Your Weapon</Text>
                </View>
                <Text style={[s.myWeaponName, { color: colors.text }]}>{myWeapon.name}</Text>
                <Text style={[s.myWeaponMeta, { color: colors.textMuted }]}>
                  {getCategoryLabel(myWeapon.category)}
                  {myWeapon.caliber && ` · ${myWeapon.caliber}`}
                </Text>
              </TouchableOpacity>
            ) : myPendingRequest ? (
              <View style={[s.pendingCard, { backgroundColor: colors.blue + '08', borderColor: colors.blue }]}>
                <View style={s.pendingRow}>
                  <Clock size={13} color={colors.blue} />
                  <Text style={[s.pendingTitle, { color: colors.blue }]}>Request pending</Text>
                </View>
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: colors.destructive }]}
                  onPress={handleCancelRequest}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={colors.destructive} />
                  ) : (
                    <>
                      <X size={12} color={colors.destructive} />
                      <Text style={[s.cancelText, { color: colors.destructive }]}>Cancel</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.requestBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowRequestModal(true)}
                activeOpacity={0.8}
              >
                <Shield size={16} color="#fff" />
                <Text style={s.requestBtnText}>Request a Weapon</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Summary */}
        <View style={s.summaryRow}>
          <Text style={[s.summaryLabel, { color: colors.textMuted }]}>
            {allWeapons.length} weapon{allWeapons.length !== 1 ? 's' : ''}
          </Text>
          <View style={s.summaryDots}>
            {assignedCount > 0 && (
              <View style={s.summaryDot}>
                <User size={9} color={colors.primary} />
                <Text style={[s.summaryDotText, { color: colors.textMuted }]}>{assignedCount} assigned</Text>
              </View>
            )}
            {teamCount > 0 && (
              <View style={s.summaryDot}>
                <Users size={9} color={colors.textMuted} />
                <Text style={[s.summaryDotText, { color: colors.textMuted }]}>{teamCount} team</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weapon List */}
        {allWeapons.length > 0 ? (
          <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {allWeapons.map((weapon, i) => (
              <WeaponRow
                key={weapon.id}
                weapon={weapon}
                isMyWeapon={weapon.assigned_to === currentUserId}
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
            <Text style={[s.emptyTitle, { color: colors.text }]}>No weapons yet</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              {isCommander ? 'Add weapons for your team' : 'Your commander will add weapons'}
            </Text>
            {isCommander && (
              <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={handleAddWeapon}>
                <Plus size={14} color="#fff" />
                <Text style={s.emptyBtnText}>Add Weapon</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {isCommander && (
        <Modal visible={showAddWeapon} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddWeapon(false)}>
          <CreateWeaponFlow onComplete={handleWeaponCreated} onCancel={() => setShowAddWeapon(false)} teamId={activeTeamId || undefined} />
        </Modal>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
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

  // My weapon section (soldier)
  myWeaponSection: {
    marginBottom: 16,
  },
  myWeaponCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  myWeaponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  myWeaponBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  myWeaponName: {
    fontSize: 16,
    fontWeight: '700',
  },
  myWeaponMeta: {
    fontSize: 12,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryDots: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  summaryDotText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // List
  listCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weaponIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  weaponName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  weaponMeta: {
    fontSize: 11,
  },
  assignmentCol: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedName: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 70,
  },
  poolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  poolText: {
    fontSize: 11,
    fontWeight: '500',
  },
  unassignedText: {
    fontSize: 11,
  },

  // Empty
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
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TeamLoadout;
