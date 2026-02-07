/**
 * TeamLoadout Component
 *
 * Unified weapon list for all team roles.
 * - View mode (default): Simple flat list of weapons with assignee. Tap → weapon details.
 * - Edit mode (commander/owner): Inline actions for assign, unassign, pool, add, delete.
 *   Pending requests & contributions visible at top.
 */

import { ApproveRequestModal } from '@/components/weapons/ApproveRequestModal';
import { CreateWeaponFlow } from '@/components/weapons/CreateWeaponFlow';
import { RequestWeaponModal } from '@/components/weapons/RequestWeaponModal';
import { getCategoryConfig } from '@/constants/weaponCategories';
import type { WeaponRequestRecord } from '@/hooks/realtime/records/weapon';
import { useWeaponRealtime } from '@/hooks/realtime/weapon/useWeaponRealtime';
import { useColors } from '@/hooks/ui/useColors';
import { getCurrentUserId } from '@/services/authService';
import { getTeamMembers } from '@/services/teamService';
import {
    approveSharedWeapon,
    assignTeamWeapon,
    cancelWeaponRequest,
    deleteTeamWeapon,
    getArmoryOverview,
    getCategoryLabel,
    rejectSharedWeapon,
    setWeaponPoolAvailable,
    unassignTeamWeapon,
    type ArmoryOverviewData,
    type TeamWeapon,
    type UserWeapon,
    type WeaponRequest,
} from '@/services/weaponService';
import { useTeamStore } from '@/stores/teamStore';
import type { WeaponCategory } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    AlertTriangle,
    Check,
    ChevronRight,
    Clock,
    Crosshair,
    Gift,
    Pencil,
    Plus,
    Shield,
    ShieldCheck,
    Target,
    Trash2,
    User,
    UserMinus,
    UserPlus,
    Users,
    X,
    Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
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

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

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
// WEAPON ROW — VIEW MODE
// ============================================================================

