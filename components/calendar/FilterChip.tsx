import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type EventFilter = 'all' | 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';

interface FilterChipProps {
  option: { id: EventFilter; label: string; icon: string };
  isActive: boolean;
  count: number;
  onPress: () => void;
  colors: {
    primary: string;
    primaryForeground: string;
    card: string;
    border: string;
    textMuted: string;
    text: string;
    secondary: string;
  };
}

/**
 * Filter chip component for calendar event filtering.
 * Uses React.memo for performance optimization.
 * Removed expensive entering animations for better scroll performance.
 */
export const FilterChip = React.memo(function FilterChip({
  option,
  isActive,
  count,
  onPress,
  colors,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? colors.primary : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name={option.icon as any}
        size={16}
        color={isActive ? colors.primaryForeground : colors.textMuted}
      />
      <Text style={[styles.chipText, { color: isActive ? colors.primaryForeground : colors.text }]}>
        {option.label}
      </Text>
      <View
        style={[
          styles.chipBadge,
          {
            backgroundColor: isActive ? colors.primaryForeground + '20' : colors.secondary,
          },
        ]}
      >
        <Text style={[styles.chipBadgeText, { color: isActive ? colors.primaryForeground : colors.primary }]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
});

export default FilterChip;
