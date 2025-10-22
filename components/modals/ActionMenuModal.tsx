import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
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
      snapPoints={["40%", "75%"]}
      enablePanDownToClose={true}
      backdropOpacity={0.45}
    >
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.description }]}>
          Choose an action to continue
        </Text>

        {/* Actions */}
        <BottomSheetFlatList
          data={actions}
          keyExtractor={(item: Action, idx: number) => `${item.action}-${idx}`}
          renderItem={({ item: action }: { item: Action }) => {
            const isDisabled =
              action.isOnlyOrganizationMember && !hasOrganization;

            return (
              <TouchableOpacity
                disabled={isDisabled}
                style={[
                  styles.actionItem,
                  { borderColor: colors.border },
                  isDisabled && styles.disabledItem,
                ]}
                onPress={() => handleActionPress(action.action)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    {
                      backgroundColor: isDisabled
                        ? colors.border
                        : colors.tint + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={22}
                    color={isDisabled ? colors.description : colors.tint}
                  />
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
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={colors.description}
                    style={styles.lockIcon}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.description}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 16,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  disabledItem: {
    opacity: 0.4,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  actionDescription: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  lockIcon: {
    opacity: 0.5,
  },
});
