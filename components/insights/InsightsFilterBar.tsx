/**
 * Insights Filter Bar
 *
 * Comprehensive filter system for the Insights page.
 * Supports time, weapon, position, distance, drill type, and stress filters.
 */

import { useColors } from '@/hooks/ui/useColors';
import { getMyTeams } from '@/services/teamService';
import { getUserWeapons, type UserWeapon } from '@/services/weaponService';
import type { TeamWithRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  Filter,
  RotateCcw,
  X
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DEFAULT_FILTERS,
  DISTANCE_BUCKETS,
  DistanceFilter,
  DrillTypeFilter,
  FilterPreset,
  InsightsFilters,
  PositionFilter,
  TimeFilter,
} from './insights.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'week', label: '7D' },
  { value: 'month', label: '30D' },
  { value: 'quarter', label: '90D' },
  { value: 'year', label: '1Y' },
  { value: 'all', label: 'All' },
];

const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: 'all', label: 'All Positions' },
  { value: 'prone', label: 'Prone' },
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'sitting', label: 'Sitting' },
];

const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 'all', label: 'All Distances' },
  { value: 'close', label: DISTANCE_BUCKETS.close.label },
  { value: 'medium', label: DISTANCE_BUCKETS.medium.label },
  { value: 'long', label: DISTANCE_BUCKETS.long.label },
  { value: 'precision', label: DISTANCE_BUCKETS.precision.label },
];

const DRILL_TYPE_OPTIONS: { value: DrillTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'grouping', label: 'Grouping' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'stress', label: 'Stress/Timed' },
];

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'competition-prep',
    name: 'Competition Prep',
    icon: 'trophy',
    filters: { time: 'month', drillType: 'engagement' },
  },
  {
    id: 'zeroing',
    name: 'Zeroing',
    icon: 'crosshairs',
    filters: { drillType: 'grouping', position: 'prone' },
  },
  {
    id: 'stress-training',
    name: 'Stress Training',
    icon: 'heart',
    filters: { drillType: 'stress', stressOnly: true },
  },
];

// ============================================================================
// PROPS
// ============================================================================

interface InsightsFilterBarProps {
  filters: InsightsFilters;
  onFiltersChange: (filters: InsightsFilters) => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: InsightsFilters) => void;
}

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================

interface FilterChipProps {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
}

