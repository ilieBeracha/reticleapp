/**
 * Unified Home Page
 * 
 * TRAINING-FIRST. Home shows trainings and drills explicitly.
 * 
 * Home answers three questions:
 * 1. What's my next training? (training name, drills, deadline)
 * 2. What drills do I need to do? (drill progress)
 * 3. What's my recent activity? (completed sessions)
 * 
 * Trainings are shown EXPLICITLY with drill counts and progress.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { deleteSession, getMyActivePersonalSession, getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { useGarminStore } from '@/store/garminStore';
import { useMessagesStore } from '@/store/messagesService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseAvatar } from '../BaseAvatar';
import { SectionHeader } from './_shared/SectionHeader';
import HeroSummaryCard from './cards/HeroSummaryCard';
import { mapSessionToHomeSession, type HomeSession } from './types';
import { AggregatedStatsCard } from './unified/sections/AggregatedStatsCard';
import { EmptyState } from './unified/sections/EmptyState';
import { UpcomingTrainingsCard } from './unified/sections/UpcomingTrainingsCard';
import { WeeklyHighlightsCard } from './unified/sections/WeeklyHighlightsCard';
import { styles } from './unified/styles';
import { useHomeState } from './useHomeState';
import { ActivityTimeline } from './widgets';

function TitleHeader({
  title,
  action,
  actionText,
  colors,
}: {
  title: string;
  action?: () => void;
  actionText?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 12, marginTop: 4 }}>
      <SectionHeader
        title={<Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14 }]}>{title}</Text>}
        right={
          action && actionText ? (
            <TouchableOpacity onPress={action}>
              <Text style={[styles.seeAllText, { color: colors.indigo, fontSize: 12 }]}>{actionText}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

export function UnifiedHomePage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const garminStatus = useGarminStore((s) => s.status);
  const isGarminConnected = garminStatus === 'CONNECTED';

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profileFullName?.split(' ')[0] || 'Shooter';
  const email = user?.email;
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial = profileFullName?.charAt(0)?.toUpperCase() ?? email?.charAt(0)?.toUpperCase() ?? '?';

  // Stores - we still load training data internally, but never expose "training" to UI
  const { sessions, loading: sessionsLoading, initialized } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();
  const { myUpcomingTrainings, myStats, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionWithDetails[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const initialLoadDone = useRef(false);

  // Load recent sessions
  const loadAllSessions = useCallback(async () => {
    try {
      const sessions = await getRecentSessionsWithStats({ days: 7, limit: 20 });
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, []);


  useEffect(() => {
    useMessagesStore.subscribe((state) => {
      console.log('Messages:', state.messages);
    });
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
        loadAllSessions();
        loadMyUpcomingTrainings();
        loadMyStats();
        return;
      }
      
      initialLoadDone.current = true;
      loadAllSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
      loadTeams();
    }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams])
  );

  useEffect(() => {
    setOnSessionCreated(() => loadAllSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadAllSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // Derived data
  const hasTeams = teams.length > 0;
  
  // Filter upcoming trainings - just show a quick peek (full schedule in Team tab)
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => !allSessions.some(s => s.training_id === t.id && s.status === 'active'))
      .slice(0, 2); // Limit to 2 - full schedule is in Team tab
  }, [myUpcomingTrainings, allSessions]);

  // Use session-centric home state
  const homeState = useHomeState({
    sessions: allSessions,
    upcomingTrainings,
    hasTeams,
  });

  // Build timeline from actual sessions only (scheduled trainings now in Team tab)
  const timelineSessions = useMemo(() => {
    return allSessions.map(session => mapSessionToHomeSession(session));
  }, [allSessions]);

  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === 'completed');
  }, [allSessions]);

  const hasActivity = allSessions.length > 0 || upcomingTrainings.length > 0;

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        setStarting(false);
        Alert.alert(
          'Active Session',
          `You have an active session${existing.drill_name ? ` for "${existing.drill_name}"` : ''}. What would you like to do?`,
          [
            {
              text: 'Continue',
              onPress: () => {
                router.push(`/(protected)/activeSession?sessionId=${existing.id}`);
              },
            },
            {
              text: 'Delete & Start New',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteSession(existing.id);
                  await loadAllSessions();
                  router.push('/(protected)/createSession');
                } catch (err) {
                  console.error('Failed to delete session:', err);
                  Alert.alert('Error', 'Failed to delete session');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      router.push('/(protected)/createSession');
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, loadAllSessions]);

  const handleHeroPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { activeSession } = homeState;
    
    // Hero card is now PERSONAL only
    // If active solo session, continue it
    if (activeSession?.sourceSession && activeSession.origin === 'solo') {
      router.push(`/(protected)/activeSession?sessionId=${activeSession.sourceSession.id}`);
      return;
    }
    
    // Otherwise, start new solo session
    handleStartSession();
  }, [homeState, handleStartSession]);

  const handleSessionPress = useCallback((session: HomeSession) => {
    if (session.sourceSession) {
      if (session.state === 'active') {
        router.push(`/(protected)/activeSession?sessionId=${session.sourceSession.id}`);
      } else {
        router.push(`/(protected)/sessionDetail?sessionId=${session.sourceSession.id}`);
      }
    } else if (session.sourceTraining) {
      router.push(`/(protected)/trainingDetail?id=${session.sourceTraining.id}`);
    }
  }, []);

  // Loading state
  const shouldShowLoading = (loadingAllSessions && allSessions.length === 0) || 
                            (!initialized && sessionsLoading);
  
  if (shouldShowLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Header Row - Greeting + Date */}
        <View style={localStyles.headerRow}>
          <View style={localStyles.headerLeft}>
            <View style={[localStyles.avatar, { backgroundColor: colors.secondary }]}>
              {avatarUrl ? (
                <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
              ) : (
                <Text style={[localStyles.avatarText, { color: colors.text }]}>{fallbackInitial}</Text>
              )}
            </View>
            <View>
              <Text style={[localStyles.greeting, { color: colors.textMuted }]}>
                {getGreeting()}, <Text style={{ color: colors.text, fontWeight: '600' }}>{firstName}</Text>
              </Text>
              <Text style={[localStyles.dateText, { color: colors.textMuted }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
          {isGarminConnected && (
            <View style={[localStyles.watchBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="watch" size={14} color="#10B981" />
            </View>
          )}
        </View>

        {/* Hero Summary - session-centric, action-forward */}
        <View style={styles.section}>
          <HeroSummaryCard
            homeState={homeState}
            onPress={handleHeroPress}
          />
        </View>

        {/* Show empty state or activity */}
        {!hasActivity && !homeState.activeSession ? (
          <EmptyState colors={colors} onStartPractice={handleStartSession} starting={starting} />
        ) : (
          <>
            {/* Upcoming Trainings - EXPLICIT training display */}
            {upcomingTrainings.length > 0 && (
              <View style={styles.section}>
                <UpcomingTrainingsCard trainings={upcomingTrainings} />
              </View>
            )}

            {/* Weekly Overview */}
            <View style={styles.section}>
              <TitleHeader title="This Week" colors={colors} />
              <View style={styles.cardsRow}>
                <AggregatedStatsCard colors={colors} allSessions={completedSessions} trainingStats={myStats} />
                <WeeklyHighlightsCard colors={colors} sessions={completedSessions} />
              </View>
            </View>

            {/* Activity Timeline - recent sessions */}
            <View style={styles.section}>
              <ActivityTimeline
                sessions={timelineSessions}
                onSessionPress={handleSessionPress}
              />
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Floating Action Button - Extended with label */}
      {!homeState.activeSession && (
        <TouchableOpacity
          style={[localStyles.fab, { bottom: insets.bottom + 70 }]}
          onPress={handleStartSession}
          activeOpacity={0.85}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={localStyles.fabLabel}>Practice</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default UnifiedHomePage;

// Local styles for layout improvements
const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 15,
    fontWeight: '400',
  },
  dateText: {
    fontSize: 12,
    marginTop: 1,
  },
  watchBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
