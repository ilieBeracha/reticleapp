/**
 * SpecialtyPicker Component
 *
 * A picker for selecting team specialty/training focus.
 * Can be used in team creation flow or team settings.
 */

import { SPECIALTY_CONFIGS, TEAM_SPECIALTIES, type TeamSpecialty } from '@/constants/teamSpecialties';
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { CircleDot, Crosshair, Shield, ShieldCheck, Target, Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SpecialtyPickerProps {
  value: TeamSpecialty | null;
  onChange: (specialty: TeamSpecialty | null) => void;
  /** Allow deselecting (setting to null) */
  allowNone?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  crosshair: Crosshair,
  shield: Shield,
  'circle-dot': CircleDot,
  target: Target,
  trophy: Trophy,
  'shield-check': ShieldCheck,
};

export function SpecialtyPicker({ value, onChange, allowNone = true }: SpecialtyPickerProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const handleSelect = (specialty: TeamSpecialty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value === specialty && allowNone) {
      onChange(null);
    } else {
      onChange(specialty);
    }
  };

  return (
    <View style={s.container}>
      <Text style={[s.title, { color: colors.text }]}>{t('teams.specialty.title')}</Text>
      <Text style={[s.description, { color: colors.textMuted }]}>{t('teams.specialty.description')}</Text>

      <View style={s.grid}>
        {TEAM_SPECIALTIES.map((specialty) => {
          const config = SPECIALTY_CONFIGS[specialty];
          const isSelected = value === specialty;
          const IconComponent = ICON_MAP[config.icon] || Target;

          return (
            <TouchableOpacity
              key={specialty}
              style={[
                s.option,
                {
                  backgroundColor: isSelected ? colors.primary + '08' : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelect(specialty)}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: colors.secondary }]}>
                <IconComponent size={18} color={isSelected ? colors.primary : colors.textMuted} />
              </View>
              <View style={s.optionContent}>
                <Text style={[s.optionLabel, { color: colors.text }]}>{t(config.labelKey)}</Text>
                <Text style={[s.optionDesc, { color: colors.textMuted }]} numberOfLines={1}>
                  {t(config.descriptionKey)}
                </Text>
              </View>
              <View
                style={[
                  s.radioOuter,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                {isSelected && <View style={[s.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  grid: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
