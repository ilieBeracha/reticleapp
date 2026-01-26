/**
 * AddSessionButton - Button to add a new session within a training tab
 *
 * Shows a "+" button that triggers session creation with pre-set drill goal
 */

import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface AddSessionButtonProps {
  drillGoal: DrillGoal;
  onPress: () => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddSessionButton({ drillGoal, onPress, disabled = false }: AddSessionButtonProps) {
  const colors = useColors();

  const isGrouping = drillGoal === 'grouping';
  const accentColor = isGrouping ? colors.primary : colors.orange;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: accentColor + '40',
          borderStyle: 'dashed',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '12' }]}>
        <Plus size={18} color={accentColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Add {isGrouping ? 'Grouping' : 'Engagement'} Session</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isGrouping ? 'Practice shot consistency' : 'Practice target hits'}
        </Text>
      </View>
      {isGrouping ? (
        <Crosshair size={16} color={accentColor} style={styles.typeIcon} />
      ) : (
        <Target size={16} color={accentColor} style={styles.typeIcon} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  typeIcon: {
    opacity: 0.5,
  },
});
