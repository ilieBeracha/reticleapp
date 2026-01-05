/**
 * SessionIntentStep - "What's the goal?"
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
import type { SessionPurpose } from './sessionCreation.types';

// ============================================================================
// DATA
// ============================================================================

const PURPOSE_OPTIONS: { id: SessionPurpose; label: string; icon: LucideIcon }[] = [
  { id: 'grouping', label: 'Grouping', icon: Crosshair },
  { id: 'achievement', label: 'Target Hits', icon: Target },
  { id: 'zeroing', label: 'Zeroing', icon: Focus },
  { id: 'physical', label: 'Stress Drill', icon: HeartPulse },
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
      <Text style={[styles.question, { color: colors.text }]}>
        What's your goal?
      </Text>

      <View style={styles.options}>
        {PURPOSE_OPTIONS.map((opt) => {
          const isSelected = selectedPurpose === opt.id;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.id}
              style={styles.option}
              onPress={() => handleSelect(opt.id)}
              activeOpacity={0.6}
            >
              <Icon
                size={20}
                color={isSelected ? colors.text : colors.textMuted}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              <Text
                style={[
                  styles.optionLabel,
                  { color: isSelected ? colors.text : colors.textMuted },
                  isSelected && styles.optionSelected,
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && (
                <Check size={16} color={colors.text} strokeWidth={2.5} style={styles.check} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {onUseSavedDrill && (
        <TouchableOpacity
          style={styles.savedBtn}
          onPress={onUseSavedDrill}
          activeOpacity={0.6}
        >
          <LayoutTemplate size={16} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.savedText, { color: colors.textMuted }]}>
            or load a saved drill
          </Text>
          <ArrowRight size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  question: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, marginBottom: 28 },
  options: { gap: 4 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  optionLabel: { fontSize: 17, flex: 1 },
  optionSelected: { fontWeight: '600' },
  check: { marginLeft: 'auto' },
  savedBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 32, paddingVertical: 8 },
  savedText: { fontSize: 14 },
});
