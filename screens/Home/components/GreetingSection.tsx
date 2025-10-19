import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface GreetingSectionProps {
  userName: string;
  organizationName?: string;
  organizationRole?: string;
  organizationCount?: number;
}

export function GreetingSection({
  userName,
  organizationName,
  organizationRole,
  organizationCount = 0,
}: GreetingSectionProps) {
  const colors = useColors();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Burning the midnight oil";
    if (hour < 7) return "You're up early";
    if (hour < 12) return "Good morning";
    if (hour < 14) return "Good afternoon";
    if (hour < 18) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good evening";
  };

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={[styles.greeting, { color: colors.description }]}>
          {getGreeting()},
        </Text>
        <Text style={[styles.userName, { color: colors.text }]}>
          {userName}
        </Text>
      </View>

      {/* Overview Section */}
      <View style={styles.overview}>
        <Text style={[styles.overviewTitle, { color: colors.description }]}>
          Overview
        </Text>

        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          {organizationName ? (
            <>
              <View style={styles.overviewItem}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="business" size={20} color={colors.tint} />
                </View>
                <View style={styles.itemContent}>
                  <Text
                    style={[styles.itemLabel, { color: colors.description }]}
                  >
                    Organization
                  </Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {organizationName}
                  </Text>
                </View>
              </View>

              {organizationRole && (
                <View style={styles.overviewItem}>
                  <View style={styles.iconWrapper}>
                    <Ionicons name="person" size={20} color={colors.tint} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text
                      style={[styles.itemLabel, { color: colors.description }]}
                    >
                      Your Role
                    </Text>
                    <Text style={[styles.itemValue, { color: colors.text }]}>
                      {organizationRole === "org:admin" ? "Admin" : "Member"}
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.overviewItem}>
              <View style={styles.iconWrapper}>
                <Ionicons name="briefcase" size={20} color={colors.tint} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemLabel, { color: colors.description }]}>
                  Organizations
                </Text>
                <Text style={[styles.itemValue, { color: colors.text }]}>
                  {organizationCount}{" "}
                  {organizationCount === 1 ? "workspace" : "workspaces"}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 48,
    gap: 32,
  },
  hero: {
    gap: 8,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
  },
  userName: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  overview: {
    gap: 16,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overviewCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
  },
  overviewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(62, 207, 142, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemValue: {
    fontSize: 17,
    fontWeight: "600",
  },
});
