/**
 * TrainingDetailsStep - Minimal, clean training setup
 * 
 * Only ask what's necessary:
 * - Team (if multiple)
 * - Name
 * - Schedule (collapsed by default - most trainings start manually)
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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
  const [showSchedule, setShowSchedule] = useState(!manualStart);

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

  const handleToggleSchedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSchedule(!showSchedule);
    if (showSchedule) {
      // Collapsing = switching to manual start
      onToggleManualStart();
    }
  };

  // Auto-select single team
  const effectiveTeam = teams.length === 1 ? teams[0] : selectedTeam;
  const showTeamSelector = teams.length > 1 && !isTeamLocked;

  return (
    <View style={styles.container}>
      {/* Training Name - Primary focus */}
      <View style={styles.nameSection}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Training Name</Text>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.card,
              borderColor: title.trim() ? colors.text : colors.border,
              color: colors.text,
            },
          ]}
          placeholder="e.g. Morning Accuracy"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={onTitleChange}
          autoCapitalize="words"
          autoFocus
        />
      </View>

      {/* Team Selection (only if multiple teams) */}
      {showTeamSelector ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Team</Text>
          <View style={styles.teamGrid}>
            {teams.map(team => {
              const isSelected = selectedTeamId === team.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamChip,
                    {
                      backgroundColor: isSelected ? colors.text : colors.card,
                      borderColor: isSelected ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectTeam(team.id);
                  }}
                  activeOpacity={0.7}
                >
                  {isSelected && <Check size={14} color={colors.background} strokeWidth={2.5} />}
                  <Text
                    style={[
                      styles.teamChipText,
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
        </View>
      ) : effectiveTeam ? (
        <View style={styles.teamBadge}>
          <Users size={14} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.teamBadgeText, { color: colors.textMuted }]}>
            {effectiveTeam.name}
          </Text>
        </View>
      ) : null}

      {/* Schedule - Collapsed by default */}
      <View style={[styles.scheduleSection, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.scheduleHeader}
          onPress={handleToggleSchedule}
          activeOpacity={0.7}
        >
          <View style={styles.scheduleHeaderLeft}>
            <Calendar size={16} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.scheduleHeaderText, { color: colors.text }]}>
              {showSchedule ? `${formatDate(scheduledDate)} at ${formatTime(scheduledDate)}` : 'Start when ready'}
            </Text>
          </View>
          <ChevronDown 
            size={18} 
            color={colors.textMuted} 
            style={{ transform: [{ rotate: showSchedule ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {showSchedule && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.scheduleContent}>
            <View style={styles.scheduleRow}>
              <TouchableOpacity
                style={[styles.scheduleBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenDatePicker();
                }}
                activeOpacity={0.7}
              >
                <Calendar size={16} color={colors.text} strokeWidth={1.5} />
                <Text style={[styles.scheduleBtnText, { color: colors.text }]}>
                  {formatDate(scheduledDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scheduleBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenTimePicker();
                }}
                activeOpacity={0.7}
              >
                <Clock size={16} color={colors.text} strokeWidth={1.5} />
                <Text style={[styles.scheduleBtnText, { color: colors.text }]}>
                  {formatTime(scheduledDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // Name
  nameSection: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '500',
  },

  // Team
  section: {
    gap: 10,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  teamChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Schedule
  scheduleSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleHeaderText: {
    fontSize: 15,
    fontWeight: '500',
  },
  scheduleContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
