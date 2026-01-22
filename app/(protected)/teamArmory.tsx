/**
 * Team Armory Screen
 *
 * Full-screen weapon management with role-based views:
 * - Commander: Full management (assignments, pool, requests, contributions)
 * - Soldier: View assignment, pool weapons, request weapon
 */

import { ApproveRequestModal, RequestWeaponModal } from '@/components/weapons';
import { useWeaponRealtime, type WeaponRequestRecord } from '@/hooks/realtime';
import { useColors } from '@/hooks/ui/useColors';
import { notifyWeaponRequested } from '@/services/notifications';
import {
  approveSharedWeapon,
  assignTeamWeapon,
  cancelWeaponRequest,
  createTeamWeapon,
  getArmoryOverview,
  getCategoryLabel,
  getGlobalWeapons,
  rejectSharedWeapon,
  setWeaponPoolAvailable,
  unassignTeamWeapon,
  WEAPON_CATEGORIES,
  type ArmoryOverviewData,
  type GlobalWeapon,
  type TeamWeapon,
  type UserWeapon,
  type WeaponRequest,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { getTeamMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type ArmoryTab = 'weapons' | 'members' | 'requests';

// ============================================================================
// TAB BAR COMPONENT
// ============================================================================

function TabBar({
  activeTab,
  onTabChange,
  requestCount,
  unassignedCount,
  colors,
}: {
  activeTab: ArmoryTab;
  onTabChange: (tab: ArmoryTab) => void;
  requestCount: number;
  unassignedCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const tabs: { id: ArmoryTab; label: string; badge?: number }[] = [
    { id: 'weapons', label: 'Weapons' },
    { id: 'members', label: 'Members', badge: unassignedCount > 0 ? unassignedCount : undefined },
    { id: 'requests', label: 'Requests', badge: requestCount > 0 ? requestCount : undefined },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tab.id);
            }}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && (
              <View style={[styles.tabBadge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

function SectionHeader({
  title,
  icon,
  count,
  colors,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  colors: ReturnType<typeof useColors>;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// WEAPON CARD COMPONENT
// ============================================================================

function WeaponCard({
  weapon,
  colors,
  isAssigned,
  isPool,
  showAssignedUser,
  onUnassign,
  onAssign,
  onAddToPool,
  onRemoveFromPool,
  actionLoading,
}: {
  weapon: TeamWeapon;
  colors: ReturnType<typeof useColors>;
  isAssigned?: boolean;
  isPool?: boolean;
  showAssignedUser?: boolean;
  onUnassign?: () => void;
  onAssign?: () => void;
  onAddToPool?: () => void;
  onRemoveFromPool?: () => void;
  actionLoading?: boolean;
}) {
  return (
    <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.weaponInfo}>
        <Text style={[styles.weaponName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` \u2022 ${weapon.caliber}`}
        </Text>
        {showAssignedUser && weapon.assigned_user && (
          <View style={styles.assignedUserRow}>
            <User size={12} color={colors.textMuted} />
            <Text style={[styles.assignedUserName, { color: colors.textMuted }]}>
              {weapon.assigned_user.full_name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.weaponActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            {isAssigned && onUnassign && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                onPress={onUnassign}
              >
                <UserMinus size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
            {!isAssigned && onAssign && (
              <TouchableOpacity
                style={[styles.assignBtn, { backgroundColor: colors.primary }]}
                onPress={onAssign}
              >
                <UserPlus size={14} color="#fff" />
                <Text style={styles.assignBtnText}>Assign</Text>
              </TouchableOpacity>
            )}
            {isPool && onRemoveFromPool && (
              <TouchableOpacity
                style={[styles.poolBtn, { backgroundColor: colors.muted }]}
                onPress={onRemoveFromPool}
              >
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {!isPool && !isAssigned && onAddToPool && (
              <TouchableOpacity
                style={[styles.poolBtn, { backgroundColor: colors.green + '20' }]}
                onPress={onAddToPool}
              >
                <Gift size={14} color={colors.green} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// PENDING REQUEST CARD COMPONENT
// ============================================================================

function PendingRequestCard({
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
      style={[styles.requestCard, { backgroundColor: colors.yellow + '10', borderColor: colors.yellow }]}
      onPress={onReview}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <AlertTriangle size={14} color={colors.yellow} />
        <Text style={[styles.requestLabel, { color: colors.yellow }]}>Weapon Request</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={[styles.requestUser, { color: colors.text }]}>
          {request.user?.full_name || 'Unknown'}
        </Text>
        {request.weapon_category && (
          <View style={[styles.categoryTag, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.categoryTagText, { color: colors.primary }]}>
              {getCategoryLabel(request.weapon_category)}
            </Text>
          </View>
        )}
      </View>
      <ChevronRight size={18} color={colors.textMuted} style={styles.requestChevron} />
    </TouchableOpacity>
  );
}

// ============================================================================
// PENDING CONTRIBUTION CARD COMPONENT
// ============================================================================

function PendingContributionCard({
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
    <View style={[styles.contributionCard, { backgroundColor: colors.card, borderColor: colors.yellow }]}>
      <View style={styles.contributionHeader}>
        <Gift size={14} color={colors.yellow} />
        <Text style={[styles.contributionLabel, { color: colors.yellow }]}>Weapon Contribution</Text>
      </View>
      <View style={styles.weaponInfo}>
        <Text style={[styles.weaponName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` \u2022 ${weapon.caliber}`}
        </Text>
        {weapon.user && (
          <Text style={[styles.contributorName, { color: colors.textMuted }]}>
            From: {weapon.user.full_name}
          </Text>
        )}
      </View>
      <View style={styles.contributionActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.rejectSmallBtn, { backgroundColor: colors.muted }]}
              onPress={onReject}
            >
              <X size={16} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveSmallBtn, { backgroundColor: colors.green }]}
              onPress={onApprove}
            >
              <Check size={16} color="#fff" />
              <Text style={styles.approveSmallText}>Approve</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// MY ASSIGNMENT CARD (SOLDIER VIEW)
// ============================================================================

function MyAssignmentCard({
  weapon,
  colors,
  onRequestWeapon,
  hasPendingRequest,
}: {
  weapon: TeamWeapon | null;
  colors: ReturnType<typeof useColors>;
  onRequestWeapon?: () => void;
  hasPendingRequest?: boolean;
}) {
  if (!weapon) {
    return (
      <View style={[styles.noAssignmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.noAssignmentIcon, { backgroundColor: colors.primary + '15' }]}>
          <Shield size={32} color={colors.primary} />
        </View>
        <Text style={[styles.noAssignmentTitle, { color: colors.text }]}>
          Get Ready for Training
        </Text>
        <Text style={[styles.noAssignmentHint, { color: colors.textMuted }]}>
          Request a weapon to participate in team drills and track your progress.
        </Text>
        {!hasPendingRequest && onRequestWeapon && (
          <TouchableOpacity
            style={[styles.noAssignmentCta, { backgroundColor: colors.primary }]}
            onPress={onRequestWeapon}
            activeOpacity={0.8}
          >
            <Text style={styles.noAssignmentCtaText}>Request a Weapon</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.myAssignmentCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={[styles.myAssignmentBadge, { backgroundColor: colors.primary }]}>
        <ShieldCheck size={16} color="#fff" />
        <Text style={styles.myAssignmentBadgeText}>Your Assigned Weapon</Text>
      </View>
      <Text style={[styles.myAssignmentName, { color: colors.text }]}>{weapon.name}</Text>
      <Text style={[styles.myAssignmentMeta, { color: colors.textMuted }]}>
        {getCategoryLabel(weapon.category)}
        {weapon.caliber && ` \u2022 ${weapon.caliber}`}
      </Text>
    </View>
  );
}

// ============================================================================
// MY PENDING REQUEST (SOLDIER VIEW)
// ============================================================================

function MyPendingRequestCard({
  request,
  colors,
  onCancel,
  cancelling,
}: {
  request: WeaponRequest;
  colors: ReturnType<typeof useColors>;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <View style={[styles.myRequestCard, { backgroundColor: colors.yellow + '10', borderColor: colors.yellow }]}>
      <View style={styles.myRequestHeader}>
        <Clock size={16} color={colors.yellow} />
        <Text style={[styles.myRequestTitle, { color: colors.yellow }]}>Request Pending</Text>
      </View>
      <Text style={[styles.myRequestText, { color: colors.text }]}>
        Your weapon request is awaiting commander review
      </Text>
      {request.weapon_category && (
        <Text style={[styles.myRequestPreference, { color: colors.textMuted }]}>
          Preferred: {getCategoryLabel(request.weapon_category)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.cancelRequestBtn, { borderColor: colors.destructive }]}
        onPress={onCancel}
        disabled={cancelling}
      >
        {cancelling ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <Text style={[styles.cancelRequestText, { color: colors.destructive }]}>
            Cancel Request
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// ADD WEAPON MODAL
// ============================================================================

function AddWeaponModal({
  visible,
  teamId,
  colors,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  teamId: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'choose' | 'catalog' | 'custom'>('choose');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<WeaponCategory | null>(null);
  const [allCatalogWeapons, setAllCatalogWeapons] = useState<GlobalWeapon[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogWeapon, setSelectedCatalogWeapon] = useState<GlobalWeapon | null>(null);

  const [newWeaponName, setNewWeaponName] = useState('');
  const [newWeaponCategory, setNewWeaponCategory] = useState<WeaponCategory>('rifle');
  const [newWeaponCaliber, setNewWeaponCaliber] = useState('');
  const [newWeaponSerial, setNewWeaponSerial] = useState('');
  const [creating, setCreating] = useState(false);

  const resetModal = () => {
    setStep('choose');
    setCatalogSearch('');
    setCatalogCategory(null);
    setSelectedCatalogWeapon(null);
    setNewWeaponName('');
    setNewWeaponCategory('rifle');
    setNewWeaponCaliber('');
    setNewWeaponSerial('');
    onClose();
  };

  const loadCatalog = useCallback(async () => {
    if (allCatalogWeapons.length > 0) return;
    try {
      setCatalogLoading(true);
      const weapons = await getGlobalWeapons();
      setAllCatalogWeapons(weapons);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  }, [allCatalogWeapons.length]);

  const filteredCatalog = allCatalogWeapons.filter((w) => {
    // Category filter
    if (catalogCategory && w.category !== catalogCategory) return false;
    // Search filter
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.manufacturer?.toLowerCase().includes(q) ||
      w.caliber?.toLowerCase().includes(q)
    );
  });

  // Group weapons by manufacturer for better organization
  const groupedByManufacturer = filteredCatalog.reduce(
    (acc, weapon) => {
      const key = weapon.manufacturer || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(weapon);
      return acc;
    },
    {} as Record<string, GlobalWeapon[]>
  );

  // Sort manufacturers alphabetically, with 'Other' at the end
  const sortedManufacturers = Object.keys(groupedByManufacturer).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const handleSelectCatalog = (weapon: GlobalWeapon) => {
    setSelectedCatalogWeapon(weapon);
    setNewWeaponName(weapon.name);
    setNewWeaponCategory(weapon.category);
    setNewWeaponCaliber(weapon.caliber || '');
    setStep('custom');
  };

  const handleCreate = async () => {
    if (!newWeaponName.trim()) {
      Alert.alert('Error', 'Weapon name is required');
      return;
    }
    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createTeamWeapon({
        team_id: teamId,
        base_weapon_id: selectedCatalogWeapon?.id,
        name: newWeaponName.trim(),
        category: newWeaponCategory,
        caliber: newWeaponCaliber.trim() || undefined,
        serial_number: newWeaponSerial.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
      resetModal();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create weapon');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetModal}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={resetModal}>
            <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {step === 'choose' ? 'Add Weapon' : step === 'catalog' ? 'Search Catalog' : 'Weapon Details'}
          </Text>
          {step === 'custom' ? (
            <TouchableOpacity onPress={handleCreate} disabled={creating || !newWeaponName.trim()}>
              {creating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: newWeaponName.trim() ? colors.primary : colors.textMuted }]}>
                  Add
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {step === 'choose' && (
          <View style={styles.chooseContainer}>
            <TouchableOpacity
              style={[styles.chooseOption, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setStep('catalog');
                loadCatalog();
              }}
            >
              <View style={[styles.chooseIcon, { backgroundColor: colors.primary + '15' }]}>
                <Search size={22} color={colors.primary} />
              </View>
              <View style={styles.chooseContent}>
                <Text style={[styles.chooseTitle, { color: colors.text }]}>From Catalog</Text>
                <Text style={[styles.chooseDesc, { color: colors.textMuted }]}>Browse known weapons</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chooseOption, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setStep('custom')}
            >
              <View style={[styles.chooseIcon, { backgroundColor: colors.green + '15' }]}>
                <Plus size={22} color={colors.green} />
              </View>
              <View style={styles.chooseContent}>
                <Text style={[styles.chooseTitle, { color: colors.text }]}>Custom Weapon</Text>
                <Text style={[styles.chooseDesc, { color: colors.textMuted }]}>Create from scratch</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {step === 'catalog' && (
          <View style={styles.catalogContainer}>
            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, manufacturer, or caliber..."
                placeholderTextColor={colors.textMuted}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                autoFocus
              />
              {catalogSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCatalogSearch('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catalogFilterScroll}
              contentContainerStyle={styles.catalogFilterContent}
            >
              <TouchableOpacity
                style={[
                  styles.catalogFilterChip,
                  {
                    backgroundColor: !catalogCategory ? colors.text : colors.card,
                    borderColor: !catalogCategory ? colors.text : colors.border,
                  },
                ]}
                onPress={() => setCatalogCategory(null)}
              >
                <Text style={[styles.catalogFilterText, { color: !catalogCategory ? colors.background : colors.text }]}>
                  All
                </Text>
              </TouchableOpacity>
              {WEAPON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.catalogFilterChip,
                    {
                      backgroundColor: catalogCategory === cat.value ? colors.text : colors.card,
                      borderColor: catalogCategory === cat.value ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => setCatalogCategory(catalogCategory === cat.value ? null : cat.value)}
                >
                  <Text
                    style={[
                      styles.catalogFilterText,
                      { color: catalogCategory === cat.value ? colors.background : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Results count */}
            {!catalogLoading && (
              <View style={styles.catalogResultsHeader}>
                <Text style={[styles.catalogResultsCount, { color: colors.textMuted }]}>
                  {filteredCatalog.length} weapon{filteredCatalog.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            )}

            {catalogLoading ? (
              <View style={styles.catalogLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.catalogLoadingText, { color: colors.textMuted }]}>Loading catalog...</Text>
              </View>
            ) : filteredCatalog.length === 0 ? (
              <View style={styles.catalogEmptyContainer}>
                <View style={[styles.catalogEmptyIcon, { backgroundColor: colors.card }]}>
                  <Search size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.catalogEmptyTitle, { color: colors.text }]}>
                  {catalogSearch || catalogCategory ? 'No matches found' : 'No weapons in catalog'}
                </Text>
                <Text style={[styles.catalogEmptyDesc, { color: colors.textMuted }]}>
                  {catalogSearch || catalogCategory
                    ? 'Try adjusting your search or filters'
                    : 'The weapon catalog is empty'}
                </Text>
                <TouchableOpacity
                  style={[styles.catalogEmptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setStep('custom')}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.catalogEmptyBtnText}>Create Custom Weapon</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.catalogScrollView} contentContainerStyle={styles.catalogList}>
                {sortedManufacturers.map((manufacturer) => (
                  <View key={manufacturer} style={styles.catalogManufacturerGroup}>
                    <Text style={[styles.catalogManufacturerTitle, { color: colors.textMuted }]}>
                      {manufacturer.toUpperCase()}
                    </Text>
                    {groupedByManufacturer[manufacturer].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.catalogItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => handleSelectCatalog(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catalogItemIcon, { backgroundColor: colors.primary + '15' }]}>
                          <Shield size={18} color={colors.primary} />
                        </View>
                        <View style={styles.catalogInfo}>
                          <Text style={[styles.catalogName, { color: colors.text }]}>{item.name}</Text>
                          <View style={styles.catalogMetaRow}>
                            <View style={[styles.catalogCategoryBadge, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.catalogCategoryText, { color: colors.textMuted }]}>
                                {getCategoryLabel(item.category)}
                              </Text>
                            </View>
                            {item.caliber && (
                              <Text style={[styles.catalogCaliberText, { color: colors.textMuted }]}>
                                {item.caliber}
                              </Text>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Skip to custom */}
            {filteredCatalog.length > 0 && (
              <TouchableOpacity
                style={[styles.skipCatalog, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setStep('custom')}
              >
                <Plus size={16} color={colors.textMuted} />
                <Text style={[styles.skipCatalogText, { color: colors.text }]}>Create custom weapon instead</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 'custom' && (
          <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
            {selectedCatalogWeapon && (
              <View style={[styles.basedOnBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.basedOnText, { color: colors.primary }]}>
                  Based on: {selectedCatalogWeapon.name}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>NAME *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newWeaponName}
                onChangeText={setNewWeaponName}
                placeholder="e.g., Team Rifle #1"
                placeholderTextColor={colors.textMuted}
                autoFocus={!selectedCatalogWeapon}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <View style={styles.categoryRow}>
                  {WEAPON_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: newWeaponCategory === cat.value ? colors.primary : colors.card,
                          borderColor: newWeaponCategory === cat.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setNewWeaponCategory(cat.value)}
                    >
                      <Text
                        style={[styles.categoryChipText, { color: newWeaponCategory === cat.value ? '#fff' : colors.text }]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>CALIBER</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newWeaponCaliber}
                onChangeText={setNewWeaponCaliber}
                placeholder="e.g., 7.62x51mm"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>SERIAL NUMBER</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newWeaponSerial}
                onChangeText={setNewWeaponSerial}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
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
  if (!weapon) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Assign {weapon.name}</Text>
          <View style={{ width: 20 }} />
        </View>

        <Text style={[styles.memberPickerHint, { color: colors.textMuted }]}>
          Select a team member (1 weapon per member)
        </Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const existingWeapon = existingAssignments.get(item.id);
            const hasWeapon = !!existingWeapon;

            return (
              <TouchableOpacity
                style={[
                  styles.memberItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: hasWeapon ? 0.5 : 1,
                  },
                ]}
                onPress={() => {
                  if (hasWeapon) {
                    Alert.alert(
                      'Already Assigned',
                      `${item.full_name} already has "${existingWeapon}" assigned.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    onSelect(item.id);
                  }
                }}
              >
                <User size={18} color={hasWeapon ? colors.textMuted : colors.text} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: hasWeapon ? colors.textMuted : colors.text }]}>
                    {item.full_name}
                  </Text>
                  {hasWeapon && (
                    <Text style={[styles.memberWeapon, { color: colors.textMuted }]}>Has: {existingWeapon}</Text>
                  )}
                </View>
                {!hasWeapon && <ChevronRight size={18} color={colors.textMuted} />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.memberList}
        />
      </View>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeamArmoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams } = useTeamStore();

  const team = teams.find((t) => t.id === teamId);
  const isCommander = team?.my_role === 'owner' || team?.my_role === 'commander';

  // Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ArmoryOverviewData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Tab state (commander only)
  const [activeTab, setActiveTab] = useState<ArmoryTab>('weapons');

  // Modal state
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedWeaponForAssign, setSelectedWeaponForAssign] = useState<TeamWeapon | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<WeaponRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    try {
      const [overview, members] = await Promise.all([
        getArmoryOverview(teamId),
        isCommander ? getTeamMembers(teamId) : Promise.resolve([]),
      ]);
      setData(overview);
      setTeamMembers(
        members.map((m: any) => ({
          id: m.user_id,
          full_name: m.profile?.full_name || 'Unknown',
          avatar_url: m.profile?.avatar_url,
        }))
      );
    } catch (err) {
      console.error('Failed to load armory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId, isCommander]);

  useEffect(() => {
    // Reset data when teamId changes to prevent showing stale data
    setData(null);
    setTeamMembers([]);
    setLoading(true);
    loadData();
  }, [loadData]);

  // Real-time updates for weapon requests and assignments
  useWeaponRealtime({
    teamId,
    enabled: isCommander, // Only commanders need real-time request notifications
    onNewRequest: useCallback(async (request: WeaponRequestRecord) => {
      console.log('[TeamArmory] Realtime: New weapon request!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Refresh data first to get full request details including user name
      await loadData();
      // Send notification to commander
      if (teamId && team?.name) {
        // Find the requester's name from the refreshed data
        const requestData = data?.pendingRequests?.find(r => r.id === request.id);
        const requesterName = (requestData as any)?.user?.full_name || 'A team member';
        notifyWeaponRequested(teamId, team.name, requesterName);
      }
    }, [loadData, teamId, team?.name, data?.pendingRequests]),
    onRequestChange: useCallback(() => {
      // Any request change - refresh silently
      loadData();
    }, [loadData]),
    onWeaponChange: useCallback(() => {
      // Any weapon change (assignment, pool status) - refresh
      loadData();
    }, [loadData]),
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Build assignment map for member picker
  const existingAssignments = new Map<string, string>();
  data?.assignedWeapons.forEach((w) => {
    if (w.assigned_to) {
      existingAssignments.set(w.assigned_to, w.name);
    }
  });

  // Actions
  const handleAssign = async (weaponId: string, userId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await assignTeamWeapon(weaponId, userId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign weapon');
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
      Alert.alert('Error', err.message || 'Failed to unassign weapon');
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
      Alert.alert('Error', err.message || 'Failed to add to pool');
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
      Alert.alert('Error', err.message || 'Failed to remove from pool');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveContribution = async (userWeaponId: string) => {
    if (!teamId) return;
    try {
      setActionLoading(userWeaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await approveSharedWeapon(userWeaponId, teamId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve contribution');
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
      Alert.alert('Error', err.message || 'Failed to reject contribution');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!data?.myPendingRequest) return;
    try {
      setCancelling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cancelWeaponRequest(data.myPendingRequest.id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  // Calculate stats
  const totalWeapons =
    (data?.assignedWeapons.length || 0) + (data?.poolWeapons.length || 0) + (data?.unassignedWeapons.length || 0);
  const assignedCount = data?.assignedWeapons.length || 0;
  const poolCount = data?.poolWeapons.length || 0;
  const pendingCount = (data?.pendingRequests.length || 0) + (data?.pendingContributions.length || 0);

  // Calculate which members have weapons assigned
  const membersWithWeapons = new Set<string>(
    data?.assignedWeapons
      .filter((w) => w.assigned_to)
      .map((w) => w.assigned_to!) || []
  );

  // Calculate unassigned members (members without a weapon)
  const unassignedMembers = teamMembers.filter((m) => !membersWithWeapons.has(m.id));
  const assignedMembers = teamMembers.filter((m) => membersWithWeapons.has(m.id));

  // Unassigned weapons for approve modal
  const unassignedForApproval = [...(data?.unassignedWeapons || []), ...(data?.poolWeapons || [])];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team Armory</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{team?.name}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <RefreshCw size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {isCommander ? (
          // ============ COMMANDER VIEW ============
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard
                label="Total"
                value={totalWeapons}
                icon={<Shield size={18} color={colors.primary} />}
                colors={colors}
              />
              <StatCard
                label="Assigned"
                value={assignedCount}
                icon={<Users size={18} color={colors.green} />}
                colors={colors}
              />
              <StatCard
                label="Pool"
                value={poolCount}
                icon={<Gift size={18} color={colors.yellow} />}
                colors={colors}
              />
              <StatCard
                label="Pending"
                value={pendingCount}
                icon={<Clock size={18} color={colors.destructive} />}
                colors={colors}
              />
            </View>

            {/* Tab Bar */}
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              requestCount={data?.pendingRequests.length || 0}
              unassignedCount={unassignedMembers.length}
              colors={colors}
            />

            {/* ========== WEAPONS TAB ========== */}
            {activeTab === 'weapons' && (
              <>
                {/* Add Weapon Button */}
                <TouchableOpacity
                  style={[styles.addWeaponBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddWeapon(true)}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.addWeaponText}>Add Team Weapon</Text>
                </TouchableOpacity>

                {/* Pending Contributions */}
                {data && data.pendingContributions.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Pending Contributions"
                      icon={<Gift size={14} color={colors.yellow} />}
                      count={data.pendingContributions.length}
                      colors={colors}
                    />
                    {data.pendingContributions.map((w) => (
                      <PendingContributionCard
                        key={w.id}
                        weapon={w as any}
                        colors={colors}
                        onApprove={() => handleApproveContribution(w.id)}
                        onReject={() => handleRejectContribution(w.id)}
                        actionLoading={actionLoading === w.id}
                      />
                    ))}
                  </View>
                )}

                {/* Assigned Weapons */}
                {data && data.assignedWeapons.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Assigned Weapons"
                      icon={<Users size={14} color={colors.green} />}
                      count={data.assignedWeapons.length}
                      colors={colors}
                    />
                    {data.assignedWeapons.map((w) => (
                      <WeaponCard
                        key={w.id}
                        weapon={w}
                        colors={colors}
                        isAssigned
                        showAssignedUser
                        onUnassign={() => handleUnassign(w.id)}
                        actionLoading={actionLoading === w.id}
                      />
                    ))}
                  </View>
                )}

                {/* Pool Weapons */}
                {data && data.poolWeapons.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Pool Weapons"
                      icon={<Gift size={14} color={colors.yellow} />}
                      count={data.poolWeapons.length}
                      colors={colors}
                    />
                    <Text style={[styles.poolHint, { color: colors.textMuted }]}>
                      Available for all team members to use
                    </Text>
                    {data.poolWeapons.map((w) => (
                      <WeaponCard
                        key={w.id}
                        weapon={w}
                        colors={colors}
                        isPool
                        onRemoveFromPool={() => handleRemoveFromPool(w.id)}
                        onAssign={() => setSelectedWeaponForAssign(w)}
                        actionLoading={actionLoading === w.id}
                      />
                    ))}
                  </View>
                )}

                {/* Unassigned Weapons */}
                {data && data.unassignedWeapons.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Unassigned Weapons"
                      icon={<Shield size={14} color={colors.textMuted} />}
                      count={data.unassignedWeapons.length}
                      colors={colors}
                    />
                    {data.unassignedWeapons.map((w) => (
                      <WeaponCard
                        key={w.id}
                        weapon={w}
                        colors={colors}
                        onAssign={() => setSelectedWeaponForAssign(w)}
                        onAddToPool={() => handleAddToPool(w.id)}
                        actionLoading={actionLoading === w.id}
                      />
                    ))}
                  </View>
                )}

                {/* Empty State */}
                {totalWeapons === 0 && (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                      <Shield size={32} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No team weapons yet</Text>
                    <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                      Add weapons once to reuse across trainings
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* ========== MEMBERS TAB ========== */}
            {activeTab === 'members' && (
              <>
                {/* Unassigned Members */}
                {unassignedMembers.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Need Weapons"
                      icon={<UserMinus size={14} color={colors.destructive} />}
                      count={unassignedMembers.length}
                      colors={colors}
                    />
                    {unassignedMembers.map((member) => (
                      <View
                        key={member.id}
                        style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.destructive + '40' }]}
                      >
                        <View style={[styles.memberCardAvatar, { backgroundColor: colors.destructive + '20' }]}>
                          <User size={20} color={colors.destructive} />
                        </View>
                        <View style={styles.memberCardInfo}>
                          <Text style={[styles.memberCardName, { color: colors.text }]}>{member.full_name}</Text>
                          <Text style={[styles.memberCardStatus, { color: colors.destructive }]}>No weapon assigned</Text>
                        </View>
                        {(data?.unassignedWeapons.length || 0) + (data?.poolWeapons.length || 0) > 0 && (
                          <TouchableOpacity
                            style={[styles.memberCardAction, { backgroundColor: colors.primary }]}
                            onPress={() => {
                              // Pre-select this member when assigning
                              const availableWeapon = data?.unassignedWeapons[0] || data?.poolWeapons[0];
                              if (availableWeapon) {
                                setSelectedWeaponForAssign(availableWeapon);
                              }
                            }}
                          >
                            <Text style={[styles.memberCardActionText, { color: '#fff' }]}>Assign</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Assigned Members */}
                {assignedMembers.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Armed"
                      icon={<ShieldCheck size={14} color={colors.green} />}
                      count={assignedMembers.length}
                      colors={colors}
                    />
                    {assignedMembers.map((member) => {
                      const weapon = data?.assignedWeapons.find((w) => w.assigned_to === member.id);
                      return (
                        <View
                          key={member.id}
                          style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        >
                          <View style={[styles.memberCardAvatar, { backgroundColor: colors.green + '20' }]}>
                            <User size={20} color={colors.green} />
                          </View>
                          <View style={styles.memberCardInfo}>
                            <Text style={[styles.memberCardName, { color: colors.text }]}>{member.full_name}</Text>
                            <Text style={[styles.memberCardStatus, { color: colors.textMuted }]}>
                              {weapon?.name || 'Unknown weapon'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Empty State */}
                {teamMembers.length === 0 && (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                      <Users size={32} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Team Members</Text>
                    <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                      Invite members to your team first
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* ========== REQUESTS TAB ========== */}
            {activeTab === 'requests' && (
              <>
                {/* Pending Requests */}
                {data && data.pendingRequests.length > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Pending Requests"
                      icon={<AlertTriangle size={14} color={colors.yellow} />}
                      count={data.pendingRequests.length}
                      colors={colors}
                    />
                    {data.pendingRequests.map((req) => (
                      <PendingRequestCard
                        key={req.id}
                        request={req}
                        colors={colors}
                        onReview={() => setSelectedRequestForReview(req)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                      <Check size={32} color={colors.green} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up</Text>
                    <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                      No pending weapon requests from team members
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          // ============ SOLDIER VIEW ============
          <>
            {/* My Assignment */}
            <View style={styles.section}>
              <SectionHeader
                title="My Assignment"
                icon={<ShieldCheck size={14} color={colors.primary} />}
                colors={colors}
              />
              <MyAssignmentCard
                weapon={data?.myAssignment || null}
                colors={colors}
                onRequestWeapon={() => setShowRequestModal(true)}
                hasPendingRequest={!!data?.myPendingRequest}
              />
            </View>

            {/* My Pending Request */}
            {data?.myPendingRequest && (
              <View style={styles.section}>
                <MyPendingRequestCard
                  request={data.myPendingRequest}
                  colors={colors}
                  onCancel={handleCancelRequest}
                  cancelling={cancelling}
                />
              </View>
            )}

            {/* Team Pool */}
            {data && data.poolWeapons.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Team Pool"
                  icon={<Gift size={14} color={colors.yellow} />}
                  count={data.poolWeapons.length}
                  colors={colors}
                />
                <Text style={[styles.poolHint, { color: colors.textMuted }]}>
                  Available for all team members
                </Text>
                {data.poolWeapons.map((w) => (
                  <WeaponCard key={w.id} weapon={w} colors={colors} isPool />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <AddWeaponModal
        visible={showAddWeapon}
        teamId={teamId || ''}
        colors={colors}
        onClose={() => setShowAddWeapon(false)}
        onSuccess={loadData}
      />

      <MemberPickerModal
        visible={!!selectedWeaponForAssign}
        weapon={selectedWeaponForAssign}
        members={teamMembers}
        existingAssignments={existingAssignments}
        colors={colors}
        onSelect={(userId) => selectedWeaponForAssign && handleAssign(selectedWeaponForAssign.id, userId)}
        onClose={() => setSelectedWeaponForAssign(null)}
      />

      <RequestWeaponModal
        visible={showRequestModal}
        teamId={teamId || ''}
        onClose={() => setShowRequestModal(false)}
        onSuccess={loadData}
      />

      <ApproveRequestModal
        visible={!!selectedRequestForReview}
        request={selectedRequestForReview}
        availableWeapons={unassignedForApproval}
        onClose={() => setSelectedRequestForReview(null)}
        onSuccess={loadData}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Add Weapon Button
  addWeaponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addWeaponText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Section
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Weapon Card
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '600',
  },
  weaponMeta: {
    fontSize: 13,
  },
  assignedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  assignedUserName: {
    fontSize: 12,
  },
  weaponActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  poolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolHint: {
    fontSize: 12,
    marginLeft: 4,
    marginTop: -4,
  },

  // Request Card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    top: 10,
    left: 14,
  },
  requestLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestInfo: {
    flex: 1,
    paddingTop: 18,
    gap: 6,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestChevron: {
    marginLeft: 8,
  },

  // Contribution Card
  contributionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  contributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contributionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contributorName: {
    fontSize: 12,
    marginTop: 2,
  },
  contributionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rejectSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
  },
  approveSmallText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // My Assignment Card
  noAssignmentCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  noAssignmentIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noAssignmentHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  noAssignmentCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
  },
  noAssignmentCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  myAssignmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  myAssignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  myAssignmentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  myAssignmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  myAssignmentMeta: {
    fontSize: 14,
  },

  // My Pending Request
  myRequestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  myRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myRequestTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  myRequestText: {
    fontSize: 14,
  },
  myRequestPreference: {
    fontSize: 12,
  },
  cancelRequestBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  cancelRequestText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Request Button
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  requestBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 14,
  },

  // Modal Shared
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Add Weapon Modal
  chooseContainer: {
    padding: 20,
    gap: 12,
  },
  chooseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  chooseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseContent: {
    flex: 1,
    gap: 2,
  },
  chooseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chooseDesc: {
    fontSize: 13,
  },
  catalogContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  catalogList: {
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  catalogFilterScroll: {
    maxHeight: 44,
  },
  catalogFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catalogFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  catalogFilterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  catalogResultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  catalogResultsCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  catalogLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 60,
  },
  catalogLoadingText: {
    fontSize: 14,
  },
  catalogEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 12,
  },
  catalogEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catalogEmptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  catalogEmptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  catalogEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
  },
  catalogEmptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  catalogScrollView: {
    flex: 1,
  },
  catalogManufacturerGroup: {
    gap: 8,
    marginBottom: 16,
  },
  catalogManufacturerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 4,
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  catalogItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogInfo: {
    flex: 1,
    gap: 4,
  },
  catalogName: {
    fontSize: 15,
    fontWeight: '600',
  },
  catalogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  catalogCategoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  catalogCaliberText: {
    fontSize: 12,
  },
  catalogMeta: {
    fontSize: 13,
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  skipCatalog: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  skipCatalogText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 20,
  },
  basedOnBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  basedOnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  formInput: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Member Picker Modal
  memberPickerHint: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  memberList: {
    padding: 16,
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  memberWeapon: {
    fontSize: 12,
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // Member Card (for Members tab)
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  memberCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCardInfo: {
    flex: 1,
    gap: 2,
  },
  memberCardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberCardStatus: {
    fontSize: 12,
  },
  memberCardAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  memberCardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
