import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/ui/useColors";
import { createInvitation } from "@/services/invitationService";
import { useTeamStore } from "@/store/teamStore";
import type { TeamMemberShip } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InviteTeamMemberSheet() {
  const colors = useColors();
  const { activeTeamId, teams } = useTeamStore();
  
  // Get pre-selected team from URL params (fallback if not in team mode)
  const { teamId: urlTeamId } = useLocalSearchParams<{ teamId?: string }>();
  
  // Priority: activeTeamId (team mode) > URL param > null
  const preselectedTeamId = activeTeamId || urlTeamId;
  
  // If we're in team mode or have a pre-selected team, skip team selection (step 0)
  const hasPreselectedTeam = !!preselectedTeamId && teams.some(t => t.id === preselectedTeamId);

  // State - simplified: only team selection (if needed) and confirm
  // Step 0: Select team (skipped if hasPreselectedTeam)
  // Step 1: Squad options + Confirm
  const [step, setStep] = useState(hasPreselectedTeam ? 1 : 0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(preselectedTeamId || null);
  
  // Squad options
  const [assignToSquad, setAssignToSquad] = useState(false);
  const [makeSquadCommander, setMakeSquadCommander] = useState(false);
  const [squadName, setSquadName] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [squadsList, setSquadsList] = useState<string[]>([]);

  const totalSteps = hasPreselectedTeam ? 1 : 2;

  // Set team from active team or URL params
  useEffect(() => {
    if (preselectedTeamId && teams.some(t => t.id === preselectedTeamId)) {
      setSelectedTeamId(preselectedTeamId);
    } else if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, preselectedTeamId, selectedTeamId]);

  // Load squads when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setSquadsList([]);
      return;
    }
    const team = teams.find(t => t.id === selectedTeamId);
    setSquadsList(team?.squads || []);
  }, [selectedTeamId, teams]);

  // Computed values
  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);
  
  const finalTeamRole = useMemo((): TeamMemberShip => {
    if (assignToSquad && makeSquadCommander) return 'squad_commander';
    return 'soldier';
  }, [assignToSquad, makeSquadCommander]);

  const roleDisplay = useMemo(() => {
    if (finalTeamRole === 'squad_commander') {
      return { label: 'Squad Commander', description: `Will lead squad: ${squadName}`, icon: 'star-half' as const, color: '#10B981' };
    }
    return { label: 'Team Member', description: 'Regular team member', icon: 'person' as const, color: colors.primary };
  }, [finalTeamRole, squadName, colors.primary]);

  // Handlers
  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && !selectedTeamId) {
      Alert.alert('Select Team', 'Please select a team to invite to.');
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  }, [step, selectedTeamId, totalSteps]);

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
    
    if (assignToSquad && !squadName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Squad Name Required', 'Please enter a squad name.');
      return;
    }
    
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const metadata = assignToSquad && squadName.trim() 
        ? { squad_id: squadName.trim() } 
        : undefined;

      const invitation = await createInvitation(null as any, 'member', selectedTeamId, finalTeamRole, metadata);
      await Clipboard.setStringAsync(invitation.invite_code);
      setCreatedCode(invitation.invite_code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    await Clipboard.setStringAsync(createdCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE - No teams
  // ══════════════════════════════════════════════════════════════════════════
  if (teams.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
          Create a team first before inviting members.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            router.back();
            setTimeout(() => router.push('/(protected)/createTeam' as any), 100);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Create Team</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS STATE - Invite created
  // ══════════════════════════════════════════════════════════════════════════
  if (createdCode) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
        </View>
        
        <Text style={[styles.successTitle, { color: colors.text }]}>Invite Created!</Text>
        
        <TouchableOpacity 
          style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={handleCopyCode}
          activeOpacity={0.7}
        >
          <Text style={[styles.codeText, { color: colors.text }]}>{createdCode}</Text>
          <Ionicons name="copy-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        
        <Text style={[styles.successHint, { color: colors.textMuted }]}>
          Tap to copy • Code expires in 7 days
        </Text>
        
        <View style={[styles.successTeamCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people" size={18} color={colors.text} />
          <Text style={[styles.successTeamName, { color: colors.text }]}>{selectedTeam?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleDisplay.color + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: roleDisplay.color }]}>{roleDisplay.label}</Text>
          </View>
        </View>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.secondary }]}
            onPress={() => {
              setCreatedCode(null);
              setAssignToSquad(false);
              setMakeSquadCommander(false);
              setSquadName('');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Create Another</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN FORM
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="person-add" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Invite Team Member</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {selectedTeam?.name ? `To ${selectedTeam.name}` : 'Generate an invite code'}
          </Text>
        </View>

        {/* Step Indicator */}
        {totalSteps > 1 && (
          <View style={styles.stepIndicator}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: index <= step ? colors.primary : colors.border,
                    width: index === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 0: Select Team
        ════════════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Team</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
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
                  <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="people" size={20} color={colors.text} />
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
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: Invite Details + Create
        ════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            {/* Default Role Info */}
            <View style={[styles.roleInfoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={[styles.roleIconBox, { backgroundColor: colors.background }]}>
                <Ionicons name={roleDisplay.icon} size={20} color={roleDisplay.color} />
              </View>
              <View style={styles.roleInfoText}>
                <Text style={[styles.roleLabel, { color: colors.text }]}>{roleDisplay.label}</Text>
                <Text style={[styles.roleDesc, { color: colors.textMuted }]}>{roleDisplay.description}</Text>
              </View>
            </View>

            {/* Squad Assignment Toggle */}
            <TouchableOpacity
              style={[styles.squadToggle, { backgroundColor: colors.card, borderColor: assignToSquad ? colors.primary : colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (assignToSquad) {
                  setAssignToSquad(false);
                  setMakeSquadCommander(false);
                  setSquadName('');
                } else {
                  setAssignToSquad(true);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.squadToggleLeft}>
                <View style={[styles.squadToggleIcon, { backgroundColor: assignToSquad ? colors.primary + '15' : colors.secondary }]}>
                  <Ionicons name="layers-outline" size={18} color={assignToSquad ? colors.primary : colors.text} />
                </View>
                <View>
                  <Text style={[styles.squadToggleTitle, { color: colors.text }]}>Assign to Squad</Text>
                  <Text style={[styles.squadToggleDesc, { color: colors.textMuted }]}>
                    Optional: add to a specific squad
                  </Text>
                </View>
              </View>
              <Switch
                value={assignToSquad}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAssignToSquad(val);
                  if (!val) {
                    setMakeSquadCommander(false);
                    setSquadName('');
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={assignToSquad ? colors.primary : colors.card}
              />
            </TouchableOpacity>

            {/* Squad Details (when enabled) */}
            {assignToSquad && (
              <View style={[styles.squadSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Existing Squads */}
                {squadsList.length > 0 && (
                  <View style={styles.squadChipsSection}>
                    <Text style={[styles.squadInputLabel, { color: colors.textMuted }]}>EXISTING SQUADS</Text>
                    <View style={styles.squadChips}>
                      {squadsList.map((squad: string) => (
                        <TouchableOpacity
                          key={squad}
                          style={[
                            styles.squadChip, 
                            { 
                              backgroundColor: squadName === squad ? colors.primary : colors.secondary, 
                              borderColor: squadName === squad ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSquadName(squadName === squad ? '' : squad);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="shield" 
                            size={12} 
                            color={squadName === squad ? '#fff' : colors.text} 
                          />
                          <Text style={[styles.squadChipText, { color: squadName === squad ? '#fff' : colors.text }]}>
                            {squad}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Custom Squad Input */}
                <View style={styles.squadInputSection}>
                  <Text style={[styles.squadInputLabel, { color: colors.textMuted }]}>
                    {squadsList.length > 0 ? 'OR ENTER NEW SQUAD' : 'SQUAD NAME'}
                  </Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: squadName ? colors.primary : colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter squad name..."
                      placeholderTextColor={colors.textMuted}
                      value={squadName}
                      onChangeText={setSquadName}
                      autoCapitalize="words"
                    />
                    {squadName.trim() && (
                      <TouchableOpacity 
                        style={styles.clearInputBtn}
                        onPress={() => setSquadName('')}
                      >
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Squad Commander Option */}
                {squadName.trim() && (
                  <TouchableOpacity
                    style={[styles.commanderOption, { backgroundColor: colors.background, borderColor: makeSquadCommander ? '#10B981' : colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMakeSquadCommander(!makeSquadCommander);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.commanderLeft}>
                      <View style={[styles.commanderIcon, { backgroundColor: makeSquadCommander ? '#10B98115' : colors.secondary }]}>
                        <Ionicons name="star-half" size={16} color={makeSquadCommander ? '#10B981' : colors.textMuted} />
                      </View>
                      <View>
                        <Text style={[styles.commanderTitle, { color: colors.text }]}>Make Squad Commander</Text>
                        <Text style={[styles.commanderDesc, { color: colors.textMuted }]}>
                          Will lead "{squadName}"
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={makeSquadCommander}
                      onValueChange={(val) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMakeSquadCommander(val);
                      }}
                      trackColor={{ false: colors.border, true: '#10B98160' }}
                      thumbColor={makeSquadCommander ? '#10B981' : colors.card}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.secondary }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Team</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedTeam?.name}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Role</Text>
                <View style={[styles.summaryBadge, { backgroundColor: roleDisplay.color + '20' }]}>
                  <Ionicons name={roleDisplay.icon} size={12} color={roleDisplay.color} />
                  <Text style={[styles.summaryBadgeText, { color: roleDisplay.color }]}>
                    {roleDisplay.label}
                  </Text>
                </View>
              </View>
              {assignToSquad && squadName && (
                <>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Squad</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{squadName}</Text>
                  </View>
                </>
              )}
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expires</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>7 days</Text>
              </View>
            </View>

            {/* Info Banner */}
            <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                The invite code can only be used once and will expire after 7 days.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════════
          ACTION BUTTONS (Sticky Bottom)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.actionsContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.secondary }]} 
          onPress={handleBack} 
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        {step === 0 ? (
          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: selectedTeamId ? colors.primary : colors.muted }]} 
            onPress={handleNext} 
            activeOpacity={0.8}
            disabled={!selectedTeamId}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.createButton, 
              { backgroundColor: isCreating ? colors.muted : colors.primary }
            ]}
            onPress={handleCreateInvite}
            disabled={isCreating || (assignToSquad && !squadName.trim())}
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
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header: { alignItems: 'center', paddingTop: 4, paddingBottom: 20 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Step Indicator
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  stepDot: { height: 6, borderRadius: 3 },

  // Step Content
  stepContent: { gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionDesc: { fontSize: 14, marginTop: -8, marginBottom: 4 },

  // Team Selection
  teamsList: { gap: 10 },
  teamCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  teamIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  teamMeta: { fontSize: 13 },

  // Role Info Box
  roleInfoBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  roleIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleInfoText: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  roleDesc: { fontSize: 12 },

  // Squad Toggle
  squadToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1.5 },
  squadToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  squadToggleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  squadToggleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  squadToggleDesc: { fontSize: 12 },

  // Squad Section
  squadSection: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  squadChipsSection: { gap: 8 },
  squadInputSection: { gap: 8 },
  squadInputLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  squadChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  squadChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  squadChipText: { fontSize: 13, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingRight: 8 },
  input: { flex: 1, height: 44, paddingHorizontal: 14, fontSize: 15 },
  clearInputBtn: { padding: 4 },

  // Commander Option
  commanderOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1.5 },
  commanderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  commanderIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  commanderTitle: { fontSize: 14, fontWeight: '600' },
  commanderDesc: { fontSize: 11, marginTop: 1 },

  // Summary Card
  summaryCard: { borderRadius: 12, padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  summaryDivider: { height: 1 },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 5 },
  summaryBadgeText: { fontSize: 12, fontWeight: '600' },

  // Info Card
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, gap: 10 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Actions (Sticky Bottom)
  actionsContainer: { 
    flexDirection: 'row', 
    gap: 12, 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  backButton: { flex: 1, flexDirection: 'row', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  createButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Success State
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, marginBottom: 16 },
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 2, marginBottom: 8 },
  codeText: { fontSize: 24, fontWeight: '700', letterSpacing: 3 },
  successHint: { fontSize: 13, marginBottom: 20 },
  successTeamCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginBottom: 32 },
  successTeamName: { fontSize: 14, fontWeight: '600', flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  successActions: { flexDirection: 'row', gap: 12, width: '100%' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 10, gap: 6 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 10, gap: 6 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
