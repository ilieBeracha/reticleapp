import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/useColors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { Ionicons } from "@expo/vector-icons";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId } = useEnhancedAuth();
  if (!userId) {
    return null;
  }
  return (
    <ThemedView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            APPEARANCE
          </Text>
          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingRow}
              onPress={() => Linking.openSettings()}
              android_ripple={{ color: colors.border }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.indigo + "15" },
                  ]}
                >
                  <Ionicons
                    name={isDark ? "moon" : "sunny"}
                    size={20}
                    color={colors.indigo}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Theme
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textMuted },
                    ]}
                  >
                    Follows system settings • {isDark ? "Dark" : "Light"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            ACCOUNT
          </Text>
          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {}}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.blue + "15" },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.blue}
                  />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Profile
                </Text>
              </View>
            <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              style={styles.settingRow}
              onPress={() => {}}
              android_ripple={{ color: colors.border }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.green + "15" },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={colors.green}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Notifications
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            ABOUT
          </Text>
          <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.settingRow}
              onPress={() => {}}
              android_ripple={{ color: colors.border }}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.purple + "15" },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={colors.purple}
                  />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    About
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});
