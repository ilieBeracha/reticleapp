import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import type { Workspace } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface WorkspaceSwitcherRef {
  open: () => void;
  close: () => void;
}

interface WorkspaceSwitcherBottomSheetProps {
  onSettingsPress?: () => void;
}

/**
 * SIMPLIFIED WORKSPACE SWITCHER
 * 
 * Model: User = Workspace
 * - Shows user's own workspace
 * - Shows other workspaces they have access to
 * - Each workspace is a profile (user)
 */
export const WorkspaceSwitcherBottomSheet = forwardRef<WorkspaceSwitcherRef, WorkspaceSwitcherBottomSheetProps>(
  (props, ref) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);
    
    const { 
      myWorkspaceId, 
      activeWorkspaceId, 
      workspaces,
      switchWorkspace,
      switchToMyWorkspace,
      loading 
    } = useAppContext();

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const snapPoints = useMemo(() => ['70%'], []);

    // Group workspaces: My workspace first, then others
    const groupedWorkspaces = useMemo(() => {
      const myWorkspace = workspaces.find(w => w.id === myWorkspaceId);
      const otherWorkspaces = workspaces.filter(w => w.id !== myWorkspaceId);

      return {
        myWorkspace: myWorkspace ? [myWorkspace] : [],
        otherWorkspaces
      };
    }, [workspaces, myWorkspaceId]);

    const handleSelectWorkspace = useCallback(async (workspace: Workspace) => {
      try {
        await switchWorkspace(workspace.id);
        bottomSheetRef.current?.close();
      } catch (error: any) {
        console.error("Failed to switch workspace:", error);
        Alert.alert("Error", "Failed to switch workspace");
      }
    }, [switchWorkspace]);

    const handleSelectMyWorkspace = useCallback(async () => {
      try {
        await switchToMyWorkspace();
        bottomSheetRef.current?.close();
      } catch (error: any) {
        console.error("Failed to switch to my workspace:", error);
        Alert.alert("Error", "Failed to switch to my workspace");
      }
    }, [switchToMyWorkspace]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    const renderWorkspaceItem = useCallback(({ item }: { item: Workspace }) => {
      const isActive = item.id === activeWorkspaceId;
      const isMyWorkspace = item.id === myWorkspaceId;

      return (
        <TouchableOpacity
          style={[styles.workspaceItem, isActive && styles.activeItem]}
          onPress={() => handleSelectWorkspace(item)}
        >
          <View style={styles.workspaceInfo}>
            <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
              <Ionicons
                name={isMyWorkspace ? "person" : "people"}
                size={24}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.workspaceName, { color: isActive ? colors.primary : colors.text }]}>
                {item.workspace_name || item.full_name || item.email}
              </Text>
              <Text style={[styles.workspaceType, { color: colors.textMuted }]}>
                {isMyWorkspace ? "My Workspace" : `${item.access_role || 'member'}`}
              </Text>
            </View>
          </View>
          {isActive && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    }, [activeWorkspaceId, myWorkspaceId, colors, handleSelectWorkspace]);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Switch Workspace</Text>
          </View>

          {/* My Workspace */}
          {groupedWorkspaces.myWorkspace.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>My Workspace</Text>
              {groupedWorkspaces.myWorkspace.map((workspace) => (
                <TouchableOpacity
                  key={workspace.id}
                  style={[
                    styles.workspaceItem,
                    workspace.id === activeWorkspaceId && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => handleSelectWorkspace(workspace)}
                >
                  <View style={styles.workspaceInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                      <Ionicons
                        name="person"
                        size={24}
                        color={workspace.id === activeWorkspaceId ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.workspaceName,
                          { color: workspace.id === activeWorkspaceId ? colors.primary : colors.text }
                        ]}
                      >
                        {workspace.workspace_name || workspace.full_name || workspace.email}
                      </Text>
                      <Text style={[styles.workspaceType, { color: colors.textMuted }]}>Owner</Text>
                    </View>
                  </View>
                  {workspace.id === activeWorkspaceId && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Other Workspaces */}
          {groupedWorkspaces.otherWorkspaces.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                Other Workspaces ({groupedWorkspaces.otherWorkspaces.length})
              </Text>
              <BottomSheetFlatList
                data={groupedWorkspaces.otherWorkspaces}
                renderItem={renderWorkspaceItem}
                keyExtractor={(item: Workspace) => item.id}
                style={styles.list}
              />
            </View>
          )}

          {/* Empty state */}
          {groupedWorkspaces.myWorkspace.length === 0 && groupedWorkspaces.otherWorkspaces.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {loading ? "Loading workspaces..." : "No workspaces available"}
              </Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

WorkspaceSwitcherBottomSheet.displayName = 'WorkspaceSwitcherBottomSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 20,
    paddingVertical: 8,
    textTransform: "uppercase",
  },
  list: {
    flexGrow: 0,
  },
  workspaceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  activeItem: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  workspaceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  activeText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  workspaceType: {
    fontSize: 13,
    color: "#666",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
});
