/**
 * QuickActionsGrid
 * 
 * A visually striking grid of quick action tiles for the home page.
 * Inspired by iOS widgets with gradient backgrounds and glowing accents.
 */

import { useColors } from '@/hooks/ui/useColors';
import { router } from 'expo-router';
import { BarChart3, BookOpen, Clock, Target, Trophy, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Toggle this to show debug borders
const DEBUG_BORDERS = true;

interface GridItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  unit?: string;
  gradient: [string, string];
  glowColor: string;
  onPress?: () => void;
  style?: 'square' | 'wide' | 'tall';
  delay?: number;
}

function GridItem({
  icon,
  title,
  subtitle,
  value,
  unit,
  gradient,
  glowColor,
  onPress,
  style = 'square',
  delay = 0,
}: GridItemProps) {
  const colors = useColors();
  
  const containerStyle = 
    style === 'wide' ? styles.gridItemWide :
    style === 'tall' ? styles.gridItemTall :
    styles.gridItem;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={{ flex: style === 'wide' ? 2 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          containerStyle,
          { 
            backgroundColor: colors.card,
            borderColor: DEBUG_BORDERS ? glowColor : colors.border,
          },
        ]}
      >
        {/* Gradient overlay */}
        <LinearGradient
          colors={[`${gradient[0]}20`, `${gradient[1]}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Glow effect */}
        <View 
          style={[
            styles.gridGlow, 
            { 
              backgroundColor: glowColor,
              top: -30,
              right: -30,
            }
          ]} 
        />

        {/* Icon */}
        <View style={[styles.gridIconContainer, { backgroundColor: `${glowColor}20` }]}>
          {icon}
        </View>

        {/* Content */}
        <View>
          {value && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.gridItemValue, { color: colors.text }]}>{value}</Text>
              {unit && <Text style={[styles.gridItemUnit, { color: colors.textMuted }]}>{unit}</Text>}
            </View>
          )}
          <Text style={[styles.gridItemTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.gridItemSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface QuickActionsGridProps {
  sessionCount?: number;
  totalShots?: number;
  accuracy?: number;
  streak?: number;
}

export function QuickActionsGrid({
  sessionCount = 0,
  totalShots = 0,
  accuracy = 0,
  streak = 0,
}: QuickActionsGridProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, DEBUG_BORDERS && { borderWidth: 1, borderColor: '#00FF00', borderStyle: 'dashed' }]}>
      {/* Row 1: Wide + Square */}
      <View style={styles.gridRow}>
        <GridItem
          style="wide"
          icon={<Zap size={20} color="#F59E0B" />}
          title="Quick Practice"
          subtitle="Start a new session"
          gradient={['#F59E0B', '#D97706']}
          glowColor="#F59E0B"
          onPress={() => router.push('/(protected)/createSession')}
          delay={0}
        />
        <GridItem
          icon={<Trophy size={20} color="#8B5CF6" />}
          value={streak.toString()}
          unit="days"
          title="Streak"
          gradient={['#8B5CF6', '#7C3AED']}
          glowColor="#8B5CF6"
          onPress={() => router.push('/(protected)/(tabs)/insights')}
          delay={50}
        />
      </View>

      {/* Row 2: Square + Square + Square */}
      <View style={styles.gridRow}>
        <GridItem
          icon={<Target size={20} color="#10B981" />}
          value={sessionCount.toString()}
          title="Sessions"
          subtitle="This week"
          gradient={['#10B981', '#059669']}
          glowColor="#10B981"
          onPress={() => router.push('/(protected)/(tabs)/insights')}
          delay={100}
        />
        <GridItem
          icon={<BarChart3 size={20} color="#3B82F6" />}
          value={accuracy > 0 ? `${accuracy}%` : '—'}
          title="Accuracy"
          gradient={['#3B82F6', '#2563EB']}
          glowColor="#3B82F6"
          onPress={() => router.push('/(protected)/(tabs)/insights')}
          delay={150}
        />
        <GridItem
          icon={<Clock size={20} color="#EC4899" />}
          value={totalShots > 999 ? `${(totalShots / 1000).toFixed(1)}k` : totalShots.toString()}
          title="Shots"
          gradient={['#EC4899', '#DB2777']}
          glowColor="#EC4899"
          onPress={() => router.push('/(protected)/(tabs)/insights')}
          delay={200}
        />
      </View>

      {/* Row 3: Square + Wide */}
      <View style={styles.gridRow}>
        <GridItem
          icon={<BookOpen size={20} color="#06B6D4" />}
          title="Drill Library"
          subtitle="Browse drills"
          gradient={['#06B6D4', '#0891B2']}
          glowColor="#06B6D4"
          onPress={() => router.push('/(protected)/drillLibrary')}
          delay={250}
        />
        <GridItem
          style="wide"
          icon={<Target size={20} color="#EF4444" />}
          title="Recent Scans"
          subtitle="View your target photos"
          gradient={['#EF4444', '#DC2626']}
          glowColor="#EF4444"
          onPress={() => router.push('/(protected)/scans')}
          delay={300}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridItemWide: {
    flex: 2,
    aspectRatio: 2.1,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridItemTall: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  gridItemSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  gridItemValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gridItemUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.12,
  },
});

