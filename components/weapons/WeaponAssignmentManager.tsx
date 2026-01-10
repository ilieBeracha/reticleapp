/**
 * WeaponAssignmentManager - For commanders to manage team weapon assignments
 * 
 * Features:
 * - View all team weapons with current assignments
 * - Add new team weapons
 * - Assign/unassign weapons to team members
 * - View and approve/reject weapon contribution requests
 */

import { useColors } from '@/hooks/ui/useColors';
import {
    approveSharedWeapon,
    assignTeamWeapon,
    createTeamWeapon,
    getCategoryLabel,
    getGlobalWeapons,
    getPendingSharedWeapons,
    getTeamWeaponsWithAssignments,
    rejectSharedWeapon,
    unassignTeamWeapon,
    WEAPON_CATEGORIES,
    type GlobalWeapon,
    type TeamWeapon,
    type UserWeapon,
    type WeaponCategory,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
    AlertTriangle,
    Check,
    ChevronRight,
    Plus,
    RefreshCw,
    Search,
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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface WeaponAssignmentManagerProps {
  teamId: string;
  teamMembers: { id: string; full_name: string; avatar_url?: string | null }[];
  onClose: () => void;
}

interface PendingWeapon extends UserWeapon {
  user?: { id: string; full_name: string; avatar_url: string | null };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaponAssignmentManager({
  teamId,
  teamMembers,
  onClose,
}: WeaponAssignmentManagerProps) {
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [teamWeapons, setTeamWeapons] = useState<TeamWeapon[]>([]);
  const [pendingWeapons, setPendingWeapons] = useState<PendingWeapon[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<TeamWeapon | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create weapon modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<'choose' | 'catalog' | 'custom'>('choose');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [allCatalogWeapons, setAllCatalogWeapons] = useState<GlobalWeapon[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogWeapon, setSelectedCatalogWeapon] = useState<GlobalWeapon | null>(null);
  
  // Create form state
  const [newWeaponName, setNewWeaponName] = useState('');
  const [newWeaponCategory, setNewWeaponCategory] = useState<WeaponCategory>('rifle');
  const [newWeaponCaliber, setNewWeaponCaliber] = useState('');
  const [newWeaponSerial, setNewWeaponSerial] = useState('');
  const [creating, setCreating] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [weapons, pending] = await Promise.all([
        getTeamWeaponsWithAssignments(teamId),
        getPendingSharedWeapons(teamId),
      ]);
      setTeamWeapons(weapons);
      setPendingWeapons(pending as PendingWeapon[]);
    } catch (err) {
      console.error('Failed to load weapon assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAssign = useCallback(async (weaponId: string, userId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await assignTeamWeapon(weaponId, userId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign weapon');
    } finally {
      setActionLoading(null);
      setSelectedWeapon(null);
    }
  }, []);

  const handleUnassign = useCallback(async (weaponId: string) => {
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
  }, []);

  const handleApprove = useCallback(async (userWeaponId: string) => {
    try {
      setActionLoading(userWeaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await approveSharedWeapon(userWeaponId, teamId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve weapon');
    } finally {
      setActionLoading(null);
    }
  }, [teamId]);

  const handleReject = useCallback(async (userWeaponId: string) => {
    try {
      setActionLoading(userWeaponId);
      await rejectSharedWeapon(userWeaponId);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject weapon');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE WEAPON
  // ─────────────────────────────────────────────────────────────────────────

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep('choose');
    setCatalogSearch('');
    setSelectedCatalogWeapon(null);
    setNewWeaponName('');
    setNewWeaponCategory('rifle');
    setNewWeaponCaliber('');
    setNewWeaponSerial('');
  };

  // Load all catalog weapons when entering catalog step
  const loadCatalogWeapons = useCallback(async () => {
    if (allCatalogWeapons.length > 0) return; // Already loaded
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

  // Filter catalog weapons locally
  const filteredCatalogWeapons = allCatalogWeapons.filter(weapon => {
    if (!catalogSearch.trim()) return true;
    const query = catalogSearch.toLowerCase();
    return (
      weapon.name.toLowerCase().includes(query) ||
      (weapon.manufacturer?.toLowerCase().includes(query)) ||
      (weapon.caliber?.toLowerCase().includes(query)) ||
      weapon.category.toLowerCase().includes(query)
    );
  });

  const handleOpenCatalog = useCallback(() => {
    setCreateStep('catalog');
    loadCatalogWeapons();
  }, [loadCatalogWeapons]);

  const handleSelectCatalogWeapon = (weapon: GlobalWeapon) => {
    setSelectedCatalogWeapon(weapon);
    setNewWeaponName(weapon.name);
    setNewWeaponCategory(weapon.category);
    setNewWeaponCaliber(weapon.caliber || '');
    setCreateStep('custom'); // Go to form to add details
  };

  const handleCreateWeapon = useCallback(async () => {
    if (!newWeaponName.trim()) {
      Alert.alert('Error', 'Weapon name is required');
      return;
    }
    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createTeamWeapon({
        team_id: teamId,
        base_weapon_id: selectedCatalogWeapon?.id || undefined,
        name: newWeaponName.trim(),
        category: newWeaponCategory,
        caliber: newWeaponCaliber.trim() || undefined,
        serial_number: newWeaponSerial.trim() || undefined,
      });
      resetCreateModal();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create weapon');
    } finally {
      setCreating(false);
    }
  }, [teamId, selectedCatalogWeapon, newWeaponName, newWeaponCategory, newWeaponCaliber, newWeaponSerial]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderWeaponItem = ({ item }: { item: TeamWeapon }) => {
    const isLoading = actionLoading === item.id;
    const assignedUser = item.assigned_user;
    
    return (
      <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.weaponInfo}>
          <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
            {getCategoryLabel(item.category)} {item.caliber && `• ${item.caliber}`}
          </Text>
        </View>
        
        <View style={styles.assignmentArea}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : assignedUser ? (
            <View style={styles.assignedRow}>
              <View style={styles.assignedUser}>
                <User size={14} color={colors.textMuted} />
                <Text style={[styles.assignedName, { color: colors.text }]}>
                  {assignedUser.full_name}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                onPress={() => handleUnassign(item.id)}
              >
                <UserMinus size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.assignBtn, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedWeapon(item)}
            >
              <UserPlus size={16} color="#fff" />
              <Text style={styles.assignBtnText}>Assign</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPendingItem = ({ item }: { item: PendingWeapon }) => {
    const isLoading = actionLoading === item.id;
    
    return (
      <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.yellow }]}>
        <View style={styles.pendingHeader}>
          <AlertTriangle size={16} color={colors.yellow} />
          <Text style={[styles.pendingLabel, { color: colors.yellow }]}>Pending Approval</Text>
        </View>
        
        <View style={styles.weaponInfo}>
          <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
            {getCategoryLabel(item.category)} {item.caliber && `• ${item.caliber}`}
          </Text>
          {item.user && (
            <Text style={[styles.contributorName, { color: colors.textMuted }]}>
              From: {item.user.full_name}
            </Text>
          )}
        </View>
        
        <View style={styles.pendingActions}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.rejectBtn, { backgroundColor: colors.muted }]}
                onPress={() => handleReject(item.id)}
              >
                <X size={18} color={colors.destructive} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.green }]}
                onPress={() => handleApprove(item.id)}
              >
                <Check size={18} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Get which users already have weapons assigned
  const usersWithWeapons = new Map<string, string>();
  teamWeapons.forEach(w => {
    if (w.assigned_to) {
      usersWithWeapons.set(w.assigned_to, w.name);
    }
  });

  const renderMemberItem = ({ item }: { item: typeof teamMembers[0] }) => {
    if (!selectedWeapon) return null;
    
    const existingWeapon = usersWithWeapons.get(item.id);
    const hasWeapon = !!existingWeapon;
    
    return (
      <TouchableOpacity
        style={[
          styles.memberItem, 
          { 
            backgroundColor: colors.card, 
            borderColor: hasWeapon ? colors.border : colors.border,
            opacity: hasWeapon ? 0.5 : 1,
          }
        ]}
        onPress={() => {
          if (hasWeapon) {
            Alert.alert(
              'Already Assigned',
              `${item.full_name} already has "${existingWeapon}" assigned. Each member can only have 1 weapon.`,
              [{ text: 'OK' }]
            );
          } else {
            handleAssign(selectedWeapon.id, item.id);
          }
        }}
      >
        <User size={18} color={hasWeapon ? colors.textMuted : colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: hasWeapon ? colors.textMuted : colors.text }]}>
            {item.full_name}
          </Text>
          {hasWeapon && (
            <Text style={[styles.memberWeapon, { color: colors.textMuted }]}>
              Has: {existingWeapon}
            </Text>
          )}
        </View>
        {!hasWeapon && <ChevronRight size={18} color={colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  // Member picker modal
  if (selectedWeapon) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedWeapon(null)}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Assign {selectedWeapon.name}
          </Text>
          <View style={{ width: 20 }} />
        </View>
        
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          Select a team member (1 weapon per member)
        </Text>
        
        <FlatList
          data={teamMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.memberList}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Team Weapons</Text>
        <TouchableOpacity onPress={loadData}>
          <RefreshCw size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Add Weapon Button */}
      <TouchableOpacity
        style={[styles.addWeaponBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus size={18} color="#fff" />
        <Text style={styles.addWeaponBtnText}>Add Team Weapon</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[
            ...(pendingWeapons.length > 0 ? [{ type: 'header' as const, title: 'Pending Requests' }] : []),
            ...pendingWeapons.map(w => ({ type: 'pending' as const, data: w })),
            { type: 'header' as const, title: 'Team Weapons' },
            ...teamWeapons.map(w => ({ type: 'weapon' as const, data: w })),
          ]}
          keyExtractor={(item, index) => 
            item.type === 'header' ? `header-${index}` : (item.data as any).id
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Users size={14} color={colors.textMuted} />
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    {item.title}
                  </Text>
                </View>
              );
            }
            if (item.type === 'pending') {
              return renderPendingItem({ item: item.data });
            }
            return renderWeaponItem({ item: item.data });
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No team weapons yet
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Tap "Add Team Weapon" to get started
              </Text>
            </View>
          }
        />
      )}

      {/* Create Weapon Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetCreateModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={resetCreateModal}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {createStep === 'choose' ? 'Add Weapon' : createStep === 'catalog' ? 'Search Catalog' : 'Weapon Details'}
            </Text>
            {createStep === 'custom' ? (
              <TouchableOpacity onPress={handleCreateWeapon} disabled={creating || !newWeaponName.trim()}>
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

          {/* Step: Choose */}
          {createStep === 'choose' && (
            <View style={styles.chooseContainer}>
              <TouchableOpacity
                style={[styles.chooseOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleOpenCatalog}
              >
                <View style={[styles.chooseIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Search size={22} color={colors.primary} />
                </View>
                <View style={styles.chooseContent}>
                  <Text style={[styles.chooseTitle, { color: colors.text }]}>From Catalog</Text>
                  <Text style={[styles.chooseDesc, { color: colors.textMuted }]}>
                    Browse and select from {allCatalogWeapons.length > 0 ? allCatalogWeapons.length : ''} known weapons
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chooseOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setCreateStep('custom')}
              >
                <View style={[styles.chooseIcon, { backgroundColor: colors.green + '15' }]}>
                  <Plus size={22} color={colors.green} />
                </View>
                <View style={styles.chooseContent}>
                  <Text style={[styles.chooseTitle, { color: colors.text }]}>Custom Weapon</Text>
                  <Text style={[styles.chooseDesc, { color: colors.textMuted }]}>
                    Create a completely custom weapon
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Catalog Search */}
          {createStep === 'catalog' && (
            <View style={styles.catalogContainer}>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search weapons..."
                  placeholderTextColor={colors.textMuted}
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
                {catalogSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCatalogSearch('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {catalogLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={filteredCatalogWeapons}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.catalogItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleSelectCatalogWeapon(item)}
                    >
                      <View style={styles.catalogInfo}>
                        <Text style={[styles.catalogName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.catalogMeta, { color: colors.textMuted }]}>
                          {item.manufacturer ? `${item.manufacturer} • ` : ''}{getCategoryLabel(item.category)}{item.caliber && ` • ${item.caliber}`}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.catalogList}
                  ListEmptyComponent={
                    catalogSearch.length > 0 ? (
                      <Text style={[styles.noResults, { color: colors.textMuted }]}>
                        No weapons match "{catalogSearch}"
                      </Text>
                    ) : allCatalogWeapons.length === 0 ? (
                      <Text style={[styles.noResults, { color: colors.textMuted }]}>
                        No weapons in catalog yet
                      </Text>
                    ) : null
                  }
                />
              )}

              <TouchableOpacity
                style={[styles.skipCatalog, { borderColor: colors.border }]}
                onPress={() => setCreateStep('custom')}
              >
                <Text style={[styles.skipCatalogText, { color: colors.textMuted }]}>
                  Can't find it? Create custom weapon →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Custom Form */}
          {createStep === 'custom' && (
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
                          }
                        ]}
                        onPress={() => setNewWeaponCategory(cat.value)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          { color: newWeaponCategory === cat.value ? '#fff' : colors.text }
                        ]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  weaponCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  assignmentArea: {
    marginLeft: 12,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignedName: {
    fontSize: 13,
    fontWeight: '500',
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  pendingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contributorName: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  emptyHint: {
    fontSize: 13,
  },
  
  // Add Weapon Button
  addWeaponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addWeaponBtnText: {
    fontSize: 15,
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

  // Choose Step
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

  // Catalog Step
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
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  catalogInfo: {
    flex: 1,
    gap: 2,
  },
  catalogName: {
    fontSize: 15,
    fontWeight: '600',
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
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  skipCatalogText: {
    fontSize: 14,
  },

  // Form Step
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
});

