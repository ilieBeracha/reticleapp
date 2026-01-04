/**
 * SessionIntentStep - "What's the goal?"
 *
 * First step - simple list with elegant styling.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Check,
  Crosshair,
  Focus,
  HeartPulse,
  LayoutTemplate,
  Target,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { SessionPurpose } from './sessionCreation.types';

// ============================================================================
// DATA
// ============================================================================

interface PurposeOption {
  id: SessionPurpose;
  label: string;
  description: string;
  icon: LucideIcon;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    id: 'grouping',
    label: 'Grouping',
    description: 'Measure precision',
    icon: Crosshair,
  },
  {
    id: 'achievement',
    label: 'Target Hits',
    description: 'Score & track hits',
    icon: Target,
  },
  {
    id: 'zeroing',
    label: 'Zeroing',
    description: 'Calibrate optic',
    icon: Focus,
  },
  {
    id: 'physical',
    label: 'Stress Drill',
    description: 'Physical load',
    icon: HeartPulse,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface SessionIntentStepProps {
  selectedPurpose: SessionPurpose | null;
  onSelectPurpose: (purpose: SessionPurpose) => void;
  onUseSavedDrill?: () => void;
}

export function SessionIntentStep({
  selectedPurpose,
  onSelectPurpose,
  onUseSavedDrill,
}: SessionIntentStepProps) {
  const colors = useColors();

  const handleSelect = (purpose: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPurpose(purpose);
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.question, { color: colors.text }]}>What's your goal?</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Choose the purpose of this session
        </Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {PURPOSE_OPTIONS.map((opt) => {
          const isSelected = selectedPurpose === opt.id;
          const Icon = opt.icon;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.card : 'transparent',
                  borderColor: isSelected ? colors.border : 'transparent',
                },
              ]}
              onPress={() => handleSelect(opt.id)}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: isSelected ? `${colors.text}10` : `${colors.textMuted}10` },
                ]}
              >
                <Icon
                  size={20}
                  color={isSelected ? colors.text : colors.textMuted}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? colors.text : colors.textMuted },
                    isSelected && styles.optionSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  {opt.description}
                </Text>
              </View>
              {isSelected && <Check size={18} color={colors.text} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Saved Drill */}
      {onUseSavedDrill && (
        <TouchableOpacity style={styles.savedBtn} onPress={onUseSavedDrill} activeOpacity={0.6}>
          <LayoutTemplate size={16} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.savedText, { color: colors.textMuted }]}>
            or load a saved drill
          </Text>
          <ArrowRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {},

  // Header
  headerContainer: {
    marginBottom: 24,
    gap: 4,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
  },

  // Options
  options: {
    gap: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
  },

  // Saved drill
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    paddingVertical: 8,
  },
  savedText: {
    fontSize: 14,
  },
});
