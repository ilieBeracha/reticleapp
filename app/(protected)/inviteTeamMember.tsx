import { Text } from "@/components/shared/ui/text";
import { CreateWeaponFlow } from "@/components/weapons";
import { useColors } from "@/hooks/ui/useColors";
import { createInvitation } from "@/services/invitationService";
import { updateTeam } from "@/services/teamService";
import { getTeamWeapons, type TeamWeapon } from "@/services/weaponService";
import { useTeamRoleFlags, useTeamStore } from "@/store/teamStore";
import type { TeamRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import { Crosshair, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  const { activeTeamId, teams, loadTeams } = useTeamStore();
  const { isSquadCommander, squadId: mySquadId, canManage: canManageTeam } = useTeamRoleFlags();
  
  // Squad commanders can only invite to their squad
  const isSquadCommanderOnly = isSquadCommander && !canManageTeam;
  
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
  
  // Squad options - pre-enable for squad commanders
  const [assignToSquad, setAssignToSquad] = useState(isSquadCommanderOnly);
  const [makeSquadCommander, setMakeSquadCommander] = useState(false);
  const [squadName, setSquadName] = useState(isSquadCommanderOnly && mySquadId ? mySquadId : '');
  
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [squadsList, setSquadsList] = useState<string[]>([]);
  
  // Weapon assignment
  const [assignWeapon, setAssignWeapon] = useState(false);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [teamWeapons, setTeamWeapons] = useState<TeamWeapon[]>([]);
  const [loadingWeapons, setLoadingWeapons] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);

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

  // Load team weapons when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamWeapons([]);
      return;
    }
    async function loadWeapons() {
      setLoadingWeapons(true);
      try {
        const weapons = await getTeamWeapons(selectedTeamId!);
        setTeamWeapons(weapons);
      } catch (error) {
        console.error('Failed to load team weapons:', error);
        setTeamWeapons([]);
      } finally {
        setLoadingWeapons(false);
      }
    }
    loadWeapons();
  }, [selectedTeamId]);

  // Computed values
  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);
  
  const finalTeamRole = useMemo((): TeamRole => {
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
  const handleWeaponCreated = useCallback(async (weaponId: string) => {
    setShowCreateWeapon(false);
    // Refresh team weapons
    if (selectedTeamId) {
      setLoadingWeapons(true);
      try {
        const weapons = await getTeamWeapons(selectedTeamId);
        setTeamWeapons(weapons);
        // Auto-select the newly created weapon
        setSelectedWeaponId(weaponId);
      } catch (error) {
        console.error('Failed to reload team weapons:', error);
      } finally {
        setLoadingWeapons(false);
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedTeamId]);

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
      const trimmedSquadName = squadName.trim();
      
      // Build metadata with optional squad and weapon
      const metadata: Record<string, any> = {};
      if (assignToSquad && trimmedSquadName) {
        metadata.squad_id = trimmedSquadName;
      }
      if (assignWeapon && selectedWeaponId) {
        metadata.weapon_id = selectedWeaponId;
      }

      // If assigning to a NEW squad (not in existing list), add it to team's squads
      if (assignToSquad && trimmedSquadName && !squadsList.includes(trimmedSquadName)) {
        await updateTeam({
          team_id: selectedTeamId,
          squads: [...squadsList, trimmedSquadName],
        });
        // Update local list so it shows in UI immediately
        setSquadsList(prev => [...prev, trimmedSquadName]);
        // Refresh teams in store to sync the new squad everywhere
        loadTeams();
      }

      const invitation = await createInvitation(
        null as any, 
        'member', 
        selectedTeamId, 
        finalTeamRole, 
        Object.keys(metadata).length > 0 ? metadata : undefined
      );
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
      <ScrollView 
        style={[styles.successScrollView, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.successContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
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
              setAssignWeapon(false);
              setSelectedWeaponId(null);
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
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN FORM
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.card }]}
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

            {/* Squad Commander Info Banner */}
            {isSquadCommanderOnly && (
              <View style={[styles.squadCommanderBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
                <Ionicons name="shield" size={18} color="#F59E0B" />
                <View style={styles.squadCommanderBannerContent}>
                  <Text style={[styles.squadCommanderBannerTitle, { color: '#F59E0B' }]}>
                    Inviting to Your Squad
                  </Text>
                  <Text style={[styles.squadCommanderBannerText, { color: '#B45309' }]}>
                    As Squad Commander of {mySquadId}, new members will be added to your squad as soldiers.
                  </Text>
                </View>
              </View>
            )}

            {/* Squad Assignment Toggle - Only show for full managers */}
            {!isSquadCommanderOnly && (
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
            )}

            {/* Squad Details (when enabled) - Full managers get all options */}
            {assignToSquad && !isSquadCommanderOnly && (
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

                {/* Squad Commander Option - Only for full managers */}
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

            {/* Weapon Assignment Toggle */}
            {!isSquadCommanderOnly && (
              <TouchableOpacity
                style={[styles.squadToggle, { backgroundColor: colors.card, borderColor: assignWeapon ? colors.green : colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (assignWeapon) {
                    setAssignWeapon(false);
                    setSelectedWeaponId(null);
                  } else {
                    setAssignWeapon(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.squadToggleLeft}>
                  <View style={[styles.squadToggleIcon, { backgroundColor: assignWeapon ? colors.green + '15' : colors.secondary }]}>
                    <Crosshair size={18} color={assignWeapon ? colors.green : colors.text} />
                  </View>
                  <View>
                    <Text style={[styles.squadToggleTitle, { color: colors.text }]}>Pre-assign Weapon</Text>
                    <Text style={[styles.squadToggleDesc, { color: colors.textMuted }]}>
                      {assignWeapon ? 'Select from team catalog' : 'Or let user add their own'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={assignWeapon}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAssignWeapon(val);
                    if (!val) {
                      setSelectedWeaponId(null);
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.green + '60' }}
                  thumbColor={assignWeapon ? colors.green : colors.card}
                />
              </TouchableOpacity>
            )}

            {/* Weapon Selection (when enabled) */}
            {assignWeapon && (
              <View style={[styles.squadSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.squadInputLabel, { color: colors.textMuted }]}>TEAM WEAPONS</Text>
                
                {loadingWeapons ? (
                  <View style={styles.weaponLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading weapons...</Text>
                  </View>
                ) : teamWeapons.length === 0 ? (
                  <View style={[styles.weaponEmptyContainer, { backgroundColor: colors.secondary }]}>
                    <Crosshair size={24} color={colors.textMuted} />
                    <Text style={[styles.weaponEmptyText, { color: colors.textMuted }]}>No weapons in team catalog</Text>
                    <TouchableOpacity
                      style={[styles.addWeaponBtn, { backgroundColor: colors.green }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowCreateWeapon(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#fff" />
                      <Text style={styles.addWeaponBtnText}>Add Weapon</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.weaponsList}>
                    {teamWeapons.map((weapon) => (
                      <TouchableOpacity
                        key={weapon.id}
                        style={[
                          styles.weaponCard,
                          {
                            backgroundColor: selectedWeaponId === weapon.id ? colors.green + '10' : colors.background,
                            borderColor: selectedWeaponId === weapon.id ? colors.green : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedWeaponId(selectedWeaponId === weapon.id ? null : weapon.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.weaponIconBox, { backgroundColor: selectedWeaponId === weapon.id ? colors.green + '20' : colors.secondary }]}>
                          <Crosshair size={16} color={selectedWeaponId === weapon.id ? colors.green : colors.textMuted} />
                        </View>
                        <View style={styles.weaponInfo}>
                          <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>{weapon.name}</Text>
                          {weapon.caliber && (
                            <Text style={[styles.weaponCaliber, { color: colors.textMuted }]}>{weapon.caliber}</Text>
                          )}
                        </View>
                        {selectedWeaponId === weapon.id && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                        )}
                      </TouchableOpacity>
                    ))}
                    {/* Add weapon button */}
                    <TouchableOpacity
                      style={[styles.addWeaponRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowCreateWeapon(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.weaponIconBox, { backgroundColor: colors.secondary }]}>
                        <Plus size={16} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.addWeaponRowText, { color: colors.textMuted }]}>Add new weapon</Text>
                    </TouchableOpacity>
                  </View>
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
              {assignWeapon && selectedWeaponId && (
                <>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Weapon</Text>
                    <Text style={[styles.summaryValue, { color: colors.green }]}>
                      {teamWeapons.find(w => w.id === selectedWeaponId)?.name || 'Selected'}
                    </Text>
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

        {/* ═════════════════════════════════════════════════════════════════════
            ACTION BUTTONS (Inline with content)
        ═════════════════════════════════════════════════════════════════════ */}
        <View style={styles.actionsContainer}>
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

      {/* Create Weapon Modal */}
      <Modal
        visible={showCreateWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateWeapon(false)}
      >
        <CreateWeaponFlow
          teamId={selectedTeamId || undefined}
          onComplete={handleWeaponCreated}
          onCancel={() => setShowCreateWeapon(false)}
        />
      </Modal>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {},
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
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
  
  // Squad Commander Banner
  squadCommanderBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  squadCommanderBannerContent: { flex: 1, gap: 2 },
  squadCommanderBannerTitle: { fontSize: 14, fontWeight: '600' },
  squadCommanderBannerText: { fontSize: 12, lineHeight: 16 },

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

  // Weapon Selection
  weaponLoadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  weaponLoadingText: { fontSize: 13 },
  weaponEmptyContainer: { alignItems: 'center', padding: 20, borderRadius: 10, gap: 10 },
  weaponEmptyText: { fontSize: 14, fontWeight: '500' },
  addWeaponBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  addWeaponBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  weaponsList: { gap: 8 },
  weaponCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, gap: 10 },
  weaponIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  weaponInfo: { flex: 1 },
  weaponName: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  weaponCaliber: { fontSize: 12 },
  addWeaponRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 10 },
  addWeaponRowText: { fontSize: 14, fontWeight: '500' },

  // Actions (Inline)
  actionsContainer: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 24,
  },
  backButton: { flex: 1, flexDirection: 'row', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  createButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 32, flexGrow: 1 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Success State
  successScrollView: {},
  successContainer: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 60, flexGrow: 1 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 2, marginBottom: 8 },
  codeText: { fontSize: 18, fontWeight: '700', letterSpacing: 2 },
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
