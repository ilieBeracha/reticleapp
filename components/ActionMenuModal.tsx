import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

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
  const colorScheme = useColorScheme();
  const colors = useColors();

  // Use lighter gray for action items in dark mode for clear contrast
  const actionItemBg =
    colorScheme === "dark"
      ? "#1f1f1f" // Noticeably lighter than sheet (#121212)
      : colors.cardBackground;

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
      snapPoints={["45%"]}
      enablePanDownToClose={true}
      backdropOpacity={0.6}
    >
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

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
                  backgroundColor: actionItemBg,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
              onPress={() => handleActionPress(action.action)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: colors.tint },
                ]}
              >
                <Ionicons name={action.icon as any} size={24} color="#ffffff" />
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
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.description}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  actionsContainer: {
    gap: 10,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 14,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
