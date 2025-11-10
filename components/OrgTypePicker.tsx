import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrgType {
  value: string;
  icon: string;
  color: string;
  hierarchyIndex: number;
  recommended: boolean;
  disabled: boolean;
}

interface OrgTypePickerProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
  parentType?: string; // Optional - for child org creation
  disabled?: boolean;
}

export function OrgTypePicker({
  selectedType,
  onTypeSelect,
  parentType,
  disabled = false,
}: OrgTypePickerProps) {
  const colors = useColors();

  // Hierarchy order (top to bottom)
  const typeHierarchy = ["Unit", "Team", "Squad"];

  // Get parent's hierarchy index
  const parentHierarchyIndex = parentType
    ? typeHierarchy.indexOf(parentType)
    : -1;

  // Smart type suggestion based on parent type
  const getSmartType = (parentType?: string): string => {
    if (!parentType) return "Unit"; // For root orgs, suggest Unit
    const parentIndex = typeHierarchy.indexOf(parentType);
    // Suggest next level down in hierarchy
    if (parentIndex >= 0 && parentIndex < typeHierarchy.length - 1) {
      return typeHierarchy[parentIndex + 1];
    }
    return "Squad"; // Fallback to bottom of hierarchy
  };

  const smartType = getSmartType(parentType);

  // Type options - filter based on parent hierarchy
  const orgTypes: OrgType[] = [
    {
      value: "Unit",
      icon: "business",
      color: colors.primary,
      hierarchyIndex: 0,
      recommended: smartType === "Unit",
      disabled: parentHierarchyIndex >= 0, // Can't create Unit if parent is Unit/Team/Squad
    },
    {
      value: "Team",
      icon: "people",
      color: colors.accent,
      hierarchyIndex: 1,
      recommended: smartType === "Team",
      disabled: parentHierarchyIndex >= 1, // Can't create Team if parent is Team/Squad
    },
    {
      value: "Squad",
      icon: "shield",
      color: colors.green,
      hierarchyIndex: 2,
      recommended: smartType === "Squad",
      disabled: parentHierarchyIndex >= 2, // Can't create Squad if parent is Squad
    },
  ].filter((type) => !type.disabled); // Remove disabled types entirely

  const recommendedType = orgTypes.find((t) => t.recommended);

  return (
    <View style={styles.container}>
      {/* Label with Recommended Badge */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>Type</Text>
        {recommendedType && (
          <View
            style={[
              styles.recommendedBadge,
              { backgroundColor: colors.green + "15" },
            ]}
          >
            <Ionicons name="star" size={12} color={colors.green} />
            <Text style={[styles.recommendedText, { color: colors.green }]}>
              {recommendedType.value} recommended
            </Text>
          </View>
        )}
      </View>

      {/* Type Pills Grid */}
      <View style={styles.typeGrid}>
        {orgTypes.map((type) => {
          const isSelected = selectedType === type.value;

          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typePill,
                {
                  backgroundColor: isSelected
                    ? type.color + "20"
                    : colors.cardBackground,
                  borderColor: isSelected ? type.color : colors.border,
                  borderWidth: type.recommended ? 2 : 1.5,
                },
              ]}
              onPress={() => onTypeSelect(type.value)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={isSelected ? type.color : colors.textMuted}
              />
              <Text
                style={[
                  styles.typePillText,
                  {
                    color: isSelected ? type.color : colors.text,
                  },
                ]}
              >
                {type.value}
              </Text>
              {type.recommended && !isSelected && (
                <Ionicons name="star-outline" size={16} color={type.color} />
              )}
              {isSelected && (
                <Ionicons name="checkmark-circle" size={18} color={type.color} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    minWidth: "45%",
  },
  typePillText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});

