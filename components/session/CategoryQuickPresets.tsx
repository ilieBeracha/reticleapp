/**
 * CategoryQuickPresets
 * 
 * Shows quick-start presets based on the selected weapon's category.
 * "Your weapon category shapes your training experience."
 */

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Icon } from '@/components/icon';
import type { QuickPreset } from '@/constants/weaponCategories';
import { useWeaponCategory } from '@/hooks/useWeaponCategory';
import type { DrillConfig } from '@/services/session/types';
import type { WeaponCategory } from '@/types/workspace';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface CategoryQuickPresetsProps {
  /** The weapon category to show presets for */
  category: WeaponCategory | null | undefined;
  /** Called when a preset is selected */
  onSelectPreset: (config: DrillConfig) => void;
  /** Currently selected preset ID (for highlighting) */
  selectedPresetId?: string | null;
  /** Show as horizontal scroll or vertical list */
  layout?: 'horizontal' | 'vertical';
  /** Optional title override */
  title?: string;
}

export function CategoryQuickPresets({
  category,
  onSelectPreset,
  selectedPresetId,
  layout = 'horizontal',
  title,
}: CategoryQuickPresetsProps) {
  const { config, presets, presetToConfig } = useWeaponCategory(category);

  if (!presets || presets.length === 0) {
    return null;
  }

  const handlePresetPress = (preset: QuickPreset) => {
    const drillConfig = presetToConfig(preset);
    onSelectPreset(drillConfig);
  };

  const renderPreset = (preset: QuickPreset) => {
    const isSelected = selectedPresetId === preset.id;
    const iconName = getPresetIcon(preset);

    return (
      <TouchableOpacity
        key={preset.id}
        onPress={() => handlePresetPress(preset)}
        activeOpacity={0.7}
      >
        <ThemedView
          style={[
            styles.presetCard,
            layout === 'horizontal' && styles.presetCardHorizontal,
            isSelected && styles.presetCardSelected,
          ]}
        >
          <View style={styles.presetHeader}>
            <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
              <Icon name={iconName} size={18} color={isSelected ? '#fff' : '#666'} />
            </View>
            <ThemedText style={[styles.presetName, isSelected && styles.presetNameSelected]}>
              {preset.name}
            </ThemedText>
          </View>
          
          <ThemedText style={styles.presetDescription} numberOfLines={2}>
            {preset.description}
          </ThemedText>
          
          <View style={styles.presetMeta}>
            <View style={styles.metaItem}>
              <Icon name="ruler" size={12} color="#888" />
              <ThemedText style={styles.metaText}>{preset.distance}m</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Icon name="circle" size={12} color="#888" />
              <ThemedText style={styles.metaText}>{preset.rounds} rds</ThemedText>
            </View>
            {preset.timeLimit && (
              <View style={styles.metaItem}>
                <Icon name="clock" size={12} color="#888" />
                <ThemedText style={styles.metaText}>{preset.timeLimit}s</ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.presetTags}>
            <View style={[styles.tag, preset.drillGoal === 'grouping' ? styles.tagGrouping : styles.tagAchievement]}>
              <ThemedText style={styles.tagText}>
                {preset.drillGoal === 'grouping' ? 'Grouping' : 'Hits'}
              </ThemedText>
            </View>
            <View style={[styles.tag, styles.tagPosition]}>
              <ThemedText style={styles.tagText}>
                {formatPosition(preset.position)}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name={config.icon} size={20} color="#666" />
        <ThemedText style={styles.title}>
          {title || `${config.label} Presets`}
        </ThemedText>
      </View>
      
      {layout === 'horizontal' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {presets.map(renderPreset)}
        </ScrollView>
      ) : (
        <View style={styles.verticalList}>
          {presets.map(renderPreset)}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getPresetIcon(preset: QuickPreset): string {
  if (preset.name.toLowerCase().includes('zero')) return 'crosshairs';
  if (preset.name.toLowerCase().includes('group')) return 'target';
  if (preset.name.toLowerCase().includes('drill')) return 'zap';
  if (preset.name.toLowerCase().includes('cold')) return 'thermometer';
  if (preset.drillGoal === 'achievement') return 'check-circle';
  return 'circle';
}

function formatPosition(position: string): string {
  return position.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  horizontalScroll: {
    paddingHorizontal: 12,
    gap: 12,
  },
  verticalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  presetCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  presetCardHorizontal: {
    width: 180,
  },
  presetCardSelected: {
    borderColor: '#4a9eff',
    backgroundColor: '#1a2a3a',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#4a9eff',
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  presetNameSelected: {
    color: '#4a9eff',
  },
  presetDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    lineHeight: 18,
  },
  presetMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  presetTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagGrouping: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  tagAchievement: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  tagPosition: {
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
  },
  tagText: {
    fontSize: 11,
    color: '#aaa',
  },
});

export default CategoryQuickPresets;


