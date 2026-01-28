/**
 * PurposeSelector
 *
 * Step 1 of session creation: "What am I going to do?"
 * User selects between Grouping and Engagement.
 *
 * This is the first decision that shapes the entire session:
 * - Grouping = measure shot dispersion (ALWAYS solo)
 * - Engagement = hit accuracy/speed (can be solo or squad)
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Crosshair, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DrillGoal } from '../../shared';

interface PurposeSelectorProps {
  /** Currently selected purpose */
  selected: DrillGoal | null;
  /** Called when purpose is selected */
  onSelect: (purpose: DrillGoal) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
}

interface PurposeOptionConfig {
  id: DrillGoal;
  label: string;
  description: string;
  icon: typeof Crosshair;
  color: string;
}

function getPurposeOptions(t: (key: string) => string): PurposeOptionConfig[] {
  return [
    {
      id: 'grouping',
      label: t('session.grouping'),
      description: t('session.groupingDescription'),
      icon: Crosshair,
      color: '#3B82F6', // Blue
    },
    {
      id: 'engagement',
      label: t('session.hittingTargets'),
      description: t('session.engagementDescription'),
      icon: Trophy,
      color: '#F59E0B', // Amber
    },
  ];
}

export function PurposeSelector({ selected, onSelect, disabled = false }: PurposeSelectorProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const PURPOSE_OPTIONS = getPurposeOptions(t);

  const handlePress = (purpose: DrillGoal) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(purpose);
  };

  return (
    <View style={styles.container}>
      {PURPOSE_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        const Icon = option.icon;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              {
                backgroundColor: colors.card,
                borderColor: isSelected ? option.color : colors.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
            onPress={() => handlePress(option.id)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
              <Icon size={28} color={option.color} strokeWidth={2} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>{option.description}</Text>
            </View>
            {isSelected && <View style={[styles.selectedIndicator, { backgroundColor: option.color }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
