import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Users } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';

export function TeamsRow({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { teams, setActiveTeam } = useTeamStore();
  const { myUpcomingTrainings } = useTrainingStore();

  if (teams.length === 0) return null;

  // Navigate to Team tab (unified workspace) - sets active team first
  // Note: teamWorkspace is deprecated; Team tab IS the team workspace
  const handleTeamPress = (teamId: string) => {
    setActiveTeam(teamId);
    router.push('/(protected)/(tabs)/trainings' as any);
  };

  // Single team - show expanded card
  if (teams.length === 1) {
    const team = teams[0];
    const teamTrainings = myUpcomingTrainings.filter((t) => t.team_id === team.id);
    const upcomingCount = teamTrainings.filter((t) => t.status === 'planned').length;
    const liveCount = teamTrainings.filter((t) => t.status === 'ongoing').length;

    return (
      <View style={[styles.teamsSection, { paddingHorizontal: 16 }]}>
        <TouchableOpacity
          style={[styles.singleTeamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handleTeamPress(team.id)}
          activeOpacity={0.7}
        >
          <View style={styles.singleTeamHeader}>
            <View style={[styles.singleTeamIcon, { backgroundColor: `${colors.indigo}18` }]}>
              <Users size={20} color={colors.indigo} />
            </View>
            <View style={styles.singleTeamInfo}>
              <Text style={[styles.singleTeamName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={[styles.singleTeamRole, { color: colors.textMuted }]}>
                {team.my_role === 'owner' ? 'Owner' : team.my_role === 'commander' ? 'Commander' : 'Member'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>

          {/* Quick stats row */}
          <View style={[styles.singleTeamStats, { borderTopColor: colors.border }]}>
            <View style={styles.singleTeamStat}>
              {liveCount > 0 ? <View style={[styles.liveDot, { backgroundColor: colors.green }]} /> : null}
              <Text style={[styles.singleTeamStatValue, { color: liveCount > 0 ? colors.green : colors.text }]}>
                {liveCount > 0 ? 'Live' : upcomingCount}
              </Text>
              <Text style={[styles.singleTeamStatLabel, { color: colors.textMuted }]}>
                {liveCount > 0 ? 'Training Now' : 'Upcoming'}
              </Text>
            </View>
            <View style={[styles.singleTeamStatDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.singleTeamAction} onPress={() => router.push('/(protected)/(tabs)/trainings')}>
              <Calendar size={16} color={colors.indigo} />
              <Text style={[styles.singleTeamActionText, { color: colors.indigo }]}>View Schedule</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Multiple teams - horizontal scroll
  return (
    <View style={styles.teamsSection}>
      <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Teams</Text>
        <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/profile')}>
          <Text style={[styles.seeAllText, { color: colors.indigo }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamsScrollContent}>
        {teams.slice(0, 6).map((team) => {
          const teamTrainings = myUpcomingTrainings.filter((t) => t.team_id === team.id);
          const hasLive = teamTrainings.some((t) => t.status === 'ongoing');

          return (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamCard, { backgroundColor: colors.card, borderColor: hasLive ? colors.green : colors.border }]}
              onPress={() => handleTeamPress(team.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.teamCardIcon, { backgroundColor: `${colors.indigo}18` }]}>
                <Users size={18} color={colors.indigo} />
              </View>
              <Text style={[styles.teamCardName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              {hasLive && (
                <View style={[styles.teamCardLive, { backgroundColor: `${colors.green}18` }]}>
                  <View style={[styles.liveDotSmall, { backgroundColor: colors.green }]} />
                  <Text style={[styles.teamCardLiveText, { color: colors.green }]}>Live</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}






