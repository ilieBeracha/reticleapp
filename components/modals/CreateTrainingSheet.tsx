import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useWorkspacePermissions } from "@/hooks/usePermissions";
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
  id: string;
}

// Quick drill presets for common training scenarios
const DRILL_PRESETS = [
  { name: 'Grouping Drill', distance: 100, rounds: 5, type: 'paper' as TargetType },
  { name: 'Rapid Fire', distance: 25, rounds: 10, type: 'tactical' as TargetType },
  { name: 'Precision', distance: 200, rounds: 3, type: 'paper' as TargetType },
];

export const CreateTrainingSheet = forwardRef<BaseBottomSheetRef, CreateTrainingSheetProps>(
  ({ onTrainingCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId } = useAppContext();
    const permissions = useWorkspacePermissions();
    
    // Check if we're in org mode based on activeWorkspaceId
    const isInOrgMode = !!activeWorkspaceId;
    
    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scheduledDate, setScheduledDate] = useState(() => {
      // Default to tomorrow at 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [drills, setDrills] = useState<DrillFormData[]>([]);
    const [showDrillSection, setShowDrillSection] = useState(false);
    
    // Data state
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Check if user can create trainings (owner/admin/instructor)
    const canCreateTraining = permissions.canCreateTraining;
    
    // Admin-level users see ALL teams, commanders only see their teams
    // For now, since we're outside OrgRoleProvider, we show all teams
    // to admin-level users and let the backend handle permissions
    const availableTeams = useMemo(() => {
      // If user can create trainings (owner/admin/instructor), show all teams
      return teams;
    }, [teams]);

    // Fetch teams when sheet opens
    useEffect(() => {
      if (activeWorkspaceId && isInOrgMode) {
        fetchTeams();
      }
    }, [activeWorkspaceId, isInOrgMode]);

    // Auto-select team if only one available
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

    const handleAddPresetDrill = useCallback((preset: typeof DRILL_PRESETS[0]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDrills(prev => [...prev, {
        id: Date.now().toString(),
        name: preset.name,
        target_type: preset.type,
        distance_m: preset.distance,
        rounds_per_shooter: preset.rounds,
      }]);
    }, []);

    const handleRemoveDrill = useCallback((drillId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDrills(prev => prev.filter(d => d.id !== drillId));
    }, []);

    const handleCreate = async () => {
      if (!title.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Missing Title', 'Please enter a name for this training');
        return;
      }

      if (!selectedTeamId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Select Team', 'Please select which team will attend');
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
        
        if (typeof ref === 'object' && ref?.current) {
          ref.current.close();
        }

        resetForm();
        onTrainingCreated?.();

        setTimeout(() => {
          Alert.alert('✓ Training Scheduled', `"${title}" has been added to the calendar`);
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
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledDate(tomorrow);
      setSelectedTeamId(availableTeams.length === 1 ? availableTeams[0].id : null);
      setDrills([]);
      setShowDrillSection(false);
    };

    const formatDateDisplay = (date: Date) => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatTimeDisplay = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    // Not in org mode - show message
    if (!isInOrgMode) {
      return (
        <BaseBottomSheet ref={ref} snapPoints={['40%']}>
          <View style={styles.notAvailable}>
            <View style={[styles.notAvailableIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="business-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.notAvailableTitle, { color: colors.text }]}>
              Organization Required
            </Text>
            <Text style={[styles.notAvailableText, { color: colors.textMuted }]}>
              Switch to an organization workspace to schedule trainings
            </Text>
          </View>
        </BaseBottomSheet>
      );
    }

    return (
      <BaseBottomSheet ref={ref} snapPoints={['85%']} backdropOpacity={0.5}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Schedule Training
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Create a training session for your team
            </Text>
          </View>

          {/* Training Name - Simple and prominent */}
          <View style={styles.section}>
            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BottomSheetTextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder="Training name..."
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                autoFocus={false}
              />
            </View>
          </View>

          {/* Team Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM</Text>
            {loadingTeams ? (
              <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading teams...</Text>
              </View>
            ) : availableTeams.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {canCreateTraining ? "No teams found" : "No teams you command"}
                </Text>
              </View>
            ) : (
              <View style={styles.teamList}>
                {availableTeams.map(team => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamChip,
                        { 
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTeamId(team.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name="people" 
                        size={16} 
                        color={isSelected ? '#fff' : colors.textMuted} 
                      />
                      <Text style={[
                        styles.teamChipText,
                        { color: isSelected ? '#fff' : colors.text }
                      ]}>
                        {team.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Date & Time - Compact row */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WHEN</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={18} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatDateDisplay(scheduledDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dateTimeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time" size={18} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {formatTimeDisplay(scheduledDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  const newDate = new Date(scheduledDate);
                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setScheduledDate(newDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) {
                  const newDate = new Date(scheduledDate);
                  newDate.setHours(date.getHours(), date.getMinutes());
                  setScheduledDate(newDate);
                }
              }}
            />
          )}

          {/* Description - Optional, collapsed by default */}
          <View style={styles.section}>
            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BottomSheetTextInput
                style={[styles.descInput, { color: colors.text }]}
                placeholder="Notes (optional)..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Drills - Expandable */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.drillsHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDrillSection(!showDrillSection);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.drillsHeaderLeft}>
                <Ionicons name="list" size={18} color={colors.primary} />
                <Text style={[styles.drillsHeaderText, { color: colors.text }]}>
                  Drills
                </Text>
                {drills.length > 0 && (
                  <View style={[styles.drillCount, { backgroundColor: colors.primary }]}>
                    <Text style={styles.drillCountText}>{drills.length}</Text>
                  </View>
                )}
              </View>
              <Ionicons 
                name={showDrillSection ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textMuted} 
              />
            </TouchableOpacity>

            {showDrillSection && (
              <View style={styles.drillsContent}>
                {/* Added drills */}
                {drills.length > 0 && (
                  <View style={styles.drillList}>
                    {drills.map((drill, idx) => (
                      <View 
                        key={drill.id} 
                        style={[styles.drillItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={styles.drillItemInfo}>
                          <Text style={[styles.drillItemName, { color: colors.text }]}>
                            {idx + 1}. {drill.name}
                          </Text>
                          <Text style={[styles.drillItemMeta, { color: colors.textMuted }]}>
                            {drill.distance_m}m • {drill.rounds_per_shooter} rds • {drill.target_type}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveDrill(drill.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={22} color={colors.red} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick add presets */}
                <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>
                  Quick Add
                </Text>
                <View style={styles.presetRow}>
                  {DRILL_PRESETS.map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.presetChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      onPress={() => handleAddPresetDrill(preset)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={14} color={colors.primary} />
                      <Text style={[styles.presetChipText, { color: colors.text }]}>
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.drillHint, { color: colors.textMuted }]}>
                  You can add more drills after creating the training
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: (!title.trim() || !selectedTeamId || submitting) 
                    ? colors.secondary 
                    : colors.primary,
                }
              ]}
              onPress={handleCreate}
              disabled={!title.trim() || !selectedTeamId || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <Text style={styles.submitButtonText}>Creating...</Text>
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Schedule Training</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
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
    paddingBottom: 20,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Input boxes
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleInput: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '500',
  },
  descInput: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  // Team list
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  teamChipText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Date/Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading/Empty
  loadingBox: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
  },

  // Drills
  drillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  drillsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  drillCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  drillCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  drillsContent: {
    marginTop: 8,
  },
  drillList: {
    gap: 8,
    marginBottom: 16,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  drillItemInfo: {
    flex: 1,
    gap: 2,
  },
  drillItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  drillItemMeta: {
    fontSize: 13,
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  drillHint: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Submit
  submitSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 10,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },

  // Not available state
  notAvailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  notAvailableIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notAvailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  notAvailableText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
