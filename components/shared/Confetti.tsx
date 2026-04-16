/**
 * Confetti - Reanimated particle burst.
 *
 * Zero-dependency celebration for moments like session completion or
 * achievement unlocks. Renders absolutely-positioned particles that fly
 * outward with gravity + rotation + fade, then self-unmount.
 *
 * Usage:
 *   const [show, setShow] = useState(false);
 *   setShow(true); // fire once
 *   {show && <Confetti onComplete={() => setShow(false)} />}
 */

import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const DEFAULT_COLORS = ['#E76925', '#F39C12', '#5A8473', '#5B6B8C', '#C85A8E', '#8B7FA1', '#5A9B9B'];

interface ConfettiProps {
  /** Number of particles. Default 40. */
  count?: number;
  /** Starting Y. Default 20% from top. */
  originY?: number;
  /** Duration of fall animation in ms. Default 1600. */
  duration?: number;
  /** Colors to randomly assign. */
  colors?: string[];
  /** Called once every particle has finished. */
  onComplete?: () => void;
}

export function Confetti({
  count = 40,
  originY = SCREEN_H * 0.2,
  duration = 1600,
  colors = DEFAULT_COLORS,
  onComplete,
}: ConfettiProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        color: colors[i % colors.length],
        dx: (Math.random() - 0.5) * SCREEN_W * 1.1,
        dy: SCREEN_H * (0.55 + Math.random() * 0.35),
        rotate: (Math.random() - 0.5) * 720,
        delay: Math.random() * 160,
        size: 6 + Math.floor(Math.random() * 6),
        shape: Math.random() > 0.5 ? ('rect' as const) : ('circle' as const),
      })),
    [count, colors]
  );

  // Kick the onComplete callback after the longest possible timeline.
  useEffect(() => {
    if (!onComplete) return;
    const total = duration + 200;
    const id = setTimeout(onComplete, total);
    return () => clearTimeout(id);
  }, [duration, onComplete]);

  return (
    <View pointerEvents="none" style={[styles.host, { top: originY }]}>
      {particles.map((p) => (
        <Particle key={p.id} {...p} duration={duration} />
      ))}
    </View>
  );
}

interface ParticleProps {
  color: string;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  size: number;
  duration: number;
  shape: 'rect' | 'circle';
}

function Particle({ color, dx, dy, rotate, delay, size, duration, shape }: ParticleProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    tx.value = withDelay(delay, withTiming(dx, { duration, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(delay, withTiming(dy, { duration, easing: Easing.in(Easing.quad) }));
    rot.value = withDelay(delay, withTiming(rotate, { duration, easing: Easing.linear }));
    op.value = withDelay(
      delay + duration * 0.55,
      withTiming(0, { duration: duration * 0.45, easing: Easing.linear })
    );
  }, [tx, ty, rot, op, dx, dy, rotate, delay, duration]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: SCREEN_W / 2 - size / 2,
          width: size,
          height: shape === 'rect' ? size * 1.6 : size,
          borderRadius: shape === 'circle' ? size / 2 : 1,
          backgroundColor: color,
        },
        aStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9997,
  },
});
