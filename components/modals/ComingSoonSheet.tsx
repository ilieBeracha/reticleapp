import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BaseDetachedBottomSheet, type BaseDetachedBottomSheetRef } from "./BaseDetachedBottomSheet";

interface ComingSoonSheetProps {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ComingSoonSheet = forwardRef<BaseDetachedBottomSheetRef, ComingSoonSheetProps>(
  ({ title, subtitle, icon = "bar-chart" }, ref) => {
    const colors = useColors();

    return (
      <BaseDetachedBottomSheet ref={ref}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={icon} size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: colors.accent + '15' }]}>
          <Ionicons name="time-outline" size={20} color={colors.accent} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            Coming Soon
          </Text>
        </View>

        <Text style={[styles.description, { color: colors.textMuted }]}>
          We're working on this feature to enhance your training experience. Stay tuned for updates!
        </Text>
      </BaseDetachedBottomSheet>
    );
  }
);

ComingSoonSheet.displayName = 'ComingSoonSheet';

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.1,
    paddingHorizontal: 10,
  },
});

