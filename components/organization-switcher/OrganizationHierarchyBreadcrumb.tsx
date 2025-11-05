import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface BreadcrumbItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface OrganizationHierarchyBreadcrumbProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (orgId: string | null, orgName: string) => void;
}

export function OrganizationHierarchyBreadcrumb({
  breadcrumbs,
  onNavigate,
}: OrganizationHierarchyBreadcrumbProps) {
  const colors = useColors();

  if (breadcrumbs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="map-outline" size={16} color={colors.indigo} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>
          Location Path
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {breadcrumbs.map((item, index) => (
          <View key={item.id} style={styles.breadcrumbWrapper}>
            <TouchableOpacity
              style={[
                styles.breadcrumb,
                {
                  backgroundColor: item.isActive
                    ? `${colors.indigo}15`
                    : "transparent",
                },
              ]}
              onPress={() =>
                onNavigate(item.id === "personal" ? null : item.id, item.name)
              }
              disabled={item.isActive}
              activeOpacity={0.65}
            >
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: item.isActive
                      ? colors.indigo
                      : `${colors.textMuted}20`,
                  },
                ]}
              >
                {item.isActive ? (
                  <Ionicons name="location" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      { color: colors.textMuted },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.breadcrumbText,
                  {
                    color: item.isActive ? colors.indigo : colors.textMuted,
                    fontWeight: item.isActive ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>

            {index < breadcrumbs.length - 1 && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
                style={styles.arrow}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#6366f115",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  breadcrumbWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
    maxWidth: 180,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "700",
  },
  breadcrumbText: {
    flex: 1,
    fontSize: 13,
  },
  arrow: {
    marginHorizontal: 6,
  },
});

