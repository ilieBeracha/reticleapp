/**
 * ToastHost - Renders queued toasts from `toastStore` with Reanimated
 * spring entrance and horizontal swipe-to-dismiss.
 *
 * Mounted once at the root of `app/_layout.tsx`. Sits above normal content
 * but below critical overlays (loading screen, bottom sheets).
 */

import { useToastStore, type ToastItem, type ToastVariant } from '@/stores/toastStore';
import { useColors } from '@/hooks/ui/useColors';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SWIPE_THRESHOLD = 80;

export function ToastHost() {
  const queue = useToastStore((s) => s.queue);
  const insets = useSafeAreaInsets();

  if (queue.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + 12 }]}
    >
      {queue.map((item, i) => (
        <ToastRow key={item.id} item={item} stackIndex={queue.length - 1 - i} />
      ))}
    </View>
  );
}

function ToastRow({ item, stackIndex }: { item: ToastItem; stackIndex: number }) {
  const colors = useColors();
  const dismiss = useToastStore((s) => s.dismiss);

  const translateY = useSharedValue(40);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(30, { duration: 200 }, (done) => {
        if (done) runOnJS(dismiss)(item.id);
      });
    }, item.durationMs);

    return () => clearTimeout(timeout);
  }, [item.id, item.durationMs, dismiss, translateY, opacity]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        translateX.value = withTiming(e.translationX > 0 ? 400 : -400, { duration: 180 });
        opacity.value = withTiming(0, { duration: 180 }, (done) => {
          if (done) runOnJS(dismiss)(item.id);
        });
      } else {
        translateX.value = withSpring(0, { damping: 18 });
      }
    });

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  const palette = variantPalette(item.variant, colors);
  const Icon = palette.Icon;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.card,
            borderColor: palette.border,
            shadowColor: colors.foreground,
            marginBottom: stackIndex * 4,
          },
          aStyle,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Icon size={18} color={palette.iconFg} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            onPress={() => {
              item.action!.onPress();
              dismiss(item.id);
            }}
            hitSlop={8}
          >
            <Text style={[styles.action, { color: palette.accent }]}>{item.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function variantPalette(
  variant: ToastVariant,
  colors: ReturnType<typeof useColors>
): { Icon: typeof Info; iconFg: string; iconBg: string; border: string; accent: string } {
  switch (variant) {
    case 'success':
      return { Icon: CheckCircle2, iconFg: '#fff', iconBg: colors.green, border: colors.green, accent: colors.green };
    case 'warning':
      return { Icon: AlertTriangle, iconFg: '#fff', iconBg: colors.yellow, border: colors.yellow, accent: colors.yellow };
    case 'error':
      return { Icon: XCircle, iconFg: '#fff', iconBg: colors.destructive, border: colors.destructive, accent: colors.destructive };
    case 'info':
    default:
      return { Icon: Info, iconFg: '#fff', iconBg: colors.accent, border: colors.border, accent: colors.accent };
  }
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'stretch',
    gap: 8,
    zIndex: 9998,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 2 },
  action: { fontSize: 13, fontWeight: '700', paddingHorizontal: 6 },
});
