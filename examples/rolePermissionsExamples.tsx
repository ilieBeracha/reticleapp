/**
 * 📚 ROLE PERMISSIONS - USAGE EXAMPLES
 * 
 * Practical examples of using the role management system
 */

import { useCanDo, useRolePermissions } from '@/hooks/useRolePermissions';
import { Ionicons } from '@expo/vector-icons';
import { Button, Text, View } from 'react-native';

// =====================================================
// EXAMPLE 1: Organization Dashboard
// =====================================================

export function OrganizationDashboard() {
  const { org, can, getRoleInfo, isOwner, isAdmin } = useRolePermissions();
  
  return (
    <View>
      {/* Show role badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons 
          name={getRoleInfo.org.icon} 
          size={24} 
          color={getRoleInfo.org.color} 
        />
        <Text style={{ color: getRoleInfo.org.color }}>
          {getRoleInfo.org.displayName}
        </Text>
      </View>
      
      {/* Show buttons based on permissions */}
      {org.canCreateTeams && (
        <Button title="Create Team" onPress={handleCreateTeam} />
      )}
      
      {org.canInviteMembers && (
        <Button title="Invite Members" onPress={handleInviteMembers} />
      )}
      
      {org.canViewAllTeams && (
        <Button title="View All Teams" onPress={handleViewTeams} />
      )}
      
      {/* Owner-only actions */}
      {isOwner && (
        <Button 
          title="Delete Organization" 
          onPress={handleDeleteOrg}
          color="red"
        />
      )}
    </View>
  );
}

// =====================================================
// EXAMPLE 2: Team Dashboard
// =====================================================

export function TeamDashboard({ teamRole }: { teamRole: 'commander' | 'squad_commander' | 'soldier' }) {
  const { team, can, getRoleInfo, isTeamCommander } = useRolePermissions(teamRole);
  
  if (!team) return null;
  
  return (
    <View>
      {/* Show team role badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons 
          name={getRoleInfo.team?.icon} 
          size={24} 
          color={getRoleInfo.team?.color} 
        />
        <Text style={{ color: getRoleInfo.team?.color }}>
          {getRoleInfo.team?.displayName}
        </Text>
      </View>
      
      {/* Commander controls */}
      {isTeamCommander && (
        <View>
          <Button title="Manage Team" onPress={handleManageTeam} />
          <Button title="Create Training" onPress={handleCreateTraining} />
        </View>
      )}
      
      {/* Squad commander controls */}
      {team.canManageOwnSquad && !isTeamCommander && (
        <Button title="Manage My Squad" onPress={handleManageSquad} />
      )}
      
      {/* All team members can add sessions */}
      {team.canAddSessionsToTeam && (
        <Button title="Add Session" onPress={handleAddSession} />
      )}
    </View>
  );
}

// =====================================================
// EXAMPLE 3: Member List with Role Management
// =====================================================

