import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createOrgWorkspace } from "@/services/workspaceService";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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
    const createSheetRef = useRef<BottomSheet>(null);
    
    const { 
      myWorkspaceId, 
      activeWorkspaceId, 
      workspaces,
      switchWorkspace,
      switchToMyWorkspace,
      loading 
    } = useAppContext();

    const [workspaceName, setWorkspaceName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const snapPoints = useMemo(() => ['75%'], []);
    const createSnapPoints = useMemo(() => ['50%'], []);

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

    const handleOpenCreateWorkspace = useCallback(() => {
      setWorkspaceName("");  // Clear for new workspace
      createSheetRef.current?.expand();
    }, []);

    const handleCreateWorkspace = useCallback(async () => {
      if (!workspaceName.trim()) {
        Alert.alert("Error", "Please enter a workspace name");
        return;
      }

      setIsCreating(true);
      try {
        // Create new org workspace
        const newWorkspace = await createOrgWorkspace({
          name: workspaceName.trim(),
          description: undefined,
        });
        
        // Reload workspaces to show the new one
        await useWorkspaceStore.getState().loadWorkspaces();
        
        // Switch to the newly created workspace
        await switchWorkspace(newWorkspace.id);
        
        setWorkspaceName("");
        createSheetRef.current?.close();
        bottomSheetRef.current?.close();
        
        Alert.alert("Success", `Workspace "${newWorkspace.workspace_name}" created!`);
      } catch (error: any) {
        console.error("Failed to create workspace:", error);
        Alert.alert("Error", "Failed to create workspace");
      } finally {
        setIsCreating(false);
      }
    }, [workspaceName, switchWorkspace]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const renderWorkspaceItem = useCallback(({ item }: { item: Workspace }) => {
      const isActive = item.id === activeWorkspaceId;
      const isMyWorkspace = item.id === myWorkspaceId;

      return (
        <TouchableOpacity
          style={[
            styles.workspaceItem,
            isActive && { backgroundColor: colors.primary + '10' }
          ]}
          onPress={() => handleSelectWorkspace(item)}
          activeOpacity={0.7}
        >
          <View style={styles.workspaceInfo}>
            <View style={[
              styles.iconContainer,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
              }
            ]}>
              <Ionicons
                name={isMyWorkspace ? "person" : "people"}
                size={22}
                color={isActive ? '#fff' : colors.textMuted}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[
                styles.workspaceName,
                { color: isActive ? colors.primary : colors.text }
              ]}>
                {item.workspace_name || item.full_name || item.email}
              </Text>
              <Text style={[styles.workspaceType, { color: colors.textMuted }]}>
                {isMyWorkspace ? "Owner" : (item.access_role || 'Member')}
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
      <>
        {/* Main Workspace Switcher */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.background }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <BottomSheetScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Workspaces</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
                </Text>
              </View>
            </View>

            {/* My Workspace Section */}
            {groupedWorkspaces.myWorkspace.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderSimple}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Personal</Text>
                </View>
                {groupedWorkspaces.myWorkspace.map((workspace) => (
                  <TouchableOpacity
                    key={workspace.id}
                    style={[
                      styles.workspaceItem,
                      workspace.id === activeWorkspaceId && { backgroundColor: colors.primary + '10' }
                    ]}
                    onPress={() => handleSelectWorkspace(workspace)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workspaceInfo}>
                      <View style={[
                        styles.iconContainer,
                        {
                          backgroundColor: workspace.id === activeWorkspaceId ? colors.primary : colors.card,
                        }
                      ]}>
                        <Ionicons
                          name="person"
                          size={22}
                          color={workspace.id === activeWorkspaceId ? '#fff' : colors.textMuted}
                        />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={[
                          styles.workspaceName,
                          { color: workspace.id === activeWorkspaceId ? colors.primary : colors.text }
                        ]}>
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

            {/* Other Workspaces Section */}
            {groupedWorkspaces.otherWorkspaces.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderSimple}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    Organizations
                  </Text>
                </View>
                {groupedWorkspaces.otherWorkspaces.map((workspace) => (
                  <View key={workspace.id}>
                    {renderWorkspaceItem({ item: workspace })}
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {groupedWorkspaces.myWorkspace.length === 0 && groupedWorkspaces.otherWorkspaces.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {loading ? "Loading workspaces..." : "No workspaces available"}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Create your first workspace to get started
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenCreateWorkspace}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Create New Workspace</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>

        {/* Create/Edit Workspace Modal */}
        <BottomSheet
          ref={createSheetRef}
          index={-1}
          snapPoints={createSnapPoints}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.background }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <BottomSheetScrollView style={styles.createContainer}>
            <View style={styles.createHeader}>
              <View style={[styles.createIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="business" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.createTitle, { color: colors.text }]}>
                Create New Workspace
              </Text>
              <Text style={[styles.createSubtitle, { color: colors.textMuted }]}>
                Set up a new workspace for your team or organization
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Workspace Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  }
                ]}
                placeholder="e.g. Alpha Team Training Hub"
                placeholderTextColor={colors.textMuted}
                value={workspaceName}
                onChangeText={setWorkspaceName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateWorkspace}
              />
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                This will be visible to all members of your workspace
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !workspaceName.trim() || isCreating ? 0.5 : 1
                  }
                ]}
                onPress={handleCreateWorkspace}
                disabled={!workspaceName.trim() || isCreating}
                activeOpacity={0.8}
              >
                <Ionicons name="rocket" size={22} color="#fff" />
                <Text style={styles.createButtonText}>
                  {isCreating ? "Creating..." : "Create Workspace"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setWorkspaceName("");
                  createSheetRef.current?.close();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
  section: {
    paddingVertical: 8,
  },
  sectionHeaderSimple: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  workspaceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  workspaceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  workspaceType: {
    fontSize: 13,
    fontWeight: "400",
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  
  // Action Section
  actionSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  
  // Create Workspace Modal Styles
  createContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  createHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: "center",
  },
  createIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  createSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    textAlign: "center",
  },
  inputContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "500",
    borderWidth: 1.5,
  },
  inputHint: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
