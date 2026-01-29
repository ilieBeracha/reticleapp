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
import { Calendar, Check, ChevronDown, Clock, Lock, UserCheck, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      {/* Training Name - Primary focus */}
      <View style={styles.nameSection}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('training.trainingName')}</Text>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.card,
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

      {/* Team Selection (only if multiple teams) */}
      {showTeamSelector ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('navigation.team')}</Text>
          <View style={styles.teamGrid}>
            {teams.map((team) => {
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
                    style={[styles.teamChipText, { color: isSelected ? colors.background : colors.text }]}
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
          <Text style={[styles.teamBadgeText, { color: colors.textMuted }]}>{effectiveTeam.name}</Text>
        </View>
      ) : null}

      {/* Participants - Who should attend */}
      {hasTeam && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('training.participants', 'PARTICIPANTS')}</Text>

          {/* Mode toggle: Entire Team vs Select Members */}
          <View style={styles.participantToggle}>
            <TouchableOpacity
              style={[
                styles.participantOption,
                {
                  backgroundColor: participantMode === 'all' ? colors.text : colors.card,
                  borderColor: participantMode === 'all' ? colors.text : colors.border,
                },
              ]}
              onPress={() => onSetParticipantMode('all')}
              activeOpacity={0.7}
            >
              <Users
                size={15}
                color={participantMode === 'all' ? colors.background : colors.textMuted}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  styles.participantOptionText,
                  { color: participantMode === 'all' ? colors.background : colors.text },
                ]}
              >
                {t('training.entireTeam', 'Entire Team')}
              </Text>
              {participantMode === 'all' && members.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: `${colors.background}30` }]}>
                  <Text style={[styles.countBadgeText, { color: colors.background }]}>{members.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.participantOption,
                {
                  backgroundColor: participantMode === 'select' ? colors.text : colors.card,
                  borderColor: participantMode === 'select' ? colors.text : colors.border,
                },
              ]}
              onPress={() => onSetParticipantMode('select')}
              activeOpacity={0.7}
            >
              <UserCheck
                size={15}
                color={participantMode === 'select' ? colors.background : colors.textMuted}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  styles.participantOptionText,
                  { color: participantMode === 'select' ? colors.background : colors.text },
                ]}
              >
                {t('training.selectMembers', 'Select Members')}
              </Text>
              {participantMode === 'select' && selectedMemberIds.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: `${colors.background}30` }]}>
                  <Text style={[styles.countBadgeText, { color: colors.background }]}>{selectedMemberIds.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Member list (when selecting specific members) */}
          {participantMode === 'select' && (
            <Animated.View entering={FadeIn.duration(150)} style={styles.memberList}>
              {loadingMembers ? (
                <View style={styles.memberLoading}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
              ) : members.length === 0 ? (
                <Text style={[styles.memberEmptyText, { color: colors.textMuted }]}>
                  {t('training.noMembersFound', 'No team members found')}
                </Text>
              ) : (
                sortedMembers.map((member) => {
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
                          backgroundColor: isRequired
                            ? `${colors.primary}08`
                            : isSelected
                              ? `${colors.text}08`
                              : 'transparent',
                          borderColor: isRequired
                            ? `${colors.primary}30`
                            : isSelected
                              ? `${colors.text}20`
                              : colors.border,
                        },
                      ]}
                      onPress={() => onToggleMember(member.user_id)}
                      activeOpacity={isRequired ? 1 : 0.7}
                      disabled={isRequired}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: isRequired ? `${colors.primary}15` : colors.secondary,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Check size={14} color={isRequired ? colors.primary : colors.text} strokeWidth={2.5} />
                        ) : (
                          <Text style={[styles.memberInitials, { color: colors.textMuted }]}>{initials}</Text>
                        )}
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
                        </View>
                        <View style={styles.memberRoleRow}>
                          {member.role?.role && (
                            <Text style={[styles.memberRole, { color: colors.textMuted }]}>{member.role.role}</Text>
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
                      </View>

                      <View
                        style={[
                          styles.memberCheckbox,
                          {
                            backgroundColor: isSelected ? (isRequired ? colors.primary : colors.text) : 'transparent',
                            borderColor: isSelected ? (isRequired ? colors.primary : colors.text) : colors.border,
                          },
                        ]}
                      >
                        {isSelected &&
                          (isRequired ? (
                            <Lock size={9} color={colors.background} strokeWidth={3} />
                          ) : (
                            <Check size={10} color={colors.background} strokeWidth={3} />
                          ))}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Only show hint if no members are selected at all (not counting required) */}
              {participantMode === 'select' &&
                members.length > 0 &&
                selectedMemberIds.length === 0 &&
                requiredMemberIds.length === 0 && (
                  <Text style={[styles.memberHint, { color: colors.textMuted }]}>
                    {t('training.selectAtLeastOne', 'Select at least one member')}
                  </Text>
                )}
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* Schedule - Collapsed by default */}
      <View style={[styles.scheduleSection, { borderColor: colors.border }]}>
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
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },

  // Name
  nameSection: {
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nameInput: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Team
  section: {
    gap: 12,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  teamChipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
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

  // Participants
  participantToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  participantOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  participantOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Member list
  memberList: {
    gap: 6,
  },
  memberLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  memberEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  memberCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  memberHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 8,
  },

  // Schedule
  scheduleSection: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  scheduleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
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
    gap: 10,
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
