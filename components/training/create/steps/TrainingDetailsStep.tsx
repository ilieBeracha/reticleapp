/**
 * TrainingDetailsStep - Training setup with participant selection
 *
 * Sections:
 * - Name (primary focus, auto-focused)
 * - Team (chips if multiple, badge if single)
 * - Participants (entire team toggle or member picker)
 * - Schedule (collapsed by default — most trainings start manually)
 */

import { useColors } from '@/hooks/ui/useColors';
import type { ParticipantMode } from '@/types/createTraining';
import type { TeamMemberWithProfile } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Calendar, Check, ChevronDown, Clock, Lock, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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
  // Participants
  participantMode: ParticipantMode;
  selectedMemberIds: string[];
  members: TeamMemberWithProfile[];
  loadingMembers: boolean;
  requiredMemberIds: string[];
  currentUserId: string | undefined;
  // Callbacks
  onSelectTeam: (teamId: string) => void;
  onTitleChange: (title: string) => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onToggleManualStart: () => void;
  onSetParticipantMode: (mode: ParticipantMode) => void;
  onToggleMember: (userId: string) => void;
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
  participantMode,
  selectedMemberIds,
  members,
  loadingMembers,
  requiredMemberIds,
  currentUserId,
  onSelectTeam,
  onTitleChange,
  onOpenDatePicker,
  onOpenTimePicker,
  onToggleManualStart,
  onSetParticipantMode,
  onToggleMember,
}: TrainingDetailsStepProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const [showSchedule, setShowSchedule] = useState(!manualStart);

  // Sort members: required first, then alphabetically by name
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aRequired = requiredMemberIds.includes(a.user_id);
      const bRequired = requiredMemberIds.includes(b.user_id);
      // Required members first
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      // Then alphabetically by name
      const aName = a.profile?.full_name || a.profile?.email || '';
      const bName = b.profile?.full_name || b.profile?.email || '';
      return aName.localeCompare(bName);
    });
  }, [members, requiredMemberIds]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return t('common.today');
    if (date.toDateString() === tomorrow.toDateString()) return t('common.tomorrow');

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
  const hasTeam = !!selectedTeamId;

  return (
    <View style={styles.container}>
      {/* ── Section: Basic Info ── */}
      <View style={styles.formSection}>
        <Text style={[styles.formSectionLabel, { color: colors.textMuted }]}>
          {t('training.basicInfo', 'BASIC INFO')}
        </Text>
        <View style={[styles.formSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('training.trainingName')}</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.background,
                  borderColor: title.trim() ? colors.text : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('training.trainingNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={onTitleChange}
              autoCapitalize="words"
              autoFocus
            />
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('training.trainingDescription')}</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
              ]}
              placeholder={t('training.trainingDescriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* ── Section: Participants ── */}
      {hasTeam && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.formSection}>
          <Text style={[styles.formSectionLabel, { color: colors.textMuted }]}>
            {t('training.participants', 'PARTICIPANTS')}
          </Text>
          <View style={[styles.formSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Entire Team toggle row */}
            <TouchableOpacity
              style={styles.entireTeamRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSetParticipantMode(participantMode === 'all' ? 'select' : 'all');
              }}
              activeOpacity={0.7}
            >
              <Users size={18} color={colors.text} strokeWidth={1.5} />
              <View style={styles.entireTeamContent}>
                <Text style={[styles.entireTeamTitle, { color: colors.text }]}>
                  {t('training.entireTeam', 'Entire Team')}
                </Text>
                <Text style={[styles.entireTeamSubtitle, { color: colors.textMuted }]}>
                  {t('training.allMembersIncluded', '{{count}} members included', { count: members.length })}
                </Text>
              </View>
              <View
                style={[
                  styles.entireTeamCheck,
                  {
                    backgroundColor: participantMode === 'all' ? colors.text : 'transparent',
                    borderColor: participantMode === 'all' ? colors.text : colors.border,
                  },
                ]}
              >
                {participantMode === 'all' && <Check size={12} color={colors.background} strokeWidth={3} />}
              </View>
            </TouchableOpacity>

            {/* Inline member list when in select mode */}
            {participantMode === 'select' && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />

                {/* Selection summary */}
                <Text style={[styles.selectionSummary, { color: colors.textMuted }]}>
                  {selectedMemberIds.length === 0
                    ? t('training.selectAtLeastOne', 'Select at least one member')
                    : t('training.xOfYMembers', '{{selected}} of {{total}} members', {
                        selected: selectedMemberIds.length,
                        total: members.length,
                      })}
                </Text>

                {loadingMembers ? (
                  <View style={styles.memberLoading}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  </View>
                ) : (
                  <View style={styles.memberList}>
                    {sortedMembers.map((member) => {
                      const isSelected = selectedMemberIds.includes(member.user_id);
                      const isRequired = requiredMemberIds.includes(member.user_id);
                      const isCurrentUser = member.user_id === currentUserId;
                      const displayName = member.profile?.full_name || member.profile?.email || 'Unknown';
                      const initials = (member.profile?.full_name || '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <TouchableOpacity
                          key={member.user_id}
                          style={[
                            styles.memberRow,
                            {
                              backgroundColor: isSelected ? `${colors.text}06` : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onToggleMember(member.user_id);
                          }}
                          activeOpacity={isRequired ? 1 : 0.7}
                          disabled={isRequired}
                        >
                          <View style={[styles.memberAvatar, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.memberInitials, { color: colors.textMuted }]}>{initials}</Text>
                          </View>

                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                                {displayName}
                              </Text>
                              {isCurrentUser && (
                                <Text style={[styles.youBadge, { color: colors.primary }]}>
                                  {t('training.you', '(You)')}
                                </Text>
                              )}
                              {isRequired && (
                                <View style={[styles.requiredBadge, { backgroundColor: `${colors.primary}15` }]}>
                                  <Lock size={9} color={colors.primary} strokeWidth={2.5} />
                                  <Text style={[styles.requiredBadgeText, { color: colors.primary }]}>
                                    {t('training.required', 'Required')}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {member.role?.role && (
                              <Text style={[styles.memberRole, { color: colors.textMuted }]}>{member.role.role}</Text>
                            )}
                          </View>

                          <View
                            style={[
                              styles.memberCheckbox,
                              {
                                backgroundColor: isSelected ? colors.text : 'transparent',
                                borderColor: isSelected ? colors.text : colors.border,
                              },
                            ]}
                          >
                            {isSelected && <Check size={10} color={colors.background} strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Section: Schedule ── */}
      <View style={styles.formSection}>
        <Text style={[styles.formSectionLabel, { color: colors.textMuted }]}>
          {t('training.schedule', 'SCHEDULE')}
        </Text>
        <View style={[styles.formSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.scheduleHeader} onPress={handleToggleSchedule} activeOpacity={0.7}>
            <View style={styles.scheduleHeaderLeft}>
              <Calendar size={16} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.scheduleHeaderText, { color: colors.text }]}>
                {showSchedule
                  ? t('training.scheduledAt', { date: formatDate(scheduledDate), time: formatTime(scheduledDate) })
                  : t('training.startWhenReady')}
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
              <View style={[styles.fieldDivider, { backgroundColor: colors.border, marginBottom: 14 }]} />
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
                  <Text style={[styles.scheduleBtnText, { color: colors.text }]}>{formatDate(scheduledDate)}</Text>
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
                  <Text style={[styles.scheduleBtnText, { color: colors.text }]}>{formatTime(scheduledDate)}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },

  // Form Section Pattern
  formSection: {
    gap: 8,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  formSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },

  // Fields within a card
  formField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  fieldDivider: {
    height: 1,
    marginVertical: 14,
  },
  nameInput: {
    height: 46,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Participants – Entire Team toggle
  entireTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entireTeamContent: {
    flex: 1,
    gap: 2,
  },
  entireTeamTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  entireTeamSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  entireTeamCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Participants – Inline member list
  selectionSummary: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  memberList: {
    gap: 2,
  },
  memberLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  // Schedule (inside card)
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleHeaderText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  scheduleContent: {},
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Inline member rows
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  youBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  memberCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
