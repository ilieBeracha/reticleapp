/**
 * WeaponPicker - Select a weapon for a session
 * 
 * Design: Clean, monochrome, Apple-inspired
 * - Typography-first, minimal decoration
 * - Category indicated subtly, not with loud colors
 * 
 * Supports weapon policy enforcement:
 * - personal: Show all weapons (default)
 * - catalog: Only team catalog weapons
 * - assigned: Only weapons assigned to current user
 */

// WeaponPolicy imports removed - team context now controls behavior directly
import { useColors } from '@/hooks/ui/useColors';
import type { WeaponCategory } from '@/services/weaponService';
import {
  getCategoryLabel,
  getWeaponPickerData,
  type GlobalWeapon,
  type TeamWeapon,
  type UserWeapon,
  type WeaponPickerData,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Crosshair,
  Lock,
  Plus,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type AnyWeapon = UserWeapon | TeamWeapon | GlobalWeapon;

interface WeaponSection {
  title: string;
  icon: React.ReactNode;
  data: AnyWeapon[];
  type: 'recent' | 'assigned' | 'personal' | 'team' | 'global';
}

interface WeaponPickerProps {
  selectedWeaponId?: string | null;
  onSelect: (weapon: UserWeapon) => void;
  onSelectCatalog?: (weapon: GlobalWeapon) => void;
  onAddNew?: () => void;
  onClose: () => void;
  /** When teamId is provided, only assigned weapons are shown (no personal weapons) */
  teamId?: string;
  weaponCategory?: WeaponCategory | 'any' | null;
  /** Hide the "Add New Weapon" option - for contexts where weapon creation isn't allowed */
  hideAddNew?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaponPicker({
  selectedWeaponId,
  onSelect,
  onSelectCatalog,
  onAddNew,
  onClose,
  teamId,
  weaponCategory,
  hideAddNew = false,
}: WeaponPickerProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeaponPickerData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  // In team context, only show assigned weapons (no personal weapons, no add new)
  const isTeamContext = !!teamId;
  
  // Hide add new button in team context
  const shouldHideAddNew = useMemo(() => {
    return hideAddNew || isTeamContext;
  }, [hideAddNew, isTeamContext]);

  useEffect(() => {
    loadWeapons();
  }, [teamId, weaponCategory]);

  const loadWeapons = async () => {
    try {
      setLoading(true);
      setError(null);
      const weaponData = await getWeaponPickerData({ 
        teamId, 
        weaponCategory,
      });
      setData(weaponData);
    } catch (err: any) {
      console.error('Failed to load weapons:', err);
      setError(err.message || 'Failed to load weapons');
    } finally {
      setLoading(false);
    }
  };

  const sections = useCallback((): WeaponSection[] => {
    if (!data) return [];

    const result: WeaponSection[] = [];
    const usedIds = new Set<string>();

    // When showing catalog, only show catalog section
    if (showCatalog) {
      if (data.globalWeapons.length > 0) {
        result.push({
          title: 'Catalog',
          icon: <Crosshair size={12} color={colors.textMuted} />,
          data: data.globalWeapons,
          type: 'global',
        });
      }
      return result;
    }

    // In team context: ONLY show assigned weapons (no personal, no team catalog)
    if (isTeamContext) {
      if (data.assignedToMe && data.assignedToMe.length > 0) {
        result.push({
          title: 'Your Assigned Weapon',
          icon: <Users size={12} color={colors.textMuted} />,
          data: data.assignedToMe,
          type: 'assigned',
        });
      }
      return result;
    }

    // Non-team view: show recent, assigned, my weapons, team (no catalog)
    if (data.recentlyUsed.length > 0) {
      result.push({
        title: 'Recent',
        icon: <Clock size={12} color={colors.textMuted} />,
        data: data.recentlyUsed,
        type: 'recent',
      });
      data.recentlyUsed.forEach(w => usedIds.add(w.id));
    }

    if (data.assignedToMe && data.assignedToMe.length > 0) {
      const assignedFiltered = data.assignedToMe.filter(w => !usedIds.has(w.id));
      if (assignedFiltered.length > 0) {
        result.push({
          title: 'Assigned',
          icon: <Users size={12} color={colors.textMuted} />,
          data: assignedFiltered,
          type: 'assigned',
        });
        assignedFiltered.forEach(w => usedIds.add(w.id));
      }
    }

    const myWeaponsFiltered = data.myWeapons.filter(w => !usedIds.has(w.id));
    if (myWeaponsFiltered.length > 0) {
      result.push({
        title: 'My Weapons',
        icon: <Star size={12} color={colors.textMuted} />,
        data: myWeaponsFiltered,
        type: 'personal',
      });
      myWeaponsFiltered.forEach(w => usedIds.add(w.id));
    }

    const teamWeaponsFiltered = data.teamWeapons.filter(w => !usedIds.has(w.id));
    if (teamWeaponsFiltered.length > 0) {
      result.push({
        title: 'Team',
        icon: <Users size={12} color={colors.textMuted} />,
        data: teamWeaponsFiltered,
        type: 'team',
      });
    }

    return result;
  }, [data, colors, showCatalog, isTeamContext]);

  const filteredSections = useCallback((): WeaponSection[] => {
    const allSections = sections();
    if (!searchQuery.trim()) return allSections;
    
    const query = searchQuery.toLowerCase();
    return allSections
      .map(section => ({
        ...section,
        data: section.data.filter(weapon => 
          weapon.name.toLowerCase().includes(query) ||
          (weapon.caliber && weapon.caliber.toLowerCase().includes(query)) ||
          ('manufacturer' in weapon && weapon.manufacturer?.toLowerCase().includes(query))
        ),
      }))
      .filter(section => section.data.length > 0);
  }, [sections, searchQuery]);

  const handleSelectWeapon = useCallback((weapon: AnyWeapon, type: WeaponSection['type']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (type === 'global') {
      // Catalog weapons need to be created as user weapons first
      if (onSelectCatalog) {
        onSelectCatalog(weapon as GlobalWeapon);
      } else if (onAddNew && !shouldHideAddNew) {
        // Fallback: trigger add new flow with catalog weapon pre-selected
        onAddNew();
      }
    } else {
      // Personal, recent, assigned, team - all are user weapons
      onSelect(weapon as UserWeapon);
    }
  }, [onSelect, onSelectCatalog, onAddNew, shouldHideAddNew]);

  const handleShowCatalog = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCatalog(true);
    setSearchQuery('');
  }, []);

  const handleBackToMyWeapons = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCatalog(false);
    setSearchQuery('');
  }, []);

  const handleCreateCustom = useCallback(() => {
    if (onAddNew && !shouldHideAddNew) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddNew();
    }
  }, [onAddNew, shouldHideAddNew]);

  // Get context-appropriate empty state content
  const getEmptyStateContent = useCallback(() => {
    if (searchQuery) {
      return {
        icon: <Crosshair size={28} color={colors.textMuted} />,
        title: 'No matches',
        hint: 'Try a different search',
      };
    }
    
    // Team context: Only assigned weapons allowed
    if (isTeamContext) {
      return {
        icon: <Lock size={28} color={colors.textMuted} />,
        title: 'No weapon assigned',
        hint: 'Ask your commander to assign you a weapon',
      };
    }
    
    return {
      icon: <Crosshair size={28} color={colors.textMuted} />,
      title: 'No weapons yet',
      hint: 'Add your first weapon to get started',
    };
  }, [searchQuery, colors, isTeamContext]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
    
   

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={showCatalog ? 'Search catalog...' : 'Search...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action buttons based on view - hidden when policy restricts or hideAddNew is true */}
      {!shouldHideAddNew && (
        showCatalog ? (
          <TouchableOpacity
            style={[styles.addNewBtn, { backgroundColor: colors.card }]}
            onPress={handleCreateCustom}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.text} strokeWidth={2} />
            <Text style={[styles.addText, { color: colors.text }]}>
              Create Custom Weapon
            </Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addNewBtn, { backgroundColor: colors.text }]}
            onPress={handleShowCatalog}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.background} strokeWidth={2} />
            <Text style={[styles.addText, { color: colors.background }]}>
              Add New Weapon
            </Text>
            <ChevronRight size={14} color={colors.background + '80'} />
          </TouchableOpacity>
        )
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : error ? (
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: colors.card }]}
            onPress={loadWeapons}
          >
            <Text style={[styles.retryText, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={filteredSections()}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              {section.icon}
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <WeaponCard
              weapon={item}
              type={section.type}
              isSelected={selectedWeaponId === item.id}
              onPress={() => handleSelectWeapon(item, section.type)}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            (() => {
              const emptyContent = getEmptyStateContent();
              return (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                    {emptyContent.icon}
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {emptyContent.title}
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                    {emptyContent.hint}
                  </Text>
                </View>
              );
            })()
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ============================================================================
// WEAPON CARD - Clean, minimal
// ============================================================================

function WeaponCard({
  weapon,
  type,
  isSelected,
  onPress,
  colors,
}: {
  weapon: AnyWeapon;
  type: WeaponSection['type'];
  isSelected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const getSubtitle = () => {
    if ('manufacturer' in weapon && weapon.manufacturer) {
      return `${weapon.manufacturer}${weapon.caliber ? ` • ${weapon.caliber}` : ''}`;
    }
    if ('base_weapon' in weapon && weapon.base_weapon) {
      return `${weapon.base_weapon.manufacturer || ''}${weapon.caliber || weapon.base_weapon.caliber ? ` • ${weapon.caliber || weapon.base_weapon.caliber}` : ''}`;
    }
    return weapon.caliber || getCategoryLabel(weapon.category);
  };

  const isFavorite = 'is_favorite' in weapon && weapon.is_favorite;
  const isCatalog = type === 'global';

  return (
    <TouchableOpacity
      style={[
        styles.weaponCard,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.text : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.weaponContent}>
        <View style={styles.weaponNameRow}>
          <Text
            style={[styles.weaponName, { color: colors.text }]}
            numberOfLines={1}
          >
            {weapon.name}
          </Text>
          {isFavorite && (
            <Star size={12} color={colors.textMuted} fill={colors.textMuted} />
          )}
        </View>
        <Text
          style={[styles.weaponSubtitle, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {getSubtitle()}
        </Text>
      </View>

      {isCatalog ? (
        <View style={[styles.addBtnSmall, { backgroundColor: colors.text }]}>
          <Plus size={14} color={colors.background} strokeWidth={2.5} />
        </View>
      ) : isSelected ? (
        <Check size={16} color={colors.text} strokeWidth={2.5} />
      ) : (
        <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
          {getCategoryLabel(weapon.category)?.split(' ')[0]}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  addText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  weaponContent: {
    flex: 1,
  },
  weaponNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weaponName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  weaponSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  addBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
  },
});
