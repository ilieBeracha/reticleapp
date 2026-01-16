/**
 * TeamSection Component
 * 
 * Displays team training section with upcoming trainings or empty state.
 * Navigates to team context (/team/[teamId]) for team-related actions.
 */

import { useTeamStore } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { styles } from '../UnifiedHomePage.styles';
import type { TeamSectionProps } from '../UnifiedHomePage.types';
import { TeamTrainingCard } from './TeamTrainingCard';

export function TeamSection({ 
  trainings, 
  hasTeams, 
  colors, 
  onTrainingPress 
}: TeamSectionProps) {
  const { teams, activeTeamId } = useTeamStore();

  // Navigate to team context
  const handleViewTeam = (teamId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetTeamId = teamId || activeTeamId || teams[0]?.id;
    if (targetTeamId) {
      router.push(`/(protected)/team/${targetTeamId}`);
    }
  };

  // Navigate to create/join team flow
  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/createTeam');
  };

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Users size={14} color={colors.textMuted} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Team Training</Text>
      </View>

      {trainings.length > 0 ? (
        <View style={styles.trainingsList}>
          {trainings.map((training) => (
            <TeamTrainingCard
              key={training.id}
              training={training}
              colors={colors}
              onPress={() => onTrainingPress(training)}
            />
          ))}
          
          {/* View Team button when there are trainings */}
          <TouchableOpacity
            style={[localStyles.viewTeamBtn, { borderColor: colors.border }]}
            onPress={() => handleViewTeam(trainings[0]?.team_id)}
            activeOpacity={0.7}
          >
            <Text style={[localStyles.viewTeamText, { color: colors.primary }]}>View Team</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : hasTeams ? (
        <View style={[styles.emptyTeam, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Calendar size={18} color={colors.textMuted} />
          <Text style={[styles.emptyTeamText, { color: colors.textMuted }]}>
            No upcoming trainings
          </Text>
          <TouchableOpacity
            style={styles.viewScheduleBtn}
            onPress={() => handleViewTeam()}
          >
            <Text style={[styles.viewScheduleText, { color: colors.primary }]}>View Schedule</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[localStyles.joinTeamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleJoinTeam}
          activeOpacity={0.7}
        >
          <View style={[localStyles.joinTeamIcon, { backgroundColor: colors.secondary }]}>
            <Users size={18} color={colors.textMuted} />
          </View>
          <View style={localStyles.joinTeamContent}>
            <Text style={[localStyles.joinTeamTitle, { color: colors.text }]}>Join a team</Text>
            <Text style={[localStyles.joinTeamText, { color: colors.textMuted }]}>
              Train together with your unit
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  joinTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  joinTeamIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinTeamContent: { flex: 1, gap: 2 },
  joinTeamTitle: { fontSize: 14, fontWeight: '600' },
  joinTeamText: { fontSize: 12 },
  viewTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewTeamText: {
    fontSize: 13,
    fontWeight: '600',
  },
});