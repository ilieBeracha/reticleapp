import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface GlassStatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

export const GlassStatCard = React.memo(function GlassStatCard({
  value,
  label,
  trend,
}: GlassStatCardProps) {
    const colors = useColors();
        return (
            <GlassView
                style={[styles.card, { backgroundColor: colors.card + 'FF' }]}
                glassEffectStyle={'clear'}
            >
      <View style={styles.content}>
        <Text style={[styles.value]}>{value}</Text>
        <Text style={[styles.label]}>{label}</Text>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend.isPositive ? 'caret-up' : 'caret-down'}
              size={10}
              color={'#000'}
            />
            <Text style={[styles.trendText, { color: '#000' }]}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Text>
          </View>
        )}
      </View>
    </GlassView>        
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fallbackCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

