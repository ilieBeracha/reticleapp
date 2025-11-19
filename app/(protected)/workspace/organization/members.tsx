import EmptyState from '@/components/shared/EmptyState';
import GroupedList from '@/components/shared/GroupedList';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MembersPage() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();  
  const permissions = useWorkspacePermissions();
  const { workspaceMembers, loadWorkspaceMembers } = useWorkspaceStore();

  useEffect(() => {
    loadWorkspaceMembers();
  }, [activeWorkspaceId, loadWorkspaceMembers]);

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  if (workspaceMembers.length === 0) {
    return (
      <View style={styles.content}>
      <EmptyState
        icon="people-outline"
        title="No members yet"
        subtitle="Invite members to your organization workspace"
        size="small"
        />
        </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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

      <GroupedList
        data={workspaceMembers}
        renderItem={(member, isFirst, isLast) => (
          <View style={[
            styles.memberItem,
            { 
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              borderBottomWidth: isLast ? 0 : 1
            }
          ]}>
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.details}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.profile?.full_name || 'Unknown'}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                  {member.profile?.email || ''}
                </Text>
              </View>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role).bg }]}>
              <Text style={[styles.roleText, { color: getRoleColor(member.role).color }]}>
                {member.role}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={(member) => member.id}
      />
    </ScrollView>
  );
}

function getRoleColor(role: string) {
  const colors = {
    owner: { color: '#FF6B35', bg: '#FF6B3515' },
    admin: { color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { color: '#E76925', bg: '#E7692515' },
    member: { color: '#666', bg: '#E0E0E0' },
  };
  return colors[role as keyof typeof colors] || colors.member;
}

const styles = StyleSheet.create({
  container: {
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

  // Member List
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  details: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  
  // Badge styles (shared with header)
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
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textTransform: 'capitalize',
  },
});

