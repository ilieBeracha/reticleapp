import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

interface MemberSession {
  id: string;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  session_mode: 'solo' | 'group';
  training_title: string | null;
  team_name: string | null;
  drill_name: string | null;
}

interface MemberStats {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalTimeMinutes: number;
  lastActive: string | null;
}

/**
 * Member Activity Screen
 * Shows training history and stats for a specific member
 */
export default function MemberActivityScreen() {
  const colors = useColors();
  const { activeTeamId } = useAppContext();
  const { memberId, memberName } = useLocalSearchParams<{ memberId: string; memberName: string }>();
  
  const [sessions, setSessions] = useState<MemberSession[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!memberId || !activeTeamId) return;

    try {
      // Fetch member's sessions in this org
      // Query sessions for this member in the active team
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          started_at,
          ended_at,
          session_mode,
          trainings:training_id(title),
          teams:team_id(name),
          training_drills:drill_id(name)
        `)
        .eq('user_id', memberId)
        .eq('team_id', activeTeamId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (sessionError) throw sessionError;

      const mappedSessions: MemberSession[] = (sessionData || []).map((s: any) => ({
        id: s.id,
        status: s.status,
        started_at: s.started_at,
        ended_at: s.ended_at,
        session_mode: s.session_mode,
        training_title: s.trainings?.title || null,
        team_name: s.teams?.name || null,
        drill_name: s.training_drills?.name || null,
      }));

      setSessions(mappedSessions);

      // Calculate stats
      const completedSessions = mappedSessions.filter(s => s.status === 'completed');
      const activeSessions = mappedSessions.filter(s => s.status === 'active');
      
      let totalMinutes = 0;
      completedSessions.forEach(s => {
        if (s.started_at && s.ended_at) {
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          totalMinutes += duration / (1000 * 60);
        }
      });

      setStats({
        totalSessions: mappedSessions.length,
        completedSessions: completedSessions.length,
        activeSessions: activeSessions.length,
        totalTimeMinutes: Math.round(totalMinutes),
        lastActive: mappedSessions[0]?.started_at || null,
      });

    } catch (error) {
      console.error('Failed to load member activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId, activeTeamId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivity();
  }, [loadActivity]);

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return 'In progress';
    const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{memberName || 'Member'}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Activity History</Text>
      </View>

      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="fitness-outline" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#22c55e" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={24} color="#f59e0b" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalTimeMinutes < 60 
                ? `${stats.totalTimeMinutes}m` 
                : `${Math.floor(stats.totalTimeMinutes / 60)}h`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flash-outline" size={24} color="#8b5cf6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active</Text>
          </View>
        </View>
      )}

      {/* Last Active */}
      {stats?.lastActive && (
        <View style={[styles.lastActiveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.lastActiveText, { color: colors.textMuted }]}>
            Last active: {formatDate(stats.lastActive)} at {formatTime(stats.lastActive)}
          </Text>
        </View>
      )}

      {/* Sessions List */}
      <View style={styles.sessionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
        
        {sessions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              This member hasn't participated in any training sessions
            </Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.map((session) => (
              <View 
                key={session.id} 
                style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionMeta}>
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: session.status === 'active' ? '#22c55e' : session.status === 'completed' ? colors.primary : colors.textMuted }
                    ]} />
                    <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                      {formatDate(session.started_at)} • {formatTime(session.started_at)}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDuration, { color: colors.text }]}>
                    {formatDuration(session.started_at, session.ended_at)}
                  </Text>
                </View>
                
                {session.training_title && (
                  <Text style={[styles.trainingTitle, { color: colors.text }]}>
                    {session.training_title}
                  </Text>
                )}
                
                <View style={styles.sessionTags}>
                  {session.team_name && (
                    <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="people" size={12} color={colors.text} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{session.team_name}</Text>
                    </View>
                  )}
                  {session.drill_name && (
                    <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="barbell" size={12} color={colors.text} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{session.drill_name}</Text>
                    </View>
                  )}
                  <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                    <Ionicons 
                      name={session.session_mode === 'group' ? 'people-outline' : 'person-outline'} 
                      size={12} 
                      color={colors.text} 
                    />
                    <Text style={[styles.tagText, { color: colors.text }]}>
                      {session.session_mode === 'group' ? 'Group' : 'Solo'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4 },

  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    marginBottom: 16,
  },
  statCard: { 
    flex: 1,
    minWidth: '45%',
    padding: 16, 
    borderRadius: 16, 
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13 },

  lastActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  lastActiveText: { fontSize: 14 },

  sessionsSection: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },

  sessionsList: { gap: 12 },
  sessionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sessionDate: { fontSize: 13 },
  sessionDuration: { fontSize: 14, fontWeight: '600' },
  trainingTitle: { fontSize: 16, fontWeight: '600' },
  sessionTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  tagText: { fontSize: 12, fontWeight: '500' },

  emptyState: {
    padding: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

