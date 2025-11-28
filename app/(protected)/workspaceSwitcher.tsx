import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * WORKSPACE SWITCHER - Native Form Sheet
 * 
 * Lists workspaces and allows switching.
 * + button → separate createWorkspace sheet
 * Enter button → separate acceptInvite sheet
 */
export default function WorkspaceSwitcherSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, activeWorkspaceId, workspaces, loading } = useAppContext();

  const groupedWorkspaces = useMemo(() => {
    const myWorkspaces = workspaces.filter(w => w.created_by === userId);
    const otherWorkspaces = workspaces.filter(w => w.created_by !== userId);
    return { myWorkspaces, otherWorkspaces };
  }, [workspaces, userId]);

  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useWorkspaceStore.getState().setIsSwitching(true);
    
    setTimeout(() => {
      useWorkspaceStore.getState().setActiveWorkspace(workspaceId);
      router.replace('/(protected)/org' as any);
      setTimeout(() => {
        useWorkspaceStore.getState().setIsSwitching(false);
      }, 300);
    }, 200);
  }, []);

  const handleSwitchToPersonal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useWorkspaceStore.getState().setIsSwitching(true);
    
    setTimeout(() => {
      useWorkspaceStore.getState().setActiveWorkspace(null);
      router.replace('/(protected)/personal' as any);
      setTimeout(() => {
        useWorkspaceStore.getState().setIsSwitching(false);
      }, 300);
    }, 200);
  }, []);

  const handleCreateWorkspace = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Opens separate sheet
    router.push('/(protected)/createWorkspace' as any);
  }, []);

  const handleJoinWorkspace = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Opens separate sheet
    router.push('/(protected)/acceptInvite' as any);
  }, []);

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />
      
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Workspaces</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countText, { color: colors.text }]}>{workspaces.length}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleJoinWorkspace}
            activeOpacity={0.7}
          >
            <Ionicons name="enter-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreateWorkspace}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERSONAL</Text>
          <WorkspaceRow
            name="Personal Mode"
            subtitle="Independent training"
            icon="person"
            isActive={!activeWorkspaceId}
            onPress={handleSwitchToPersonal}
            colors={colors}
          />
        </View>

        {/* My Organizations */}
        {groupedWorkspaces.myWorkspaces.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MY ORGANIZATIONS</Text>
            {groupedWorkspaces.myWorkspaces.map(w => (
              <WorkspaceRow
                key={w.id}
                name={w.workspace_name}
                subtitle={w.access_role}
                initial={w.workspace_name?.charAt(0).toUpperCase() || 'W'}
                isActive={w.id === activeWorkspaceId}
                isOwner={w.created_by === userId}
                onPress={() => handleSelectWorkspace(w.id)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Member Of */}
        {groupedWorkspaces.otherWorkspaces.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MEMBER OF</Text>
            {groupedWorkspaces.otherWorkspaces.map(w => (
              <WorkspaceRow
                key={w.id}
                name={w.workspace_name}
                subtitle={w.access_role}
                initial={w.workspace_name?.charAt(0).toUpperCase() || 'W'}
                isActive={w.id === activeWorkspaceId}
                onPress={() => handleSelectWorkspace(w.id)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {workspaces.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="business-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No organizations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create an organization or join with an invite code
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Workspace Row Component
const WorkspaceRow = React.memo(function WorkspaceRow({
  name,
  subtitle,
  icon,
  initial,
  isActive,
  isOwner,
  onPress,
  colors,
}: {
  name: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  initial?: string;
  isActive: boolean;
  isOwner?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, isActive && { backgroundColor: colors.primary + '10' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowAvatar, { backgroundColor: icon ? colors.secondary : colors.primary + '15' }]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.text} />
        ) : (
          <Text style={[styles.rowInitial, { color: colors.primary }]}>{initial}</Text>
        )}
      </View>
      
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowRole, { color: colors.textMuted }]}>{subtitle}</Text>
          {isOwner && (
            <View style={[styles.ownerTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.ownerTagText, { color: colors.primary }]}>Owner</Text>
            </View>
          )}
        </View>
      </View>
      
      {isActive && (
        <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  grabberSpacer: {
    height: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryBtn: {
    borderWidth: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowInitial: {
    fontSize: 17,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRole: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  ownerTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ownerTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
