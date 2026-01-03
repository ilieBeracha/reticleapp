/**
 * CategoryDrillPicker - Select a drill for a session
 */

import {
  type CategoryDrill,
  type DrillType,
  groupDrillsByType,
} from '@/constants/categoryDrills';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Award,
  Check,
  Target
} from 'lucide-react-native';
import { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES & CONFIG
// ============================================================================

interface CategoryDrillPickerProps {
  category: WeaponCategory | null;
  onSelectDrill: (drill: CategoryDrill) => void;
  selectedDrillId?: string | null;
  showHeader?: boolean;
  /** Filter drills to only show specific types */
  filterTypes?: DrillType[];
}

const DRILL_TYPE_LABELS: Record<DrillType, string> = {
  zeroing: 'Zeroing',
  grouping: 'Grouping',
  qualification: 'Qualification',
  speed: 'Speed',
  accuracy: 'Accuracy',
  transition: 'Transitions',
  movement: 'Movement',
  stress: 'Stress',
  diagnostic: 'Diagnostic',
  competition: 'Competition',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#3B82F6',
  advanced: '#F59E0B',
  expert: '#EF4444',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CategoryDrillPicker({
  category,
  onSelectDrill,
  selectedDrillId,
  showHeader = true,
  filterTypes,
}: CategoryDrillPickerProps) {
  const colors = useColors();
  const categoryConfig = category ? getCategoryConfig(category) : null;
  const groupedDrills: Partial<Record<DrillType, CategoryDrill[]>> = category
    ? groupDrillsByType(category)
    : {};

  // Filter drill types based on filterTypes prop
  const allDrillTypes = Object.keys(groupedDrills) as DrillType[];
  const drillTypes = filterTypes?.length
    ? allDrillTypes.filter(type => filterTypes.includes(type))
    : allDrillTypes;

  if (!category || drillTypes.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Target size={28} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Select a weapon to see drills
        </Text>
      </View>
    );
  }

  const handlePress = (drill: CategoryDrill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectDrill(drill);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={!showHeader ? styles.contentNoHeader : undefined}
      showsVerticalScrollIndicator={false}
    >
      {showHeader && categoryConfig && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {categoryConfig.label}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {drillTypes.length} drill types available
          </Text>
        </View>
      )}

      {drillTypes.map((type) => {
        const drills = groupedDrills[type];
        if (!drills?.length) return null;

        return (
          <View key={type} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {DRILL_TYPE_LABELS[type]}
            </Text>
            <View style={styles.drillList}>
              {drills.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  isSelected={selectedDrillId === drill.id}
                  onPress={() => handlePress(drill)}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================================
// DRILL CARD
// ============================================================================

const DrillCard = memo(function DrillCard({
  drill,
  isSelected,
  onPress,
}: {
  drill: CategoryDrill;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const diffColor = DIFFICULTY_COLORS[drill.difficulty] || colors.textMuted;

  const specs = [
    `${drill.distances[0]}m`,
    `${drill.rounds} rds`,
    drill.totalTimeLimit ? `${drill.totalTimeLimit}s` : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.text : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          {isSelected && <Check size={16} color={colors.text} strokeWidth={2.5} />}
        </View>

        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
          {drill.description}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.specs}>
            {specs.map((spec, i) => (
              <View key={i} style={[styles.specBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.specText, { color: colors.text }]}>{spec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardRight}>
            {drill.isStandard && (
              <View style={[styles.standardBadge, { backgroundColor: colors.secondary }]}>
                <Award size={10} color={colors.textMuted} />
              </View>
            )}
            <Text style={[styles.diffText, { color: diffColor }]}>
              {drill.difficulty.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentNoHeader: { paddingTop: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  headerSub: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 },
  drillList: { paddingHorizontal: 12, gap: 8 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1 },
  cardMain: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  specs: { flexDirection: 'row', gap: 6 },
  specBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  specText: { fontSize: 12, fontWeight: '500' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  standardBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  diffText: { fontSize: 12, fontWeight: '700' },
});

export default CategoryDrillPicker;
