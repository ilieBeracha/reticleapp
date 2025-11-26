import { useOrgRole } from "@/contexts/OrgRoleContext";
import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { getWorkspaceTeams } from "@/services/teamService";
import { createTraining } from "@/services/trainingService";
import type { CreateDrillInput, TargetType, Team } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateTrainingSheetProps {
  onTrainingCreated?: () => void;
}

interface DrillFormData extends CreateDrillInput {
  id: string; // Temp ID for UI
}

const TARGET_TYPES: { value: TargetType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'paper', label: 'Paper', icon: 'document-outline' },
  { value: 'tactical', label: 'Tactical', icon: 'shield-outline' },
];

const POSITIONS = ['prone', 'kneeling', 'standing', 'supported'];
const WEAPON_CATEGORIES = ['rifle', 'pistol', 'sniper', 'any'];

export const CreateTrainingSheet = forwardRef<BaseBottomSheetRef, CreateTrainingSheetProps>(
  ({ onTrainingCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId } = useAppContext();
    const { orgRole, allTeams: userTeams, isCommander } = useOrgRole();
    
    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scheduledDate, setScheduledDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [drills, setDrills] = useState<DrillFormData[]>([]);
    const [showDrillForm, setShowDrillForm] = useState(false);
    
    // Data state
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // New drill form state
    const [newDrill, setNewDrill] = useState<Partial<DrillFormData>>({
      name: '',
      target_type: 'paper',
      distance_m: 100,
      rounds_per_shooter: 10,
    });

    // Check if user is admin-level (can create for any team)
    const isAdminLevel = useMemo(() => 
      ['owner', 'admin', 'instructor'].includes(orgRole || ''),
      [orgRole]
    );

    // Filter teams based on user role
    // - Admin/Owner/Instructor: see all teams
    // - Team commander: only see teams they command
    const availableTeams = useMemo(() => {
      if (isAdminLevel) {
        return teams;
      }
      // For team commanders, filter to only teams they command
      const commanderTeamIds = userTeams
        .filter(t => t.teamRole === 'commander')
        .map(t => t.teamId);
      return teams.filter(t => commanderTeamIds.includes(t.id));
    }, [teams, isAdminLevel, userTeams]);

    // Fetch teams when sheet opens
    useEffect(() => {
      if (activeWorkspaceId) {
        fetchTeams();
      }
    }, [activeWorkspaceId]);

    // Auto-select team for commanders with only one team
    useEffect(() => {
      if (availableTeams.length === 1 && !selectedTeamId) {
        setSelectedTeamId(availableTeams[0].id);
      }
    }, [availableTeams, selectedTeamId]);

    const fetchTeams = async () => {
      if (!activeWorkspaceId) return;
      
      setLoadingTeams(true);
      try {
        const data = await getWorkspaceTeams(activeWorkspaceId);
        setTeams(data);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };

    const handleAddDrill = useCallback(() => {
      if (!newDrill.name?.trim()) {
        Alert.alert('Error', 'Please enter a drill name');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setDrills(prev => [...prev, {
        id: Date.now().toString(),
        name: newDrill.name!.trim(),
        target_type: newDrill.target_type || 'paper',
        distance_m: newDrill.distance_m || 100,
        rounds_per_shooter: newDrill.rounds_per_shooter || 10,
        time_limit_seconds: newDrill.time_limit_seconds,
        position: newDrill.position,
        weapon_category: newDrill.weapon_category,
        notes: newDrill.notes,
      }]);

      // Reset form
      setNewDrill({
        name: '',
        target_type: 'paper',
        distance_m: 100,
        rounds_per_shooter: 10,
      });
      setShowDrillForm(false);
    }, [newDrill]);

    const handleRemoveDrill = useCallback((drillId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDrills(prev => prev.filter(d => d.id !== drillId));
    }, []);

    const handleCreate = async () => {
      if (!title.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Please enter a training title');
        return;
      }

      if (!selectedTeamId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Please select a team');
        return;
      }

      if (!activeWorkspaceId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'No active workspace');
        return;
      }

      setSubmitting(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        await createTraining({
          org_workspace_id: activeWorkspaceId,
          team_id: selectedTeamId,
          title: title.trim(),
          description: description.trim() || undefined,
          scheduled_at: scheduledDate.toISOString(),
          drills: drills.length > 0 ? drills.map(({ id, ...drill }) => drill) : undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Close sheet
        if (typeof ref === 'object' && ref?.current) {
          ref.current.close();
        }

        // Reset form
        resetForm();
        
        // Callback
        onTrainingCreated?.();

        setTimeout(() => {
          Alert.alert('Success', `Training "${title}" scheduled!`);
        }, 300);
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('Failed to create training:', error);
        Alert.alert('Error', error.message || 'Failed to create training');
      } finally {
        setSubmitting(false);
      }
    };

    const resetForm = () => {
      setTitle('');
      setDescription('');
      setScheduledDate(new Date());
      setSelectedTeamId(availableTeams.length === 1 ? availableTeams[0].id : null);
      setDrills([]);
      setShowDrillForm(false);
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['90%']} backdropOpacity={0.6}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="fitness" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Schedule Training
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Create a training session for your team
            </Text>
          </View>

          {/* Training Title */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Training Title *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <BottomSheetTextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Live Fire Qualification"
                placeholderTextColor={colors.textMuted + 'CC'}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <BottomSheetTextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Training objectives and notes..."
                placeholderTextColor={colors.textMuted + 'CC'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Team Selection */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Team *</Text>
            {loadingTeams ? (
              <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading teams...</Text>
              </View>
            ) : availableTeams.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
                <Ionicons name="people-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {isAdminLevel 
                    ? "No teams available. Create a team first." 
                    : "No teams you command. Contact your admin."}
                </Text>
              </View>
            ) : (
              <View style={styles.teamGrid}>
                {availableTeams.map(team => (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamOption,
                      { 
                        borderColor: selectedTeamId === team.id ? colors.primary : colors.border,
                        backgroundColor: selectedTeamId === team.id ? colors.primary + '10' : colors.card,
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTeamId(team.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={selectedTeamId === team.id ? "checkmark-circle" : "people-outline"} 
                      size={20} 
                      color={selectedTeamId === team.id ? colors.primary : colors.textMuted} 
                    />
                    <Text style={[
                      styles.teamOptionText,
                      { color: selectedTeamId === team.id ? colors.primary : colors.text }
                    ]}>
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Schedule *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatDate(scheduledDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dateTimeButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatTime(scheduledDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setScheduledDate(date);
              }}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setScheduledDate(date);
              }}
            />
          )}

          {/* Drills Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Drills ({drills.length})
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary + '15' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDrillForm(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Drill</Text>
              </TouchableOpacity>
            </View>

            {/* Drills List */}
            {drills.length > 0 && (
              <View style={styles.drillsList}>
                {drills.map((drill, index) => (
                  <View 
                    key={drill.id} 
                    style={[styles.drillItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.drillInfo}>
                      <View style={styles.drillHeader}>
                        <Text style={[styles.drillIndex, { color: colors.textMuted }]}>#{index + 1}</Text>
                        <Text style={[styles.drillName, { color: colors.text }]}>{drill.name}</Text>
                      </View>
                      <View style={styles.drillMeta}>
                        <View style={[styles.drillBadge, { backgroundColor: colors.secondary }]}>
                          <Ionicons 
                            name={drill.target_type === 'paper' ? 'document-outline' : 'shield-outline'} 
                            size={12} 
                            color={colors.textMuted} 
                          />
                          <Text style={[styles.drillBadgeText, { color: colors.textMuted }]}>
                            {drill.target_type}
                          </Text>
                        </View>
                        <Text style={[styles.drillMetaText, { color: colors.textMuted }]}>
                          {drill.distance_m}m • {drill.rounds_per_shooter} rds
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeDrillButton}
                      onPress={() => handleRemoveDrill(drill.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={22} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Drill Form */}
            {showDrillForm && (
              <View style={[styles.drillForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.drillFormTitle, { color: colors.text }]}>New Drill</Text>
                
                {/* Drill Name */}
                <View style={styles.drillFormRow}>
                  <Text style={[styles.drillFormLabel, { color: colors.textMuted }]}>Name</Text>
                  <View style={[styles.drillInputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <BottomSheetTextInput
                      style={[styles.drillInput, { color: colors.text }]}
                      placeholder="e.g. 100m Grouping"
                      placeholderTextColor={colors.textMuted + 'CC'}
                      value={newDrill.name}
                      onChangeText={(text) => setNewDrill(prev => ({ ...prev, name: text }))}
                    />
                  </View>
                </View>

                {/* Target Type */}
                <View style={styles.drillFormRow}>
                  <Text style={[styles.drillFormLabel, { color: colors.textMuted }]}>Target Type</Text>
                  <View style={styles.targetTypeRow}>
                    {TARGET_TYPES.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.targetTypeOption,
                          { 
                            borderColor: newDrill.target_type === type.value ? colors.primary : colors.border,
                            backgroundColor: newDrill.target_type === type.value ? colors.primary + '10' : colors.background,
                          }
                        ]}
                        onPress={() => setNewDrill(prev => ({ ...prev, target_type: type.value }))}
                      >
                        <Ionicons 
                          name={type.icon} 
                          size={16} 
                          color={newDrill.target_type === type.value ? colors.primary : colors.textMuted} 
                        />
                        <Text style={[
                          styles.targetTypeText,
                          { color: newDrill.target_type === type.value ? colors.primary : colors.textMuted }
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Distance & Rounds */}
                <View style={styles.drillFormRowDouble}>
                  <View style={styles.drillFormHalf}>
                    <Text style={[styles.drillFormLabel, { color: colors.textMuted }]}>Distance (m)</Text>
                    <View style={[styles.drillInputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <BottomSheetTextInput
                        style={[styles.drillInput, { color: colors.text }]}
                        placeholder="100"
                        placeholderTextColor={colors.textMuted + 'CC'}
                        value={newDrill.distance_m?.toString()}
                        onChangeText={(text) => setNewDrill(prev => ({ ...prev, distance_m: parseInt(text) || 0 }))}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <View style={styles.drillFormHalf}>
                    <Text style={[styles.drillFormLabel, { color: colors.textMuted }]}>Rounds</Text>
                    <View style={[styles.drillInputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <BottomSheetTextInput
                        style={[styles.drillInput, { color: colors.text }]}
                        placeholder="10"
                        placeholderTextColor={colors.textMuted + 'CC'}
                        value={newDrill.rounds_per_shooter?.toString()}
                        onChangeText={(text) => setNewDrill(prev => ({ ...prev, rounds_per_shooter: parseInt(text) || 0 }))}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Drill Form Actions */}
                <View style={styles.drillFormActions}>
                  <TouchableOpacity
                    style={[styles.drillFormCancel, { borderColor: colors.border }]}
                    onPress={() => setShowDrillForm(false)}
                  >
                    <Text style={[styles.drillFormCancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.drillFormSubmit,
                      { backgroundColor: newDrill.name?.trim() ? colors.primary : colors.secondary }
                    ]}
                    onPress={handleAddDrill}
                    disabled={!newDrill.name?.trim()}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.drillFormSubmitText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {drills.length === 0 && !showDrillForm && (
              <View style={[styles.emptyDrills, { backgroundColor: colors.secondary }]}>
                <Ionicons name="list-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.emptyDrillsText, { color: colors.textMuted }]}>
                  Add drills to structure your training
                </Text>
              </View>
            )}
          </View>

          {/* Create Button */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: (!title.trim() || !selectedTeamId || submitting) 
                    ? colors.secondary 
                    : colors.primary,
                  shadowColor: (!title.trim() || !selectedTeamId || submitting) 
                    ? 'transparent' 
                    : colors.primary,
                }
              ]}
              onPress={handleCreate}
              disabled={!title.trim() || !selectedTeamId || submitting}
              activeOpacity={0.8}
            >
              <View style={styles.primaryButtonContent}>
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {submitting ? "Creating..." : "Schedule Training"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

CreateTrainingSheet.displayName = 'CreateTrainingSheet';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.1,
    opacity: 0.7,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },

  // Loading/Empty states
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Team Grid
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  teamOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Date/Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Section
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Drills List
  drillsList: {
    gap: 8,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  drillInfo: {
    flex: 1,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  drillIndex: {
    fontSize: 12,
    fontWeight: '600',
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  drillBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  drillMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeDrillButton: {
    padding: 4,
  },

  // Drill Form
  drillForm: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  drillFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  drillFormRow: {
    marginBottom: 12,
  },
  drillFormRowDouble: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  drillFormHalf: {
    flex: 1,
  },
  drillFormLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  drillInputWrapper: {
    borderRadius: 8,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  drillInput: {
    height: 38,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
  },

  // Target Type
  targetTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Drill Form Actions
  drillFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  drillFormCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  drillFormCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  drillFormSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  drillFormSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty Drills
  emptyDrills: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    gap: 8,
  },
  emptyDrillsText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  primaryButton: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: '#fff',
    letterSpacing: -0.2,
  },
});

