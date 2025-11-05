import { useColors } from "@/hooks/ui/useColors";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { Organization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrgInfoCardProps {
  organization: Organization;
  canEdit: boolean;
  onEdit: () => void;
}

export function OrgInfoCard({
  organization,
  canEdit,
  onEdit,
}: OrgInfoCardProps) {
  const colors = useColors();
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");

  const createdDate = new Date(organization.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <View
      style={[styles.card, { backgroundColor: cardBackground, borderColor }]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.indigo + "20" },
            ]}
          >
            <Ionicons name="business" size={24} color={colors.indigo} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.orgName, { color: textColor }]}>
              {organization.name}
            </Text>
            <View style={styles.typeRow}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.blue + "15" },
                ]}
              >
                <Text style={[styles.typeText, { color: colors.blue }]}>
                  {organization.org_type}
                </Text>
              </View>
              {organization.depth === 0 && (
                <View
                  style={[
                    styles.rootBadge,
                    { backgroundColor: colors.purple + "15" },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={12}
                    color={colors.purple}
                  />
                  <Text style={[styles.rootText, { color: colors.purple }]}>
                    Root
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {canEdit && (
          <TouchableOpacity
            style={[styles.editButton, { borderColor }]}
            onPress={onEdit}
          >
            <Ionicons name="create-outline" size={18} color={colors.indigo} />
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      {organization.description && (
        <View style={styles.descriptionSection}>
          <Text style={[styles.description, { color: mutedColor }]}>
            {organization.description}
          </Text>
        </View>
      )}

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: mutedColor }]}>Created</Text>
          <Text style={[styles.infoValue, { color: textColor }]}>
            {createdDate}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: mutedColor }]}>
            Depth Level
          </Text>
          <Text style={[styles.infoValue, { color: textColor }]}>
            Level {organization.depth}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rootBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  rootText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  descriptionSection: {
    paddingTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
