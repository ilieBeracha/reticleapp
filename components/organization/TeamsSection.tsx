import GroupedList from '@/components/shared/GroupedList';
import TeamCard from '@/components/shared/TeamCard';
import { useColors } from '@/hooks/ui/useColors';
import type { Team } from '@/types/workspace';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../shared/EmptyState';

interface TeamsSectionProps {
  teams: Team[];
  loading: boolean;
  canManageTeams: boolean;
  onCreateTeam: () => void;
}

const TeamsSection = memo(function TeamsSection({
  teams,
  loading,
  canManageTeams,
  onCreateTeam,
}: TeamsSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Teams</Text>
        {canManageTeams && teams.length > 0 && (
          <TouchableOpacity onPress={onCreateTeam}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading teams...</Text>
        </View>
      ) : teams.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={canManageTeams ? "No teams yet" : "No teams available"}
          subtitle={canManageTeams ? "Create your first team to get started" : "Teams will appear here when created"}
          size="small"
        />
      ) : (
        <GroupedList
          data={teams}
          renderItem={(team, isFirst, isLast) => (
            <TeamCard 
              team={team} 
              memberCount={0} 
              isFirst={isFirst}
              isLast={isLast}
            />
          )}
          keyExtractor={(team, index) => team.id}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});

export default TeamsSection;