interface WeaponRowViewProps {
  weapon: TeamWeapon;
  isMyWeapon: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaponRowView({ weapon, isMyWeapon, onPress, colors }: WeaponRowViewProps) {
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
// WEAPON ROW — EDIT MODE
// ============================================================================

interface WeaponRowEditProps {
  weapon: TeamWeapon;
  colors: ReturnType<typeof useColors>;
  actionLoading: boolean;
  onPress: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  onAddToPool: () => void;
  onRemoveFromPool: () => void;
  onDelete: () => void;
}

function WeaponRowEdit({
  weapon,
  colors,
  actionLoading,
  onPress,
  onAssign,
  onUnassign,
  onAddToPool,
  onRemoveFromPool,
  onDelete,
}: WeaponRowEditProps) {
  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;
  const isAssigned = !!weapon.assigned_to;
  const isPool = weapon.pool_available && !isAssigned;

  return (
    <View style={[s.weaponRow, { borderBottomColor: colors.border }]}>
      {/* Tap for details */}
      <TouchableOpacity style={s.editRowContent} onPress={onPress} activeOpacity={0.6}>
        <View style={[s.weaponIcon, { backgroundColor: isAssigned ? colors.primary + '10' : colors.secondary }]}>
          {getCategoryIcon(weapon.category, isAssigned ? colors.primary : colors.textMuted)}
        </View>
        <View style={s.weaponInfo}>
          <Text style={[s.weaponName, { color: colors.text }]} numberOfLines={1}>
            {weapon.name}
          </Text>
          <Text style={[s.weaponMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {categoryConfig?.label || 'Weapon'}
            {weapon.caliber ? ` · ${weapon.caliber}` : ''}
            {isAssigned && weapon.assigned_user ? ` · ${weapon.assigned_user.full_name}` : ''}
            {isPool ? ' · Pool' : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={s.editActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            {isAssigned && (
              <TouchableOpacity
                style={[s.editActionBtn, { backgroundColor: colors.destructive + '12' }]}
                onPress={onUnassign}
                hitSlop={4}
              >
                <UserMinus size={13} color={colors.destructive} />
              </TouchableOpacity>
            )}
            {!isAssigned && (
              <TouchableOpacity
                style={[s.editActionBtn, { backgroundColor: colors.primary + '12' }]}
                onPress={onAssign}
                hitSlop={4}
              >
                <UserPlus size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
            {!isPool && !isAssigned && (
              <TouchableOpacity
                style={[s.editActionBtn, { backgroundColor: colors.green + '12' }]}
                onPress={onAddToPool}
                hitSlop={4}
              >
                <Gift size={13} color={colors.green} />
              </TouchableOpacity>
            )}
            {isPool && (
              <TouchableOpacity
                style={[s.editActionBtn, { backgroundColor: colors.muted }]}
                onPress={onRemoveFromPool}
                hitSlop={4}
              >
                <X size={11} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.editActionBtn, { backgroundColor: colors.destructive + '08' }]}
              onPress={onDelete}
              hitSlop={4}
            >
              <Trash2 size={12} color={colors.destructive} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// PENDING REQUEST ROW (edit mode)
// ============================================================================

function PendingRequestRow({
  request,
  colors,
  onReview,
}: {
  request: WeaponRequest;
  colors: ReturnType<typeof useColors>;
  onReview: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.pendingRow, { borderBottomColor: colors.border }]}
      onPress={onReview}
      activeOpacity={0.7}
    >
      <View style={[s.pendingIcon, { backgroundColor: colors.yellow + '15' }]}>
        <AlertTriangle size={13} color={colors.yellow} />
      </View>
      <View style={s.weaponInfo}>
        <Text style={[s.weaponName, { color: colors.text }]}>
          {request.user?.full_name || 'Unknown'}
        </Text>
        <Text style={[s.weaponMeta, { color: colors.textMuted }]}>
          Weapon request{request.weapon_category ? ` · ${getCategoryLabel(request.weapon_category)}` : ''}
        </Text>
      </View>
      <ChevronRight size={13} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ============================================================================
// PENDING CONTRIBUTION ROW (edit mode)
// ============================================================================

function PendingContributionRow({
  weapon,
  colors,
  onApprove,
  onReject,
  actionLoading,
}: {
  weapon: UserWeapon & { user?: { id: string; full_name: string; avatar_url: string | null } };
  colors: ReturnType<typeof useColors>;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <View style={[s.pendingRow, { borderBottomColor: colors.border }]}>
      <View style={[s.pendingIcon, { backgroundColor: colors.yellow + '12' }]}>
        <Gift size={13} color={colors.yellow} />
      </View>
      <View style={s.weaponInfo}>
        <Text style={[s.weaponName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[s.weaponMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` · ${weapon.caliber}`}
          {weapon.user && ` · from ${weapon.user.full_name}`}
        </Text>
      </View>
      <View style={s.contributionActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[s.editActionBtn, { backgroundColor: colors.destructive + '12' }]}
              onPress={onReject}
              hitSlop={4}
            >
              <X size={12} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.editActionBtn, { backgroundColor: colors.green }]}
              onPress={onApprove}
            >
              <Check size={12} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// MEMBER PICKER MODAL
// ============================================================================

function MemberPickerModal({
  visible,
  weapon,
  members,
  existingAssignments,
  colors,
  onSelect,
  onClose,
}: {
  visible: boolean;
  weapon: TeamWeapon | null;
  members: TeamMember[];
  existingAssignments: Map<string, string>;
  colors: ReturnType<typeof useColors>;
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!weapon) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {t('weapons.assignTo', { name: weapon.name })}
          </Text>
          <View style={{ width: 18 }} />
        </View>

        <Text style={[s.pickerHint, { color: colors.textMuted }]}>{t('weapons.selectMember')}</Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const existingWeapon = existingAssignments.get(item.id);
            const hasWeapon = !!existingWeapon;

            return (
              <View>
                <TouchableOpacity
                  style={[s.pickerRow, { opacity: hasWeapon ? 0.5 : 1 }]}
                  onPress={() => {
                    if (hasWeapon) {
                      Alert.alert(
                        t('weapons.alreadyAssignedTitle'),
                        t('weapons.alreadyAssignedMessage', { member: item.full_name, weapon: existingWeapon }),
                        [{ text: t('common.ok') }]
                      );
                    } else {
                      onSelect(item.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[s.pickerAvatar, { backgroundColor: hasWeapon ? colors.muted : colors.primary + '12' }]}>
                    <User size={14} color={hasWeapon ? colors.textMuted : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerName, { color: hasWeapon ? colors.textMuted : colors.text }]}>
                      {item.full_name}
                    </Text>
                    {hasWeapon && (
                      <Text style={[s.pickerSub, { color: colors.textMuted }]}>Has: {existingWeapon}</Text>
                    )}
                  </View>
                  {!hasWeapon && <ChevronRight size={14} color={colors.textMuted} />}
                </TouchableOpacity>
                {index < members.length - 1 && (
                  <View style={[s.pickerDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            );
          }}
          contentContainerStyle={s.pickerList}
          style={[s.pickerListCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        />
      </View>
    </Modal>
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

  // Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [armoryData, setArmoryData] = useState<ArmoryOverviewData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // UI state
  const [editMode, setEditMode] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedWeaponForAssign, setSelectedWeaponForAssign] = useState<TeamWeapon | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<WeaponRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  const loadData = useCallback(async () => {
    if (!activeTeamId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [data, members] = await Promise.all([
        getArmoryOverview(activeTeamId),
        isCommander ? getTeamMembers(activeTeamId) : Promise.resolve([]),
      ]);
      setArmoryData(data);
      setTeamMembers(
        members.map((m: any) => ({
          id: m.user_id,
          full_name: m.profile?.full_name || 'Unknown',
          avatar_url: m.profile?.avatar_url,
        }))
      );
    } catch (error) {
      console.error('[TeamLoadout] Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTeamId, isCommander]);

  // Derived data
  const myWeapon = armoryData?.myAssignment ?? null;
  const myPendingRequest = armoryData?.myPendingRequest ?? null;

  // Flat weapon list: assigned → pool → unassigned
  const allWeapons = useMemo(() => {
    if (!armoryData) return [];
    const assigned = armoryData.assignedWeapons || [];
    const pool = armoryData.poolWeapons || [];
    const unassigned = isCommander ? (armoryData.unassignedWeapons || []) : [];
    return [...assigned, ...pool, ...unassigned];
  }, [armoryData, isCommander]);

  // Build assignment map for member picker
  const existingAssignments = useMemo(() => {
    const map = new Map<string, string>();
    armoryData?.assignedWeapons.forEach((w) => {
      if (w.assigned_to) map.set(w.assigned_to, w.name);
    });
    return map;
  }, [armoryData]);

  // Available weapons for approve modal
  const availableForApproval = useMemo(() => {
    return [...(armoryData?.unassignedWeapons || []), ...(armoryData?.poolWeapons || [])];
  }, [armoryData]);

  // Counts
  const pendingCount = (armoryData?.pendingRequests.length || 0) + (armoryData?.pendingContributions.length || 0);
  const assignedCount = (armoryData?.assignedWeapons || []).length;
  const teamPoolCount = (armoryData?.poolWeapons || []).length;

  // Realtime
  useWeaponRealtime({
    teamId: activeTeamId || undefined,
    userId: currentUserId,
    enabled: !!activeTeamId,
    onNewRequest: useCallback(
      async (_request: WeaponRequestRecord) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await loadData();
      },
      [loadData]
    ),
    onRequestApproved: useCallback(() => loadData(), [loadData]),
    onRequestRejected: useCallback(() => loadData(), [loadData]),
    onWeaponAssigned: useCallback(() => loadData(), [loadData]),
    onWeaponUnassigned: useCallback(() => loadData(), [loadData]),
    onRequestChange: useCallback(() => loadData(), [loadData]),
    onWeaponChange: useCallback(() => loadData(), [loadData]),
  });

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const handleWeaponPress = useCallback((weapon: TeamWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const source = weapon.assigned_to ? 'team_assigned' : weapon.pool_available ? 'team_pool' : 'team_assigned';
    router.push({ pathname: '/(protected)/weaponDetail', params: { weaponId: weapon.id, source } } as any);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COMMANDER ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAssign = async (weaponId: string, userId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await assignTeamWeapon(weaponId, userId);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to assign weapon');
    } finally {
      setActionLoading(null);
      setSelectedWeaponForAssign(null);
    }
  };

  const handleUnassign = async (weaponId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await unassignTeamWeapon(weaponId);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to unassign weapon');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToPool = async (weaponId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setWeaponPoolAvailable(weaponId, true);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to add to pool');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromPool = async (weaponId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setWeaponPoolAvailable(weaponId, false);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to remove from pool');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWeapon = (weapon: TeamWeapon) => {
    Alert.alert(
      'Delete Weapon',
      `Remove "${weapon.name}" from the team? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(weapon.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await deleteTeamWeapon(weapon.id);
              await loadData();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || 'Failed to delete weapon');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleApproveContribution = async (userWeaponId: string) => {
    if (!activeTeamId) return;
    try {
      setActionLoading(userWeaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await approveSharedWeapon(userWeaponId, activeTeamId);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectContribution = async (userWeaponId: string) => {
    try {
      setActionLoading(userWeaponId);
      await rejectSharedWeapon(userWeaponId);
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

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

  const handleAddWeapon = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddWeapon(true);
  }, []);

  const handleWeaponCreated = useCallback(async () => {
    setShowAddWeapon(false);
    await loadData();
  }, [loadData]);

  const handleRequestSuccess = async () => {
    setShowRequestModal(false);
    await loadData();
  };

  const toggleEditMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditMode((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerLabel, { color: colors.textMuted }]}>{activeTeam?.name}</Text>
            <Text style={[s.title, { color: colors.text }]}>{t('navigation.loadout')}</Text>
          </View>
          <View style={s.headerActions}>
            {isCommander && (
              <>
                {editMode && (
                  <TouchableOpacity
                    style={[s.addBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddWeapon}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    s.editToggleBtn,
                    {
                      backgroundColor: editMode ? colors.primary : colors.card,
                      borderColor: editMode ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={toggleEditMode}
                  activeOpacity={0.7}
                >
                  {editMode ? (
                    <Text style={[s.editToggleText, { color: '#fff' }]}>Done</Text>
                  ) : (
                    <Pencil size={15} color={colors.text} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* My Weapon (soldier only, view mode) */}
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
                <View style={s.pendingCardRow}>
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

        {/* Pending Requests & Contributions (edit mode only) */}
        {isCommander && editMode && pendingCount > 0 && (
          <View style={s.pendingSection}>
            <View style={s.sectionLabelRow}>
              <Text style={[s.sectionLabel, { color: colors.yellow }]}>
                PENDING ({pendingCount})
              </Text>
            </View>
            <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.yellow + '40' }]}>
              {/* Weapon requests */}
              {(armoryData?.pendingRequests || []).map((req) => (
                <PendingRequestRow
                  key={req.id}
                  request={req}
                  colors={colors}
                  onReview={() => setSelectedRequestForReview(req)}
                />
              ))}
              {/* Weapon contributions */}
              {(armoryData?.pendingContributions || []).map((w) => (
                <PendingContributionRow
                  key={w.id}
                  weapon={w as any}
                  colors={colors}
                  onApprove={() => handleApproveContribution(w.id)}
                  onReject={() => handleRejectContribution(w.id)}
                  actionLoading={actionLoading === w.id}
                />
              ))}
            </View>
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
            {teamPoolCount > 0 && (
              <View style={s.summaryDot}>
                <Users size={9} color={colors.textMuted} />
                <Text style={[s.summaryDotText, { color: colors.textMuted }]}>{teamPoolCount} team</Text>
              </View>
            )}
            {isCommander && pendingCount > 0 && !editMode && (
              <TouchableOpacity style={s.summaryDot} onPress={toggleEditMode}>
                <AlertTriangle size={9} color={colors.yellow} />
                <Text style={[s.summaryDotText, { color: colors.yellow }]}>{pendingCount} pending</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Weapon List */}
        {allWeapons.length > 0 ? (
          <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {allWeapons.map((weapon) =>
              editMode && isCommander ? (
                <WeaponRowEdit
                  key={weapon.id}
                  weapon={weapon}
                  colors={colors}
                  actionLoading={actionLoading === weapon.id}
                  onPress={() => handleWeaponPress(weapon)}
                  onAssign={() => setSelectedWeaponForAssign(weapon)}
                  onUnassign={() => handleUnassign(weapon.id)}
                  onAddToPool={() => handleAddToPool(weapon.id)}
                  onRemoveFromPool={() => handleRemoveFromPool(weapon.id)}
                  onDelete={() => handleDeleteWeapon(weapon)}
                />
              ) : (
                <WeaponRowView
                  key={weapon.id}
                  weapon={weapon}
                  isMyWeapon={weapon.assigned_to === currentUserId}
                  onPress={() => handleWeaponPress(weapon)}
                  colors={colors}
                />
              )
            )}
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

      {/* ── Modals ── */}

      {/* Add Weapon (commander) */}
      {isCommander && (
        <Modal visible={showAddWeapon} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddWeapon(false)}>
          <CreateWeaponFlow onComplete={handleWeaponCreated} onCancel={() => setShowAddWeapon(false)} teamId={activeTeamId || undefined} />
        </Modal>
      )}

      {/* Request Weapon (soldier) */}
      {!isCommander && (
        <RequestWeaponModal
          visible={showRequestModal}
          teamId={activeTeamId || ''}
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}

      {/* Member Picker (commander, assign weapon) */}
      <MemberPickerModal
        visible={!!selectedWeaponForAssign}
        weapon={selectedWeaponForAssign}
        members={teamMembers}
        existingAssignments={existingAssignments}
        colors={colors}
        onSelect={(userId) => selectedWeaponForAssign && handleAssign(selectedWeaponForAssign.id, userId)}
        onClose={() => setSelectedWeaponForAssign(null)}
      />

      {/* Approve Request (commander) */}
      <ApproveRequestModal
        visible={!!selectedRequestForReview}
        request={selectedRequestForReview}
        availableWeapons={availableForApproval}
        onClose={() => setSelectedRequestForReview(null)}
        onSuccess={loadData}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggleBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
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
  pendingCardRow: {
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

  // Pending section (edit mode)
  pendingSection: {
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributionActions: {
    flexDirection: 'row',
    gap: 6,
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
  editRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
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

  // Edit mode actions
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerHint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerListCard: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerList: {
    paddingVertical: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  pickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  pickerDivider: {
    height: 1,
    marginLeft: 62,
  },
});

export default TeamLoadout;
