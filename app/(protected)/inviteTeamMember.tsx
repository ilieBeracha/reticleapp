import { useColors } from "@/hooks/ui/useColors";
import { useWorkspacePermissions } from "@/hooks/usePermissions";
import { createInvitation } from "@/services/invitationService";
import { getTeamCommanderStatus, type TeamCommanderStatus } from "@/services/teamService";
import { useTeamStore } from "@/store/teamStore";
import type { TeamMemberShip } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================================
// CONFIGURATIONS
// ============================================================================
interface RoleConfig {
  value: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const TEAM_ROLES: RoleConfig[] = [
  { value: 'commander', label: 'Team Commander', description: 'Leads the entire team', icon: 'star', color: '#F59E0B' },
  { value: 'soldier', label: 'Team Member', description: 'Regular team member', icon: 'person', color: '#6B7280' },
];

// ============================================================================
// COMPONENTS
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
          backgroundColor: isSelected ? role.color + '15' : isTaken ? colors.destructive + '08' : colors.background,
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
// MAIN COMPONENT
// ============================================================================
export default function InviteTeamMemberSheet() {
  const colors = useColors();
  const { activeTeamId, teams, activeTeam } = useTeamStore();
  const permissions = useWorkspacePermissions();
  
  // Get pre-selected team from URL params (e.g., when commander invites to their team)
  const { teamId: preselectedTeamId } = useLocalSearchParams<{ teamId?: string }>();

  const isAdminOrOwner = permissions.isOwner || permissions.isAdmin;
  const canAssignCommander = isAdminOrOwner;
  
  // If team is pre-selected, skip step 0
  const hasPreselectedTeam = !!preselectedTeamId && teams.some(t => t.id === preselectedTeamId);

  // State - start at step 1 if team is pre-selected
  const [step, setStep] = useState(hasPreselectedTeam ? 1 : 0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(preselectedTeamId || null);
  const [selectedTeamRole, setSelectedTeamRole] = useState<string>('soldier');
  
  // Squad options
  const [assignToSquad, setAssignToSquad] = useState(false);
  const [makeSquadCommander, setMakeSquadCommander] = useState(false);
  const [squadName, setSquadName] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [commanderStatus, setCommanderStatus] = useState<TeamCommanderStatus | null>(null);
  const [loadingCommanderStatus, setLoadingCommanderStatus] = useState(false);

  const totalSteps = hasPreselectedTeam ? 2 : 3; // Skip team step if pre-selected

  // Set team from URL params or default to first team
  useEffect(() => {
    if (preselectedTeamId && teams.some(t => t.id === preselectedTeamId)) {
      setSelectedTeamId(preselectedTeamId);
    } else if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, preselectedTeamId]);

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

  // Reset squad options when role changes
  useEffect(() => {
    if (selectedTeamRole === 'commander') {
      setAssignToSquad(false);
      setMakeSquadCommander(false);
      setSquadName('');
    }
  }, [selectedTeamRole]);

  // Computed values
  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);
  const isMemberRole = selectedTeamRole === 'soldier';
  
  const finalTeamRole = useMemo((): TeamMemberShip => {
    if (selectedTeamRole === 'commander') return 'commander';
    if (isMemberRole && assignToSquad && makeSquadCommander) return 'squad_commander';
    return 'soldier';
  }, [selectedTeamRole, isMemberRole, assignToSquad, makeSquadCommander]);

  const selectedRoleConfig = useMemo(() => {
    if (selectedTeamRole === 'commander') return TEAM_ROLES.find(r => r.value === 'commander');
    if (finalTeamRole === 'squad_commander') {
      return { value: 'squad_commander', label: 'Squad Commander', description: `Leads squad: ${squadName}`, icon: 'star-half' as const, color: '#10B981' };
    }
    return TEAM_ROLES.find(r => r.value === 'soldier');
  }, [selectedTeamRole, finalTeamRole, squadName]);

  const availableTeamRoles = useMemo((): RoleConfig[] => {
    if (!canAssignCommander) return TEAM_ROLES.filter(r => r.value !== 'commander');
    return TEAM_ROLES;
  }, [canAssignCommander]);

  // Handlers
  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && !selectedTeamId) {
      Alert.alert('Select Team', 'Please select a team to invite to.');
      return;
    }
    if (step < totalSteps - 1) setStep(step + 1);
  }, [step, selectedTeamId]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const minStep = hasPreselectedTeam ? 1 : 0;
    if (step > minStep) {
      setStep(step - 1);
    } else {
      router.back();
    }
  }, [step, hasPreselectedTeam]);

  const handleCreateInvite = async () => {
    if (!selectedTeamId) return;
    
    if (isMemberRole && assignToSquad && !squadName.trim()) {
      Alert.alert('Squad Name Required', 'Please enter a squad name.');
      return;
    }
    
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const metadata = assignToSquad && squadName.trim() 
        ? { squad_id: squadName.trim() } 
        : undefined;

      // Team-first: pass null for org workspace, team is the primary entity
      const invitation = await createInvitation(null as any, 'member', selectedTeamId, finalTeamRole, metadata);
      await Clipboard.setStringAsync(invitation.invite_code);
      setCreatedCode(invitation.invite_code);
      setIsCreating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✓ Invite Created',
        `Code ${invitation.invite_code} copied to clipboard!\n\nShare this code to invite a ${selectedRoleConfig?.label} to ${selectedTeam?.name}.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
      setIsCreating(false);
    }
  };

  if (teams.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
          Create a team first before inviting team members.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            router.back();
            setTimeout(() => router.push('/(protected)/createTeam' as any), 100);
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Create Team</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state
  if (createdCode) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: selectedRoleConfig?.color + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={selectedRoleConfig?.color || colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Invite Created!</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]}>{createdCode}</Text>
        </View>
        <Text style={[styles.successHint, { color: colors.textMuted }]}>Code copied to clipboard</Text>
        <Text style={[styles.successTeam, { color: colors.textMuted }]}>
          For {selectedTeam?.name}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name="people" size={28} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Invite Team Member</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {activeTeam?.name || 'Select a team'}
        </Text>
      </View>

      <StepIndicator currentStep={step} totalSteps={totalSteps} colors={colors} />

        {/* STEP 0: Select Team */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Select Team</Text>
            <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
              Which team should this member join?
            </Text>

            <View style={styles.teamsList}>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamCard,
                    {
                      backgroundColor: selectedTeamId === team.id ? colors.primary + '10' : colors.background,
                      borderColor: selectedTeamId === team.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTeamId(team.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.teamIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Ionicons name="people" size={22} color="#F59E0B" />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                    {team.description && (
                      <Text style={[styles.teamMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {team.description}
                      </Text>
                    )}
                  </View>
                  {selectedTeamId === team.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 1: Select Role */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Select Role</Text>
            <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
              What role should they have in {selectedTeam?.name}?
            </Text>

            {loadingCommanderStatus ? (
              <View style={styles.loadingRoles}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingRolesText, { color: colors.textMuted }]}>Checking availability...</Text>
              </View>
            ) : (
              <>
                <View style={styles.rolesGrid}>
                  {availableTeamRoles.map(role => {
                    let takenBy: string | null = null;
                    if (role.value === 'commander' && commanderStatus) {
                      if (commanderStatus.has_commander) takenBy = commanderStatus.commander_name || 'Someone';
                      else if (commanderStatus.has_pending_commander) takenBy = 'pending';
                    }
                    return (
                      <RoleCard 
                        key={role.value} 
                        role={role} 
                        isSelected={selectedTeamRole === role.value} 
                        onSelect={() => setSelectedTeamRole(role.value)} 
                        colors={colors} 
                        takenBy={takenBy} 
                      />
                    );
                  })}
                </View>

                {/* Squad Options for Members */}
                {isMemberRole && (
                  <View style={[styles.squadSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.squadHeader}>
                      <View style={styles.squadHeaderInfo}>
                        <Ionicons name="layers-outline" size={20} color={colors.primary} />
                        <View>
                          <Text style={[styles.squadTitle, { color: colors.text }]}>Assign to Squad</Text>
                          <Text style={[styles.squadSubtitle, { color: colors.textMuted }]}>Optional: add to a specific squad</Text>
                        </View>
                      </View>
                      <Switch
                        value={assignToSquad}
                        onValueChange={(val) => {
                          setAssignToSquad(val);
                          if (!val) {
                            setMakeSquadCommander(false);
                            setSquadName('');
                          }
                        }}
                        trackColor={{ false: colors.border, true: colors.primary + '60' }}
                        thumbColor={assignToSquad ? colors.primary : colors.card}
                      />
                    </View>

                    {assignToSquad && (
                      <View style={styles.squadContent}>
                        <View style={styles.squadInputSection}>
                          <Text style={[styles.squadInputLabel, { color: colors.textMuted }]}>SQUAD NAME</Text>
                          {commanderStatus?.squads && commanderStatus.squads.length > 0 && (
                            <View style={styles.squadChips}>
                              {commanderStatus.squads.map((squad: string) => (
                                <TouchableOpacity
                                  key={squad}
                                  style={[
                                    styles.squadChip, 
                                    { 
                                      backgroundColor: squadName === squad ? colors.primary : colors.secondary, 
                                      borderColor: squadName === squad ? colors.primary : colors.border 
                                    }
                                  ]}
                                  onPress={() => setSquadName(squadName === squad ? '' : squad)}
                                >
                                  <Text style={[styles.squadChipText, { color: squadName === squad ? '#fff' : colors.text }]}>{squad}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TextInput
                              style={[styles.input, { color: colors.text }]}
                              placeholder="Enter squad name..."
                              placeholderTextColor={colors.textMuted}
                              value={squadName}
                              onChangeText={setSquadName}
                            />
                          </View>
                        </View>

                        {squadName.trim() && (
                          <View style={[styles.squadCommanderOption, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.squadCommanderInfo}>
                              <Ionicons name="star-half" size={18} color="#10B981" />
                              <View>
                                <Text style={[styles.squadCommanderTitle, { color: colors.text }]}>Make Squad Commander</Text>
                                <Text style={[styles.squadCommanderDesc, { color: colors.textMuted }]}>
                                  Lead squad "{squadName}"
                                </Text>
                              </View>
                            </View>
                            <Switch
                              value={makeSquadCommander}
                              onValueChange={setMakeSquadCommander}
                              trackColor={{ false: colors.border, true: '#10B98160' }}
                              thumbColor={makeSquadCommander ? '#10B981' : colors.card}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* STEP 2: Confirm */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Create</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Team</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedTeam?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Role</Text>
                <View style={[styles.summaryBadge, { backgroundColor: selectedRoleConfig?.color + '20' }]}>
                  <Ionicons name={selectedRoleConfig?.icon || 'person'} size={14} color={selectedRoleConfig?.color} />
                  <Text style={[styles.summaryBadgeText, { color: selectedRoleConfig?.color }]}>
                    {selectedRoleConfig?.label}
                  </Text>
                </View>
              </View>
              {isMemberRole && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Squad</Text>
                  <Text style={[styles.summaryValue, { color: assignToSquad && squadName ? colors.text : colors.textMuted }]}>
                    {assignToSquad && squadName ? squadName : 'No squad'}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expires</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>7 days</Text>
              </View>
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

          {step < totalSteps - 1 ? (
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: isCreating ? colors.muted : '#F59E0B' }]}
              onPress={handleCreateInvite}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="ticket" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Generate Invite Code</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  headerSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center' },

  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  stepDot: { height: 6, borderRadius: 3 },

  stepContent: { marginBottom: 16 },
  stepTitle: { fontSize: 20, fontWeight: '600', marginBottom: 6, letterSpacing: -0.3 },
  stepDesc: { fontSize: 14, marginBottom: 20 },

  teamsList: { gap: 10 },
  teamCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 14 },
  teamIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  teamMeta: { fontSize: 13 },

  rolesGrid: { gap: 10 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  roleIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  roleDesc: { fontSize: 12 },
  loadingRoles: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingRolesText: { fontSize: 13 },

  // Squad Section
  squadSection: { marginTop: 20, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  squadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  squadHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  squadTitle: { fontSize: 15, fontWeight: '600' },
  squadSubtitle: { fontSize: 12, marginTop: 1 },
  squadContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  squadInputSection: { gap: 8 },
  squadInputLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  squadChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  squadChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  squadChipText: { fontSize: 12, fontWeight: '600' },
  inputWrapper: { borderRadius: 10, borderWidth: 1 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 15 },
  squadCommanderOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1 },
  squadCommanderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  squadCommanderTitle: { fontSize: 14, fontWeight: '600' },
  squadCommanderDesc: { fontSize: 11, marginTop: 1 },

  // Summary
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  summaryBadgeText: { fontSize: 13, fontWeight: '600' },

  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16, gap: 10 },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  backButton: { flex: 1, flexDirection: 'row', height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, gap: 8 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  createButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, gap: 10 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  codeBox: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 2, marginBottom: 12 },
  codeText: { fontSize: 28, fontWeight: '700', letterSpacing: 4 },
  successHint: { fontSize: 14 },
  successTeam: { fontSize: 13, marginTop: 8 },
});

