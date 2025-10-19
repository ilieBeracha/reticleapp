import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface Action {
  title: string;
  description: string;
  icon: string;
  action: string;
  isOnlyOrganizationMember?: boolean;
}

export interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  actions: Action[];
  onActionSelect: (action: string) => void;
  hasOrganization?: boolean;
}

export default function ActionMenu({
  visible,
  onClose,
  title,
  actions,
  onActionSelect,
  hasOrganization = false,
}: ActionMenuProps) {
  const colors = useColors();

  const handleActionPress = (action: string) => {
    // Close first, then execute action
    onClose();
    setTimeout(() => {
      onActionSelect(action);
    }, 100);
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%"]}
      enablePanDownToClose={true}
      backdropOpacity={0.5}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.description }]}>
          Choose an action to continue
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {actions.map((action, idx) => {
          const isDisabled =
            action.isOnlyOrganizationMember && !hasOrganization;

          return (
            <TouchableOpacity
              key={idx}
              disabled={isDisabled}
              style={[
                styles.actionItem,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: isDisabled ? 0.4 : 1,
                },
              ]}
              onPress={() => handleActionPress(action.action)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  {
                    backgroundColor: isDisabled ? colors.border : colors.tint,
                  },
                ]}
              >
                <Ionicons name={action.icon as any} size={22} color="#ffffff" />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.actionDescription,
                    { color: colors.description },
                  ]}
                >
                  {action.description}
                </Text>
              </View>
              {isDisabled ? (
                <View
                  style={[
                    styles.disabledBadge,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={colors.description}
                  />
                </View>
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.description}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 12,
    gap: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
  actionsContainer: {
    gap: 12,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  actionDescription: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  disabledBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
