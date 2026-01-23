/**
 * CaptureModePicker - Inline capture mode selection component
 *
 * A simple, inline component for selecting phone/watch capture mode.
 * Can be used as a step in a form or as a standalone selector.
 * NOT a modal or overlay - renders inline where placed.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { Check, Smartphone, Watch } from 'lucide-react-native';
import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CaptureMode = 'phone' | 'watch';

export interface CaptureModeSelection {
  mode: CaptureMode;
  sensitivity: number;
}

// ============================================================================
// INLINE COMPONENT - For embedding in forms
// ============================================================================

interface CaptureModePickerInlineProps {
  selectedMode: CaptureMode;
  onModeChange: (mode: CaptureMode) => void;
  sensitivity?: number;
  onSensitivityChange?: (value: number) => void;
  showSensitivity?: boolean;
}

export function CaptureModePickerInline({
  selectedMode,
  onModeChange,
  sensitivity = 3.5,
  onSensitivityChange,
  showSensitivity = true,
}: CaptureModePickerInlineProps) {
  const colors = useColors();

  const handleModeSelect = useCallback(
    (mode: CaptureMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeChange(mode);
    },
    [onModeChange]
  );

  const handleSensitivity = useCallback(
    (value: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSensitivityChange?.(value);
    },
    [onSensitivityChange]
  );

  return (
    <View style={styles.inlineContainer}>
      {/* Mode Selection */}
      <View style={styles.modeRow}>
        {/* Phone Option */}
        <TouchableOpacity
          style={[
            styles.modeOption,
            {
              backgroundColor: selectedMode === 'phone' ? `${colors.primary}12` : colors.card,
              borderColor: selectedMode === 'phone' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => handleModeSelect('phone')}
          activeOpacity={0.7}
        >
          <View style={[styles.modeIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Smartphone size={20} color={colors.primary} />
          </View>
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>Phone</Text>
            <Text style={[styles.modeDesc, { color: colors.textMuted }]}>Manual logging</Text>
          </View>
          {selectedMode === 'phone' && (
            <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
              <Check size={12} color="#fff" strokeWidth={3} />
            </View>
          )}
        </TouchableOpacity>

        {/* Watch Option */}
        <TouchableOpacity
          style={[
            styles.modeOption,
            {
              backgroundColor: selectedMode === 'watch' ? `${colors.orange}12` : colors.card,
              borderColor: selectedMode === 'watch' ? colors.orange : colors.border,
            },
          ]}
          onPress={() => handleModeSelect('watch')}
          activeOpacity={0.7}
        >
          <View style={[styles.modeIcon, { backgroundColor: `${colors.orange}15` }]}>
            <Watch size={20} color={colors.orange} />
          </View>
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>Watch</Text>
            <Text style={[styles.modeDesc, { color: colors.textMuted }]}>Auto detection</Text>
          </View>
          {selectedMode === 'watch' && (
            <View style={[styles.checkIcon, { backgroundColor: colors.orange }]}>
              <Check size={12} color="#fff" strokeWidth={3} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sensitivity Settings - Only show when watch is selected */}
      {showSensitivity && selectedMode === 'watch' && onSensitivityChange && (
        <View style={[styles.sensitivityContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sensitivityTitle, { color: colors.textMuted }]}>Detection Sensitivity</Text>
          <View style={styles.sensitivityOptions}>
            {[
              { value: 2.5, label: 'Light' },
              { value: 3.5, label: 'Standard' },
              { value: 5.5, label: 'Heavy' },
            ].map((opt) => {
              const isSelected = sensitivity === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.sensitivityBtn,
                    {
                      backgroundColor: isSelected ? colors.orange : colors.background,
                      borderColor: isSelected ? colors.orange : colors.border,
                    },
                  ]}
                  onPress={() => handleSensitivity(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sensitivityLabel,
                      { color: isSelected ? '#fff' : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// LEGACY COMPONENT - For backward compatibility (deprecated)
// This is a no-op component - use CaptureModePickerInline instead
// ============================================================================

interface CaptureModePickerProps {
  visible: boolean;
  onSelect: (mode: CaptureMode, sensitivity?: number) => void;
  onClose: () => void;
}

/**
 * @deprecated Use CaptureModePickerInline instead for better UX
 */
export function CaptureModePicker({ visible, onSelect }: CaptureModePickerProps) {
  // This is now a no-op - the inline picker should be used instead
  // Just auto-select phone mode if visible
  if (visible) {
    // Auto-select phone to maintain backward compatibility
    setTimeout(() => onSelect('phone'), 0);
  }
  return null;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Inline Component Styles
  inlineContainer: {
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeContent: {
    flex: 1,
    gap: 2,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modeDesc: {
    fontSize: 11,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sensitivity
  sensitivityContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  sensitivityTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sensitivityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sensitivityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sensitivityLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
