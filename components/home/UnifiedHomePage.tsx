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
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BaseAvatar } from '../BaseAvatar';
import { SectionHeader } from './_shared/SectionHeader';
import HeroSummaryCard from './cards/HeroSummaryCard';
import { mapSessionToHomeSession, mapTrainingToScheduledSession, type HomeSession } from './types';
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
  
  // Filter upcoming trainings - exclude trainings where user already has an active session
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      // Don't show training in "upcoming" if user already has an active session for it
      .filter((t) => !allSessions.some(s => s.training_id === t.id && s.status === 'active'))
      .slice(0, 5);
  }, [myUpcomingTrainings, allSessions]);

  // Use session-centric home state
  const homeState = useHomeState({
    sessions: allSessions,
    upcomingTrainings,
    hasTeams,
  });

  // Build unified timeline from sessions + scheduled sessions
  const timelineSessions = useMemo(() => {
    const homeSessions: HomeSession[] = [];
    
    // Add real sessions
    allSessions.forEach(session => {
      homeSessions.push(mapSessionToHomeSession(session));
    });
    
    // Add scheduled sessions from upcoming trainings
    upcomingTrainings.forEach(training => {
      // Only add if not already represented by an active session
      const hasActiveSession = allSessions.some(
        s => s.training_id === training.id && s.status === 'active'
      );
      if (!hasActiveSession) {
        homeSessions.push(mapTrainingToScheduledSession(training));
      }
    });
    
    return homeSessions;
  }, [allSessions, upcomingTrainings]);

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
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={[styles.greetingAvatar, { backgroundColor: colors.secondary }]}>
            {avatarUrl ? (
              <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
            ) : (
              <Text style={[styles.greetingAvatarText, { color: colors.text }]}>{fallbackInitial}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>{getGreeting()},</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.greetingName, { color: colors.text }]}>{firstName}</Text>
              {isGarminConnected && (
                <Ionicons name="watch" size={16} color="#10B981" />
              )}
            </View>
          </View>
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
            <View style={{ marginTop: 8 }}>
              <ActivityTimeline
                sessions={timelineSessions}
                onSessionPress={handleSessionPress}
              />
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Floating Action Button - Always visible to start solo session */}
      {!homeState.activeSession && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 90,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#10B981',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={handleStartSession}
          activeOpacity={0.8}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default UnifiedHomePage;
