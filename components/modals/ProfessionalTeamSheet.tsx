/**
 * 🏗️ PROFESSIONAL TEAM CREATION
 * 
 * Clean 2-step team builder:
 * 1. Team details
 * 2. Member assignment (optional)
 */

import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import { useModals } from "@/contexts/ModalContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useState, useEffect } from "react";
import { 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface ProfessionalTeamSheetProps {
  onTeamCreated?: () => void;
}

interface TeamMember {
  profile_id: string;
  display_name: string;
  role: 'commander' | 'squad_commander' | 'soldier';
  experience_score: number;
  is_eligible_commander: boolean;
}

export const ProfessionalTeamSheet = forwardRef<BaseBottomSheetRef, ProfessionalTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { currentOrg, isPersonalOrg } = useProfile();
    const { inviteMembersSheetRef } = useModals();
    
    const [step, setStep] = useState<1 | 2>(1);
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [squads, setSquads] = useState<string[]>([]);
    const [newSquadName, setNewSquadName] = useState("");
    
    const [availableMembers, setAvailableMembers] = useState<any[]>([]);
    const [assignedMembers, setAssignedMembers] = useState<Record<string, TeamMember>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (step === 2 && currentOrg?.id) {
        loadAvailableMembers();
      }
    }, [step, currentOrg?.id]);

    const loadAvailableMembers = async () => {
      if (!currentOrg?.id) return;
      
      try {
        const { data, error } = await supabase.rpc('get_available_team_members', {
          p_org_id: currentOrg.id
        });
        
        if (error) throw error;
        setAvailableMembers(data || []);
        
        // Auto-suggest commander
        if (data && data.length > 0) {
          const commander = data.find((m: any) => m.is_eligible_commander) || data[0];
          setAssignedMembers({
            [commander.profile_id]: {
              profile_id: commander.profile_id,
              display_name: commander.display_name,
              role: 'commander',
              experience_score: commander.experience_score,
              is_eligible_commander: commander.is_eligible_commander
            }
          });
        }
      } catch (error: any) {
        console.error('Failed to load members:', error);
      }
    };

    const handleCreateTeam = async (withMembers: boolean = false) => {
      if (!teamName.trim() || !currentOrg?.id) return;
      
      setLoading(true);
      try {
        if (withMembers && Object.keys(assignedMembers).length > 0) {
          // Create with members
          const members = Object.values(assignedMembers).map(m => ({
            profile_id: m.profile_id,
            display_name: m.display_name,
            role: m.role,
            squad_id: null,
            avatar_url: null
          }));

          const { data, error } = await supabase.rpc('create_team_with_members', {
            p_org_id: currentOrg.id,
            p_name: teamName,
            p_team_type: 'field',
            p_description: teamDescription || null,
            p_squads: squads,
            p_members: JSON.stringify(members)
          });
          
          if (error) throw error;
          if (!data.success) throw new Error(data.error);
        } else {
          // Create empty team
          const { data, error } = await supabase.rpc('create_team_for_org', {
            p_org_id: currentOrg.id,
            p_name: teamName.trim(),
            p_team_type: 'field',
            p_description: teamDescription.trim() || null
          });
          
          if (error) throw error;
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetForm();
        (ref as any)?.current?.close();
        onTeamCreated?.();
        
        const memberCount = Object.keys(assignedMembers).length;
        Alert.alert(
          "Team Created",
          memberCount > 0 
            ? `"${teamName}" created with ${memberCount} members`
            : `"${teamName}" created successfully`
        );
        
      } catch (error: any) {
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      } finally {
        setLoading(false);
      }
    };

    const handleCreateAndInvite = async () => {
      await handleCreateTeam(false);
      setTimeout(() => {
        inviteMembersSheetRef.current?.open();
      }, 500);
    };

    const resetForm = () => {
      setStep(1);
      setTeamName("");
      setTeamDescription("");
      setSquads([]);
      setNewSquadName("");
      setAssignedMembers({});
    };

    const toggleMember = (member: any) => {
      const profileId = member.profile_id;
      if (assignedMembers[profileId]) {
        setAssignedMembers(prev => {
          const { [profileId]: removed, ...rest } = prev;
          return rest;
        });
      } else {
        // Smart role assignment
        const existingRoles = Object.values(assignedMembers).map(m => m.role);
        const role = !existingRoles.includes('commander') && member.is_eligible_commander
          ? 'commander'
          : existingRoles.filter(r => r === 'squad_commander').length < 3
            ? 'squad_commander'
            : 'soldier';

        setAssignedMembers(prev => ({
          ...prev,
          [profileId]: {
            profile_id: profileId,
            display_name: member.display_name,
            role,
            experience_score: member.experience_score,
            is_eligible_commander: member.is_eligible_commander
          }
        }));
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const changeRole = (profileId: string, role: TeamMember['role']) => {
      if (role === 'commander') {
        // Demote existing commander to soldier
        const currentCommander = Object.values(assignedMembers).find(m => m.role === 'commander');
        if (currentCommander && currentCommander.profile_id !== profileId) {
          setAssignedMembers(prev => ({
            ...prev,
            [currentCommander.profile_id]: { ...currentCommander, role: 'soldier' }
          }));
        }
      }
      
      setAssignedMembers(prev => ({
        ...prev,
        [profileId]: { ...prev[profileId], role }
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    if (isPersonalOrg) return null;

    return (
      <BaseBottomSheet ref={ref} snapPoints={['85%']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step === 2 && (
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.text }]}>
                {step === 1 ? 'New Team' : 'Assign Members'}
              </Text>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
                <View style={[styles.stepLine, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
                <View style={[styles.stepDot, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
              </View>
            </View>
            
            <View style={styles.headerRight} />
          </View>

          <BottomSheetScrollView style={styles.content}>
            {step === 1 ? (
              // Step 1: Team Details
              <View style={styles.stepContent}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Team Name</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <BottomSheetTextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter team name"
                      placeholderTextColor={colors.textMuted}
                      value={teamName}
                      onChangeText={setTeamName}
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <BottomSheetTextInput
                      style={[styles.textArea, { color: colors.text }]}
                      placeholder="Team mission and objectives"
                      placeholderTextColor={colors.textMuted}
                      value={teamDescription}
                      onChangeText={setTeamDescription}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Squads</Text>
                  <View style={styles.squadInput}>
                    <View style={[styles.inputContainer, { flex: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                      <BottomSheetTextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Add squad names"
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
                        <View key={squad} style={[styles.squadTag, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.squadText, { color: colors.primary }]}>{squad}</Text>
                          <TouchableOpacity onPress={() => removeSquad(squad)}>
                            <Ionicons name="close" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // Step 2: Member Assignment
              <View style={styles.stepContent}>
                <View style={styles.memberAssignment}>
                  {availableMembers.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
                      <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        No available members
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.membersList}>
                      {availableMembers.map((member: any) => {
                        const isAssigned = !!assignedMembers[member.profile_id];
                        const assignedMember = assignedMembers[member.profile_id];
                        
                        return (
                          <View key={member.profile_id} style={[
                            styles.memberItem,
                            { 
                              backgroundColor: isAssigned ? colors.primary + '08' : colors.cardBackground,
                              borderColor: isAssigned ? colors.primary + '40' : colors.border 
                            }
                          ]}>
                            <TouchableOpacity
                              style={styles.memberHeader}
                              onPress={() => toggleMember(member)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="person" size={20} color={colors.primary} />
                              </View>
                              
                              <View style={styles.memberDetails}>
                                <Text style={[styles.memberName, { color: colors.text }]}>
                                  {member.display_name}
                                </Text>
                                <View style={styles.memberStats}>
                                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                                    {member.session_count} sessions
                                  </Text>
                                  {member.is_eligible_commander && (
                                    <View style={[styles.leaderBadge, { backgroundColor: '#FFD700' + '20' }]}>
                                      <Text style={[styles.leaderText, { color: '#FFD700' }]}>Leader</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              
                              <View style={[
                                styles.selectButton,
                                { backgroundColor: isAssigned ? colors.primary : colors.border }
                              ]}>
                                <Ionicons 
                                  name={isAssigned ? "checkmark" : "add"} 
                                  size={16} 
                                  color={isAssigned ? "#fff" : colors.text} 
                                />
                              </View>
                            </TouchableOpacity>
                            
                            {isAssigned && assignedMember && (
                              <View style={[styles.roleSelector, { borderTopColor: colors.border }]}>
                                <View style={styles.roleOptions}>
                                  {(['commander', 'squad_commander', 'soldier'] as const).map((role) => (
                                    <TouchableOpacity
                                      key={role}
                                      style={[
                                        styles.roleOption,
                                        { 
                                          backgroundColor: assignedMember.role === role 
                                            ? colors.primary 
                                            : colors.cardBackground + '80'
                                        }
                                      ]}
                                      onPress={() => changeRole(member.profile_id, role)}
                                    >
                                      <Text style={[
                                        styles.roleText,
                                        { color: assignedMember.role === role ? '#fff' : colors.text }
                                      ]}>
                                        {role === 'commander' ? '👑' : role === 'squad_commander' ? '🎖️' : '🛡️'}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                                <Text style={[styles.roleLabel, { color: colors.textMuted }]}>
                                  {assignedMember.role.replace('_', ' ')}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </BottomSheetScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {step === 1 ? (
              <View style={styles.step1Actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleCreateTeam(false)}
                  disabled={!teamName.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.actionButtonText}>Create Team</Text>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
                
                <View style={styles.optionalActions}>
                  <TouchableOpacity
                    style={[styles.optionalButton, { borderColor: colors.border }]}
                    onPress={() => setStep(2)}
                    disabled={!teamName.trim()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people-outline" size={16} color={colors.text} />
                    <Text style={[styles.optionalButtonText, { color: colors.text }]}>
                      Assign Members
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.optionalButton, { borderColor: colors.border }]}
                    onPress={handleCreateAndInvite}
                    disabled={!teamName.trim() || loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mail-outline" size={16} color={colors.text} />
                    <Text style={[styles.optionalButtonText, { color: colors.text }]}>
                      Invite People
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.step2Actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleCreateTeam(true)}
                  disabled={Object.keys(assignedMembers).length === 0 || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.actionButtonText}>
                        Create with {Object.keys(assignedMembers).length} Members
                      </Text>
                      <Ionicons name="people" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.skipButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleCreateTeam(false)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skipButtonText, { color: colors.text }]}>
                    Create Without Members
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </BaseBottomSheet>
    );
  }
);

ProfessionalTeamSheet.displayName = 'ProfessionalTeamSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  
  // Inputs
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Squad input
  squadInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
    gap: 6,
  },
  squadTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  squadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Members
  memberAssignment: {
    gap: 16,
  },
  membersList: {
    gap: 8,
  },
  memberItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  leaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Role selection
  roleSelector: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  
  // Empty state
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  step1Actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  optionalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  optionalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  optionalButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  step2Actions: {
    gap: 8,
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
