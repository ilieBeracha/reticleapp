import { useColors } from "@/hooks/ui/useColors";
import type { Workspace } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface WorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  isMyWorkspace: boolean;
  onSelect: (workspace: Workspace) => void;
}

const WorkspaceItem = memo(({ workspace, isActive, isMyWorkspace, onSelect }: WorkspaceItemProps) => {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isOrgWorkspace = workspace.workspace_type === 'org';

  const animatePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  const animatePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    onSelect(workspace);
  }, [workspace, onSelect]);

  // Memoize styles
  const itemStyle = useMemo(() => [
    styles.workspaceItem,
    isActive && styles.workspaceItemActive,
  ], [isActive]);

  const iconStyle = useMemo(() => [
    styles.workspaceIcon,
    { backgroundColor: isActive ? colors.primary : colors.secondary }
  ], [isActive, colors.primary, colors.secondary]);

  const nameStyle = useMemo(() => [
    styles.workspaceName,
    isActive && styles.workspaceNameActive,
    { color: isActive ? colors.primary : colors.text }
  ], [isActive, colors.primary, colors.text]);

  const roleStyle = useMemo(() => [
    styles.roleBadge,
    isMyWorkspace && styles.roleBadgeOwner,
  ], [isMyWorkspace]);

  const roleTextStyle = useMemo(() => [
    styles.roleBadgeText,
    { color: isMyWorkspace ? '#FF6B35' : colors.textMuted }
  ], [isMyWorkspace, colors.textMuted]);

  const checkmarkStyle = useMemo(() => [
    styles.checkmarkContainer,
    { backgroundColor: colors.primary }
  ], [colors.primary]);

  const iconName = useMemo(() => 
    isMyWorkspace ? "person" : isOrgWorkspace ? "business" : "people"
  , [isMyWorkspace, isOrgWorkspace]);

  const iconColor = useMemo(() => 
    isActive ? '#fff' : colors.textMuted
  , [isActive, colors.textMuted]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={itemStyle}
        onPress={handlePress}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.workspaceItemContent}>
          <View style={iconStyle}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          <View style={styles.workspaceDetails}>
            <Text style={nameStyle}>
              {workspace.workspace_name || workspace.full_name || workspace.email}
            </Text>

            <View style={styles.workspaceMeta}>
              <View style={roleStyle}>
                <Text style={roleTextStyle}>
                  {isMyWorkspace ? "Owner" : (workspace.access_role || 'Member')}
                </Text>
              </View>
            </View>
          </View>

          {isActive && (
            <View style={checkmarkStyle}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

WorkspaceItem.displayName = 'WorkspaceItem';

const styles = StyleSheet.create({
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
});

export default WorkspaceItem;

