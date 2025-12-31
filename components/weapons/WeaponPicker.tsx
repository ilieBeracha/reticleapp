/**
 * WeaponPicker - Select a weapon for a session
 * 
 * Displays weapons in prioritized sections:
 * 1. Recently Used
 * 2. My Weapons (favorites first)
 * 3. Team Weapons (if in team context)
 * 4. Standard Weapons (catalog)
 * 
 * Includes search and "Add new" option
 */

import { useColors } from '@/hooks/ui/useColors';
import {
    getCategoryLabel,
    getWeaponPickerData,
    type GlobalWeapon,
    type TeamWeapon,
    type UserWeapon,
    type WeaponCategory,
    type WeaponPickerData,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
    Check,
    ChevronRight,
    Clock,
    Plus,
    Search,
    Star,
    Users,
    X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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
  onAddNew: () => void;
  onClose: () => void;
  teamId?: string;
  /** Filter weapons by category (from drill's weapon_category) */
  weaponCategory?: WeaponCategory | 'any' | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaponPicker({
  selectedWeaponId,
  onSelect,
  onAddNew,
  onClose,
  teamId,
  weaponCategory,
}: WeaponPickerProps) {
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeaponPickerData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load weapons
  useEffect(() => {
    loadWeapons();
  }, [teamId, weaponCategory]);

  const loadWeapons = async () => {
    try {
      setLoading(true);
      setError(null);
      const weaponData = await getWeaponPickerData({ teamId, weaponCategory });
      setData(weaponData);
    } catch (err: any) {
      console.error('Failed to load weapons:', err);
      setError(err.message || 'Failed to load weapons');
    } finally {
      setLoading(false);
    }
  };

  // Build sections from data
  const sections = useCallback((): WeaponSection[] => {
    if (!data) return [];
    
    const result: WeaponSection[] = [];
    const usedIds = new Set<string>();
    
    // Recently Used (only user weapons that were recently used)
    if (data.recentlyUsed.length > 0) {
      result.push({
        title: 'Recently Used',
        icon: <Clock size={14} color={colors.textMuted} />,
        data: data.recentlyUsed,
        type: 'recent',
      });
      data.recentlyUsed.forEach(w => usedIds.add(w.id));
    }
    
    // Assigned To Me (team weapons assigned to current user)
    if (data.assignedToMe && data.assignedToMe.length > 0) {
      const assignedFiltered = data.assignedToMe.filter(w => !usedIds.has(w.id));
      if (assignedFiltered.length > 0) {
        result.push({
          title: 'Assigned To Me',
          icon: <Users size={14} color={colors.primary} />,
          data: assignedFiltered,
          type: 'assigned',
        });
        assignedFiltered.forEach(w => usedIds.add(w.id));
      }
    }
    
    // My Weapons (exclude already shown)
    const myWeaponsFiltered = data.myWeapons.filter(w => !usedIds.has(w.id));
    if (myWeaponsFiltered.length > 0) {
      result.push({
        title: 'My Weapons',
        icon: <Star size={14} color={colors.textMuted} />,
        data: myWeaponsFiltered,
        type: 'personal',
      });
      myWeaponsFiltered.forEach(w => usedIds.add(w.id));
    }
    
    // Team Weapons (exclude assigned weapons)
    const teamWeaponsFiltered = data.teamWeapons.filter(w => !usedIds.has(w.id));
    if (teamWeaponsFiltered.length > 0) {
      result.push({
        title: 'Team Weapons',
        icon: <Users size={14} color={colors.textMuted} />,
        data: teamWeaponsFiltered,
        type: 'team',
      });
    }
    
    // Standard Weapons (global catalog)
    if (data.globalWeapons.length > 0) {
      result.push({
        title: 'Standard Weapons',
        icon: <ChevronRight size={14} color={colors.textMuted} />,
        data: data.globalWeapons,
        type: 'global',
      });
    }
    
    return result;
  }, [data, colors]);

  // Filter by search
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

  // Handle selection
  const handleSelectWeapon = useCallback((weapon: AnyWeapon, type: WeaponSection['type']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (type === 'personal' || type === 'recent') {
      // Already a user weapon
      onSelect(weapon as UserWeapon);
    } else if (type === 'assigned') {
      // Team weapon assigned to user - parent should create a personal profile
      // Pass the team weapon for now
      onSelect(weapon as any);
    } else {
      // TODO: For team/global weapons, we should create a user weapon reference
      // For now, just pass it along - the parent can handle creating the link
      onSelect(weapon as UserWeapon);
    }
  }, [onSelect]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Weapon</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search weapons..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add new button */}
      <TouchableOpacity
        style={[styles.addNewBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddNew();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.addIcon, { backgroundColor: colors.text }]}>
          <Plus size={16} color={colors.background} />
        </View>
        <Text style={[styles.addText, { color: colors.text }]}>Add New Weapon</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : error ? (
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <TouchableOpacity onPress={loadWeapons}>
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
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
            <WeaponRow
              weapon={item}
              type={section.type}
              isSelected={selectedWeaponId === item.id}
              onPress={() => handleSelectWeapon(item, section.type)}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery ? 'No weapons found' : 'No weapons yet'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Tap "Add New Weapon" to get started
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function WeaponRow({
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
  // Get display info based on weapon type
  const getSubtitle = () => {
    if ('manufacturer' in weapon && weapon.manufacturer) {
      return `${weapon.manufacturer} • ${weapon.caliber || ''}`;
    }
    if ('base_weapon' in weapon && weapon.base_weapon) {
      return `${weapon.base_weapon.manufacturer || ''} • ${weapon.caliber || weapon.base_weapon.caliber || ''}`;
    }
    return weapon.caliber || getCategoryLabel(weapon.category);
  };

  const isFavorite = 'is_favorite' in weapon && weapon.is_favorite;
  const isVerified = 'is_verified' in weapon && weapon.is_verified;

  return (
    <TouchableOpacity
      style={[
        styles.weaponRow,
        { borderBottomColor: colors.border },
        isSelected && { backgroundColor: `${colors.text}08` },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.weaponInfo}>
        <View style={styles.weaponNameRow}>
          <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
            {weapon.name}
          </Text>
          {isFavorite && <Star size={12} color={colors.orange} fill={colors.orange} />}
          {isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: `${colors.green}20` }]}>
              <Check size={10} color={colors.green} />
            </View>
          )}
        </View>
        <Text style={[styles.weaponSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {getSubtitle()}
        </Text>
      </View>
      
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.text }]}>
          <Check size={14} color={colors.background} />
        </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
    gap: 12,
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  weaponInfo: {
    flex: 1,
  },
  weaponNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  weaponSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
  },
});

