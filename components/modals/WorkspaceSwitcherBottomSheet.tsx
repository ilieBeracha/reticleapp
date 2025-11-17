import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createOrgWorkspace } from "@/services/workspaceService";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

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
    const bottomSheetRef = useRef<BaseBottomSheetRef>(null);
    const createSheetRef = useRef<BaseBottomSheetRef>(null);
    
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

    // iOS-style press animation functions
    const createPressAnimation = () => {
      const scaleAnim = new Animated.Value(1);
      const animatePressIn = () => {
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }).start();
      };
      const animatePressOut = () => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }).start();
      };
      return { scaleAnim, animatePressIn, animatePressOut };
    };

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.open(),
      close: () => bottomSheetRef.current?.close(),
    }));



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
      createSheetRef.current?.open();
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


    const renderWorkspaceItem = useCallback(({ item }: { item: Workspace }) => {
      const isActive = item.id === activeWorkspaceId;
      const isMyWorkspace = item.id === myWorkspaceId;
      const isOrgWorkspace = item.workspace_type === 'org';

      const { scaleAnim, animatePressIn, animatePressOut } = createPressAnimation();

      return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.workspaceItem,
              isActive && styles.workspaceItemActive,
          ]}
          onPress={() => handleSelectWorkspace(item)}
            onPressIn={animatePressIn}
            onPressOut={animatePressOut}
            activeOpacity={0.8}
        >
            <View style={styles.workspaceItemContent}>
            <View style={[
              styles.workspaceIcon,
              {
                backgroundColor: isActive ? colors.primary : colors.secondary,
              }
            ]}>
              <Ionicons
                name={isMyWorkspace ? "person" : isOrgWorkspace ? "business" : "people"}
                size={20}
                color={isActive ? '#fff' : colors.textMuted}
              />
            </View>

            <View style={styles.workspaceDetails}>
              <Text style={[
                styles.workspaceName,
                isActive && styles.workspaceNameActive,
                { color: isActive ? colors.primary : colors.text }
              ]}>
                {item.workspace_name || item.full_name || item.email}
              </Text>

              <View style={styles.workspaceMeta}>
                <View style={[
                  styles.roleBadge,
                  isMyWorkspace && styles.roleBadgeOwner,
                ]}>
                  <Text style={[
                    styles.roleBadgeText,
                    { color: isMyWorkspace ? '#FF6B35' : colors.textMuted }
                  ]}>
                    {isMyWorkspace ? "Owner" : (item.access_role || 'Member')}
                  </Text>
                </View>
              </View>
            </View>

            {isActive && (
              <View style={[styles.checkmarkContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
          )}
            </View>
        </TouchableOpacity>
        </Animated.View>
      );
    }, [activeWorkspaceId, myWorkspaceId, handleSelectWorkspace, createPressAnimation]);

    return (
      <>
        {/* Main Workspace Switcher */}
        <BaseBottomSheet
          ref={bottomSheetRef}
          backdropOpacity={0.6}
          enableDynamicSizing={true}
        >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerContent}>
                  <Text style={[styles.title, { color: colors.text }]}>Workspaces</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#FF6B351A' }]}>
                    <Text style={[styles.countBadgeText, { color: '#FF6B35' }]}>
                      {workspaces.length}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenCreateWorkspace}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Switch between your workspaces
              </Text>
            </View>

            {/* My Workspace Section */}
            {groupedWorkspaces.myWorkspace.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Personal</Text>
                </View>
                {groupedWorkspaces.myWorkspace.map((workspace) => (
                  <View key={workspace.id}>
                    {renderWorkspaceItem({ item: workspace })}
                        </View>
                ))}
              </View>
            )}

            {/* Other Workspaces Section */}
            {groupedWorkspaces.otherWorkspaces.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
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
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                  <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {loading ? "Loading workspaces..." : "No Workspaces Yet"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Create your first workspace to organize your training data
                </Text>
              </View>
            )}

        </BaseBottomSheet>

        {/* Create Workspace Modal */}
        <BaseBottomSheet
          snapPoints={['90%']}
          ref={createSheetRef}
          backdropOpacity={0.6}
          enableDynamicSizing={false}
        >
            <View style={styles.createHeader}>
              <View style={[styles.createIcon, { backgroundColor: colors.primary + '1A' }]}>
                <Ionicons name="business" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.createTitle, { color: colors.text }]}>
                Create Workspace
              </Text>
              <Text style={[styles.createSubtitle, { color: colors.textMuted }]}>
                Set up a new workspace for your team or organization
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Workspace Name</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Alpha Team Training Hub"
                  placeholderTextColor={colors.textMuted + 'CC'}
                  value={workspaceName}
                  onChangeText={setWorkspaceName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateWorkspace}
                />
              </View>
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                Choose a memorable name for your team
              </Text>
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: (!workspaceName.trim() || isCreating) ? colors.secondary : colors.primary,
                    shadowColor: (!workspaceName.trim() || isCreating) ? 'transparent' : colors.primary
                  },
                  (!workspaceName.trim() || isCreating) && styles.primaryButtonDisabled
                ]}
                onPress={handleCreateWorkspace}
                disabled={!workspaceName.trim() || isCreating}
                activeOpacity={0.8}
              >
                <View style={styles.primaryButtonContent}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                    {isCreating ? "Creating..." : "Create Workspace"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  setWorkspaceName("");
                  createSheetRef.current?.close();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
        </BaseBottomSheet>
      </>
    );
  }
);

WorkspaceSwitcherBottomSheet.displayName = 'WorkspaceSwitcherBottomSheet';

const styles = StyleSheet.create({

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // Sections
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },

  // Workspace Items
  workspaceItem: {
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  workspaceItemActive: {
    backgroundColor: 'rgba(231, 105, 37, 0.08)',
  },
  workspaceItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  workspaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  workspaceDetails: {
    flex: 1,
    gap: 2,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  workspaceNameActive: {
    fontWeight: "600",
  },
  workspaceMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeOwner: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
    letterSpacing: -0.1,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    letterSpacing: -0.1,
  },
  createHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
  },
  createIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  createSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    letterSpacing: -0.1,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: '#1c1c1e',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
    backgroundColor: '#f2f2f7',
    overflow: "hidden",
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  inputHint: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
    letterSpacing: -0.1,
  },

  // Create Actions
  createActions: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  primaryButton: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  secondaryButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
