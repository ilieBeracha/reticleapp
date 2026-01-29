/**
 * Insights Filter Bar
 *
 * Clean, minimal filter system with bottom sheet for detailed filters.
 * Only includes filters that actually work.
 */

import { useColors } from '@/hooks/ui/useColors';
import { getMyTeams } from '@/services/teamService';
import { getUserWeapons, type UserWeapon } from '@/services/weaponService';
import type { TeamWithRole } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Check, Filter, RotateCcw, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type {
  DistanceFilter,
  DrillTypeFilter,
  InsightsFilters,
  PositionFilter,
  TimeFilter,
} from '@/types/insights';
import { DEFAULT_FILTERS, DISTANCE_BUCKETS } from '@/constants/insights';

// ============================================================================
// CONSTANTS
// ============================================================================

const getTimeOptions = (t: ReturnType<typeof useTranslation>['t']): { value: TimeFilter; label: string; short: string }[] => [
  { value: 'week', label: t('insights.filters.last7Days'), short: '7D' },
  { value: 'month', label: t('insights.filters.last30Days'), short: '30D' },
  { value: 'quarter', label: t('insights.filters.last90Days'), short: '90D' },
  { value: 'year', label: t('insights.filters.lastYear'), short: '1Y' },
  { value: 'all', label: t('insights.filters.allTime'), short: t('insights.filters.all') },
];

const getPositionOptions = (t: ReturnType<typeof useTranslation>['t']): { value: PositionFilter; label: string }[] => [
  { value: 'all', label: t('insights.filters.allPositions') },
  { value: 'prone', label: t('session.prone') },
  { value: 'standing', label: t('session.standing') },
  { value: 'kneeling', label: t('session.kneeling') },
  { value: 'sitting', label: t('session.sitting') },
];

const getDistanceOptions = (t: ReturnType<typeof useTranslation>['t']): { value: DistanceFilter; label: string }[] => [
  { value: 'all', label: t('insights.filters.allDistances') },
  { value: 'close', label: DISTANCE_BUCKETS.close.label },
  { value: 'medium', label: DISTANCE_BUCKETS.medium.label },
  { value: 'long', label: DISTANCE_BUCKETS.long.label },
  { value: 'precision', label: DISTANCE_BUCKETS.precision.label },
];

const getDrillTypeOptions = (t: ReturnType<typeof useTranslation>['t']): { value: DrillTypeFilter; label: string }[] => [
  { value: 'all', label: t('insights.filters.allTypes') },
  { value: 'grouping', label: t('session.grouping') },
  { value: 'engagement', label: t('session.engagement') },
];

// ============================================================================
// PROPS
// ============================================================================

