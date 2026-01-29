/**
 * SpecialtyBadge Component
 *
 * Compact badge showing a team's specialty.
 * Used in team cards, headers, etc.
 */

import { SPECIALTY_CONFIGS, type TeamSpecialty } from '@/constants/teamSpecialties';
import { CircleDot, Crosshair, Shield, ShieldCheck, Target, Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface SpecialtyBadgeProps {
  specialty: TeamSpecialty | null | undefined;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Show label text */
  showLabel?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  crosshair: Crosshair,
  shield: Shield,
  'circle-dot': CircleDot,
  target: Target,
  trophy: Trophy,
  'shield-check': ShieldCheck,
};

export function SpecialtyBadge({ specialty, size = 'small', showLabel = true }: SpecialtyBadgeProps) {
  const { t } = useTranslation();

  if (!specialty) return null;

  const config = SPECIALTY_CONFIGS[specialty];
  if (!config) return null;

  const IconComponent = ICON_MAP[config.icon] || Target;
  const isSmall = size === 'small';
  const iconSize = isSmall ? 10 : 12;

  return (
    <View style={[s.badge, isSmall ? s.badgeSmall : s.badgeMedium, { backgroundColor: `${config.color}15` }]}>
      <IconComponent size={iconSize} color={config.color} />
      {showLabel && (
        <Text style={[s.label, isSmall ? s.labelSmall : s.labelMedium, { color: config.color }]} numberOfLines={1}>
          {t(config.labelKey)}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
  },
  labelMedium: {
    fontSize: 11,
  },
});
