import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { Ionicons } from '@expo/vector-icons';
import { router, Slot, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrganizationLayout() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();
  const pathname = usePathname();

  // Determine active tab from pathname
  const isOverviewActive = pathname === '/workspace/organization' || pathname.endsWith('/workspace/organization/');
  const isMembersActive = pathname.includes('/workspace/organization/members');

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  // Memoize container style
  const containerStyle = useMemo(() => [
    styles.container,
    { backgroundColor: colors.background }
  ], [colors.background]);

  return (
    <View style={containerStyle}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
      >
        {/* Workspace Header */}
        <View style={styles.header}>
          <Text style={[styles.workspaceName, { color: colors.text }]}>
            {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: currentRole.bg }]}>
            <Ionicons name={currentRole.icon} size={12} color={currentRole.color} />
            <Text style={[styles.roleBadgeText, { color: currentRole.color }]}>
              {roleDisplay}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              isOverviewActive && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
            onPress={() => router.push('/workspace/organization')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="stats-chart" 
              size={18} 
              color={isOverviewActive ? colors.primary : colors.textMuted} 
            />
            <Text style={[
              styles.tabText,
              { color: isOverviewActive ? colors.primary : colors.textMuted }
            ]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              isMembersActive && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
            onPress={() => router.push('/workspace/organization/members')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="people" 
              size={18} 
              color={isMembersActive ? colors.primary : colors.textMuted} 
            />
            <Text style={[
              styles.tabText,
              { color: isMembersActive ? colors.primary : colors.textMuted }
            ]}>
              Members
            </Text>
          </TouchableOpacity>
        </View>

        {/* Render child routes */}
        <Slot />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  workspaceName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

