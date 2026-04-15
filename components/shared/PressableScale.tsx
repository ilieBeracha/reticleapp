/**
 * PressableScale - Drop-in replacement for TouchableOpacity that adds
 * Reanimated spring scale + optional haptic on press.
 *
 * Intentional API match for `Pressable` so migration is a search-and-replace.
 *
 * Usage:
 *   <PressableScale onPress={...} haptic="light">
 *     <Text>Tap me</Text>
 *   </PressableScale>
 */

import * as Haptics from 'expo-haptics';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' | 'none';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Target scale while pressed. Default 0.96. */
  scaleTo?: number;
  /** Haptic fired on press-in. Defaults to 'selection'. Pass 'none' to disable. */
  haptic?: HapticKind;
  style?: PressableProps['style'];
  /** Fire haptic on press-out instead of press-in (feels more deliberate for primary actions). */
  hapticOnRelease?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  scaleTo = 0.96,
  haptic = 'selection',
  hapticOnRelease = false,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
    if (!hapticOnRelease && haptic !== 'none') triggerHaptic(haptic);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
    if (hapticOnRelease && haptic !== 'none') triggerHaptic(haptic);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[aStyle, style as any]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function triggerHaptic(kind: Exclude<HapticKind, 'none'>): void {
  switch (kind) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    case 'selection':
      Haptics.selectionAsync();
      return;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
  }
}
