import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useWorkspacePermissions } from "@/hooks/usePermissions";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { cancelInvitation, createInvitation, getPendingInvitations } from "@/services/invitationService";
import { getTeamCommanderStatus, type TeamCommanderStatus } from "@/services/teamService";
import type { TeamMemberShip, WorkspaceInvitationWithDetails, WorkspaceRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ============================================================================
// ROLE CONFIGURATIONS
// ============================================================================
interface RoleConfig {
  value: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ORG_ROLES: RoleConfig[] = [
  { value: 'instructor', label: 'Instructor', description: 'Can create trainings & sessions', icon: 'school', color: '#7C3AED' },
  { value: 'admin', label: 'Admin', description: 'Full management access', icon: 'shield-half', color: '#3B82F6' },
];

const TEAM_ROLES: RoleConfig[] = [
  { value: 'commander', label: 'Commander', description: 'Leads the team', icon: 'star', color: '#F59E0B' },
  { value: 'squad_commander', label: 'Squad Leader', description: 'Leads a squad', icon: 'star-half', color: '#10B981' },
  { value: 'soldier', label: 'Member', description: 'Team member', icon: 'person', color: '#6B7280' },
];

// ============================================================================
// STEP INDICATOR
// ============================================================================
const StepIndicator = React.memo(function StepIndicator({
  currentStep,
  totalSteps,
  colors,
}: {
  currentStep: number;
  totalSteps: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
              backgroundColor: index <= currentStep ? colors.primary : colors.border,
              width: index === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
});

// ============================================================================
// ROLE CARD
// ============================================================================
const RoleCard = React.memo(function RoleCard({
  role,
  isSelected,
  onSelect,
  colors,
  takenBy,
}: {
  role: RoleConfig;
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
  takenBy?: string | null;
}) {
  const isTaken = !!takenBy;
  
  return (
    <TouchableOpacity
      style={[
        styles.roleCard,
        {
          backgroundColor: isSelected ? role.color + '15' : isTaken ? colors.destructive + '08' : colors.card,
          borderColor: isSelected ? role.color : isTaken ? colors.destructive + '40' : colors.border,
          opacity: isTaken ? 0.6 : 1,
        },
      ]}
      onPress={onSelect}
      disabled={isTaken}
      activeOpacity={0.7}
    >
      <View style={[styles.roleIconBox, { backgroundColor: isTaken ? colors.destructive + '15' : role.color + '20' }]}>
        <Ionicons name={isTaken ? 'close-circle' : role.icon} size={20} color={isTaken ? colors.destructive : role.color} />
      </View>
      <View style={styles.roleInfo}>
        <Text style={[styles.roleLabel, { color: isTaken ? colors.textMuted : colors.text }]}>{role.label}</Text>
        {isTaken ? (
          <Text style={[styles.roleDesc, { color: colors.destructive }]}>
            Taken{takenBy !== 'pending' ? ` by ${takenBy}` : ' (pending invite)'}
          </Text>
        ) : (
          <Text style={[styles.roleDesc, { color: colors.textMuted }]}>{role.description}</Text>
        )}
      </View>
      {isSelected && !isTaken && <Ionicons name="checkmark-circle" size={22} color={role.color} />}
    </TouchableOpacity>
  );
});

// ============================================================================
// TEAM CHIP
// ============================================================================
const TeamChip = React.memo(function TeamChip({
  team,
  isSelected,
  onSelect,
  colors,
}: {
  team: { id: string; name: string };
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.teamChip,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Ionicons name="people" size={16} color={isSelected ? '#fff' : colors.text} />
      <Text style={[styles.teamChipText, { color: isSelected ? '#fff' : colors.text }]}>{team.name}</Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// PENDING INVITE ROW
// ============================================================================
const PendingInviteRow = React.memo(function PendingInviteRow({
  invite,
  colors,
  onCopy,
  onRevoke,
}: {
  invite: WorkspaceInvitationWithDetails;
  colors: ReturnType<typeof useColors>;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const isExpiringSoon = useMemo(() => {
    const hours = (new Date(invite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
    return hours < 24;
  }, [invite.expires_at]);

  const roleDisplay = invite.team_name
    ? `${invite.team_role || 'Member'} • ${invite.team_name}`
    : invite.role.charAt(0).toUpperCase() + invite.role.slice(1);

  return (
    <View style={[styles.inviteRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.inviteContent}>
        <View style={styles.inviteCodeRow}>
          <Text style={[styles.inviteCode, { color: colors.text }]}>{invite.invite_code}</Text>
          {isExpiringSoon && (
            <View style={[styles.expiringBadge, { backgroundColor: colors.orange + '20' }]}>
              <Ionicons name="time-outline" size={10} color={colors.orange} />
              <Text style={[styles.expiringText, { color: colors.orange }]}>Expiring</Text>
            </View>
          )}
        </View>
        <Text style={[styles.inviteRole, { color: colors.textMuted }]}>{roleDisplay}</Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity style={[styles.inviteActionBtn, { backgroundColor: colors.secondary }]} onPress={onCopy}>
          <Ionicons name="copy-outline" size={16} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.inviteActionBtn, { backgroundColor: colors.destructive + '15' }]} onPress={onRevoke}>
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InviteMembersSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();
  const { teams } = useWorkspaceData();
  const permissions = useWorkspacePermissions();

  const isAdminOrOwner = permissions.isOwner || permissions.isAdmin;
  const isInstructor = permissions.isInstructor;
  const availableTeams = useMemo(() => (isAdminOrOwner || isInstructor) ? teams : [], [teams, isAdminOrOwner, isInstructor]);
  const availableTeamRoles = useMemo((): RoleConfig[] => {
    if (isAdminOrOwner) return TEAM_ROLES;
    if (isInstructor) return TEAM_ROLES.filter(r => r.value !== 'commander');
    return TEAM_ROLES.filter(r => r.value === 'soldier');
  }, [isAdminOrOwner, isInstructor]);
  const canCreateOrgInvites = isAdminOrOwner;

  // State
  const [step, setStep] = useState(0);
  const [inviteType, setInviteType] = useState<'team' | 'org'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamRole, setSelectedTeamRole] = useState<string>('soldier');
  const [selectedOrgRole, setSelectedOrgRole] = useState<string>('instructor');
  const [squadName, setSquadName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [commanderStatus, setCommanderStatus] = useState<TeamCommanderStatus | null>(null);
  const [loadingCommanderStatus, setLoadingCommanderStatus] = useState(false);

  // Set default team
  useEffect(() => {
    if (availableTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(availableTeams[0].id);
    }
  }, [availableTeams, selectedTeamId]);

  // Fetch commander status when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setCommanderStatus(null);
      return;
    }
    const fetchStatus = async () => {
      setLoadingCommanderStatus(true);
      try {
        const status = await getTeamCommanderStatus(selectedTeamId);
        setCommanderStatus(status);
        if ((status.has_commander || status.has_pending_commander) && selectedTeamRole === 'commander') {
          setSelectedTeamRole('soldier');
        }
      } catch (error) {
        console.error('Failed to fetch commander status:', error);
      } finally {
        setLoadingCommanderStatus(false);
      }
    };
    fetchStatus();
  }, [selectedTeamId]);

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingInvites(true);
    try {
      const invites = await getPendingInvitations(activeWorkspaceId);
      setPendingInvites(invites);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoadingInvites(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Handlers
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && inviteType === 'team' && !selectedTeamId) {
      Alert.alert('Select Team', 'Please select a team to invite to.');
      return;
    }
    if (step === 1 && inviteType === 'team' && (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander')) {
      if (!squadName.trim()) {
        Alert.alert('Squad Required', 'Please enter a squad name for this role.');
        return;
      }
    }
    if (step < (inviteType === 'team' ? 2 : 1)) setStep(step + 1);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) setStep(step - 1);
  };

  const handleCreateInvite = async () => {
    if (!activeWorkspaceId) return;
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const role = inviteType === 'team' ? 'member' : (selectedOrgRole as WorkspaceRole);
      const teamId = inviteType === 'team' ? selectedTeamId : null;
      const teamRole = inviteType === 'team' ? (selectedTeamRole as TeamMemberShip) : null;
      const metadata = inviteType === 'team' && squadName.trim() ? { squad_id: squadName.trim() } : undefined;

      const invitation = await createInvitation(activeWorkspaceId, role, teamId, teamRole, metadata);
      await Clipboard.setStringAsync(invitation.invite_code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✓ Invite Created',
        `Code ${invitation.invite_code} copied to clipboard!\n\nShare this code with the person you want to invite.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
      await loadInvitations();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', `Code ${code} copied to clipboard`);
  };

  const handleRevokeInvite = (inviteId: string, code: string) => {
    Alert.alert('Revoke Invitation', `Are you sure you want to revoke code ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelInvitation(inviteId);
            await loadInvitations();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const selectedTeam = useMemo(() => availableTeams.find(t => t.id === selectedTeamId), [availableTeams, selectedTeamId]);
  const selectedRoleConfig = useMemo(() => {
    if (inviteType === 'team') return TEAM_ROLES.find(r => r.value === selectedTeamRole);
    return ORG_ROLES.find(r => r.value === selectedOrgRole);
  }, [inviteType, selectedTeamRole, selectedOrgRole]);
  const totalSteps = inviteType === 'team' ? 3 : 2;
  const needsSquad = inviteType === 'team' && (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander');

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />

      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Invite Member</Text>
          <View style={[styles.stepBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.stepBadgeText, { color: colors.textMuted }]}>{step + 1}/{totalSteps}</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {activeWorkspace?.workspace_name || 'Workspace'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={step} totalSteps={totalSteps} colors={colors} />

        {/* STEP 0: Choose Type */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What type of invite?</Text>

            <TouchableOpacity
              style={[styles.typeCard, { backgroundColor: inviteType === 'team' ? colors.primary + '10' : colors.card, borderColor: inviteType === 'team' ? colors.primary : colors.border }]}
              onPress={() => setInviteType('team')}
              disabled={availableTeams.length === 0}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIconBox, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="people" size={24} color={colors.primary} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeLabel, { color: colors.text }]}>Team Member</Text>
                <Text style={[styles.typeDesc, { color: colors.textMuted }]}>Add someone to a specific team</Text>
              </View>
              {inviteType === 'team' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>

            {canCreateOrgInvites && (
              <TouchableOpacity
                style={[styles.typeCard, { backgroundColor: inviteType === 'org' ? colors.primary + '10' : colors.card, borderColor: inviteType === 'org' ? colors.primary : colors.border }]}
                onPress={() => setInviteType('org')}
                activeOpacity={0.7}
              >
                <View style={[styles.typeIconBox, { backgroundColor: '#7C3AED20' }]}>
                  <Ionicons name="business" size={24} color="#7C3AED" />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>Staff Member</Text>
                  <Text style={[styles.typeDesc, { color: colors.textMuted }]}>Instructor or admin role</Text>
                </View>
                {inviteType === 'org' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            )}

            {inviteType === 'team' && availableTeams.length > 0 && (
              <View style={styles.teamSection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT TEAM</Text>
                <View style={styles.teamGrid}>
                  {availableTeams.map(team => (
                    <TeamChip key={team.id} team={team} isSelected={selectedTeamId === team.id} onSelect={() => setSelectedTeamId(team.id)} colors={colors} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 1: Choose Role */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {inviteType === 'team' ? 'Select team role' : 'Select role'}
            </Text>

            {loadingCommanderStatus && inviteType === 'team' ? (
              <View style={styles.loadingRoles}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingRolesText, { color: colors.textMuted }]}>Checking availability...</Text>
              </View>
            ) : inviteType === 'team' ? (
              <View style={styles.rolesGrid}>
                {availableTeamRoles.map(role => {
                  let takenBy: string | null = null;
                  if (role.value === 'commander' && commanderStatus) {
                    if (commanderStatus.has_commander) takenBy = commanderStatus.commander_name || 'Someone';
                    else if (commanderStatus.has_pending_commander) takenBy = 'pending';
                  }
                  return (
                    <RoleCard key={role.value} role={role} isSelected={selectedTeamRole === role.value} onSelect={() => setSelectedTeamRole(role.value)} colors={colors} takenBy={takenBy} />
                  );
                })}
              </View>
            ) : (
              <View style={styles.rolesGrid}>
                {ORG_ROLES.map(role => (
                  <RoleCard key={role.value} role={role} isSelected={selectedOrgRole === role.value} onSelect={() => setSelectedOrgRole(role.value)} colors={colors} />
                ))}
              </View>
            )}

            {needsSquad && (
              <View style={styles.squadSection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {selectedTeamRole === 'squad_commander' ? 'SELECT SQUAD TO LEAD' : 'ASSIGN TO SQUAD'}
                </Text>
                {commanderStatus?.squads && commanderStatus.squads.length > 0 && (
                  <View style={styles.squadChips}>
                    {commanderStatus.squads.map((squad: string) => (
                      <TouchableOpacity
                        key={squad}
                        style={[styles.squadChip, { backgroundColor: squadName === squad ? colors.primary : colors.card, borderColor: squadName === squad ? colors.primary : colors.border }]}
                        onPress={() => setSquadName(squad)}
                      >
                        <Text style={[styles.squadChipText, { color: squadName === squad ? '#fff' : colors.text }]}>{squad}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter squad name..."
                    placeholderTextColor={colors.textMuted}
                    value={squadName}
                    onChangeText={setSquadName}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Confirm */}
        {((inviteType === 'team' && step === 2) || (inviteType === 'org' && step === 1)) && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Create</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Role</Text>
                <View style={[styles.roleBadge, { backgroundColor: selectedRoleConfig?.color + '20' }]}>
                  <Ionicons name={selectedRoleConfig?.icon || 'person'} size={14} color={selectedRoleConfig?.color} />
                  <Text style={[styles.roleBadgeText, { color: selectedRoleConfig?.color }]}>{selectedRoleConfig?.label}</Text>
                </View>
              </View>
              {inviteType === 'team' && selectedTeam && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Team</Text>
                  <Text style={[styles.summaryValueText, { color: colors.text }]}>{selectedTeam.name}</Text>
                </View>
              )}
              {needsSquad && squadName && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Squad</Text>
                  <Text style={[styles.summaryValueText, { color: colors.text }]}>{squadName}</Text>
                </View>
              )}
            </View>

            <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
                The invite code will be valid for 7 days and can only be used once.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {step > 0 && (
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.secondary }]} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}

          {((inviteType === 'team' && step < 2) || (inviteType === 'org' && step < 1)) ? (
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: isCreating ? colors.muted : colors.primary }]}
              onPress={handleCreateInvite}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="ticket" size={18} color="#fff" />
                  <Text style={styles.createButtonText}>Generate Code</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Pending Invites */}
        <TouchableOpacity
          style={[styles.pendingHeader, { borderTopColor: colors.border }]}
          onPress={() => setShowPendingInvites(!showPendingInvites)}
          activeOpacity={0.7}
        >
          <View style={styles.pendingHeaderLeft}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.pendingHeaderText, { color: colors.textMuted }]}>Pending Invites</Text>
            {pendingInvites.length > 0 && (
              <View style={[styles.pendingBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.pendingBadgeText}>{pendingInvites.length}</Text>
              </View>
            )}
          </View>
          <Ionicons name={showPendingInvites ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {showPendingInvites && (
          <View style={styles.pendingContent}>
            {loadingInvites ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : pendingInvites.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>No pending invites</Text>
              </View>
            ) : (
              <View style={styles.invitesList}>
                {pendingInvites.map(invite => (
                  <PendingInviteRow
                    key={invite.id}
                    invite={invite}
                    colors={colors}
                    onCopy={() => handleCopyCode(invite.invite_code)}
                    onRevoke={() => handleRevokeInvite(invite.id, invite.invite_code)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  sheet: { flex: 1 },
  grabberSpacer: { height: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  headerContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  stepBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stepBadgeText: { fontSize: 12, fontWeight: '600' },
  subtitle: { fontSize: 14, marginTop: 4 },

  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: 20 },
  stepDot: { height: 6, borderRadius: 3 },

  stepContent: { marginBottom: 16 },
  stepTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, letterSpacing: -0.3 },

  typeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10, gap: 14 },
  typeIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeInfo: { flex: 1 },
  typeLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  typeDesc: { fontSize: 13 },

  teamSection: { marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  teamChipText: { fontSize: 14, fontWeight: '600' },

  rolesGrid: { gap: 10 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  roleIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  roleDesc: { fontSize: 12 },
  loadingRoles: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingRolesText: { fontSize: 13 },

  squadSection: { marginTop: 24 },
  squadChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  squadChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  squadChipText: { fontSize: 13, fontWeight: '600' },
  inputWrapper: { borderRadius: 10, borderWidth: 1 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 15 },

  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValueText: { fontSize: 14, fontWeight: '600' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  roleBadgeText: { fontSize: 13, fontWeight: '600' },

  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16, gap: 10 },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  backButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, gap: 6 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, gap: 6 },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  createButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, gap: 8 },
  createButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
  pendingHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingHeaderText: { fontSize: 14, fontWeight: '600' },
  pendingBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  pendingContent: { paddingBottom: 10 },
  invitesList: { gap: 8 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  inviteContent: { flex: 1, gap: 2 },
  inviteCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteCode: { fontSize: 15, fontWeight: '700', fontFamily: 'SpaceMono', letterSpacing: 1 },
  expiringBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  expiringText: { fontSize: 10, fontWeight: '600' },
  inviteRole: { fontSize: 12 },
  inviteActions: { flexDirection: 'row', gap: 6 },
  inviteActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 20, borderRadius: 12, alignItems: 'center' },
  emptyStateText: { fontSize: 13 },
});

