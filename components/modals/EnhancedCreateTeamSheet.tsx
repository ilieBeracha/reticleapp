/**
 * 🏗️ ENHANCED TEAM CREATION SHEET
 * 
 * Elegant multi-step team builder with member assignment
 * - Smart member suggestions
 * - Visual role hierarchy
 * - Real-time preview
 * - Atomic creation
 */

import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import {
    createTeamPreview,
    createTeamWithMembers,
    getAvailableMembers,
    suggestTeamRoles,
    type AvailableMember,
    type TeamMember,
    type TeamStructurePreview
} from "@/services/teamServiceNew";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated, StyleSheet, Text,
    TouchableOpacity,
    View
} from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface EnhancedCreateTeamSheetProps {
  onTeamCreated?: () => void;
}

type Step = 'info' | 'members' | 'roles' | 'preview';

const STEP_TITLES = {
  info: 'Team Information',
  members: 'Select Members',
  roles: 'Assign Roles', 
  preview: 'Review & Create'
};

export const EnhancedCreateTeamSheet = forwardRef<BaseBottomSheetRef, EnhancedCreateTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { currentOrg, isPersonalOrg, orgMembers } = useProfile();
    
    // Form state
    const [step, setStep] = useState<Step>('info');
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [squads, setSquads] = useState<string[]>([]);
    const [newSquadName, setNewSquadName] = useState("");
    
    // Member selection state
    const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [teamPreview, setTeamPreview] = useState<TeamStructurePreview | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Animation values
    const [fadeAnim] = useState(new Animated.Value(1));

    // Load available members when switching to members step
    const loadAvailableMembers = useCallback(async () => {
      if (!currentOrg?.id || step !== 'members') return;
      
      setLoadingMembers(true);
      try {
        const members = await getAvailableMembers(currentOrg.id);
        setAvailableMembers(members);
        
        // Smart suggestions
        if (members.length > 0) {
          const suggestions = suggestTeamRoles(members);
          console.log('💡 Smart team suggestions:', suggestions);
        }
      } catch (error: any) {
        console.error('Failed to load available members:', error);
        Alert.alert('Error', 'Failed to load available members');
      } finally {
        setLoadingMembers(false);
      }
    }, [currentOrg?.id, step]);

    useEffect(() => {
      loadAvailableMembers();
    }, [loadAvailableMembers]);

    // Update team preview when data changes
    useEffect(() => {
      if (step === 'preview') {
        const preview = createTeamPreview(teamName, teamMembers, squads);
        setTeamPreview(preview);
      }
    }, [step, teamName, teamMembers, squads]);

    const handleStepTransition = (newStep: Step) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setStep(newStep);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    };

    const handleNext = () => {
      switch (step) {
        case 'info':
          if (!teamName.trim()) {
            Alert.alert("Error", "Please enter a team name");
            return;
          }
          handleStepTransition('members');
          break;
        case 'members':
          if (selectedMembers.length === 0) {
            Alert.alert("Error", "Please select at least one member");
            return;
          }
          // Create initial team member assignments
          const initialTeamMembers: TeamMember[] = selectedMembers.map(profileId => {
            const member = availableMembers.find(m => m.profile_id === profileId)!;
            return {
              profile_id: profileId,
              display_name: member.display_name,
              role: 'soldier', // Default role
              squad_id: null,
              avatar_url: member.avatar_url,
            };
          });
          setTeamMembers(initialTeamMembers);
          handleStepTransition('roles');
          break;
        case 'roles':
          // Validate roles before proceeding
          const preview = createTeamPreview(teamName, teamMembers, squads);
          if (!preview.is_valid) {
            Alert.alert("Invalid Team Structure", preview.validation_errors.join('\n'));
            return;
          }
          handleStepTransition('preview');
          break;
        case 'preview':
          handleCreateTeam();
          break;
      }
    };

    const handleBack = () => {
      switch (step) {
        case 'members':
          handleStepTransition('info');
          break;
        case 'roles':
          handleStepTransition('members');
          break;
        case 'preview':
          handleStepTransition('roles');
          break;
        case 'info':
          (ref as any)?.current?.close();
          break;
      }
    };

    const handleCreateTeam = async () => {
      if (!currentOrg?.id || !teamPreview?.is_valid) return;
      
      setLoading(true);
      try {
        await createTeamWithMembers({
          org_id: currentOrg.id,
          name: teamName,
          team_type: 'field',
          description: teamDescription || undefined,
          squads: squads,
          members: teamMembers
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Reset form
        resetForm();
        
        // Close sheet
        (ref as any)?.current?.close();
        
        // Success callback
        onTeamCreated?.();
        
        // Show success message
        setTimeout(() => {
          Alert.alert("Success!", `Team "${teamName}" created with ${teamMembers.length} members!`);
        }, 300);
        
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
      setSelectedMembers([]);
      setTeamMembers([]);
      setTeamPreview(null);
    };

    const toggleMemberSelection = (profileId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedMembers.includes(profileId)) {
        setSelectedMembers(selectedMembers.filter(id => id !== profileId));
      } else {
        setSelectedMembers([...selectedMembers, profileId]);
      }
    };

    const updateMemberRole = (profileId: string, role: TeamMember['role'], squadId?: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTeamMembers(prev => prev.map(member => 
        member.profile_id === profileId 
          ? { ...member, role, squad_id: squadId || null }
          : member
      ));
    };

    const renderStepContent = () => {
      switch (step) {
        case 'info':
          return <TeamInfoStep {...{
            teamName, setTeamName,
            teamDescription, setTeamDescription,
            squads, setSquads,
            newSquadName, setNewSquadName,
            colors
          }} />;
        
        case 'members':
          return <MemberSelectionStep {...{
            availableMembers,
            selectedMembers,
            toggleMemberSelection,
            loadingMembers,
            colors
          }} />;
        
        case 'roles':
          return <RoleAssignmentStep {...{
            teamMembers,
            updateMemberRole,
            squads,
            colors
          }} />;
        
        case 'preview':
          return <TeamPreviewStep {...{
            teamPreview,
            colors
          }} />;
        
        default:
          return null;
      }
    };

    const canProceed = () => {
      switch (step) {
        case 'info': return teamName.trim().length > 0;
        case 'members': return selectedMembers.length > 0;
        case 'roles': return teamPreview?.is_valid || false;
        case 'preview': return teamPreview?.is_valid || false;
        default: return false;
      }
    };

    if (isPersonalOrg) {
      return null;
    }

    return (
      <BaseBottomSheet ref={ref} snapPoints={['90%']}>
        <BottomSheetScrollView>
          {/* Progress Header */}
          <TeamCreationHeader 
            step={step}
            title={STEP_TITLES[step]}
            onBack={handleBack}
            colors={colors}
          />
          
          {/* Step Content */}
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <BottomSheetScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {renderStepContent()}
            </BottomSheetScrollView>
          </Animated.View>
          
          {/* Bottom Actions */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.nextButton,
                {
                  backgroundColor: canProceed() ? colors.primary : colors.secondary,
                  opacity: canProceed() ? 1 : 0.6,
                }
              ]}
              onPress={handleNext}
              disabled={!canProceed() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionButtonText}>
                    {step === 'preview' ? 'Create Team' : 'Continue'}
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

// ===== STEP COMPONENTS =====

const TeamCreationHeader = ({ step, title, onBack, colors }: any) => (
  <View style={[styles.header, { borderBottomColor: colors.border }]}>
    <TouchableOpacity onPress={onBack} style={styles.headerButton}>
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </TouchableOpacity>
    <View style={styles.headerContent}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.progressDots}>
        {(['info', 'members', 'roles', 'preview'] as Step[]).map((s, index) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              {
                backgroundColor: s === step ? colors.primary : colors.border,
                transform: [{ scale: s === step ? 1.2 : 1 }]
              }
            ]}
          />
        ))}
      </View>
    </View>
    <View style={styles.headerButton} />
  </View>
);

