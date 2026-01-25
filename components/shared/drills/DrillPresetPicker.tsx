/**
 * DrillPresetPicker - Select from saved drill presets
 *
 * Shows user's saved presets with:
 * - Drill goal icon
 * - Weapon category badge
 * - Quick stats (distance, shots)
 * - Default indicator
 */

import { useColors } from '@/hooks/ui/useColors';
import { getMyPresets, type DrillGoal, type DrillPreset } from '@/services/presetService';
import { getCategoryLabel } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { Check, Crosshair, Plus, Target, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface DrillPresetPickerProps {
  onSelect: (preset: DrillPreset) => void;
  onCreateNew: () => void;
  onClose: () => void;
  /** Filter presets by session purpose: 'grouping' shows only grouping, 'engagement' shows all others */
  filterByPurpose?: 'grouping' | 'engagement' | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getGoalIcon(goal: DrillGoal, color: string) {
  switch (goal) {
    case 'grouping':
      return <Target size={18} color={color} />;
    case 'engagement':
      return <Crosshair size={18} color={color} />;
    default:
      return <Target size={18} color={color} />;
  }
}

function getGoalLabel(goal: DrillGoal): string {
  switch (goal) {
    case 'grouping':
      return 'Grouping';
    case 'engagement':
      return 'Engagement';
    default:
      return goal;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillPresetPicker({ onSelect, onCreateNew, onClose, filterByPurpose }: DrillPresetPickerProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<DrillPreset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyPresets();
      setPresets(data);
    } catch (err: any) {
      console.error('Failed to load presets:', err);
      setError(err.message || 'Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  // Filter presets based on selected purpose
  const filteredPresets = presets.filter((preset) => {
    if (!filterByPurpose) return true; // No filter, show all

    if (filterByPurpose === 'grouping') {
      // Only show grouping drills
      return preset.drill_goal === 'grouping';
    } else {
      // Engagement: show everything except grouping (achievement, zeroing, physical, engagement)
      return preset.drill_goal !== 'grouping';
    }
  });

  // Get the title based on filter
  const getHeaderTitle = () => {
    if (filterByPurpose === 'grouping') return 'Grouping Drills';
    if (filterByPurpose === 'engagement') return 'Engagement Drills';
    return 'My Saved Drills';
  };

  const handleSelect = useCallback(
    (preset: DrillPreset) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(preset);
    },
    [onSelect]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Get empty state message based on filter
  const getEmptyMessage = () => {
    if (filterByPurpose === 'grouping') {
      return {
        title: 'No grouping drills yet',
        subtitle: 'Create a preset for your grouping practice sessions',
      };
    }
    if (filterByPurpose === 'engagement') {
      return {
        title: 'No engagement drills yet',
        subtitle: 'Create a preset for your target engagement sessions',
      };
    }
    return {
      title: 'No saved drills yet',
      subtitle: 'Create presets to quickly start your favorite drills',
    };
  };

  const emptyMessage = getEmptyMessage();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Create New */}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCreateNew();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.createIcon, { backgroundColor: colors.text }]}>
          <Plus size={16} color={colors.background} />
        </View>
        <Text style={[styles.createText, { color: colors.text }]}>Create New Preset</Text>
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : error ? (
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <TouchableOpacity onPress={loadPresets}>
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPresets.length === 0 ? (
        <View style={styles.emptyState}>
          <Target size={48} color={colors.textMuted} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyMessage.title}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{emptyMessage.subtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPresets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PresetRow preset={item} onPress={() => handleSelect(item)} colors={colors} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PresetRow({
  preset,
  onPress,
  colors,
}: {
  preset: DrillPreset;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.presetRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.presetIcon, { backgroundColor: colors.secondary }]}>
        {getGoalIcon(preset.drill_goal, colors.text)}
      </View>

      {/* Info */}
      <View style={styles.presetInfo}>
        <View style={styles.presetNameRow}>
          <Text style={[styles.presetName, { color: colors.text }]} numberOfLines={1}>
            {preset.name}
          </Text>
          {preset.is_default && (
            <View style={[styles.defaultBadge, { backgroundColor: `${colors.green}20` }]}>
              <Check size={10} color={colors.green} />
              <Text style={[styles.defaultText, { color: colors.green }]}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.presetMeta}>
          <Text style={[styles.presetStats, { color: colors.textMuted }]}>
            {preset.distance_m}m • {preset.rounds_per_shooter} shots
          </Text>
          {preset.weapon_category && preset.weapon_category !== 'any' && (
            <View style={[styles.categoryBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.categoryText, { color: colors.text }]}>
                {getCategoryLabel(preset.weapon_category as any)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Goal */}
      <View style={[styles.goalBadge, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.goalText, { color: colors.textMuted }]}>{getGoalLabel(preset.drill_goal)}</Text>
      </View>
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
  createBtn: {
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
  createIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
  },
  presetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  presetStats: {
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
