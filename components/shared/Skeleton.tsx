/**
 * Skeleton - Animated shimmer placeholder
 *
 * Reanimated-driven gradient sweep used to replace bare ActivityIndicators.
 * Three prebuilt variants cover 90% of loading states; pass `width`/`height`
 * for one-offs.
 *
 * Usage:
 *   <Skeleton variant="card" />
 *   <Skeleton variant="row" count={5} />
 *   <Skeleton width={120} height={16} radius={8} />
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SkeletonVariant = 'card' | 'row' | 'chart' | 'avatar' | 'text';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  count?: number;
  style?: ViewStyle;
}

const VARIANT_DIMS: Record<SkeletonVariant, { height: number; radius: number; width?: number | `${number}%` }> = {
  card: { height: 96, radius: 16, width: '100%' },
  row: { height: 56, radius: 12, width: '100%' },
  chart: { height: 180, radius: 16, width: '100%' },
  avatar: { height: 44, radius: 22, width: 44 },
  text: { height: 14, radius: 6, width: '70%' },
};

export function Skeleton({ variant = 'row', width, height, radius, count = 1, style }: SkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <View style={{ gap: 12 }}>
      {items.map((_, i) => (
        <SkeletonBlock
          key={i}
          variant={variant}
          width={width}
          height={height}
          radius={radius}
          style={style}
        />
      ))}
    </View>
  );
}

function SkeletonBlock({ variant = 'row', width, height, radius, style }: SkeletonProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const dims = VARIANT_DIMS[variant];
  const progress = useSharedValue(0);
  const highlight = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 0.5) * 400 }],
  }));

  const w = width ?? dims.width;
  const h = height ?? dims.height;
  const r = radius ?? dims.radius;

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: colors.secondary,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ flex: 1 }, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', highlight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, width: '200%' }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Composed skeletons for common list screens.
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return <Skeleton variant="row" count={count} />;
}

export function SkeletonDashboard() {
  return (
    <View style={{ gap: 16 }}>
      <Skeleton variant="card" />
      <Skeleton variant="chart" />
      <Skeleton variant="row" count={3} />
    </View>
  );
}
