import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { height } = Dimensions.get('window');

interface WorkspaceContextHeaderProps {
  showNotification?: boolean;
  onNotificationPress?: () => void;
}

export default function WorkspaceContextHeader({
  showNotification = true,
  onNotificationPress,
}: WorkspaceContextHeaderProps) {
  const colors = useColors();
  const router = useRouter();
  const { workspaces, activeWorkspaceId, switchWorkspace, activeWorkspace } = useAppContext();
  
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      setShowSwitcher(false);
      return;
    }

    setSwitching(true);
    await switchWorkspace(workspaceId);
    setSwitching(false);
    
    setTimeout(() => {
      setShowSwitcher(false);
    }, 300);
  };

  const handleSeeAll = () => {
    setShowSwitcher(false);
    router.push('/(protected)/org');
  };

  const getWorkspaceIcon = (type?: string) => {
    switch (type) {
      case 'org':
        return 'office-building';
      case 'personal':
        return 'account';
      default:
        return 'briefcase';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'crown';
      case 'admin':
        return 'shield-check';
      default:
        return 'account';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return '#059669';
      case 'admin':
        return '#6366F1';
      default:
        return '#64748B';
    }
  };

  // Get top 5 workspaces for quick switcher
  const recentWorkspaces = workspaces.slice(0, 5);

  return (
    <>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.workspaceChip, { backgroundColor: colors.card }]}
          onPress={() => setShowSwitcher(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={'office-building'}
            size={18}
            color={colors.accent}
          />
          <Text 
            style={[styles.workspaceName, { color: colors.text }]}
            numberOfLines={1}
          >
            {activeWorkspace?.workspace_name || 'Select Workspace'}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={colors.textMuted} 
          />
        </TouchableOpacity>

        {showNotification && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {/* Notification Badge */}
            {/* <View style={[styles.badge, { backgroundColor: colors.accent }]} /> */}
          </TouchableOpacity>
        )}
      </View>

      {/* Workspace Switcher Bottom Sheet */}
      <Modal
        visible={showSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSwitcher(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSwitcher(false)}
        >
          <Pressable 
            style={[styles.bottomSheet, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Switch Workspace
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
              </Text>
            </View>

            {/* Workspaces List */}
            <ScrollView 
              style={styles.workspacesList}
              showsVerticalScrollIndicator={false}
            >
              {recentWorkspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;
                const roleColor = getRoleColor(workspace.access_role);

                return (
                  <TouchableOpacity
                    key={workspace.id}
                    style={[
                      styles.workspaceItem,
                      {
                        backgroundColor: isActive ? colors.accent : colors.card,
                        borderColor: isActive ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => handleWorkspaceSwitch(workspace.id)}
                    activeOpacity={0.7}
                    disabled={isActive || switching}
                  >
                    {/* Gradient Overlay for Active */}
                    {isActive && (
                      <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}

                    <View style={styles.workspaceItemContent}>
                      {/* Icon */}
                      <View
                        style={[
                          styles.workspaceIcon,
                          {
                            backgroundColor: isActive
                              ? 'rgba(255,255,255,0.2)'
                              : `${colors.accent}15`,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={'office-building'}
                          size={24}
                          color={isActive ? '#FFFFFF' : colors.accent}
                        />
                      </View>

                      {/* Info */}
                      <View style={styles.workspaceInfo}>
                        <Text
                          style={[
                            styles.workspaceItemName,
                            { color: isActive ? '#FFFFFF' : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {workspace.workspace_name}
                        </Text>
                        
                        <View style={styles.workspaceMeta}>
                          <MaterialCommunityIcons
                            name={getRoleIcon(workspace.access_role)}
                            size={12}
                            color={isActive ? 'rgba(255,255,255,0.8)' : roleColor}
                          />
                          <Text
                            style={[
                              styles.workspaceRole,
                              { 
                                color: isActive 
                                  ? 'rgba(255,255,255,0.8)' 
                                  : colors.textMuted 
                              },
                            ]}
                          >
                            {workspace.access_role}
                          </Text>
                          
                          {workspace.access_role === 'member' && (
                            <>
                              <View 
                                style={[
                                  styles.metaDot, 
                                  { 
                                    backgroundColor: isActive 
                                      ? 'rgba(255,255,255,0.4)' 
                                      : colors.border 
                                  }
                                ]} 
                              />
                              <Text
                                style={[
                                  styles.workspaceRole,
                                  { 
                                    color: isActive 
                                      ? 'rgba(255,255,255,0.8)' 
                                      : colors.textMuted 
                                  },
                                ]}
                              >
                                {workspace.access_role}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Active Indicator */}
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* See All Button */}
              {workspaces.length > 5 && (
                <TouchableOpacity
                  style={[styles.seeAllButton, { backgroundColor: colors.card }]}
                  onPress={handleSeeAll}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeAllText, { color: colors.accent }]}>
                    See All Workspaces ({workspaces.length})
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}

              {/* Create New */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: `${colors.accent}10`, borderColor: colors.accent },
                ]}
                onPress={() => {
                  setShowSwitcher(false);
                  // Navigate to create workspace
                  router.push('/(protected)/org');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.createIconContainer, { backgroundColor: `${colors.accent}20` }]}>
                  <Ionicons name="add" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.createTitle, { color: colors.text }]}>
                    Create New Workspace
                  </Text>
                  <Text style={[styles.createSubtitle, { color: colors.textMuted }]}>
                    Organize your training data
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  workspaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workspaceName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
  },
  workspacesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  workspaceItem: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workspaceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  workspaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceInfo: {
    flex: 1,
  },
  workspaceItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workspaceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workspaceRole: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
    marginBottom: 20,
  },
  createIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: 13,
  },
});