export function MemberList({ members }: { members: Member[] }) {
  const { can, validate } = useRolePermissions();
  
  const handleChangeRole = (member: Member, newRole: OrgRole) => {
    // Validate role change before making API call
    const validation = validate.roleChange(member.role, newRole);
    
    if (!validation.valid) {
      Alert.alert('Cannot Change Role', validation.reason);
      return;
    }
    
    // Proceed with API call
    updateMemberRole(member.id, newRole);
  };
  
  return (
    <View>
      {members.map(member => {
        // Check if we can modify this member's role
        const canModify = can.modifyRole(member.role);
        
        return (
          <View key={member.id}>
            <Text>{member.name}</Text>
            <Text>{member.role}</Text>
            
            {canModify && (
              <Button 
                title="Change Role" 
                onPress={() => handleChangeRole(member, 'admin')} 
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// =====================================================
// EXAMPLE 4: Simple Permission Checks
// =====================================================

export function SimpleChecks() {
  // Simple one-line permission checks
  const canCreateTeams = useCanDo('canCreateTeams');
  const canInviteMembers = useCanDo('canInviteMembers');
  const canViewAllTeams = useCanDo('canViewAllTeams');
  
  return (
    <View>
      {canCreateTeams && <CreateTeamButton />}
      {canInviteMembers && <InviteMembersButton />}
      {canViewAllTeams && <ViewAllTeamsButton />}
    </View>
  );
}

// =====================================================
// EXAMPLE 5: Conditional Rendering Based on Role
// =====================================================

export function ConditionalContent() {
  const { roles, isOwner, isAdmin, isInstructor, isMember } = useRolePermissions();
  
  // Show different content based on role
  if (isOwner || isAdmin) {
    return <AdminDashboard />;
  }
  
  if (isInstructor) {
    return <InstructorDashboard />;
  }
  
  if (isMember) {
    return <MemberDashboard />;
  }
  
  return <Text>No role assigned</Text>;
}

// =====================================================
// EXAMPLE 6: Team Assignment Check
// =====================================================

export function TeamAssignment({ member }: { member: Member }) {
  const { can } = useRolePermissions();
  
  // Check if this member can be assigned to a team
  const canAssignToTeam = can.beAssignedToTeam();
  
  if (!canAssignToTeam) {
    return (
      <Text style={{ color: 'red' }}>
        Only members can be assigned to teams.
        This user is {member.role}.
      </Text>
    );
  }
  
  return <TeamSelector memberId={member.id} />;
}

// =====================================================
// EXAMPLE 7: Using in OrgDashboard
// =====================================================

export function OrgDashboardExample() {
  const { org, getRoleInfo } = useRolePermissions();
  const { activeProfile } = useProfile();
  
  // Get all quick actions based on permissions
  const quickActions = [];
  
  if (org.canCreateTeams) {
    quickActions.push({
      icon: 'people',
      title: 'Create Team',
      onPress: handleCreateTeam,
    });
  }
  
  if (org.canInviteMembers) {
    quickActions.push({
      icon: 'person-add',
      title: 'Invite Members',
      onPress: handleInviteMembers,
    });
  }
  
  if (org.canViewAllTeams) {
    quickActions.push({
      icon: 'eye',
      title: 'View All Teams',
      onPress: handleViewTeams,
    });
  }
  
  return (
    <View>
      {/* Header with role */}
      <View>
        <Text>{activeProfile.org.name}</Text>
        <View style={{ 
          backgroundColor: `${getRoleInfo.org.color}20`,
          padding: 8,
          borderRadius: 4,
        }}>
          <Text style={{ color: getRoleInfo.org.color }}>
            {getRoleInfo.org.displayName}
          </Text>
        </View>
      </View>
      
      {/* Quick Actions */}
      {quickActions.map(action => (
        <Button 
          key={action.title}
          title={action.title}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
}

// =====================================================
// EXAMPLE 8: Full Permission Matrix Display
// =====================================================

export function PermissionMatrixDisplay() {
  const { org, team, roles } = useRolePermissions();
  
  const orgPermissions = [
    { name: 'Create Teams', value: org.canCreateTeams },
    { name: 'Invite Members', value: org.canInviteMembers },
    { name: 'View All Teams', value: org.canViewAllTeams },
    { name: 'Delete Org', value: org.canDeleteOrg },
  ];
  
  const teamPermissions = team ? [
    { name: 'Manage Team', value: team.canManageTeam },
    { name: 'Manage Squads', value: team.canManageSquads },
    { name: 'Add Sessions', value: team.canAddSessionsToTeam },
    { name: 'View Progress', value: team.canViewTeamProgress },
  ] : [];
  
  return (
    <View>
      <Text>Organization Permissions ({roles.org})</Text>
      {orgPermissions.map(perm => (
        <View key={perm.name} style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons 
            name={perm.value ? 'checkmark-circle' : 'close-circle'} 
            color={perm.value ? 'green' : 'red'} 
          />
          <Text>{perm.name}</Text>
        </View>
      ))}
      
      {team && (
        <>
          <Text style={{ marginTop: 16 }}>Team Permissions ({roles.team})</Text>
          {teamPermissions.map(perm => (
            <View key={perm.name} style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons 
                name={perm.value ? 'checkmark-circle' : 'close-circle'} 
                color={perm.value ? 'green' : 'red'} 
              />
              <Text>{perm.name}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// =====================================================
// Helper Functions (Mock)
// =====================================================

function handleCreateTeam() {
  console.log('Creating team...');
}

function handleInviteMembers() {
  console.log('Inviting members...');
}

function handleViewTeams() {
  console.log('Viewing teams...');
}

function handleDeleteOrg() {
  console.log('Deleting org...');
}

function handleManageTeam() {
  console.log('Managing team...');
}

function handleCreateTraining() {
  console.log('Creating training...');
}

function handleManageSquad() {
  console.log('Managing squad...');
}

function handleAddSession() {
  console.log('Adding session...');
}

function updateMemberRole(id: string, role: string) {
  console.log(`Updating member ${id} to role ${role}`);
}


