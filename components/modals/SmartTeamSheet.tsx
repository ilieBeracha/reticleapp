/**
 * 🚀 SMART TEAM CREATION SHEET
 * 
 * Elegant team creation with member assignment
 */

import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface SmartTeamSheetProps {
  onTeamCreated?: () => void;
}

interface AvailableMember {
  profile_id: string;
  display_name: string;
  org_role: string;
  experience_score: number;
  is_eligible_commander: boolean;
  session_count: number;
}

export const SmartTeamSheet = forwardRef<BaseBottomSheetRef, SmartTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { currentOrg, isPersonalOrg, orgMembers } = useProfile();
    
    const [step, setStep] = useState<'info' | 'assign' | 'preview'>('info');
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [squads, setSquads] = useState<string[]>([]);
    const [newSquadName, setNewSquadName] = useState("");
    
    const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [memberRoles, setMemberRoles] = useState<Record<string, { role: string; squad?: string }>>({});
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const loadAvailableMembers = useCallback(async () => {
      if (!currentOrg?.id || isPersonalOrg) return;
      
      setLoadingMembers(true);
      try {
        console.log('🔍 Loading available members for team creation');
        const { data, error } = await supabase.rpc('get_available_team_members', {
          p_org_id: currentOrg.id
        });
        
        if (error) throw error;
        
        setAvailableMembers(data || []);
        console.log('✅ Loaded', data?.length || 0, 'available members');
        
        // Smart suggestions
        if (data && data.length > 0) {
          autoAssignRoles(data);
        }
      } catch (error: any) {
        console.error('Failed to load members:', error);
      } finally {
        setLoadingMembers(false);
      }
    }, [currentOrg?.id, isPersonalOrg]);

    const autoAssignRoles = (members: AvailableMember[]) => {
      const sortedMembers = [...members].sort((a, b) => b.experience_score - a.experience_score);
      const newRoles: Record<string, { role: string; squad?: string }> = {};
      
      // Auto-select most experienced as commander
      if (sortedMembers.length > 0) {
        const commander = sortedMembers[0];
        newRoles[commander.profile_id] = { role: 'commander' };
        setSelectedMemberIds([commander.profile_id]);
        
        // Auto-select up to 2 more as squad commanders
        const squadCommanderCandidates = sortedMembers
          .slice(1, Math.min(4, sortedMembers.length))
          .filter(m => m.experience_score > 20);
        
        squadCommanderCandidates.forEach((member, index) => {
          newRoles[member.profile_id] = { 
            role: 'squad_commander',
            squad: squads[index] || undefined
          };
          setSelectedMemberIds(prev => [...prev, member.profile_id]);
        });
        
        console.log('💡 Smart suggestions applied:', newRoles);
      }
      
      setMemberRoles(newRoles);
    };

    useEffect(() => {
      if (step === 'assign') {
        loadAvailableMembers();
      }
    }, [step, loadAvailableMembers]);

    const handleNext = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (step === 'info') {
        if (!teamName.trim()) {
          Alert.alert("Error", "Please enter a team name");
          return;
        }
        setStep('assign');
      } else if (step === 'assign') {
        if (selectedMemberIds.length === 0) {
          Alert.alert("Error", "Please select at least one member");
          return;
        }
        setStep('preview');
      } else {
        handleCreateTeam();
      }
    };

    const handleBack = () => {
      if (step === 'assign') {
        setStep('info');
      } else if (step === 'preview') {
        setStep('assign');
      } else {
        (ref as any)?.current?.close();
      }
    };

    const handleCreateTeam = async () => {
      if (!currentOrg?.id) return;
      
      setLoading(true);
      try {
        // Prepare members array
        const membersToAssign = selectedMemberIds.map(profileId => {
          const member = availableMembers.find(m => m.profile_id === profileId);
          const assignment = memberRoles[profileId] || { role: 'soldier' };
          
          return {
            profile_id: profileId,
            display_name: member?.display_name || 'Member',
            role: assignment.role,
            squad_id: assignment.squad || null,
            avatar_url: null
          };
        });
        
        const result = await supabase.rpc('create_team_with_members', {
          p_org_id: currentOrg.id,
          p_name: teamName,
          p_team_type: 'field',
          p_description: teamDescription || null,
          p_squads: squads,
          p_members: JSON.stringify(membersToAssign)
        });
        
        if (result.error) throw result.error;
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Reset form
        resetForm();
        (ref as any)?.current?.close();
        onTeamCreated?.();
        
        Alert.alert("Success!", `Team "${teamName}" created with ${membersToAssign.length} members!`);
        
      } catch (error: any) {
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    };

    const resetForm = () => {
      setStep('info');
      setTeamName("");
      setTeamDescription("");
      setSquads([]);
      setNewSquadName("");
      setSelectedMemberIds([]);
      setMemberRoles({});
    };

    const handleAddSquad = () => {
      const trimmedName = newSquadName.trim();
      if (!trimmedName || squads.includes(trimmedName)) return;
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads([...squads, trimmedName]);
      setNewSquadName("");
    };

    const handleRemoveSquad = (squadName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads(squads.filter(s => s !== squadName));
    };

    const toggleMember = (profileId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedMemberIds.includes(profileId)) {
        setSelectedMemberIds(prev => prev.filter(id => id !== profileId));
        setMemberRoles(prev => {
          const { [profileId]: removed, ...rest } = prev;
          return rest;
        });
      } else {
        setSelectedMemberIds(prev => [...prev, profileId]);
        setMemberRoles(prev => ({
          ...prev,
          [profileId]: { role: 'soldier' } // Default role
        }));
      }
    };

    const updateMemberRole = (profileId: string, role: string, squad?: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMemberRoles(prev => ({
        ...prev,
        [profileId]: { role, squad }
      }));
    };

    if (isPersonalOrg) {
      return null;
    }

    return (
      <BaseBottomSheet ref={ref} snapPoints={['90%']}>
        <BottomSheetScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {step === 'info' ? 'Team Info' : step === 'assign' ? 'Assign Members' : 'Review Team'}
              </Text>
              <View style={styles.progressDots}>
                {['info', 'assign', 'preview'].map((s, i) => (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      { backgroundColor: s === step ? colors.primary : colors.border }
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.backButton} />
          </View>

          {/* Step Content */}
          <View style={styles.content}>
            {step === 'info' && (
              <View style={styles.stepContent}>
                {/* Team Name */}
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

                {/* Team Description */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <BottomSheetTextInput
                      style={[styles.textArea, { color: colors.text }]}
                      placeholder="What's this team's mission?"
                      placeholderTextColor={colors.textMuted}
                      value={teamDescription}
                      onChangeText={setTeamDescription}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                {/* Squads */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Squads (Optional)</Text>
                  
                  <View style={styles.squadInputRow}>
                    <View style={[styles.inputContainer, { flex: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                      <BottomSheetTextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Alpha, Bravo..."
                        placeholderTextColor={colors.textMuted}
                        value={newSquadName}
                        onChangeText={setNewSquadName}
                        onSubmitEditing={handleAddSquad}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: newSquadName.trim() ? colors.primary : colors.border }]}
                      onPress={handleAddSquad}
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
                          <TouchableOpacity onPress={() => handleRemoveSquad(squad)}>
                            <Ionicons name="close-circle" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {step === 'assign' && (
              <View style={styles.stepContent}>
                <Text style={[styles.stepDescription, { color: colors.textMuted }]}>
                  Select members and assign their roles. Most experienced members are suggested as leaders.
                </Text>
                
                {loadingMembers ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                      Loading available members...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.membersList}>
                    {availableMembers.map((member) => (
                      <TouchableOpacity
                        key={member.profile_id}
                        style={[
                          styles.memberCard,
                          {
                            backgroundColor: selectedMemberIds.includes(member.profile_id) ? colors.primary + '10' : colors.cardBackground,
                            borderColor: selectedMemberIds.includes(member.profile_id) ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={() => toggleMember(member.profile_id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.memberInfo}>
                          <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="person" size={20} color={colors.primary} />
                          </View>
                          <View style={styles.memberDetails}>
                            <Text style={[styles.memberName, { color: colors.text }]}>
                              {member.display_name}
                            </Text>
                            <View style={styles.memberMeta}>
                              <Text style={[styles.memberStats, { color: colors.textMuted }]}>
                                {member.session_count} sessions • Score: {member.experience_score}
                              </Text>
                              {member.is_eligible_commander && (
                                <View style={[styles.eligibleBadge, { backgroundColor: '#FFD700' + '20' }]}>
                                  <Text style={[styles.eligibleBadgeText, { color: '#FFD700' }]}>
                                    ⭐ Leader
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {/* Role Assignment */}
                            {selectedMemberIds.includes(member.profile_id) && (
                              <View style={styles.roleSelection}>
                                {(['commander', 'squad_commander', 'soldier'] as const).map((role) => (
                                  <TouchableOpacity
                                    key={role}
                                    style={[
                                      styles.roleButton,
                                      {
                                        backgroundColor: memberRoles[member.profile_id]?.role === role ? colors.primary : colors.border,
                                      }
                                    ]}
                                    onPress={() => updateMemberRole(member.profile_id, role)}
                                  >
                                    <Text style={[
                                      styles.roleButtonText,
                                      { 
                                        color: memberRoles[member.profile_id]?.role === role ? '#fff' : colors.text 
                                      }
                                    ]}>
                                      {role === 'commander' ? '👑' : role === 'squad_commander' ? '🎖️' : '🛡️'}
                                      {' '}
                                      {role.replace('_', ' ')}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {selectedMemberIds.includes(member.profile_id) && (
                          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {step === 'preview' && (
              <View style={styles.stepContent}>
                <View style={[styles.previewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    🏗️ {teamName}
                  </Text>
                  
                  <View style={styles.teamStructure}>
                    {Object.entries(memberRoles).map(([profileId, assignment]) => {
                      const member = availableMembers.find(m => m.profile_id === profileId);
                      if (!member) return null;
                      
                      return (
                        <View key={profileId} style={styles.previewMember}>
                          <Text style={{ color: colors.text }}>
                            {assignment.role === 'commander' ? '👑' : assignment.role === 'squad_commander' ? '🎖️' : '🛡️'}
                            {' '}
                            {member.display_name}
                            {assignment.role !== 'soldier' && (
                              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                {' '}({assignment.role.replace('_', ' ')})
                              </Text>
                            )}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  
                  {squads.length > 0 && (
                    <View style={styles.squadsPreview}>
                      <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                        Squads: {squads.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                {
                  backgroundColor: 
                    (step === 'info' && !teamName.trim()) ||
                    (step === 'assign' && selectedMemberIds.length === 0) ||
                    loading
                      ? colors.border 
                      : colors.primary,
                  opacity: loading ? 0.7 : 1,
                }
              ]}
              onPress={handleNext}
              disabled={
                (step === 'info' && !teamName.trim()) ||
                (step === 'assign' && selectedMemberIds.length === 0) ||
                loading
              }
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {step === 'info' ? 'Select Members' : 
                     step === 'assign' ? 'Review Team' : 
                     'Create Team'}
                  </Text>
                  <Ionicons 
                    name={step === 'preview' ? "checkmark" : "chevron-forward"} 
                    size={18} 
                    color="#fff" 
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

SmartTeamSheet.displayName = 'SmartTeamSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
    gap: 20,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  // Input styles
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
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  squadInputRow: {
    flexDirection: 'row',
    gap: 8,
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
    marginTop: 8,
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
  
  // Member selection
  membersList: {
    gap: 12,
  },
  memberCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    gap: 8,
  },
  memberStats: {
    fontSize: 12,
    fontWeight: '500',
  },
  eligibleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  eligibleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleSelection: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  roleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Loading/empty states
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Preview
  previewCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  teamStructure: {
    gap: 8,
  },
  previewMember: {
    paddingVertical: 4,
  },
  squadsPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
