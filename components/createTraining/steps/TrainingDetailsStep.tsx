/**
 * TrainingDetailsStep - Professional, question-driven training details form
 * 
 * Step 1 of training creation: Team, name, schedule
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Hand,
  Info,
  Users,
} from 'lucide-react-native';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface Team {
  id: string;
  name: string;
}

interface TrainingDetailsStepProps {
  teams: Team[];
  selectedTeamId: string | null;
  isTeamLocked: boolean;
  title: string;
  scheduledDate: Date;
  manualStart: boolean;
  onSelectTeam: (teamId: string) => void;
  onTitleChange: (title: string) => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onToggleManualStart: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TrainingDetailsStep({
  teams,
  selectedTeamId,
  isTeamLocked,
  title,
  scheduledDate,
  manualStart,
  onSelectTeam,
  onTitleChange,
  onOpenDatePicker,
  onOpenTimePicker,
  onToggleManualStart,
}: TrainingDetailsStepProps) {
  const colors = useColors();
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <View style={styles.container}>
      {/* Question 1: Team */}
      <View style={styles.section}>
        <View style={styles.questionHeader}>
          <View style={[styles.questionIcon, { backgroundColor: colors.card }]}>
            <Users size={16} color={colors.text} strokeWidth={1.5} />
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>
            Who is this training for?
          </Text>
        </View>

        {isTeamLocked && selectedTeam ? (
          <View style={[styles.lockedTeam, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.teamIcon, { backgroundColor: colors.text }]}>
              <Users size={14} color={colors.background} strokeWidth={1.5} />
            </View>
            <Text style={[styles.teamName, { color: colors.text }]}>{selectedTeam.name}</Text>
            <View style={[styles.lockedBadge, { backgroundColor: colors.secondary }]}>
              <Check size={12} color={colors.text} strokeWidth={2} />
            </View>
          </View>
        ) : teams.length === 1 ? (
          <View style={[styles.lockedTeam, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.teamIcon, { backgroundColor: colors.text }]}>
              <Users size={14} color={colors.background} strokeWidth={1.5} />
            </View>
            <Text style={[styles.teamName, { color: colors.text }]}>{teams[0].name}</Text>
          </View>
        ) : (
          <View style={styles.teamOptions}>
            {teams.map(team => {
              const isSelected = selectedTeamId === team.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    {
                      backgroundColor: isSelected ? colors.text : 'transparent',
                      borderColor: isSelected ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectTeam(team.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.teamOptionText,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {team.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!selectedTeamId && teams.length > 1 && (
          <View style={[styles.hint, { backgroundColor: `${colors.orange}15` }]}>
            <Info size={12} color={colors.orange} />
            <Text style={[styles.hintText, { color: colors.orange }]}>
              Select a team to see their drills
            </Text>
          </View>
        )}
      </View>

      {/* Question 2: Name */}
      <View style={styles.section}>
        <View style={styles.questionHeader}>
          <View style={[styles.questionIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="text" size={16} color={colors.text} />
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>
            What is this training called?
          </Text>
        </View>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.card,
              borderColor: title.trim() ? colors.text : colors.border,
              color: colors.text,
            },
          ]}
          placeholder="e.g. Morning Accuracy Drill"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={onTitleChange}
          autoCapitalize="words"
        />
      </View>

      {/* Question 3: Schedule */}
      <View style={styles.section}>
        <View style={styles.questionHeader}>
          <View style={[styles.questionIcon, { backgroundColor: colors.card }]}>
            <Calendar size={16} color={colors.text} strokeWidth={1.5} />
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>
            When does it happen?
          </Text>
        </View>

        <View style={styles.scheduleRow}>
          <TouchableOpacity
            style={[styles.scheduleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenDatePicker();
            }}
            activeOpacity={0.7}
          >
            <Calendar size={16} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.scheduleBtnText, { color: colors.text }]}>
              {formatDate(scheduledDate)}
            </Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </TouchableOpacity>

          {!manualStart && (
            <TouchableOpacity
              style={[styles.scheduleBtn, styles.timeBtn, { backgroundColor: colors.card, borderColor: colors.text }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenTimePicker();
              }}
              activeOpacity={0.7}
            >
              <Clock size={16} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.scheduleBtnText, { color: colors.text }]}>
                {formatTime(scheduledDate)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manual Start Toggle */}
        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleManualStart();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleIcon, { backgroundColor: manualStart ? colors.text : colors.secondary }]}>
            <Hand size={14} color={manualStart ? colors.background : colors.textMuted} strokeWidth={1.5} />
          </View>
          <View style={styles.toggleContent}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Manual Start</Text>
            <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
              {manualStart ? 'Start when you\'re ready' : 'Starts at scheduled time'}
            </Text>
          </View>
          <View style={[styles.switch, { backgroundColor: manualStart ? colors.text : colors.secondary }]}>
            <View style={[styles.switchThumb, manualStart && styles.switchThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 28,
  },
  section: {
    gap: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Team
  lockedTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  teamIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  lockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  teamOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Name
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  timeBtn: {
    flex: 0,
    minWidth: 100,
  },
  scheduleBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  // Toggle
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    marginLeft: 'auto',
  },
});

