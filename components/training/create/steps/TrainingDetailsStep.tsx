/**
 * TrainingDetailsStep - Minimal, clean training setup
 *
 * Only ask what's necessary:
 * - Team (if multiple)
 * - Name
 * - Location (מיקום)
 * - Training Type (סוג אימון)
 * - Sub-types (תת סוג)
 * - Schedule (collapsed by default - most trainings start manually)
 */

import { useColors } from '@/hooks/ui/useColors';
import { SUB_TYPES, TRAINING_TYPES, type SubType, type TrainingType } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Calendar, Check, ChevronDown, Clock, MapPin, Target, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  // Hebrew military format fields (only for sniper-oriented teams)
  isSniperOriented: boolean;
  location: string;
  trainingType: TrainingType | null;
  subTypes: SubType[];
  onSelectTeam: (teamId: string) => void;
  onTitleChange: (title: string) => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onToggleManualStart: () => void;
  onLocationChange: (location: string) => void;
  onTrainingTypeChange: (type: TrainingType | null) => void;
  onSubTypesChange: (subTypes: SubType[]) => void;
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
  isSniperOriented,
  location,
  trainingType,
  subTypes,
  onSelectTeam,
  onTitleChange,
  onOpenDatePicker,
  onOpenTimePicker,
  onToggleManualStart,
  onLocationChange,
  onTrainingTypeChange,
  onSubTypesChange,
}: TrainingDetailsStepProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const [showSchedule, setShowSchedule] = useState(!manualStart);

  const toggleSubType = (subType: SubType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (subTypes.includes(subType)) {
      onSubTypesChange(subTypes.filter((st) => st !== subType));
    } else {
      onSubTypesChange([...subTypes, subType]);
    }
  };

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

      {/* Military Debrief Format Fields (only for sniper-oriented teams) */}
      {isSniperOriented && (
        <>
          {/* Location */}
          <View style={styles.nameSection}>
            <View style={styles.labelRow}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.label, { color: colors.textMuted }]}>{t('training.militaryDebrief.location')}</Text>
            </View>
            <TextInput
              style={[
                styles.locationInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('training.militaryDebrief.locationPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={onLocationChange}
            />
          </View>

          {/* Training Type */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Target size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('training.militaryDebrief.trainingType')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeScrollContent}
            >
              {TRAINING_TYPES.map((type) => {
                const isSelected = trainingType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? colors.text : colors.card,
                        borderColor: isSelected ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onTrainingTypeChange(isSelected ? null : type);
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Check size={14} color={colors.background} strokeWidth={2.5} />}
                    <Text style={[styles.typeChipText, { color: isSelected ? colors.background : colors.text }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Sub-Types */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('training.militaryDebrief.subType')}</Text>
            <View style={styles.teamGrid}>
              {SUB_TYPES.map((subType) => {
                const isSelected = subTypes.includes(subType);
                return (
                  <TouchableOpacity
                    key={subType}
                    style={[
                      styles.subTypeChip,
                      {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleSubType(subType)}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Check size={12} color={colors.primary} strokeWidth={2.5} />}
                    <Text style={[styles.subTypeChipText, { color: isSelected ? colors.primary : colors.text }]}>
                      {subType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

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
    gap: 20,
  },

  // Name
  nameSection: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  locationInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },

  // Training Type
  typeScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Sub-Types
  subTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  subTypeChipText: {
    fontSize: 13,
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