const TeamInfoStep = ({ teamName, setTeamName, teamDescription, setTeamDescription, squads, setSquads, newSquadName, setNewSquadName, colors }: any) => {
  
  const handleAddSquad = () => {
    const trimmedName = newSquadName.trim();
    if (!trimmedName || squads.includes(trimmedName)) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads([...squads, trimmedName]);
    setNewSquadName("");
  };

  const handleRemoveSquad = (squadName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads(squads.filter((s: string) => s !== squadName));
  };

  return (
    <View style={styles.stepContent}>
      {/* Team Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Team Name *</Text>
        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
          <Ionicons name="people" size={20} color={colors.textMuted} style={styles.inputIcon} />
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
        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
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
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Create sub-units within your team
        </Text>
        
        <View style={styles.squadInputRow}>
          <View style={[styles.inputContainer, { flex: 1, borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Ionicons name="shield-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <BottomSheetTextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Alpha, Bravo, Charlie..."
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
            {squads.map((squad: string) => (
              <View key={squad} style={[styles.squadTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
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
  );
};

const MemberSelectionStep = ({ availableMembers, selectedMembers, toggleMemberSelection, loadingMembers, colors }: any) => (
  <View style={styles.stepContent}>
    <Text style={[styles.stepDescription, { color: colors.textMuted }]}>
      Choose members for your team. Only members not currently in other teams are shown.
    </Text>
    
    {loadingMembers ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading available members...</Text>
      </View>
    ) : (
      <View style={styles.membersList}>
        {availableMembers.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No available members for teams
            </Text>
          </View>
        ) : (
          availableMembers.map((member: AvailableMember) => (
            <TouchableOpacity
              key={member.profile_id}
              style={[
                styles.memberCard,
                {
                  backgroundColor: selectedMembers.includes(member.profile_id) ? colors.primary + '10' : colors.cardBackground,
                  borderColor: selectedMembers.includes(member.profile_id) ? colors.primary : colors.border,
                }
              ]}
              onPress={() => toggleMemberSelection(member.profile_id)}
              activeOpacity={0.7}
            >
              <View style={styles.memberInfo}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.memberDetails}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.display_name || 'Member'}
                  </Text>
                  <View style={styles.memberMeta}>
                    <Ionicons name="fitness-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.memberStats, { color: colors.textMuted }]}>
                      {member.experience_score} experience
                    </Text>
                    {member.is_eligible_commander && (
                      <View style={[styles.commanderBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.commanderBadgeText, { color: colors.primary }]}>
                          Commander Eligible
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              {selectedMembers.includes(member.profile_id) && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    )}
  </View>
);

const RoleAssignmentStep = ({ teamMembers, updateMemberRole, squads, colors }: any) => (
  <View style={styles.stepContent}>
    <Text style={[styles.stepDescription, { color: colors.textMuted }]}>
      Assign roles to your team members. Drag members to different positions or tap to change roles.
    </Text>
    
    <TeamHierarchyBuilder 
      teamMembers={teamMembers}
      updateMemberRole={updateMemberRole}
      squads={squads}
      colors={colors}
    />
  </View>
);

const TeamPreviewStep = ({ teamPreview, colors }: any) => (
  <View style={styles.stepContent}>
    {teamPreview && (
      <>
        <View style={[styles.previewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.previewHeader}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {teamPreview.team_name}
            </Text>
          </View>
          
          <TeamHierarchyPreview preview={teamPreview} colors={colors} />
          
          {teamPreview.validation_errors.length > 0 && (
            <View style={[styles.errorCard, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <View style={styles.errorContent}>
                {teamPreview.validation_errors.map((error: string, index: number) => (
                  <Text key={index} style={[styles.errorText, { color: colors.destructive }]}>
                    {error}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </>
    )}
  </View>
);

// Temporary simplified components until we fix import issues
const TeamHierarchyBuilder = ({ teamMembers, updateMemberRole, squads, colors }: any) => (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <Ionicons name="construct" size={32} color={colors.textMuted} />
    <Text style={{ color: colors.textMuted, marginTop: 8 }}>
      Role assignment coming soon
    </Text>
    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
      {teamMembers.length} members selected
    </Text>
  </View>
);

const TeamHierarchyPreview = ({ preview, colors }: any) => (
  <View style={{ padding: 20 }}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
      Team Structure
    </Text>
    <View style={{ gap: 8 }}>
      {preview?.commander && (
        <Text style={{ color: colors.text }}>
          👑 Commander: {preview.commander.display_name}
        </Text>
      )}
      {preview?.squad_commanders?.map((sc: any, i: number) => (
        <Text key={i} style={{ color: colors.text }}>
          🎖️ Squad Commander: {sc.display_name}
        </Text>
      ))}
      <Text style={{ color: colors.text }}>
        🛡️ Soldiers: {preview?.soldiers?.length || 0}
      </Text>
    </View>
  </View>
);

EnhancedCreateTeamSheet.displayName = 'EnhancedCreateTeamSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
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
  scrollView: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  
  // Input styles
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputIcon: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 80,
    textAlignVertical: 'top',
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
  
  // Member selection styles
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
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
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberStats: {
    fontSize: 12,
    fontWeight: '500',
  },
  commanderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commanderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Loading states
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Preview styles
  previewCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  errorContent: {
    flex: 1,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButton: {
    // Primary button styles
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

