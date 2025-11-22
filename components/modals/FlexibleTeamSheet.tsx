/**
 * 🎯 FLEXIBLE TEAM CREATION SHEET
 * 
 * Agile team creation with multiple workflows:
 * - Quick create (just team name, assign later)
 * - Create with existing members
 * - Create and invite specific people
 * - Hybrid approach - some existing + some invites
 */

import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import { useModals } from "@/contexts/ModalContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useState, useEffect, useCallback } from "react";
import { 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface FlexibleTeamSheetProps {
  onTeamCreated?: () => void;
}

type CreationMode = 'quick' | 'with_existing' | 'with_invites' | 'hybrid';

interface SelectedMember {
  profile_id: string;
  display_name: string;
  role: 'commander' | 'squad_commander' | 'soldier';
  squad?: string;
}

interface InviteSpec {
  role: 'commander' | 'squad_commander' | 'soldier';
  squad?: string;
  email?: string; // Optional pre-filled email
}

export const FlexibleTeamSheet = forwardRef<BaseBottomSheetRef, FlexibleTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { currentOrg, isPersonalOrg, orgMembers } = useProfile();
    const { inviteMembersSheetRef } = useModals();
    
    // Basic team info
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [squads, setSquads] = useState<string[]>([]);
    const [newSquadName, setNewSquadName] = useState("");
    
    // Flexible creation options
    const [creationMode, setCreationMode] = useState<CreationMode>('quick');
    const [availableMembers, setAvailableMembers] = useState<any[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
    const [inviteSpecs, setInviteSpecs] = useState<InviteSpec[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const loadAvailableMembers = useCallback(async () => {
      if (!currentOrg?.id || creationMode === 'quick') return;
      
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase.rpc('get_available_team_members', {
          p_org_id: currentOrg.id
        });
        
        if (error) throw error;
        setAvailableMembers(data || []);
      } catch (error: any) {
        console.error('Failed to load members:', error);
      } finally {
        setLoadingMembers(false);
      }
    }, [currentOrg?.id, creationMode]);

    useEffect(() => {
      loadAvailableMembers();
    }, [loadAvailableMembers]);

    const handleQuickCreate = async () => {
      if (!teamName.trim() || !currentOrg?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('create_team_for_org', {
          p_org_id: currentOrg.id,
          p_name: teamName.trim(),
          p_team_type: 'field',
          p_description: teamDescription.trim() || null
        });
        
        if (error) throw error;
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetForm();
        (ref as any)?.current?.close();
        onTeamCreated?.();
        
        Alert.alert(
          "Team Created! 🎉",
          `"${teamName}" has been created. You can now:\n\n• Assign existing members\n• Invite new people to join\n• Set roles and squads`,
          [
            { text: "Manage Now", onPress: () => {/* TODO: Open team management */} },
            { text: "Done", style: "cancel" }
          ]
        );
        
      } catch (error: any) {
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      } finally {
        setLoading(false);
      }
    };

    const handleAdvancedCreate = async () => {
      if (!teamName.trim() || !currentOrg?.id) return;
      
      setLoading(true);
      try {
        // Create team with members
        const membersToAssign = selectedMembers.map(m => ({
          profile_id: m.profile_id,
          display_name: m.display_name,
          role: m.role,
          squad_id: m.squad || null,
          avatar_url: null
        }));
        
        const { data, error } = await supabase.rpc('create_team_with_members', {
          p_org_id: currentOrg.id,
          p_name: teamName,
          p_team_type: 'field',
          p_description: teamDescription || null,
          p_squads: squads,
          p_members: JSON.stringify(membersToAssign)
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetForm();
        (ref as any)?.current?.close();
        onTeamCreated?.();
        
        Alert.alert("Success!", `Team "${teamName}" created with ${selectedMembers.length} members!`);
        
      } catch (error: any) {
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      } finally {
        setLoading(false);
      }
    };

    const handleCreateAndInvite = async () => {
      // First create the team, then open invite sheet
      await handleQuickCreate();
      
      // After team is created, open invite sheet
      setTimeout(() => {
        inviteMembersSheetRef.current?.open();
      }, 500);
    };

    const resetForm = () => {
      setTeamName("");
      setTeamDescription("");
      setSquads([]);
      setNewSquadName("");
      setCreationMode('quick');
      setSelectedMembers([]);
      setInviteSpecs([]);
    };

    const addSquad = () => {
      const trimmed = newSquadName.trim();
      if (trimmed && !squads.includes(trimmed)) {
        setSquads([...squads, trimmed]);
        setNewSquadName("");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const removeSquad = (squadName: string) => {
      setSquads(squads.filter(s => s !== squadName));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    // Handle when sheet opens - reset to quick mode by default
    const handleSheetOpen = () => {
      setCreationMode('quick');
    };

    if (isPersonalOrg) return null;

    return (
      <BaseBottomSheet ref={ref} snapPoints={['85%']}>
        <BottomSheetScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Team</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Choose how you'd like to set up your team
            </Text>
          </View>

          {/* Team Basic Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Team Name *</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                <BottomSheetTextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Alpha Team, Bravo Squad..."
                  placeholderTextColor={colors.textMuted}
                  value={teamName}
                  onChangeText={setTeamName}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                <BottomSheetTextInput
                  style={[styles.textArea, { color: colors.text }]}
                  placeholder="Team mission and objectives..."
                  placeholderTextColor={colors.textMuted}
                  value={teamDescription}
                  onChangeText={setTeamDescription}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </View>

          {/* Creation Mode Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Setup Options</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Choose how to handle team members
            </Text>
            
            <View style={styles.optionsGrid}>
              {/* Quick Create */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: creationMode === 'quick' ? colors.primary + '10' : colors.cardBackground,
                    borderColor: creationMode === 'quick' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setCreationMode('quick')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#4CAF50' + '20' }]}>
                  <Ionicons name="flash" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Quick Create</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Create team now, assign members later
                </Text>
                {creationMode === 'quick' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* With Existing Members */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: creationMode === 'with_existing' ? colors.primary + '10' : colors.cardBackground,
                    borderColor: creationMode === 'with_existing' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setCreationMode('with_existing')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#2196F3' + '20' }]}>
                  <Ionicons name="people" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Assign Existing</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Create with current org members
                </Text>
                {creationMode === 'with_existing' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Create and Invite */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: creationMode === 'with_invites' ? colors.primary + '10' : colors.cardBackground,
                    borderColor: creationMode === 'with_invites' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setCreationMode('with_invites')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#FF9800' + '20' }]}>
                  <Ionicons name="mail" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Create & Invite</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Create team, then open invite flow
                </Text>
                {creationMode === 'with_invites' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Hybrid */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: creationMode === 'hybrid' ? colors.primary + '10' : colors.cardBackground,
                    borderColor: creationMode === 'hybrid' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setCreationMode('hybrid')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#9C27B0' + '20' }]}>
                  <Ionicons name="layers" size={20} color="#9C27B0" />
                </View>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Mixed Setup</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Assign existing + invite new members
                </Text>
                {creationMode === 'hybrid' && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Squads (Optional for all modes) */}
          {creationMode !== 'quick' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Squads (Optional)</Text>
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                Create sub-units within your team
              </Text>
              
              <View style={styles.squadInputRow}>
                <View style={[styles.inputContainer, { flex: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Alpha, Bravo, Charlie..."
                    placeholderTextColor={colors.textMuted}
                    value={newSquadName}
                    onChangeText={setNewSquadName}
                    onSubmitEditing={addSquad}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: newSquadName.trim() ? colors.primary : colors.border }]}
                  onPress={addSquad}
                  disabled={!newSquadName.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {squads.length > 0 && (
                <View style={styles.squadTags}>
                  {squads.map((squad) => (
                    <View key={squad} style={[styles.squadTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                      <Text style={[styles.squadTagText, { color: colors.primary }]}>{squad}</Text>
                      <TouchableOpacity onPress={() => removeSquad(squad)}>
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Member Assignment (for with_existing and hybrid modes) */}
          {(creationMode === 'with_existing' || creationMode === 'hybrid') && (
            <ExistingMembersSection
              availableMembers={availableMembers}
              selectedMembers={selectedMembers}
              onMemberToggle={(member) => {
                const isSelected = selectedMembers.some(m => m.profile_id === member.profile_id);
                if (isSelected) {
                  setSelectedMembers(prev => prev.filter(m => m.profile_id !== member.profile_id));
                } else {
                  // Smart role assignment
                  const role = selectedMembers.length === 0 && member.is_eligible_commander 
                    ? 'commander' 
                    : selectedMembers.length < 3 && member.experience_score > 50 
                      ? 'squad_commander'
                      : 'soldier';
                  
                  setSelectedMembers(prev => [...prev, {
                    profile_id: member.profile_id,
                    display_name: member.display_name,
                    role,
                    squad: squads[0] // Default to first squad if available
                  }]);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onRoleChange={(profileId, role, squad) => {
                setSelectedMembers(prev => prev.map(m => 
                  m.profile_id === profileId 
                    ? { ...m, role, squad }
                    : m
                ));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              squads={squads}
              colors={colors}
              loading={loadingMembers}
            />
          )}

          {/* Invite Specifications (for with_invites and hybrid modes) */}
          {(creationMode === 'with_invites' || creationMode === 'hybrid') && (
            <InviteSpecsSection
              inviteSpecs={inviteSpecs}
              onAddInvite={(spec) => {
                setInviteSpecs(prev => [...prev, spec]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onRemoveInvite={(index) => {
                setInviteSpecs(prev => prev.filter((_, i) => i !== index));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              squads={squads}
              colors={colors}
            />
          )}

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            {creationMode === 'quick' ? (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleQuickCreate}
                  disabled={!teamName.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color="#fff" />
                      <Text style={styles.primaryButtonText}>Create Team</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                  onPress={handleCreateAndInvite}
                  disabled={!teamName.trim() || loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail" size={18} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    Create & Invite
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  { 
                    backgroundColor: !teamName.trim() || loading ? colors.border : colors.primary,
                    opacity: !teamName.trim() || loading ? 0.6 : 1
                  }
                ]}
                onPress={handleAdvancedCreate}
                disabled={!teamName.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="people" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      Create with {selectedMembers.length + inviteSpecs.length} Members
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              {creationMode === 'quick' 
                ? "Team will be created empty. You can add members anytime from the team management page."
                : "Members will be assigned their roles immediately. You can always change roles later."
              }
            </Text>
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

// ===== SUB-COMPONENTS =====

const ExistingMembersSection = ({ availableMembers, selectedMembers, onMemberToggle, onRoleChange, squads, colors, loading }: any) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      Available Members ({availableMembers.length})
    </Text>
    
    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading members...</Text>
      </View>
    ) : (
      <View style={styles.membersList}>
        {availableMembers.map((member: any) => {
          const isSelected = selectedMembers.some((m: any) => m.profile_id === member.profile_id);
          const selectedMember = selectedMembers.find((m: any) => m.profile_id === member.profile_id);
          
          return (
            <View key={member.profile_id} style={[styles.memberCard, { 
              backgroundColor: isSelected ? colors.primary + '10' : colors.cardBackground,
              borderColor: isSelected ? colors.primary : colors.border 
            }]}>
              <TouchableOpacity
                style={styles.memberToggle}
                onPress={() => onMemberToggle(member)}
                activeOpacity={0.7}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.display_name}
                  </Text>
                  <View style={styles.memberMeta}>
                    <Text style={[styles.memberStats, { color: colors.textMuted }]}>
                      {member.session_count} sessions
                    </Text>
                    {member.is_eligible_commander && (
                      <Text style={[styles.eligibleBadge, { color: '#FFD700' }]}>⭐ Leader</Text>
                    )}
                  </View>
                </View>
                
                {isSelected && (
                  <View style={[styles.selectedIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              
              {isSelected && selectedMember && (
                <View style={[styles.roleAssignment, { borderTopColor: colors.border }]}>
                  <View style={styles.roleButtons}>
                    {(['commander', 'squad_commander', 'soldier'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleButton,
                          { 
                            backgroundColor: selectedMember.role === role ? colors.primary : colors.cardBackground
                          }
                        ]}
                        onPress={() => onRoleChange(member.profile_id, role)}
                      >
                        <Text style={[
                          styles.roleButtonText,
                          { color: selectedMember.role === role ? '#fff' : colors.text }
                        ]}>
                          {role === 'commander' ? '👑' : role === 'squad_commander' ? '🎖️' : '🛡️'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {squads.length > 0 && selectedMember.role !== 'commander' && (
                    <View style={styles.squadSelection}>
                      <Text style={[styles.squadLabel, { color: colors.textMuted }]}>Squad:</Text>
                      {squads.map((squad) => (
                        <TouchableOpacity
                          key={squad}
                          style={[
                            styles.squadButton,
                            { 
                              backgroundColor: selectedMember.squad === squad ? colors.primary : colors.cardBackground
                            }
                          ]}
                          onPress={() => onRoleChange(member.profile_id, selectedMember.role, squad)}
                        >
                          <Text style={[
                            styles.squadButtonText,
                            { color: selectedMember.squad === squad ? '#fff' : colors.text }
                          ]}>
                            {squad}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    )}
  </View>
);

const InviteSpecsSection = ({ inviteSpecs, onAddInvite, onRemoveInvite, squads, colors }: any) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      Invitations to Send ({inviteSpecs.length})
    </Text>
    <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
      Specify roles for people you'll invite
    </Text>
    
    <TouchableOpacity
      style={[styles.addInviteButton, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
      onPress={() => onAddInvite({ role: 'soldier' })}
    >
      <Ionicons name="add" size={20} color={colors.primary} />
      <Text style={[styles.addInviteText, { color: colors.primary }]}>Add Invitation Slot</Text>
    </TouchableOpacity>
    
    {inviteSpecs.map((spec: InviteSpec, index: number) => (
      <View key={index} style={[styles.inviteSpec, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.inviteSpecContent}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={[styles.inviteSpecText, { color: colors.text }]}>
            Invite someone as {spec.role.replace('_', ' ')}
            {spec.squad && ` (${spec.squad} Squad)`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onRemoveInvite(index)}>
          <Ionicons name="close-circle" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    ))}
  </View>
);

FlexibleTeamSheet.displayName = 'FlexibleTeamSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 16,
  },
  
  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 60,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  
  // Squad management
  squadInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  squadTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Options
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Members
  membersList: {
    gap: 8,
  },
  memberCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberStats: {
    fontSize: 11,
    fontWeight: '500',
  },
  eligibleBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Role assignment
  roleAssignment: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  squadSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squadLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  squadButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  squadButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Invites
  addInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addInviteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteSpec: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  inviteSpecContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inviteSpecText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Actions
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  quickActions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Info
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
