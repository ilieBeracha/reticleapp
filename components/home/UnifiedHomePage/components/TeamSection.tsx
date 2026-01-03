/**
 * TeamSection Component
 * 
 * Displays team training section with upcoming trainings or empty state.
 */

import { router } from 'expo-router';
import { Calendar, ChevronRight, Users } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
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
  const hasTeamContent = trainings.length > 0 || hasTeams;
  
  if (!hasTeamContent) return null;

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
        </View>
      ) : (
        <View style={[styles.emptyTeam, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Calendar size={18} color={colors.textMuted} />
          <Text style={[styles.emptyTeamText, { color: colors.textMuted }]}>
            No upcoming trainings
          </Text>
          <TouchableOpacity
            style={styles.viewScheduleBtn}
            onPress={() => router.push('/(protected)/(tabs)/team')}
          >
            <Text style={[styles.viewScheduleText, { color: colors.primary }]}>Schedule</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

