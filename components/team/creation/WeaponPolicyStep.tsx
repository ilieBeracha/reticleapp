/**
 * WeaponPolicyStep - "How do members get weapons?"
 * 
 * Card-based policy selection for team creation.
 * Allows team owner to set the weapon access policy.
 */

import {
  WEAPON_POLICIES,
  WEAPON_POLICY_CONFIG,
  type WeaponPolicy,
} from '@/constants/weaponPolicy';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { WeaponPolicyStepProps } from './WeaponPolicyStep.types';

// ============================================================================
// COMPONENT
// ============================================================================

export function WeaponPolicyStep({ 
  value, 
  onChange, 
  disabled = false,
  hideHeader = false,
}: WeaponPolicyStepProps) {
  const colors = useColors();

  const handleSelect = (policy: WeaponPolicy) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(policy);
  };

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <Animated.View 
          entering={FadeInDown.duration(300)} 
          style={styles.header}
        >
          <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="shield-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              Weapon Policy
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              How will members access weapons?
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.options}>
        {WEAPON_POLICIES.map((policy, index) => {
          const config = WEAPON_POLICY_CONFIG[policy];
          const isSelected = value === policy;
          
          return (
            <Animated.View 
              key={policy} 
              entering={FadeInDown.duration(300).delay(100 + index * 50)}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { 
                    backgroundColor: isSelected ? `${colors.primary}10` : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: disabled ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleSelect(policy)}
                activeOpacity={0.7}
                disabled={disabled}
              >
                <View 
                  style={[
                    styles.optionIcon, 
                    { backgroundColor: isSelected ? colors.primary : `${colors.textMuted}15` }
                  ]}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color={isSelected ? '#fff' : colors.textMuted}
                  />
                </View>
                
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {config.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {config.description}
                  </Text>
                  <Text style={[styles.optionHint, { color: colors.textMuted }]}>
                    {config.hint}
                  </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  options: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  optionHint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
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
});