interface InsightsFilterBarProps {
  filters: InsightsFilters;
  onFiltersChange: (filters: InsightsFilters) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsFilterBar({ filters, onFiltersChange }: InsightsFilterBarProps) {
  const { t } = useTranslation();
  const colors = useColors();
  
  const TIME_OPTIONS = getTimeOptions(t);
  const POSITION_OPTIONS = getPositionOptions(t);
  const DISTANCE_OPTIONS = getDistanceOptions(t);
  const DRILL_TYPE_OPTIONS = getDrillTypeOptions(t);

  // Data for filters
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [teams, setTeams] = useState<TeamWithRole[]>([]);

  // Bottom sheet state
  const [showSheet, setShowSheet] = useState(false);

  // Load filter options
  useEffect(() => {
    async function load() {
      try {
        const [weaponsData, teamsData] = await Promise.all([getUserWeapons(), getMyTeams()]);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFiltersChange(DEFAULT_FILTERS);
    setShowSheet(false);
  }, [onFiltersChange]);

  // Count active filters (excluding time)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.weaponId) count++;
    if (filters.teamId) count++;
    if (filters.position !== 'all') count++;
    if (filters.distance !== 'all') count++;
    if (filters.drillType !== 'all') count++;
    return count;
  }, [filters]);

  // Get active filter summary text
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.position !== 'all') {
      parts.push(POSITION_OPTIONS.find((p) => p.value === filters.position)?.label || '');
    }
    if (filters.distance !== 'all') {
      parts.push(DISTANCE_OPTIONS.find((d) => d.value === filters.distance)?.label || '');
    }
    if (filters.drillType !== 'all') {
      parts.push(DRILL_TYPE_OPTIONS.find((d) => d.value === filters.drillType)?.label || '');
    }
    if (filters.weaponId) {
      parts.push(weapons.find((w) => w.id === filters.weaponId)?.name || t('weapons.weapon'));
    }
    if (filters.teamId) {
      parts.push(teams.find((t) => t.id === filters.teamId)?.name || t('teams.team'));
    }
    return parts.join(' · ');
  }, [filters, weapons, teams]);

  return (
    <View style={styles.container}>
      {/* Time Pills + Filter Button */}
      <View style={styles.row}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePills}>
          {TIME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timePill,
                {
                  backgroundColor: filters.time === option.value ? colors.text : colors.card,
                },
              ]}
              onPress={() => updateFilter('time', option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timePillText,
                  {
                    color: filters.time === option.value ? colors.background : colors.textMuted,
                  },
                ]}
              >
                {option.short}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFilterCount > 0 ? colors.primary + '15' : colors.card,
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSheet(true);
          }}
          activeOpacity={0.7}
        >
          <Filter size={16} color={activeFilterCount > 0 ? colors.primary : colors.textMuted} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.primary + '08' }]}
          onPress={() => setShowSheet(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.summaryText, { color: colors.primary }]} numberOfLines={1}>
            {filterSummary}
          </Text>
          <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={14} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <View style={styles.sheetOverlay}>
          {/* Backdrop - tapping dismisses */}
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowSheet(false)} />

          {/* Sheet content - View instead of Pressable so ScrollView works */}
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            {/* Handle */}
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('insights.filters.title')}</Text>
              <View style={styles.sheetHeaderRight}>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: colors.secondary }]}
                    onPress={resetFilters}
                  >
                    <RotateCcw size={14} color={colors.textMuted} />
                    <Text style={[styles.resetBtnText, { color: colors.textMuted }]}>{t('common.reset')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowSheet(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContentInner} showsVerticalScrollIndicator={false}>
              {/* Position */}
              <FilterSection
                title={t('session.position')}
                options={POSITION_OPTIONS}
                selectedValue={filters.position}
                onSelect={(v) => updateFilter('position', v as PositionFilter)}
                colors={colors}
              />

              {/* Distance */}
              <FilterSection
                title={t('session.distance')}
                options={DISTANCE_OPTIONS}
                selectedValue={filters.distance}
                onSelect={(v) => updateFilter('distance', v as DistanceFilter)}
                colors={colors}
              />

              {/* Drill Type */}
              <FilterSection
                title={t('insights.filters.type')}
                options={DRILL_TYPE_OPTIONS}
                selectedValue={filters.drillType}
                onSelect={(v) => updateFilter('drillType', v as DrillTypeFilter)}
                colors={colors}
              />

              {/* Weapon */}
              {weapons.length > 0 && (
                <FilterSection
                  title={t('weapons.weapon')}
                  options={[
                    { value: '', label: t('insights.filters.allWeapons') },
                    ...weapons.map((w) => ({ value: w.id, label: w.name })),
                  ]}
                  selectedValue={filters.weaponId || ''}
                  onSelect={(v) => updateFilter('weaponId', v || null)}
                  colors={colors}
                />
              )}

              {/* Team */}
              {teams.length > 0 && (
                <FilterSection
                  title={t('teams.team')}
                  options={[{ value: '', label: t('insights.filters.allTeams') }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
                  selectedValue={filters.teamId || ''}
                  onSelect={(v) => updateFilter('teamId', v || null)}
                  colors={colors}
                />
              )}
            </ScrollView>

            {/* Apply Button */}
            <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: colors.text }]}
                onPress={() => setShowSheet(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.applyBtnText, { color: colors.background }]}>{t('insights.filters.applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// FILTER SECTION COMPONENT
// ============================================================================

interface FilterSectionProps {
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  colors: ReturnType<typeof useColors>;
}

function FilterSection({ title, options, selectedValue, onSelect, colors }: FilterSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={styles.optionsGrid}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          const isAll = option.value === '' || option.value === 'all';

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected ? (isAll ? colors.secondary : colors.primary + '15') : colors.background,
                  borderColor: isSelected ? (isAll ? colors.border : colors.primary) : colors.border,
                },
              ]}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionChipText,
                  {
                    color: isSelected && !isAll ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {isSelected && !isAll && <Check size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },

  // Top row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePills: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 8,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtn: {
    width: 42,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContentInner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 24,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Filter section
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 14,
  },
});

export default InsightsFilterBar;
