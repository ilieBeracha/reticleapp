import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface WorkspaceSwitcherRef {
  open: () => void;
  close: () => void;
}

export const WorkspaceSwitcherBottomSheet = forwardRef<WorkspaceSwitcherRef>((_, ref) => {
  const colors = useColors();
  // ✨ SINGLE SOURCE OF TRUTH
  const { workspaceId, workspaces, switchWorkspace } = useAppContext();
  const sheetRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  const snapPoints = useMemo(() => ["45%", "70%"], []);

  const handleWorkspacePress = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    sheetRef.current?.close();
  };

  const getWorkspaceIcon = (type: string) => {
    return type === "personal" ? "person-circle-outline" : "business-outline";
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
    >
      <BottomSheetScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Workspaces
          </Text>
        </View>

        {/* Workspace List */}
        <View style={styles.workspaceList}>
          <View style={[styles.listGroup, { backgroundColor: colors.card }]}>
            {workspaces.map((ws, index) => {
              // ✨ Compare with SINGLE SOURCE OF TRUTH
              const isActive = ws.id === workspaceId;
              const isPersonal = ws.workspace_type === "personal";
              const isLast = index === workspaces.length - 1;

              return (
                <View key={ws.id}>
                  <TouchableOpacity
                    onPress={() => handleWorkspacePress(ws.id)}
                    activeOpacity={0.6}
                    style={styles.workspaceRow}
                  >
                    {/* Icon */}
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: isPersonal ? colors.accent : colors.green,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getWorkspaceIcon(ws.workspace_type) as any}
                        size={18}
                        color="#FFF"
                      />
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                      <Text
                        style={[
                          styles.workspaceName,
                          {
                            color: colors.text,
                            fontWeight: isActive ? "600" : "400",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {isPersonal ? 'Personal' : ws.name}
                      </Text>
                    </View>

                    {/* Active Indicator */}
                    {isActive && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.accent}
                        style={styles.checkmark}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Separator */}
                  {!isLast && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Empty State */}
        {workspaces.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No workspaces available
            </Text>
          </View>
        )}

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

WorkspaceSwitcherBottomSheet.displayName = "WorkspaceSwitcherBottomSheet";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  workspaceList: {
    paddingHorizontal: 16,
  },
  listGroup: {
    borderRadius: 12,
    overflow: "hidden",
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 16,
  },
  workspaceName: {
    fontSize: 17,
    lineHeight: 22,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  checkmark: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
});

