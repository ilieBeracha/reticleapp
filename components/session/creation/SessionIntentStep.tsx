/**
 * SessionIntentStep - "What's the goal?"
 *
 * Clean card-based goal selection with subtle animations.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Crosshair, LayoutTemplate, Target, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { SessionPurpose } from './sessionCreation.types';

// ============================================================================
// DATA
// ============================================================================

const PURPOSE_OPTIONS: {
  id: SessionPurpose;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: 'grouping', label: 'Grouping', description: 'Build consistent shots', icon: Crosshair },
  { id: 'engagement', label: 'Engagement', description: 'Hit or miss inside a defined area', icon: Target },
  // { id: 'zeroing', label: 'Zeroing', description: 'Dial in your optic', icon: Focus },
  // { id: 'physical', label: 'Stress Drill', description: 'Shoot under pressure', icon: HeartPulse },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface SessionIntentStepProps {
  selectedPurpose: SessionPurpose | null;
  onSelectPurpose: (purpose: SessionPurpose) => void;
  onUseSavedDrill?: () => void;
}

export function SessionIntentStep({ selectedPurpose, onSelectPurpose, onUseSavedDrill }: SessionIntentStepProps) {
  const colors = useColors();

  const handleSelect = (purpose: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPurpose(purpose);
  };

  return (
    <View style={styles.container}>
      <Animated.Text entering={FadeInDown.duration(300)} style={[styles.question, { color: colors.text }]}>
        What's your goal?
      </Animated.Text>

      <View style={styles.options}>
        {PURPOSE_OPTIONS.map((opt, index) => {
          const isSelected = selectedPurpose === opt.id;
          const Icon = opt.icon;
          return (
            <Animated.View key={opt.id} entering={FadeInDown.duration(300).delay(50 + index * 50)}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? `${colors.primary}10` : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelect(opt.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: isSelected ? colors.primary : `${colors.textMuted}15` },
                  ]}
                >
                  <Icon size={20} color={isSelected ? '#fff' : colors.textMuted} strokeWidth={2} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>{opt.description}</Text>
                </View>
                <View
                  style={[
                    styles.optionRadio,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {onUseSavedDrill && (
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <TouchableOpacity
            style={[styles.savedBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onUseSavedDrill}
            activeOpacity={0.7}
          >
            <LayoutTemplate size={18} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.savedText, { color: colors.textMuted }]}>Load a saved drill</Text>
            <ArrowRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  question: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  options: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  optionDescription: {
    fontSize: 13,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  savedText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
