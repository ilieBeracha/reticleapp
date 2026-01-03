/**
 * SensitivitySelector
 * 
 * UI component for selecting/adjusting shot detection sensitivity
 * for Garmin watch integration. Allows users to:
 * 
 * 1. Select from presets (Light, Medium, Heavy, Shotgun)
 * 2. Fine-tune with a slider
 * 3. See auto-derived value from their weapon
 * 
 * Usage:
 * ```tsx
 * <SensitivitySelector
 *   value={sensitivity}
 *   onChange={setSensitivity}
 *   weaponCategory="pistol"
 *   caliber="9mm"
 * />
 * ```
 */

import { useColors } from '@/hooks/ui/useColors';
import {
    deriveDetectionConfig,
    findClosestPreset,
    SENSITIVITY_PRESETS,
    type SensitivityPresetId,
    type WeaponDetectionInput,
} from '@/utils/detectionSensitivity';
import Slider from '@react-native-community/slider';
import { Feather, Flame, Shield, Target } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// ============================================================================
// TYPES
// ============================================================================

export interface SensitivitySelectorProps {
  /** Current sensitivity value (G-force threshold) */
  value: number;
  /** Called when sensitivity changes */
  onChange: (value: number) => void;
  /** Weapon category for auto-derivation */
  weaponCategory?: string | null;
  /** Weapon caliber for auto-derivation */
  caliber?: string | null;
  /** Whether weapon has suppressor */
  hasSuppressor?: boolean;
  /** Whether weapon has muzzle brake */
  hasMuzzleBrake?: boolean;
  /** Show compact version */
  compact?: boolean;
  /** Disable interaction */
  disabled?: boolean;
}

// ============================================================================
// ICON COMPONENTS
// ============================================================================

