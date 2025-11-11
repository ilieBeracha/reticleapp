import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrganizationBadgeProps {
  organizationName?: string;
  onPress: () => void;
}

export function OrganizationBadge({
  organizationName,
  onPress,
}: OrganizationBadgeProps) {
  const colors = useColors();
  const { userOrgContext } = useOrganizationsStore();

  // Get breadcrumb for context
  const breadcrumb = userOrgContext?.fullPath || "";
  const isRoot = userOrgContext?.orgDepth === 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: organizationName ? colors.tint + '15' : colors.blue + '15',
          borderColor: organizationName ? colors.tint + '40' : colors.blue + '40',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {organizationName ? (
        <>
          <View
            style={[
              styles.iconContainer, 
              { backgroundColor: colors.tint + '25' }
            ]}
          >
            <Ionicons 
              name={
                userOrgContext?.orgDepth === 0 ? "business" :
                userOrgContext?.orgDepth === 1 ? "people" :
                "shield"
              }
              size={14} 
              color={colors.tint} 
            />
          </View>
          <View style={styles.textContainer}>
            {/* Show full path if not root */}
            {!isRoot && breadcrumb && (
              <Text 
                style={[styles.breadcrumb, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {breadcrumb.split(' → ').slice(0, -1).join(' → ')}
              </Text>
            )}
            <Text 
              style={[styles.title, { color: colors.tint }]}
              numberOfLines={1}
            >
              {organizationName}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View
            style={[
              styles.iconContainer, 
              { backgroundColor: colors.blue + '25' }
            ]}
          >
            <Ionicons name="person" size={14} color={colors.blue} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.blue }]}>
              Personal
            </Text>
          </View>
        </>
      )}
      <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 280,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
    minWidth: 0, // Allow text to shrink
  },
  breadcrumb: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
