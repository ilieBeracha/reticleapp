import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ChartDataPoint {
  value: number;
  color: string;
  gradientCenterColor: string;
  focused?: boolean;
}

interface Category {
  label: string;
  color: string;
}

interface TrainingChartProps {
  data: ChartDataPoint[];
  categories?: Category[];
  centerValue?: string | number;
  centerLabel?: string;
  centerSubtext?: string;
  onDoubleTap?: () => void;
}

const defaultCategories: Category[] = [
  { label: 'All', color: '#6B8FA3' },
  { label: 'Strength', color: '#6B8FA3' },
  { label: 'Cardio', color: '#FF8A5C' },
  { label: 'Flexibility', color: '#7AA493' },
];

const TrainingChart = memo(function TrainingChart({ 
  data, 
  categories = defaultCategories,
  centerValue = 0,
  centerLabel = 'Sessions',
  centerSubtext = 'This Week',
  onDoubleTap 
}: TrainingChartProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const lastTap = useRef(0);

  const isGlassAvailable = isLiquidGlassAvailable();
  const glassStyle = theme === 'dark' ? 'clear' : 'regular';

  const handleChartPress = () => {
    if (!onDoubleTap) return;
    
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      onDoubleTap();
    }
    lastTap.current = now;
  };

  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    if (isGlassAvailable) {
      return (
        <GlassView style={[styles.glassCard, style]} glassEffectStyle={glassStyle}>
          {children}
        </GlassView>
      );
    }
    return (
      <View style={[styles.fallbackCard, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
        {children}
      </View>
    );
  };

  // Memoize dynamic styles
  const heroTitleStyle = useMemo(() => [
    styles.heroTitle,
    { color: colors.text }
  ], [colors.text]);

  const heroSubtitleStyle = useMemo(() => [
    styles.heroSubtitle,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  const centerValueTextStyle = useMemo(() => [
    styles.centerLabelValue,
    { color: colors.text }
  ], [colors.text]);

  const centerLabelTextStyle = useMemo(() => [
    styles.centerLabelText,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  const centerSubtextTextStyle = useMemo(() => [
    styles.centerLabelSubtext,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  // Memoize center label component to prevent recreations
  const centerLabelComponent = useMemo(() => () => (
    <View style={styles.centerLabel}>
      <Text style={centerValueTextStyle}>{centerValue}</Text>
      <Text style={centerLabelTextStyle}>{centerLabel}</Text>
      <Text style={centerSubtextTextStyle}>{centerSubtext}</Text>
    </View>
  ), [centerValue, centerLabel, centerSubtext, centerValueTextStyle, centerLabelTextStyle, centerSubtextTextStyle]);

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <GlassCard>
        <View style={styles.heroHeader}>
          <Text style={heroTitleStyle}>Training Overview</Text>
          <Text style={heroSubtitleStyle}>
            Track your workout categories
          </Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryTab,
                index === 0 && styles.categoryTabActive,
                { 
                  backgroundColor: index === 0 ? category.color + '12' : 'transparent',
                  borderColor: index === 0 ? category.color : colors.border
                }
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryTabText,
                { color: index === 0 ? category.color : colors.textMuted }
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.chartContainer}
          onPress={handleChartPress}
          activeOpacity={0.9}
        >
          <PieChart
            data={data}
            donut
            sectionAutoFocus
            radius={110}
            innerRadius={80}
            innerCircleColor={colors.card}
            centerLabelComponent={centerLabelComponent}
            focusOnPress
            toggleFocusOnPress
          />
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
});

export default TrainingChart;

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  fallbackCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  heroHeader: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    opacity: 0.7,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryTabActive: {
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chartContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginBottom: 2,
  },
  centerLabelText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  centerLabelSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: -0.1,
    opacity: 0.7,
  },
});

