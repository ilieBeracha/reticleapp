import GroupedList from '@/components/shared/GroupedList';
import OrgSessionCard from '@/components/shared/OrgSessionCard';
import { useColors } from '@/hooks/ui/useColors';
import { SessionWithDetails } from '@/services/sessionService';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../shared/EmptyState';

interface RecentSessionsProps {
  sessions: SessionWithDetails[];
  loading: boolean;
  error: string | null;
}

const RecentSessions = memo(function RecentSessions({
  sessions,
  loading,
  error,
}: RecentSessionsProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading sessions...</Text>
        </View>
      ) : error ? (
        <EmptyState
          icon="warning-outline"
          title="Unable to load sessions"
          subtitle={error}
          size="small"
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="fitness-outline"
          title="No sessions yet"
          subtitle="Start your first training session"
          size="small"
        />
      ) : (
        <GroupedList
          data={sessions.slice(0, 5)}
          renderItem={(session, isFirst, isLast) => (
            <OrgSessionCard 
              session={session}
              isFirst={isFirst}
              isLast={isLast}
            />
          )}
          keyExtractor={(session, index) => session.id}
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

export default RecentSessions;