const PresetIcon = ({ 
  icon, 
  size = 20, 
  color 
}: { 
  icon: string; 
  size?: number; 
  color: string;
}) => {
  const iconProps = { size, color, strokeWidth: 2 };
  
  switch (icon) {
    case 'feather':
      return <Feather {...iconProps} />;
    case 'target':
      return <Target {...iconProps} />;
    case 'flame':
      return <Flame {...iconProps} />;
    case 'shield':
      return <Shield {...iconProps} />;
    default:
      return <Target {...iconProps} />;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SensitivitySelector({
  value,
  onChange,
  weaponCategory,
  caliber,
  hasSuppressor = false,
  hasMuzzleBrake = false,
  compact = false,
  disabled = false,
}: SensitivitySelectorProps) {
  const colors = useColors();
  
  // Local state for slider (debounced updates)
  const [localValue, setLocalValue] = useState(value);
  const [showSlider, setShowSlider] = useState(false);
  
  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Calculate auto-derived sensitivity from weapon
  const autoConfig = useMemo(() => {
    const input: WeaponDetectionInput = {
      category: weaponCategory as any,
      caliber,
      hasSuppressor,
      hasMuzzleBrake,
    };
    return deriveDetectionConfig(input);
  }, [weaponCategory, caliber, hasSuppressor, hasMuzzleBrake]);
  
  // Find which preset is currently selected (or closest)
  const selectedPreset = useMemo(() => {
    return findClosestPreset(value);
  }, [value]);
  
  // Check if current value matches auto-derived
  const isAuto = Math.abs(value - autoConfig.sensitivity) < 0.1;
  
  // Handlers
  const handlePresetSelect = useCallback((presetId: SensitivityPresetId) => {
    const preset = SENSITIVITY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onChange(preset.sensitivity);
      setShowSlider(false);
    }
  }, [onChange]);
  
  const handleAutoSelect = useCallback(() => {
    onChange(autoConfig.sensitivity);
    setShowSlider(false);
  }, [onChange, autoConfig.sensitivity]);
  
  const handleSliderChange = useCallback((val: number) => {
    setLocalValue(val);
  }, []);
  
  const handleSliderComplete = useCallback((val: number) => {
    const rounded = Math.round(val * 10) / 10;
    onChange(rounded);
  }, [onChange]);
  
  const toggleSlider = useCallback(() => {
    setShowSlider(prev => !prev);
  }, []);
  
  // Styles
  const dynamicStyles = useMemo(() => ({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: compact ? 12 : 16,
    },
    label: {
      color: colors.text,
      fontSize: compact ? 14 : 16,
      fontWeight: '600' as const,
    },
    sublabel: {
      color: colors.secondary,
      fontSize: 12,
    },
    presetButton: {
      borderRadius: 10,
      padding: compact ? 10 : 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    presetButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.secondary,
    },
    presetLabel: {
      color: colors.text,
      fontSize: compact ? 12 : 14,
      fontWeight: '500' as const,
    },
    presetLabelSelected: {
      color: colors.accent,
    },
    autoButton: {
      borderRadius: 10,
      padding: compact ? 10 : 14,
      borderWidth: 1.5,
      borderColor: isAuto ? colors.accent : colors.border,
      backgroundColor: isAuto ? `${colors.accent}15` : colors.cardBackground,
    },
    autoLabel: {
      color: isAuto ? colors.accent : colors.secondary,
      fontWeight: '500' as const,
      fontSize: compact ? 12 : 14,
    },
    sliderContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
    },
    sliderValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700' as const,
    },
    sliderUnit: {
      color: colors.secondary,
      fontSize: 14,
    },
  }), [colors, compact, isAuto]);
  
  if (disabled) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.disabled]}>
        <Text style={dynamicStyles.label}>Shot Detection</Text>
        <Text style={dynamicStyles.sublabel}>Connect Garmin watch to enable</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={dynamicStyles.label}>Shot Detection Sensitivity</Text>
          <Text style={dynamicStyles.sublabel}>
            Adjust based on your firearm's recoil
          </Text>
        </View>
        <TouchableOpacity onPress={toggleSlider} style={styles.tuneButton}>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '500' }}>
            {showSlider ? 'Done' : 'Fine-tune'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Auto-derived option (if weapon info available) */}
      {(caliber || weaponCategory) && (
        <TouchableOpacity 
          style={[styles.autoButton, dynamicStyles.autoButton]}
          onPress={handleAutoSelect}
          activeOpacity={0.7}
        >
          <View style={styles.autoContent}>
            <View style={styles.autoLeft}>
              <Text style={dynamicStyles.autoLabel}>
                ✨ Auto: {autoConfig.sensitivity}G
              </Text>
              <Text style={[dynamicStyles.sublabel, { marginTop: 2 }]}>
                {autoConfig.description}
              </Text>
            </View>
            {isAuto && (
              <Text style={{ color: colors.accent, fontSize: 12 }}>Selected</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      
      {/* Preset buttons */}
      <View style={styles.presetsGrid}>
        {SENSITIVITY_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id && !isAuto;
          
          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                dynamicStyles.presetButton,
                isSelected && dynamicStyles.presetButtonSelected,
              ]}
              onPress={() => handlePresetSelect(preset.id)}
              activeOpacity={0.7}
            >
              <PresetIcon 
                icon={preset.icon} 
                color={isSelected ? colors.accent : colors.text}
                size={compact ? 18 : 22}
              />
              <Text 
                style={[
                  dynamicStyles.presetLabel,
                  isSelected && dynamicStyles.presetLabelSelected,
                ]}
                numberOfLines={1}
              >
                {preset.label}
              </Text>
              <Text style={dynamicStyles.sublabel}>
                {preset.sensitivity}G
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Fine-tune slider */}
      {showSlider && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          style={dynamicStyles.sliderContainer}
        >
          <View style={styles.sliderHeader}>
            <Text style={dynamicStyles.sublabel}>Fine-tune threshold</Text>
            <View style={styles.sliderValueContainer}>
              <Text style={dynamicStyles.sliderValue}>
                {localValue.toFixed(1)}
              </Text>
              <Text style={dynamicStyles.sliderUnit}>G</Text>
            </View>
          </View>
          
          <Slider
            style={styles.slider}
            minimumValue={1.0}
            maximumValue={7.0}
            step={0.1}
            value={localValue}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
          
          <View style={styles.sliderLabels}>
            <Text style={dynamicStyles.sublabel}>Light</Text>
            <Text style={dynamicStyles.sublabel}>Heavy</Text>
          </View>
        </Animated.View>
      )}
      
      {/* Current value display */}
      <View style={styles.currentValue}>
        <Text style={dynamicStyles.sublabel}>
          Current: <Text style={{ color: colors.text, fontWeight: '600' }}>
            {value.toFixed(1)}G threshold
          </Text>
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tuneButton: {
    padding: 4,
  },
  autoButton: {
    marginTop: 4,
  },
  autoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoLeft: {
    flex: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    gap: 4,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  currentValue: {
    alignItems: 'center',
    marginTop: 4,
  },
});

export default SensitivitySelector;

