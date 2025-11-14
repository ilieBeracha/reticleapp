import React from "react";
import { View, Pressable } from "react-native";
import {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetContent,
  BottomSheetDragIndicator,
  BottomSheetBackdrop,
  BottomSheetItem,
  BottomSheetItemText,
} from "@/components/ui/bottomsheet";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

/**
 * Quick Actions Sheet - A practical example of a slightly open bottom sheet
 * Shows quick actions at the bottom of the screen, slightly visible by default
 * 
 * Usage:
 * ```tsx
 * <QuickActionsSheet
 *   actions={[
 *     { label: "New Session", onPress: () => {}, icon: "➕" },
 *     { label: "View Stats", onPress: () => {}, icon: "📊" },
 *   ]}
 * />
 * ```
 */

export interface QuickAction {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface QuickActionsSheetProps {
  actions: QuickAction[];
  title?: string;
  snapPoints?: string[];
  initialSnapIndex?: number;
}

export const QuickActionsSheet = ({
  actions,
  title = "Quick Actions",
  snapPoints = ["18%", "50%"],
  initialSnapIndex = 0,
}: QuickActionsSheetProps) => {
  return (
    <BottomSheet>
      <BottomSheetPortal
        snapPoints={snapPoints}
        defaultIsOpen={true}
        snapToIndex={initialSnapIndex}
        handleComponent={BottomSheetDragIndicator}
        backdropComponent={BottomSheetBackdrop}
      >
        <BottomSheetContent className="px-4">
          <ThemedView className="py-2">
            <ThemedText className="text-lg font-semibold mb-3 text-center">
              {title}
            </ThemedText>

            <View className="space-y-2">
              {actions.map((action, index) => (
                <BottomSheetItem
                  key={index}
                  onPress={action.onPress}
                  className={`
                    flex-row items-center p-4 rounded-xl
                    ${action.destructive ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}
                  `}
                >
                  {action.icon && (
                    <ThemedText className="text-2xl mr-3">
                      {action.icon}
                    </ThemedText>
                  )}
                  <BottomSheetItemText
                    className={`
                      text-base font-medium
                      ${action.destructive ? "text-red-600 dark:text-red-400" : ""}
                    `}
                  >
                    {action.label}
                  </BottomSheetItemText>
                </BottomSheetItem>
              ))}
            </View>
          </ThemedView>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
};

/**
 * Example usage for a training app
 */
export const TrainingQuickActions = () => {
  const actions: QuickAction[] = [
    {
      label: "New Session",
      icon: "🎯",
      onPress: () => console.log("New session"),
    },
    {
      label: "View Statistics",
      icon: "📊",
      onPress: () => console.log("View stats"),
    },
    {
      label: "My Loadouts",
      icon: "🔫",
      onPress: () => console.log("Loadouts"),
    },
    {
      label: "Training Plans",
      icon: "📋",
      onPress: () => console.log("Training plans"),
    },
  ];

  return (
    <QuickActionsSheet
      actions={actions}
      title="Quick Actions"
      snapPoints={["22%", "60%"]}
    />
  );
};

