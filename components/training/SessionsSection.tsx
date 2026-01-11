import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SessionCard } from './SessionCard';
import type { SessionWithDetails, ThemeColors } from './types';

interface SessionsSectionProps {
  sessions: SessionWithDetails[];
  loading: boolean;
  colors: ThemeColors;
}

export function SessionsSection({ sessions, loading, colors }: SessionsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>Sessions ({sessions.length})</Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : sessions.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.secondary }]}>
          <Ionicons name="fitness-outline" size={24} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sessions logged yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sessions.slice(0, 5).map((session) => (
            <SessionCard key={session.id} session={session} colors={colors} />
          ))}
          {sessions.length > 5 && (
            <Text style={[styles.more, { color: colors.textMuted }]}>
              +{sessions.length - 5} more sessions
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  loader: {
    padding: 20,
  },
  more: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '500',
  },
});
