/**
 * Team Armory Screen
 *
 * Full-screen weapon management with role-based views:
 * - Commander: Full management (assignments, pool, requests, contributions)
 * - Soldier: View assignment, pool weapons, request weapon
 *
 * Design language: matches UnifiedHomePage / TeamHomePage
 * Compact, professional, utility-focused.
 */

import { ApproveRequestModal } from '@/components/weapons/ApproveRequestModal';
import { RequestWeaponModal } from '@/components/weapons/RequestWeaponModal';
import type { WeaponRequestRecord } from '@/hooks/realtime/records/weapon';
import { useWeaponRealtime } from '@/hooks/realtime/weapon/useWeaponRealtime';
import { useColors } from '@/hooks/ui/useColors';
import { notifyWeaponRequested } from '@/services/notifications';
import { getTeamMembers } from '@/services/teamService';
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
import { useTeamStore } from '@/stores/teamStore';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { t } from 'i18next';
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Gift,
    Plus,
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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  const { t } = useTranslation();
  const tabs: { id: ArmoryTab; label: string; badge?: number }[] = [
    { id: 'weapons', label: t('weapons.weaponsTab') },
    { id: 'members', label: t('weapons.membersTab'), badge: unassignedCount > 0 ? unassignedCount : undefined },
    { id: 'requests', label: t('weapons.requestsTab'), badge: requestCount > 0 ? requestCount : undefined },
  ];

  return (
    <View style={[s.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, isActive && { backgroundColor: colors.primary + '12' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tab.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, { color: isActive ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
            {tab.badge !== undefined && (
              <View style={[s.tabBadge, { backgroundColor: colors.destructive }]}>
                <Text style={s.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// WEAPON ROW COMPONENT (renders inside grouped card)
// ============================================================================

function WeaponRow({
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
    <View style={s.weaponRow}>
      <View style={[s.weaponIcon, { backgroundColor: isPool ? colors.yellow + '12' : colors.primary + '12' }]}>
        <Shield size={15} color={isPool ? colors.yellow : colors.primary} />
      </View>
      <View style={s.weaponInfo}>
        <Text style={[s.weaponName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[s.weaponMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` \u2022 ${weapon.caliber}`}
        </Text>
        {showAssignedUser && weapon.assigned_user && (
          <View style={s.assignedUserRow}>
            <User size={10} color={colors.textMuted} />
            <Text style={[s.assignedUserName, { color: colors.textMuted }]}>{weapon.assigned_user.full_name}</Text>
          </View>
        )}
      </View>

      <View style={s.weaponActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            {isAssigned && onUnassign && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.destructive + '12' }]}
                onPress={onUnassign}
                hitSlop={4}
              >
                <UserMinus size={14} color={colors.destructive} />
              </TouchableOpacity>
            )}
            {!isAssigned && onAssign && (
              <TouchableOpacity style={[s.assignBtn, { backgroundColor: colors.primary }]} onPress={onAssign}>
                <UserPlus size={12} color="#fff" />
                <Text style={s.assignBtnText}>{t('weapons.assign')}</Text>
              </TouchableOpacity>
            )}
            {isPool && onRemoveFromPool && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.muted }]}
                onPress={onRemoveFromPool}
                hitSlop={4}
              >
                <X size={12} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {!isPool && !isAssigned && onAddToPool && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.green + '12' }]}
                onPress={onAddToPool}
                hitSlop={4}
              >
                <Gift size={12} color={colors.green} />
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
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={s.requestRow} onPress={onReview} activeOpacity={0.7}>
      <View style={[s.requestIcon, { backgroundColor: colors.yellow + '15' }]}>
        <AlertTriangle size={14} color={colors.yellow} />
      </View>
      <View style={s.requestInfo}>
        <Text style={[s.requestUser, { color: colors.text }]}>
          {request.user?.full_name || t('common.unknown')}
        </Text>
        {request.weapon_category && (
          <Text style={[s.requestCat, { color: colors.textMuted }]}>
            {getCategoryLabel(request.weapon_category)}
          </Text>
        )}
      </View>
      <ChevronRight size={14} color={colors.textMuted} />
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
  const { t } = useTranslation();
  return (
    <View style={s.contributionRow}>
      <View style={[s.contributionIcon, { backgroundColor: colors.yellow + '12' }]}>
        <Gift size={14} color={colors.yellow} />
      </View>
      <View style={s.contributionInfo}>
        <Text style={[s.weaponName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[s.weaponMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` \u2022 ${weapon.caliber}`}
          {weapon.user && ` \u2022 ${weapon.user.full_name}`}
        </Text>
      </View>
      <View style={s.contributionActions}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.destructive + '12' }]}
              onPress={onReject}
              hitSlop={4}
            >
              <X size={13} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.approveBtn, { backgroundColor: colors.green }]} onPress={onApprove}>
              <Check size={13} color="#fff" />
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
  const { t } = useTranslation();
  if (!weapon) {
    return (
      <View style={[s.noAssignmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.noAssignmentIcon, { backgroundColor: colors.primary + '12' }]}>
          <Shield size={24} color={colors.primary} />
        </View>
        <Text style={[s.noAssignmentTitle, { color: colors.text }]}>{t('weapons.getReadyForTraining')}</Text>
        <Text style={[s.noAssignmentHint, { color: colors.textMuted }]}>{t('weapons.requestMessage')}</Text>
        {!hasPendingRequest && onRequestWeapon && (
          <TouchableOpacity
            style={[s.noAssignmentCta, { backgroundColor: colors.primary }]}
            onPress={onRequestWeapon}
            activeOpacity={0.8}
          >
            <Text style={s.noAssignmentCtaText}>{t('weapons.requestAction')}</Text>
            <ChevronRight size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[s.myAssignmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.myAssignmentTop}>
        <View style={[s.myAssignmentBadge, { backgroundColor: colors.primary }]}>
          <ShieldCheck size={12} color="#fff" />
          <Text style={s.myAssignmentBadgeText}>{t('weapons.yourAssignedWeapon')}</Text>
        </View>
      </View>
      <View style={[s.myAssignmentBody, { borderTopColor: colors.border }]}>
        <Text style={[s.myAssignmentName, { color: colors.text }]}>{weapon.name}</Text>
        <Text style={[s.myAssignmentMeta, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)}
          {weapon.caliber && ` \u2022 ${weapon.caliber}`}
        </Text>
      </View>
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
  const { t } = useTranslation();
  return (
    <View style={[s.myRequestCard, { backgroundColor: colors.yellow + '08', borderColor: colors.yellow + '40' }]}>
      <View style={s.myRequestHeader}>
        <View style={[s.myRequestIconBg, { backgroundColor: colors.yellow + '15' }]}>
          <Clock size={13} color={colors.yellow} />
        </View>
        <View style={s.myRequestHeaderInfo}>
          <Text style={[s.myRequestTitle, { color: colors.text }]}>{t('weapons.requestPending')}</Text>
          {request.weapon_category && (
            <Text style={[s.myRequestPreference, { color: colors.textMuted }]}>
              {t('weapons.preferred')} {getCategoryLabel(request.weapon_category)}
            </Text>
          )}
        </View>
      </View>
      <Text style={[s.myRequestText, { color: colors.textMuted }]}>{t('weapons.pendingMessage')}</Text>
      <TouchableOpacity
        style={[s.cancelRequestBtn, { borderColor: colors.destructive + '40' }]}
        onPress={onCancel}
        disabled={cancelling}
        activeOpacity={0.7}
      >
        {cancelling ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <Text style={[s.cancelRequestText, { color: colors.destructive }]}>{t('weapons.cancelRequest')}</Text>
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
  const { t } = useTranslation();
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
    if (catalogCategory && w.category !== catalogCategory) return false;
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.manufacturer?.toLowerCase().includes(q) ||
      w.caliber?.toLowerCase().includes(q)
    );
  });

  const groupedByManufacturer = filteredCatalog.reduce(
    (acc, weapon) => {
      const key = weapon.manufacturer || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(weapon);
      return acc;
    },
    {} as Record<string, GlobalWeapon[]>
  );

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
      Alert.alert(t('common.error'), t('weapons.nameRequired'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedCreate'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetModal}>
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={resetModal} hitSlop={8}>
            <Text style={[s.modalCancel, { color: colors.primary }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {step === 'choose'
              ? t('weapons.addWeapon')
              : step === 'catalog'
                ? t('weapons.searchCatalog')
                : t('weapons.weaponDetails')}
          </Text>
          {step === 'custom' ? (
            <TouchableOpacity onPress={handleCreate} disabled={creating || !newWeaponName.trim()} hitSlop={8}>
              {creating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[s.modalSave, { color: newWeaponName.trim() ? colors.primary : colors.textMuted }]}>
                  {t('common.add')}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Step: Choose */}
        {step === 'choose' && (
          <View style={s.chooseContainer}>
            <View style={[s.chooseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={s.chooseOption}
                onPress={() => {
                  setStep('catalog');
                  loadCatalog();
                }}
                activeOpacity={0.7}
              >
                <View style={[s.chooseIcon, { backgroundColor: colors.primary + '12' }]}>
                  <Search size={16} color={colors.primary} />
                </View>
                <View style={s.chooseContent}>
                  <Text style={[s.chooseTitle, { color: colors.text }]}>{t('weapons.fromCatalog')}</Text>
                  <Text style={[s.chooseDesc, { color: colors.textMuted }]}>{t('weapons.browseCatalog')}</Text>
                </View>
                <ChevronRight size={14} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[s.hairline, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={s.chooseOption} onPress={() => setStep('custom')} activeOpacity={0.7}>
                <View style={[s.chooseIcon, { backgroundColor: colors.green + '12' }]}>
                  <Plus size={16} color={colors.green} />
                </View>
                <View style={s.chooseContent}>
                  <Text style={[s.chooseTitle, { color: colors.text }]}>{t('weapons.customWeapon')}</Text>
                  <Text style={[s.chooseDesc, { color: colors.textMuted }]}>{t('weapons.createScratch')}</Text>
                </View>
                <ChevronRight size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step: Catalog */}
        {step === 'catalog' && (
          <View style={s.catalogContainer}>
            {/* Search Bar */}
            <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder={t('weapons.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                autoFocus
              />
              {catalogSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCatalogSearch('')} hitSlop={8}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.catalogFilterScroll}
              contentContainerStyle={s.catalogFilterContent}
            >
              <TouchableOpacity
                style={[
                  s.catalogFilterChip,
                  {
                    backgroundColor: !catalogCategory ? colors.text : colors.card,
                    borderColor: !catalogCategory ? colors.text : colors.border,
                  },
                ]}
                onPress={() => setCatalogCategory(null)}
              >
                <Text style={[s.catalogFilterText, { color: !catalogCategory ? colors.background : colors.text }]}>
                  {t('weapons.all')}
                </Text>
              </TouchableOpacity>
              {WEAPON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    s.catalogFilterChip,
                    {
                      backgroundColor: catalogCategory === cat.value ? colors.text : colors.card,
                      borderColor: catalogCategory === cat.value ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => setCatalogCategory(catalogCategory === cat.value ? null : cat.value)}
                >
                  <Text
                    style={[
                      s.catalogFilterText,
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
              <Text style={[s.catalogResultsCount, { color: colors.textMuted }]}>
                {filteredCatalog.length} weapon{filteredCatalog.length !== 1 ? 's' : ''} found
              </Text>
            )}

            {catalogLoading ? (
              <View style={s.catalogLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.catalogLoadingText, { color: colors.textMuted }]}>Loading catalog...</Text>
              </View>
            ) : filteredCatalog.length === 0 ? (
              <View style={s.catalogEmptyContainer}>
                <View style={[s.catalogEmptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Search size={24} color={colors.textMuted} />
                </View>
                <Text style={[s.catalogEmptyTitle, { color: colors.text }]}>
                  {catalogSearch || catalogCategory ? 'No matches found' : 'No weapons in catalog'}
                </Text>
                <Text style={[s.catalogEmptyDesc, { color: colors.textMuted }]}>
                  {catalogSearch || catalogCategory
                    ? 'Try adjusting your search or filters'
                    : 'The weapon catalog is empty'}
                </Text>
                <TouchableOpacity
                  style={[s.catalogEmptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setStep('custom')}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={s.catalogEmptyBtnText}>Create Custom Weapon</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={s.catalogScrollView} contentContainerStyle={s.catalogList}>
                {sortedManufacturers.map((manufacturer) => (
                  <View key={manufacturer} style={s.catalogManufacturerGroup}>
                    <Text style={[s.catalogManufacturerTitle, { color: colors.textMuted }]}>
                      {manufacturer.toUpperCase()}
                    </Text>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {groupedByManufacturer[manufacturer].map((item, idx) => (
                        <View key={item.id}>
                          <TouchableOpacity
                            style={s.catalogItem}
                            onPress={() => handleSelectCatalog(item)}
                            activeOpacity={0.7}
                          >
                            <View style={[s.catalogItemIcon, { backgroundColor: colors.primary + '12' }]}>
                              <Shield size={14} color={colors.primary} />
                            </View>
                            <View style={s.catalogInfo}>
                              <Text style={[s.catalogName, { color: colors.text }]}>{item.name}</Text>
                              <Text style={[s.catalogMeta, { color: colors.textMuted }]}>
                                {getCategoryLabel(item.category)}
                                {item.caliber && ` \u2022 ${item.caliber}`}
                              </Text>
                            </View>
                            <ChevronRight size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                          {idx < groupedByManufacturer[manufacturer].length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Skip to custom */}
            {filteredCatalog.length > 0 && (
              <TouchableOpacity
                style={[s.skipCatalog, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setStep('custom')}
              >
                <Plus size={14} color={colors.textMuted} />
                <Text style={[s.skipCatalogText, { color: colors.text }]}>{t('weapons.createCustomInstead')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step: Custom Form */}
        {step === 'custom' && (
          <ScrollView style={s.formContainer} contentContainerStyle={s.formContent}>
            {selectedCatalogWeapon && (
              <View style={[s.basedOnBadge, { backgroundColor: colors.primary + '12' }]}>
                <Text style={[s.basedOnText, { color: colors.primary }]}>
                  {t('weapons.basedOn')} {selectedCatalogWeapon.name}
                </Text>
              </View>
            )}

            <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>{t('weapons.nameLabel')}</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={newWeaponName}
                  onChangeText={setNewWeaponName}
                  placeholder={t('weapons.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus={!selectedCatalogWeapon}
                />
              </View>

              <View style={[s.formDivider, { backgroundColor: colors.border }]} />

              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>{t('weapons.categoryLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.categoryRow}>
                    {WEAPON_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          s.categoryChip,
                          {
                            backgroundColor: newWeaponCategory === cat.value ? colors.primary : colors.background,
                            borderColor: newWeaponCategory === cat.value ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setNewWeaponCategory(cat.value)}
                      >
                        <Text
                          style={[
                            s.categoryChipText,
                            { color: newWeaponCategory === cat.value ? '#fff' : colors.text },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={[s.formDivider, { backgroundColor: colors.border }]} />

              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>{t('weapons.caliberLabel')}</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={newWeaponCaliber}
                  onChangeText={setNewWeaponCaliber}
                  placeholder={t('weapons.caliberPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[s.formDivider, { backgroundColor: colors.border }]} />

              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textMuted }]}>{t('weapons.serialLabel')}</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={newWeaponSerial}
                  onChangeText={setNewWeaponSerial}
                  placeholder={t('common.optional')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
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
                      <Text style={[s.pickerSub, { color: colors.textMuted }]}>
                        {t('weapons.has')} {existingWeapon}
                      </Text>
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
// WEAPON PICKER FOR MEMBER MODAL
// ============================================================================

function WeaponPickerForMemberModal({
  visible,
  member,
  availableWeapons,
  colors,
  onSelect,
  onClose,
  actionLoading,
}: {
  visible: boolean;
  member: TeamMember | null;
  availableWeapons: TeamWeapon[];
  colors: ReturnType<typeof useColors>;
  onSelect: (weaponId: string) => void;
  onClose: () => void;
  actionLoading: string | null;
}) {
  const { t } = useTranslation();
  if (!member) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {t('weapons.assignToMember', { name: member.full_name })}
          </Text>
          <View style={{ width: 18 }} />
        </View>

        <Text style={[s.pickerHint, { color: colors.textMuted }]}>{t('weapons.selectWeaponForMember')}</Text>

        <FlatList
          data={availableWeapons}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isLoading = actionLoading === item.id;
            return (
              <View>
                <TouchableOpacity
                  style={s.pickerRow}
                  onPress={() => onSelect(item.id)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={[s.pickerAvatar, { backgroundColor: colors.primary + '12' }]}>
                    <Shield size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[s.pickerSub, { color: colors.textMuted }]}>
                      {getCategoryLabel(item.category)}
                      {item.caliber && ` \u2022 ${item.caliber}`}
                    </Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <ChevronRight size={14} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
                {index < availableWeapons.length - 1 && (
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

interface TeamArmoryProps {
  /** When provided, use this teamId instead of search params */
  teamIdProp?: string;
  /** When true, skip the standalone header (for tab embedding) */
  embedded?: boolean;
}

export function TeamArmoryContent({ teamIdProp, embedded }: TeamArmoryProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId: paramTeamId } = useLocalSearchParams<{ teamId: string }>();
  const teamId = teamIdProp || paramTeamId;
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
  const [targetMemberForAssign, setTargetMemberForAssign] = useState<TeamMember | null>(null);
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
          full_name: m.profile?.full_name || t('common.unknown'),
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
    setData(null);
    setTeamMembers([]);
    setLoading(true);
    loadData();
  }, [loadData]);

  // Real-time updates for weapon requests and assignments
  useWeaponRealtime({
    teamId,
    enabled: isCommander,
    onNewRequest: useCallback(
      async (request: WeaponRequestRecord) => {
        console.log('[TeamArmory] Realtime: New weapon request!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await loadData();
        if (teamId && team?.name) {
          const requestData = data?.pendingRequests?.find((r) => r.id === request.id);
          const requesterName = (requestData as any)?.user?.full_name || t('teams.teamMember');
          notifyWeaponRequested(teamId, team.name, requesterName);
        }
      },
      [loadData, teamId, team?.name, data?.pendingRequests]
    ),
    onRequestChange: useCallback(() => {
      loadData();
    }, [loadData]),
    onWeaponChange: useCallback(() => {
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedAssign'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedUnassign'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedAddPool'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedRemovePool'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedApprove'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedReject'));
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
      Alert.alert(t('common.error'), err.message || t('weapons.failedCancel'));
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
    data?.assignedWeapons.filter((w) => w.assigned_to).map((w) => w.assigned_to!) || []
  );

  const unassignedMembers = teamMembers.filter((m) => !membersWithWeapons.has(m.id));
  const assignedMembers = teamMembers.filter((m) => membersWithWeapons.has(m.id));

  // Unassigned weapons for approve modal
  const unassignedForApproval = [...(data?.unassignedWeapons || []), ...(data?.poolWeapons || [])];

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header - only in standalone mode */}
      {!embedded && (
        <Animated.View entering={FadeIn.duration(200)} style={[s.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={[s.headerTitle, { color: colors.text }]}>{t('weapons.teamArmory')}</Text>
            <Text style={[s.headerSubtitle, { color: colors.textMuted }]}>{team?.name}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textMuted} />}
        showsVerticalScrollIndicator={false}
      >
        {isCommander ? (
          // ============ COMMANDER VIEW ============
          <>
            {/* Stats Strip */}
            <Animated.View entering={FadeIn.duration(300)}>
              <View style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.statsStrip}>
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: colors.text }]}>{totalWeapons}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.total')}</Text>
                  </View>
                  <View style={[s.statDivider, { backgroundColor: colors.border }]} />
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: colors.text }]}>{assignedCount}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.assigned')}</Text>
                  </View>
                  <View style={[s.statDivider, { backgroundColor: colors.border }]} />
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: colors.text }]}>{poolCount}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.pool')}</Text>
                  </View>
                  <View style={[s.statDivider, { backgroundColor: colors.border }]} />
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: pendingCount > 0 ? colors.yellow : colors.text }]}>
                      {pendingCount}
                    </Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('weapons.pending')}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

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
              <Animated.View entering={FadeIn.duration(250)} style={s.tabContent}>
                {/* Add Weapon Button */}
                <TouchableOpacity
                  style={[s.addWeaponBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddWeapon(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={15} color="#fff" />
                  <Text style={s.addWeaponText}>{t('weapons.addTeamWeapon')}</Text>
                </TouchableOpacity>

                {/* Pending Contributions */}
                {data && data.pendingContributions.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        {t('weapons.pendingContributions').toUpperCase()}
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.yellow }]}>
                        <Text style={s.sectionBadgeText}>{data.pendingContributions.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {data.pendingContributions.map((w, idx) => (
                        <View key={w.id}>
                          <PendingContributionCard
                            weapon={w as any}
                            colors={colors}
                            onApprove={() => handleApproveContribution(w.id)}
                            onReject={() => handleRejectContribution(w.id)}
                            actionLoading={actionLoading === w.id}
                          />
                          {idx < data.pendingContributions.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Assigned Weapons */}
                {data && data.assignedWeapons.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        {t('weapons.assignedWeapons').toUpperCase()}
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.green }]}>
                        <Text style={s.sectionBadgeText}>{data.assignedWeapons.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {data.assignedWeapons.map((w, idx) => (
                        <View key={w.id}>
                          <WeaponRow
                            weapon={w}
                            colors={colors}
                            isAssigned
                            showAssignedUser
                            onUnassign={() => handleUnassign(w.id)}
                            actionLoading={actionLoading === w.id}
                          />
                          {idx < data.assignedWeapons.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Pool Weapons */}
                {data && data.poolWeapons.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        POOL WEAPONS
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.yellow }]}>
                        <Text style={s.sectionBadgeText}>{data.poolWeapons.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {data.poolWeapons.map((w, idx) => (
                        <View key={w.id}>
                          <WeaponRow
                            weapon={w}
                            colors={colors}
                            isPool
                            onRemoveFromPool={() => handleRemoveFromPool(w.id)}
                            onAssign={() => setSelectedWeaponForAssign(w)}
                            actionLoading={actionLoading === w.id}
                          />
                          {idx < data.poolWeapons.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Unassigned Weapons */}
                {data && data.unassignedWeapons.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        {t('weapons.unassigned').toUpperCase()}
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.border }]}>
                        <Text style={[s.sectionBadgeText, { color: colors.textMuted }]}>
                          {data.unassignedWeapons.length}
                        </Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {data.unassignedWeapons.map((w, idx) => (
                        <View key={w.id}>
                          <WeaponRow
                            weapon={w}
                            colors={colors}
                            onAssign={() => setSelectedWeaponForAssign(w)}
                            onAddToPool={() => handleAddToPool(w.id)}
                            actionLoading={actionLoading === w.id}
                          />
                          {idx < data.unassignedWeapons.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Empty State */}
                {totalWeapons === 0 && (
                  <View style={[s.emptyState, { borderColor: colors.border }]}>
                    <View style={[s.emptyIcon, { backgroundColor: colors.card }]}>
                      <Shield size={22} color={colors.textMuted} />
                    </View>
                    <View style={s.emptyContent}>
                      <Text style={[s.emptyTitle, { color: colors.text }]}>{t('weapons.noTeamWeapons')}</Text>
                      <Text style={[s.emptyHint, { color: colors.textMuted }]}>{t('weapons.addWeaponsOnce')}</Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ========== MEMBERS TAB ========== */}
            {activeTab === 'members' && (
              <Animated.View entering={FadeIn.duration(250)} style={s.tabContent}>
                {/* Unassigned Members */}
                {unassignedMembers.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        {t('weapons.needWeapons').toUpperCase()}
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.destructive }]}>
                        <Text style={s.sectionBadgeText}>{unassignedMembers.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {unassignedMembers.map((member, idx) => (
                        <View key={member.id}>
                          <View style={s.memberRow}>
                            <View style={[s.memberAvatar, { backgroundColor: colors.destructive + '15' }]}>
                              <User size={14} color={colors.destructive} />
                            </View>
                            <View style={s.memberInfo}>
                              <Text style={[s.memberName, { color: colors.text }]}>{member.full_name}</Text>
                              <Text style={[s.memberStatus, { color: colors.destructive }]}>
                                {t('weapons.noWeaponAssigned')}
                              </Text>
                            </View>
                            {(data?.unassignedWeapons.length || 0) + (data?.poolWeapons.length || 0) > 0 && (
                              <TouchableOpacity
                                style={[s.assignBtn, { backgroundColor: colors.primary }]}
                                onPress={() => setTargetMemberForAssign(member)}
                              >
                                <Text style={s.assignBtnText}>{t('weapons.assign')}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {idx < unassignedMembers.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Assigned Members */}
                {assignedMembers.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ARMED</Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.green }]}>
                        <Text style={s.sectionBadgeText}>{assignedMembers.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {assignedMembers.map((member, idx) => {
                        const weapon = data?.assignedWeapons.find((w) => w.assigned_to === member.id);
                        return (
                          <View key={member.id}>
                            <View style={s.memberRow}>
                              <View style={[s.memberAvatar, { backgroundColor: colors.green + '15' }]}>
                                <User size={14} color={colors.green} />
                              </View>
                              <View style={s.memberInfo}>
                                <Text style={[s.memberName, { color: colors.text }]}>{member.full_name}</Text>
                                <Text style={[s.memberStatus, { color: colors.textMuted }]}>
                                  {weapon?.name || 'Unknown weapon'}
                                </Text>
                              </View>
                            </View>
                            {idx < assignedMembers.length - 1 && (
                              <View style={[s.hairline, { backgroundColor: colors.border }]} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Empty State */}
                {teamMembers.length === 0 && (
                  <View style={[s.emptyState, { borderColor: colors.border }]}>
                    <View style={[s.emptyIcon, { backgroundColor: colors.card }]}>
                      <Users size={22} color={colors.textMuted} />
                    </View>
                    <View style={s.emptyContent}>
                      <Text style={[s.emptyTitle, { color: colors.text }]}>No Team Members</Text>
                      <Text style={[s.emptyHint, { color: colors.textMuted }]}>
                        Invite members to your team first
                      </Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ========== REQUESTS TAB ========== */}
            {activeTab === 'requests' && (
              <Animated.View entering={FadeIn.duration(250)} style={s.tabContent}>
                {data && data.pendingRequests.length > 0 ? (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                        {t('weapons.pendingRequests').toUpperCase()}
                      </Text>
                      <View style={[s.sectionBadge, { backgroundColor: colors.yellow }]}>
                        <Text style={s.sectionBadgeText}>{data.pendingRequests.length}</Text>
                      </View>
                    </View>
                    <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {data.pendingRequests.map((req, idx) => (
                        <View key={req.id}>
                          <PendingRequestCard
                            request={req}
                            colors={colors}
                            onReview={() => setSelectedRequestForReview(req)}
                          />
                          {idx < data.pendingRequests.length - 1 && (
                            <View style={[s.hairline, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={[s.emptyState, { borderColor: colors.border }]}>
                    <View style={[s.emptyIcon, { backgroundColor: colors.green + '12' }]}>
                      <Check size={22} color={colors.green} />
                    </View>
                    <View style={s.emptyContent}>
                      <Text style={[s.emptyTitle, { color: colors.text }]}>{t('weapons.allCaughtUp')}</Text>
                      <Text style={[s.emptyHint, { color: colors.textMuted }]}>
                        {t('weapons.noPendingRequests')}
                      </Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            )}
          </>
        ) : (
          // ============ SOLDIER VIEW ============
          <Animated.View entering={FadeIn.duration(300)} style={s.tabContent}>
            {/* My Assignment */}
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                {t('weapons.myAssignment').toUpperCase()}
              </Text>
              <MyAssignmentCard
                weapon={data?.myAssignment || null}
                colors={colors}
                onRequestWeapon={() => setShowRequestModal(true)}
                hasPendingRequest={!!data?.myPendingRequest}
              />
            </View>

            {/* My Pending Request */}
            {data?.myPendingRequest && (
              <View style={s.section}>
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
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
                    {t('weapons.teamPool').toUpperCase()}
                  </Text>
                  <View style={[s.sectionBadge, { backgroundColor: colors.yellow }]}>
                    <Text style={s.sectionBadgeText}>{data.poolWeapons.length}</Text>
                  </View>
                </View>
                <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {data.poolWeapons.map((w, idx) => (
                    <View key={w.id}>
                      <WeaponRow weapon={w} colors={colors} isPool />
                      {idx < data.poolWeapons.length - 1 && (
                        <View style={[s.hairline, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
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

      <WeaponPickerForMemberModal
        visible={!!targetMemberForAssign}
        member={targetMemberForAssign}
        availableWeapons={[...(data?.unassignedWeapons || []), ...(data?.poolWeapons || [])]}
        colors={colors}
        onSelect={async (weaponId) => {
          if (targetMemberForAssign) {
            await handleAssign(weaponId, targetMemberForAssign.id);
            setTargetMemberForAssign(null);
          }
        }}
        onClose={() => setTargetMemberForAssign(null)}
        actionLoading={actionLoading}
      />
    </View>
  );
}

/**
 * Default export for route — standalone page with header & back button.
 * TeamArmoryContent is also exported for embedding in loadout tab.
 */
export default function TeamArmoryScreen() {
  return <TeamArmoryContent />;
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  // Layout
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
  tabContent: {
    gap: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  // Stats Card
  statsCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    gap: 5,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Section
  section: {
    gap: 6,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  sectionBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  // Group Card
  groupCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },

  // Weapon Row (inside group card)
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  weaponIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 1,
  },
  weaponName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  weaponMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  assignedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  assignedUserName: {
    fontSize: 10,
    fontWeight: '500',
  },
  weaponActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  assignBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add Weapon Button
  addWeaponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addWeaponText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Request Row (inside group card)
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  requestIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    gap: 1,
  },
  requestUser: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  requestCat: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Contribution Row (inside group card)
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  contributionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributionInfo: {
    flex: 1,
    gap: 1,
  },
  contributionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Member Row (inside group card)
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  memberStatus: {
    fontSize: 11,
    fontWeight: '500',
  },

  // My Assignment Card (Soldier)
  noAssignmentCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  noAssignmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noAssignmentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  noAssignmentHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  noAssignmentCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 6,
  },
  noAssignmentCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  myAssignmentCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  myAssignmentTop: {
    padding: 10,
  },
  myAssignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  myAssignmentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  myAssignmentBody: {
    borderTopWidth: 1,
    padding: 12,
    gap: 2,
  },
  myAssignmentName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  myAssignmentMeta: {
    fontSize: 12,
    fontWeight: '500',
  },

  // My Pending Request (Soldier)
  myRequestCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  myRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myRequestIconBg: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRequestHeaderInfo: {
    flex: 1,
    gap: 1,
  },
  myRequestTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  myRequestPreference: {
    fontSize: 11,
    fontWeight: '500',
  },
  myRequestText: {
    fontSize: 12,
    lineHeight: 17,
  },
  cancelRequestBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: 1,
  },
  cancelRequestText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
    gap: 10,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 11,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalSave: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Add Weapon Modal - Choose Step
  chooseContainer: {
    padding: 16,
  },
  chooseCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chooseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  chooseIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseContent: {
    flex: 1,
    gap: 1,
  },
  chooseTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  chooseDesc: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Add Weapon Modal - Catalog Step
  catalogContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  catalogFilterScroll: {
    maxHeight: 36,
  },
  catalogFilterContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  catalogFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  catalogFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  catalogResultsCount: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  catalogLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 48,
  },
  catalogLoadingText: {
    fontSize: 12,
  },
  catalogEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    gap: 8,
  },
  catalogEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  catalogEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  catalogEmptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  catalogEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  catalogEmptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  catalogScrollView: {
    flex: 1,
  },
  catalogList: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  catalogManufacturerGroup: {
    gap: 6,
  },
  catalogManufacturerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  catalogItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogInfo: {
    flex: 1,
    gap: 1,
  },
  catalogName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  catalogMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  skipCatalog: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  skipCatalogText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Add Weapon Modal - Custom Form Step
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    gap: 14,
  },
  basedOnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  basedOnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formGroup: {
    padding: 12,
    gap: 6,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  formInput: {
    padding: 10,
    borderRadius: 7,
    borderWidth: 1,
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Picker Modal Shared (Member & Weapon Pickers)
  pickerHint: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  pickerListCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerList: {},
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  pickerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pickerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
});
