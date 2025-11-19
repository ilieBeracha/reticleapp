import { useColors } from '@/hooks/ui/useColors';
import { memo, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

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
  centerValue = '0',
  centerLabel = 'Sessions',
  centerSubtext = 'This Week',
  onDoubleTap 
}: TrainingChartProps) {
  const colors = useColors();
  const lastTap = useRef(0);

  const handleChartPress = () => {
    if (!onDoubleTap) return;
    
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      onDoubleTap();
    }
    lastTap.current = now;
  };

  // Memoize dynamic styles
  const heroStyle = useMemo(() => [
    styles.hero,
    { backgroundColor: colors.card }
  ], [colors.card]);

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
    <View style={heroStyle}>
      <View style={styles.heroHeader}>
        <Text style={heroTitleStyle}>Training Distribution</Text>
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
                backgroundColor: index === 0 ? category.color + '15' : 'transparent',
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
          showGradient
          sectionAutoFocus
          radius={120}
          innerRadius={85}
          innerCircleColor={colors.card}
          centerLabelComponent={centerLabelComponent}
          focusOnPress
          toggleFocusOnPress
        />
      </TouchableOpacity>
    </View>
  );
});

export default TrainingChart;

const styles = StyleSheet.create({
  hero: {
    marginBottom: 32,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroHeader: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryTabActive: {
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chartContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  centerLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  centerLabelSubtext: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.1,
  },
});

