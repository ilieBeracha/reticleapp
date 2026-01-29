import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DATE_RANGE_OPTIONS,
  DEFAULT_FILTERS,
  DISTANCE_PRESETS,
  DRILL_GOAL_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from './SessionHistory.constants';
import { countActiveFilters } from './SessionHistory.helpers';
import type { DateRangePreset, SessionFilters, SortConfig, SortField } from '@/types/sessionHistory';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SessionFilters;
  sort: SortConfig;
  onApplyFilters: (filters: SessionFilters) => void;
  onApplySort: (sort: SortConfig) => void;
  onReset: () => void;
  availableWeapons?: { id: string; name: string }[];
}

// Pill button for filter options
function FilterPill({
  label,
  selected,
  onPress,
  color,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: selected ? (color || colors.primary) : colors.card,
          borderColor: selected ? (color || colors.primary) : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.pillText,
          { color: selected ? '#fff' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Section header
function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>
  );
}

export function FilterSheet({
  isOpen,
  onClose,
  filters,
  sort,
  onApplyFilters,
  onApplySort,
  onReset,
  availableWeapons = [],
}: FilterSheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  
  // Local state for editing
  const [localFilters, setLocalFilters] = useState<SessionFilters>(filters);
  const [localSort, setLocalSort] = useState<SortConfig>(sort);
  
  // Reset local state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
      setLocalSort(sort);
    }
  }, [isOpen, filters, sort]);
  
  // Toggle array filter
  const toggleArrayFilter = useCallback(<T extends string>(
    key: keyof SessionFilters,
    value: T
  ) => {
    setLocalFilters(prev => {
      const arr = prev[key] as T[];
      const newArr = arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
      return { ...prev, [key]: newArr };
    });
  }, []);
  
  // Apply and close
  const handleApply = useCallback(() => {
    onApplyFilters(localFilters);
    onApplySort(localSort);
    onClose();
  }, [localFilters, localSort, onApplyFilters, onApplySort, onClose]);
  
  // Reset all
  const handleReset = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS);
    setLocalSort({ field: 'date', direction: 'desc' });
  }, []);
  
  const activeCount = countActiveFilters(localFilters);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {activeCount > 0 ? t('session.filtersWithCount', { count: activeCount }) : t('session.filters')}
          </Text>
          <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
            <Text style={[styles.resetText, { color: colors.primary }]}>{t('common.reset')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Sort */}
          <SectionHeader title={t('session.sortBySection')} colors={colors} />
          <View style={styles.pillRow}>
            {SORT_OPTIONS.map(option => (
              <FilterPill
                key={option.value}
                label={t(`session.sortField.${option.value}`)}
                selected={localSort.field === option.value}
                onPress={() => setLocalSort(prev => ({
                  field: option.value,
                  direction: prev.field === option.value && prev.direction === 'desc' ? 'asc' : 'desc',
                }))}
                colors={colors}
              />
            ))}
          </View>
          <View style={styles.sortDirectionRow}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                { 
                  backgroundColor: localSort.direction === 'desc' ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setLocalSort(prev => ({ ...prev, direction: 'desc' }))}
            >
              <Ionicons 
                name="arrow-down" 
                size={16} 
                color={localSort.direction === 'desc' ? '#fff' : colors.text} 
              />
              <Text style={{ color: localSort.direction === 'desc' ? '#fff' : colors.text, marginLeft: 4 }}>
                {t('session.newest')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionButton,
                { 
                  backgroundColor: localSort.direction === 'asc' ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setLocalSort(prev => ({ ...prev, direction: 'asc' }))}
            >
              <Ionicons 
                name="arrow-up" 
                size={16} 
                color={localSort.direction === 'asc' ? '#fff' : colors.text} 
              />
              <Text style={{ color: localSort.direction === 'asc' ? '#fff' : colors.text, marginLeft: 4 }}>
                {t('session.oldest')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Range */}
          <SectionHeader title={t('session.timePeriodSection')} colors={colors} />
          <View style={styles.pillRow}>
            {DATE_RANGE_OPTIONS.map(option => (
              <FilterPill
                key={option.value}
                label={t(`session.dateRange.${option.value}`)}
                selected={localFilters.dateRange === option.value}
                onPress={() => setLocalFilters(prev => ({ ...prev, dateRange: option.value }))}
                colors={colors}
              />
            ))}
          </View>

          {/* Status */}
          <SectionHeader title={t('session.statusSection')} colors={colors} />
          <View style={styles.pillRow}>
            {STATUS_OPTIONS.map(option => (
              <FilterPill
                key={option.value}
                label={t(`common.${option.value}`)}
                selected={localFilters.status.includes(option.value as any)}
                onPress={() => toggleArrayFilter('status', option.value)}
                color={option.color}
                colors={colors}
              />
            ))}
          </View>

          {/* Drill Goal */}
          <SectionHeader title={t('session.drillTypeSection')} colors={colors} />
          <View style={styles.pillRow}>
            {DRILL_GOAL_OPTIONS.map(option => (
              <FilterPill
                key={option.value}
                label={option.value === 'grouping' ? t('session.grouping') : t('session.engagement')}
                selected={localFilters.drillGoal.includes(option.value as any)}
                onPress={() => toggleArrayFilter('drillGoal', option.value)}
                colors={colors}
              />
            ))}
          </View>

          {/* Session Mode */}
          <SectionHeader title={t('session.sessionModeSection')} colors={colors} />
          <View style={styles.pillRow}>
            <FilterPill
              label={t('session.solo')}
              selected={localFilters.sessionMode.includes('solo')}
              onPress={() => toggleArrayFilter('sessionMode', 'solo')}
              colors={colors}
            />
            <FilterPill
              label={t('session.group')}
              selected={localFilters.sessionMode.includes('group')}
              onPress={() => toggleArrayFilter('sessionMode', 'group')}
              colors={colors}
            />
          </View>

          {/* Distance */}
          <SectionHeader title={t('session.distanceSection')} colors={colors} />
          <View style={styles.pillRow}>
            {DISTANCE_PRESETS.slice(0, 6).map(distance => (
              <FilterPill
                key={distance}
                label={`${distance}m`}
                selected={localFilters.distanceRange.min === distance || localFilters.distanceRange.max === distance}
                onPress={() => {
                  setLocalFilters(prev => ({
                    ...prev,
                    distanceRange: prev.distanceRange.min === distance 
                      ? { min: null, max: null }
                      : { min: distance, max: distance },
                  }));
                }}
                colors={colors}
              />
            ))}
          </View>

          {/* Source */}
          <SectionHeader title={t('session.sourceSection')} colors={colors} />
          <View style={styles.pillRow}>
            <FilterPill
              label={t('session.watch')}
              selected={localFilters.watchControlled === true}
              onPress={() => setLocalFilters(prev => ({
                ...prev,
                watchControlled: prev.watchControlled === true ? null : true,
              }))}
              colors={colors}
            />
            <FilterPill
              label={t('session.manualLabel')}
              selected={localFilters.watchControlled === false}
              onPress={() => setLocalFilters(prev => ({
                ...prev,
                watchControlled: prev.watchControlled === false ? null : false,
              }))}
              colors={colors}
            />
            <FilterPill
              label={t('session.teamLabel')}
              selected={localFilters.hasTeam === true}
              onPress={() => setLocalFilters(prev => ({
                ...prev,
                hasTeam: prev.hasTeam === true ? null : true,
              }))}
              colors={colors}
            />
            <FilterPill
              label={t('session.personalLabel')}
              selected={localFilters.hasTeam === false}
              onPress={() => setLocalFilters(prev => ({
                ...prev,
                hasTeam: prev.hasTeam === false ? null : false,
              }))}
              colors={colors}
            />
          </View>

          {/* Weapons (if available) */}
          {availableWeapons.length > 0 && (
            <>
              <SectionHeader title={t('session.weaponSection')} colors={colors} />
              <View style={styles.pillRow}>
                {availableWeapons.slice(0, 8).map(weapon => (
                  <FilterPill
                    key={weapon.id}
                    label={weapon.name}
                    selected={localFilters.weaponIds.includes(weapon.id)}
                    onPress={() => toggleArrayFilter('weaponIds', weapon.id)}
                    colors={colors}
                  />
                ))}
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Apply Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>{t('session.applyFilters')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  
  // Section
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  
  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Sort direction
  sortDirectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  directionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  
  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomSpacer: {
    height: 40,
  },
});

