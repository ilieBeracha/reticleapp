import EmptyState from '@/components/shared/EmptyState';
import GroupedList from '@/components/shared/GroupedList';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MembersPage() {
  const colors = useColors();
  const { activeWorkspaceId } = useAppContext();  
  const { workspaceMembers, loadWorkspaceMembers } = useWorkspaceStore();

  useEffect(() => {
    loadWorkspaceMembers();
  }, [activeWorkspaceId, loadWorkspaceMembers]);

  if (workspaceMembers.length === 0) {
    return (
      <EmptyState
        icon="people-outline"
        title="No members yet"
        subtitle="Invite members to your organization workspace"
        size="small"
      />
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
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
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textTransform: 'capitalize',
  },
});

