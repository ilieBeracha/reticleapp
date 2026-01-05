/**
 * TRAINING DETAILS STEP - Premium Design
 *
 * Step 1: Team selection, name, schedule with beautiful visual hierarchy
 */

import { useColors } from '@/hooks/ui/useColors';
import type { Team } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Hand,
  LayoutList,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react-native';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// ============================================================================
// TYPES
// ============================================================================

interface TrainingDetailsStepProps {
  teams: Team[];
  selectedTeamId: string | null;
  isTeamLocked: boolean;
  title: string;
  scheduledDate: Date;
  manualStart: boolean;
  teamDrillsCount?: number;
  onSelectTeam: (teamId: string) => void;
  onTitleChange: (title: string) => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onToggleManualStart: () => void;
  onViewDrillLibrary?: () => void;
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
  teamDrillsCount = 0,
  onSelectTeam,
  onTitleChange,
  onOpenDatePicker,
  onOpenTimePicker,
  onToggleManualStart,
  onViewDrillLibrary,
}: TrainingDetailsStepProps) {
  const colors = useColors();
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <View style={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════════
          TEAM SELECTION
      ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.purple}15` }]}>
            <Users size={14} color={colors.purple} strokeWidth={2} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Team</Text>
        </View>
        
        {isTeamLocked && selectedTeam ? (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={[styles.teamCard, styles.teamCardSelected, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.teamAvatar, { backgroundColor: `${colors.text}10` }]}>
              <Text style={[styles.teamInitial, { color: colors.text }]}>{selectedTeam.name[0]}</Text>
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.text }]}>{selectedTeam.name}</Text>
              <Text style={[styles.teamMeta, { color: colors.textMuted }]}>Selected for training</Text>
            </View>
            <View style={[styles.checkBadge, { backgroundColor: colors.text }]}>
              <Check size={12} color={colors.background} strokeWidth={3} />
            </View>
          </Animated.View>
        ) : teams.length === 1 ? (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={[styles.teamCard, styles.teamCardSelected, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.teamAvatar, { backgroundColor: `${colors.text}10` }]}>
              <Text style={[styles.teamInitial, { color: colors.text }]}>{teams[0].name[0]}</Text>
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.text }]}>{teams[0].name}</Text>
              <Text style={[styles.teamMeta, { color: colors.textMuted }]}>Your only team</Text>
            </View>
            <View style={[styles.checkBadge, { backgroundColor: colors.text }]}>
              <Check size={12} color={colors.background} strokeWidth={3} />
            </View>
          </Animated.View>
        ) : (
          <View style={styles.teamGrid}>
            {teams.map((team, index) => {
              const isSelected = team.id === selectedTeamId;
              return (
                <Animated.View key={team.id} entering={FadeInDown.delay(index * 50).duration(300)}>
                  <TouchableOpacity
                    style={[
                      styles.teamCard,
                      isSelected && styles.teamCardSelected,
                      { backgroundColor: colors.card, borderColor: isSelected ? colors.text : colors.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelectTeam(team.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.teamAvatar, { backgroundColor: `${colors.text}10` }]}>
                      <Text style={[styles.teamInitial, { color: colors.text }]}>{team.name[0]}</Text>
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                      <Text style={[styles.teamMeta, { color: colors.textMuted }]}>
                        {team.member_count ?? '-'} members
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkBadge, { backgroundColor: colors.text }]}>
                        <Check size={12} color={colors.background} strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={[styles.radioOuter, { borderColor: colors.border }]} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          TRAINING NAME
      ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.orange}15` }]}>
            <Sparkles size={14} color={colors.orange} strokeWidth={2} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Training Name</Text>
          <Text style={[styles.sectionOptional, { color: colors.textMuted }]}>Optional</Text>
        </View>
        
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.card,
              borderColor: title.trim() ? colors.border : 'transparent',
              color: colors.text,
            },
          ]}
          placeholder="e.g. Morning Accuracy Drill, CQB Practice..."
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={onTitleChange}
          autoCapitalize="words"
        />
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          SCHEDULE
      ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.delay(150).duration(300)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.green}15` }]}>
            <Calendar size={14} color={colors.green} strokeWidth={2} />
          </View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Schedule</Text>
        </View>
        
        <View style={styles.scheduleRow}>
          {/* Date */}
          <TouchableOpacity
            style={[styles.scheduleCard, styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenDatePicker();
            }}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={colors.text} strokeWidth={1.5} />
            <Text style={[styles.scheduleValue, { color: colors.text }]}>
              {formatDate(scheduledDate)}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Time - only if not manual start */}
          {!manualStart && (
            <TouchableOpacity
              style={[styles.scheduleCard, styles.timeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenTimePicker();
              }}
              activeOpacity={0.7}
            >
              <Clock size={18} color={colors.text} strokeWidth={1.5} />
              <Text style={[styles.scheduleValue, { color: colors.text }]}>
                {formatTime(scheduledDate)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manual Start Option */}
        <TouchableOpacity
          style={[
            styles.manualToggle,
            manualStart && styles.manualToggleActive,
            { 
              backgroundColor: manualStart ? `${colors.text}08` : 'transparent', 
              borderColor: manualStart ? colors.text : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleManualStart();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.manualIcon, { backgroundColor: manualStart ? `${colors.text}15` : `${colors.textMuted}10` }]}>
            <Hand size={16} color={manualStart ? colors.text : colors.textMuted} strokeWidth={1.5} />
          </View>
          <View style={styles.manualContent}>
            <Text style={[styles.manualTitle, { color: manualStart ? colors.text : colors.textMuted }]}>
              Manual Start
            </Text>
            <Text style={[styles.manualDesc, { color: colors.textMuted }]}>
              Start when ready, no fixed time
            </Text>
          </View>
          {manualStart && (
            <View style={[styles.checkBadge, { backgroundColor: colors.text }]}>
              <Check size={12} color={colors.background} strokeWidth={3} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════
          DRILL LIBRARY SHORTCUT
      ═══════════════════════════════════════════════════════════════════ */}
      {onViewDrillLibrary && selectedTeamId && (
        <Animated.View entering={FadeIn.delay(200).duration(300)}>
          <TouchableOpacity 
            style={[styles.libraryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onViewDrillLibrary();
            }} 
            activeOpacity={0.7}
          >
            <View style={[styles.libraryIcon, { backgroundColor: `${colors.blue}15` }]}>
              <LayoutList size={18} color={colors.blue} strokeWidth={1.5} />
            </View>
            <View style={styles.libraryContent}>
              <Text style={[styles.libraryTitle, { color: colors.text }]}>
                Browse Drill Library
              </Text>
              <Text style={[styles.libraryMeta, { color: colors.textMuted }]}>
                {teamDrillsCount > 0 
                  ? `${teamDrillsCount} drill${teamDrillsCount !== 1 ? 's' : ''} available`
                  : 'Create new drills for your team'
                }
              </Text>
            </View>
            <ArrowRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 32,
  },

  // Section Header
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  sectionOptional: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Team Cards
  teamGrid: {
    gap: 12,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 16,
  },
  teamCardSelected: {
    borderWidth: 2,
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInitial: {
    fontSize: 19,
    fontWeight: '700',
  },
  teamInfo: {
    flex: 1,
    gap: 3,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  teamMeta: {
    fontSize: 13,
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },

  // Name Input
  nameInput: {
    height: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    fontSize: 16,
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateCard: {
    flex: 1,
  },
  timeCard: {},
  scheduleValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  // Manual Toggle
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 16,
  },
  manualToggleActive: {
    borderWidth: 2,
  },
  manualIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualContent: {
    flex: 1,
    gap: 4,
  },
  manualTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  manualDesc: {
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Library Card
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    marginTop: 8,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryContent: {
    flex: 1,
    gap: 4,
  },
  libraryTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  libraryMeta: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