function FilterChip({
  label,
  value,
  placeholder,
  onPress,
  onClear,
  colors,
  compact = false,
}: FilterChipProps) {
  const hasValue = value !== null && value !== placeholder;

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        compact && styles.filterChipCompact,
        {
          backgroundColor: hasValue ? `${colors.primary}15` : colors.card,
          borderColor: hasValue ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!compact && (
        <Text style={[styles.filterChipLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
      )}
      <Text
        style={[
          styles.filterChipValue,
          { color: hasValue ? colors.primary : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      {hasValue && onClear ? (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <ChevronDown size={14} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// FILTER MODAL COMPONENT
// ============================================================================

interface FilterModalProps<T extends string> {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}

function FilterModal<T extends string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  colors,
}: FilterModalProps<T>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                {
                  backgroundColor:
                    selectedValue === option.value
                      ? `${colors.primary}15`
                      : 'transparent',
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option.value);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  {
                    color:
                      selectedValue === option.value ? colors.primary : colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsFilterBar({
  filters,
  onFiltersChange,
  presets = DEFAULT_PRESETS,
  onSavePreset,
}: InsightsFilterBarProps) {
  const colors = useColors();

  // Data for filters
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [teams, setTeams] = useState<TeamWithRole[]>([]);

  // Modal state
  const [showFilters, setShowFilters] = useState(false);
  const [activeModal, setActiveModal] = useState<
    'position' | 'distance' | 'drillType' | 'weapon' | 'team' | null
  >(null);

  // Load filter options
  useEffect(() => {
    async function load() {
      try {
        const [weaponsData, teamsData] = await Promise.all([
          getUserWeapons(),
          getMyTeams(),
        ]);
        setWeapons(weaponsData);
        setTeams(teamsData);
      } catch (e) {
        console.error('Failed to load filter options:', e);
      }
    }
    load();
  }, []);

  // Update a single filter
  const updateFilter = useCallback(
    <K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  // Apply preset
  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onFiltersChange({ ...DEFAULT_FILTERS, ...preset.filters });
    },
    [onFiltersChange]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.weaponId) count++;
    if (filters.teamId) count++;
    if (filters.position !== 'all') count++;
    if (filters.distance !== 'all') count++;
    if (filters.drillType !== 'all') count++;
    if (filters.stressOnly) count++;
    if (filters.timedOnly) count++;
    return count;
  }, [filters]);

  // Weapon options
  const weaponOptions = useMemo(
    () => [
      { value: '' as string, label: 'All Weapons' },
      ...weapons.map((w) => ({ value: w.id, label: w.name })),
    ],
    [weapons]
  );

  // Team options
  const teamOptions = useMemo(
    () => [
      { value: '' as string, label: 'All Teams' },
      ...teams.map((t) => ({ value: t.id, label: t.name })),
    ],
    [teams]
  );

  return (
    <View style={styles.container}>
      {/* Time Filter Pills - Always visible */}
      <View style={styles.timeRow}>
        {TIME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.timePill,
              {
                backgroundColor:
                  filters.time === option.value ? colors.primary : colors.card,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateFilter('time', option.value);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.timePillText,
                {
                  color:
                    filters.time === option.value ? '#fff' : colors.textMuted,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Filter toggle button */}
        <TouchableOpacity
          style={[
            styles.filterToggle,
            {
              backgroundColor:
                showFilters || activeFilterCount > 0
                  ? `${colors.primary}15`
                  : colors.card,
              borderColor:
                showFilters || activeFilterCount > 0
                  ? colors.primary
                  : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(!showFilters);
          }}
        >
          <Filter
            size={16}
            color={
              showFilters || activeFilterCount > 0
                ? colors.primary
                : colors.textMuted
            }
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expanded Filters */}
      {showFilters && (
        <View style={styles.expandedFilters}>
          {/* Presets Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetsRow}
            contentContainerStyle={styles.presetsContent}
          >
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetChip, { backgroundColor: colors.card }]}
                onPress={() => applyPreset(preset)}
                activeOpacity={0.7}
              >
                {preset.icon && (
                  <Ionicons
                    name={preset.icon as any}
                    size={14}
                    color={colors.textMuted}
                  />
                )}
                <Text style={[styles.presetText, { color: colors.text }]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Filter Chips */}
          <View style={styles.filtersGrid}>
            <FilterChip
              label="Position"
              value={
                filters.position === 'all'
                  ? null
                  : POSITION_OPTIONS.find((p) => p.value === filters.position)?.label ||
                    null
              }
              placeholder="All"
              onPress={() => setActiveModal('position')}
              onClear={
                filters.position !== 'all'
                  ? () => updateFilter('position', 'all')
                  : undefined
              }
              colors={colors}
            />

            <FilterChip
              label="Distance"
              value={
                filters.distance === 'all'
                  ? null
                  : DISTANCE_OPTIONS.find((d) => d.value === filters.distance)?.label ||
                    null
              }
              placeholder="All"
              onPress={() => setActiveModal('distance')}
              onClear={
                filters.distance !== 'all'
                  ? () => updateFilter('distance', 'all')
                  : undefined
              }
              colors={colors}
            />

            <FilterChip
              label="Type"
              value={
                filters.drillType === 'all'
                  ? null
                  : DRILL_TYPE_OPTIONS.find((d) => d.value === filters.drillType)
                      ?.label || null
              }
              placeholder="All"
              onPress={() => setActiveModal('drillType')}
              onClear={
                filters.drillType !== 'all'
                  ? () => updateFilter('drillType', 'all')
                  : undefined
              }
              colors={colors}
            />

            <FilterChip
              label="Weapon"
              value={
                filters.weaponId
                  ? weapons.find((w) => w.id === filters.weaponId)?.name || null
                  : null
              }
              placeholder="All"
              onPress={() => setActiveModal('weapon')}
              onClear={
                filters.weaponId
                  ? () => updateFilter('weaponId', null)
                  : undefined
              }
              colors={colors}
            />

            {teams.length > 0 && (
              <FilterChip
                label="Team"
                value={
                  filters.teamId
                    ? teams.find((t) => t.id === filters.teamId)?.name || null
                    : null
                }
                placeholder="All"
                onPress={() => setActiveModal('team')}
                onClear={
                  filters.teamId
                    ? () => updateFilter('teamId', null)
                    : undefined
                }
                colors={colors}
              />
            )}
          </View>

          {/* Toggle Filters */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                {
                  backgroundColor: filters.stressOnly
                    ? `${colors.primary}15`
                    : colors.card,
                  borderColor: filters.stressOnly ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateFilter('stressOnly', !filters.stressOnly);
              }}
            >
              <Ionicons
                name="heart"
                size={14}
                color={filters.stressOnly ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: filters.stressOnly ? colors.primary : colors.textMuted },
                ]}
              >
                High HR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleChip,
                {
                  backgroundColor: filters.timedOnly
                    ? `${colors.primary}15`
                    : colors.card,
                  borderColor: filters.timedOnly ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateFilter('timedOnly', !filters.timedOnly);
              }}
            >
              <Ionicons
                name="timer"
                size={14}
                color={filters.timedOnly ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: filters.timedOnly ? colors.primary : colors.textMuted },
                ]}
              >
                Timed
              </Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Reset button */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.card }]}
                onPress={resetFilters}
              >
                <RotateCcw size={14} color={colors.textMuted} />
                <Text style={[styles.resetText, { color: colors.textMuted }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Active Filters Summary (when collapsed) */}
      {!showFilters && activeFilterCount > 0 && (
        <View
          style={[styles.activeFiltersSummary, { backgroundColor: `${colors.primary}10` }]}
        >
          <Filter size={14} color={colors.primary} />
          <Text
            style={[styles.activeFiltersText, { color: colors.primary }]}
            numberOfLines={1}
          >
            {[
              filters.position !== 'all' &&
                POSITION_OPTIONS.find((p) => p.value === filters.position)?.label,
              filters.distance !== 'all' &&
                DISTANCE_OPTIONS.find((d) => d.value === filters.distance)?.label,
              filters.drillType !== 'all' &&
                DRILL_TYPE_OPTIONS.find((d) => d.value === filters.drillType)?.label,
              filters.weaponId &&
                weapons.find((w) => w.id === filters.weaponId)?.name,
              filters.teamId && teams.find((t) => t.id === filters.teamId)?.name,
              filters.stressOnly && 'High HR',
              filters.timedOnly && 'Timed',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <FilterModal
        visible={activeModal === 'position'}
        title="Filter by Position"
        options={POSITION_OPTIONS}
        selectedValue={filters.position}
        onSelect={(v) => updateFilter('position', v)}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />

      <FilterModal
        visible={activeModal === 'distance'}
        title="Filter by Distance"
        options={DISTANCE_OPTIONS}
        selectedValue={filters.distance}
        onSelect={(v) => updateFilter('distance', v)}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />

      <FilterModal
        visible={activeModal === 'drillType'}
        title="Filter by Drill Type"
        options={DRILL_TYPE_OPTIONS}
        selectedValue={filters.drillType}
        onSelect={(v) => updateFilter('drillType', v)}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />

      <FilterModal
        visible={activeModal === 'weapon'}
        title="Filter by Weapon"
        options={weaponOptions}
        selectedValue={filters.weaponId || ''}
        onSelect={(v) => updateFilter('weaponId', v || null)}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />

      <FilterModal
        visible={activeModal === 'team'}
        title="Filter by Team"
        options={teamOptions}
        selectedValue={filters.teamId || ''}
        onSelect={(v) => updateFilter('teamId', v || null)}
        onClose={() => setActiveModal(null)}
        colors={colors}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  filterBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Expanded filters
  expandedFilters: {
    gap: 12,
  },

  // Presets
  presetsRow: {
    flexGrow: 0,
  },
  presetsContent: {
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Filter chips
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterChipValue: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 80,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Active filters summary
  activeFiltersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: {
    fontSize: 16,
  },
});

export default InsightsFilterBar;
