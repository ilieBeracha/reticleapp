/**
 * Trainings Section
 *
 * Simple list of trainings with collapsible sessions.
 * Same style as ActivityTimeline.
 */
import { useColors } from '@/hooks/ui/useColors';
import { getTrainingSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import type { TrainingWithDetails } from '@/types/workspace';
import { differenceInMinutes, format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronDown, ChevronUp, Clock, Crosshair } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TrainingsSectionProps {
  trainings: TrainingWithDetails[];
  title?: string;
}

export function TrainingsSection({ trainings, title = 'Trainings' }: TrainingsSectionProps) {
  const colors = useColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sessionsMap, setSessionsMap] = useState<Record<string, SessionWithDetails[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Only show active trainings (planned + ongoing)
  const activeTrainings = trainings.filter((t) => t.status === 'planned' || t.status === 'ongoing');

  const handleTrainingPress = useCallback(async (training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (expandedId === training.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(training.id);

    if (!sessionsMap[training.id]) {
      setLoadingId(training.id);
      try {
        const sessions = await getTrainingSessionsWithStats(training.id);
        setSessionsMap((prev) => ({ ...prev, [training.id]: sessions }));
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessionsMap((prev) => ({ ...prev, [training.id]: [] }));
      } finally {
        setLoadingId(null);
      }
    }
  }, [expandedId, sessionsMap]);

  const handleSessionPress = useCallback((session: SessionWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (session.status === 'active') {
      router.push(`/(protected)/activeSession?sessionId=${session.id}`);
    } else {
      router.push(`/(protected)/sessionDetail?sessionId=${session.id}`);
    }
  }, []);

  const handleViewTraining = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  }, []);

  if (activeTrainings.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.textMuted }]}>{title}</Text>

      <View style={styles.timeline}>
        {activeTrainings.map((training, index) => {
          const isExpanded = expandedId === training.id;
          const isLoading = loadingId === training.id;
          const sessions = sessionsMap[training.id] || [];
          const isLast = index === activeTrainings.length - 1;
          const isLive = training.status === 'ongoing';

          return (
            <View key={training.id}>
              {/* Training Row */}
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleTrainingPress(training)}
                activeOpacity={0.7}
              >
                <View style={styles.lineContainer}>
                  <View style={[styles.dot, { backgroundColor: isLive ? colors.orange : colors.blue }]}>
                    <Calendar size={18} color="#fff" />
                  </View>
                  {(!isLast || isExpanded) && <View style={[styles.line, { backgroundColor: colors.border }]} />}
                </View>

                <View style={[styles.content, { borderBottomColor: isLast && !isExpanded ? 'transparent' : colors.border }]}>
                  <View style={styles.contentHeader}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    <View style={styles.headerRight}>
                      {isLive && (
                        <View style={[styles.liveBadge, { backgroundColor: colors.orange + '20' }]}>
                          <Text style={[styles.liveText, { color: colors.orange }]}>LIVE</Text>
                        </View>
                      )}
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.textMuted} style={{ marginLeft: 8 }} />
                      ) : isExpanded ? (
                        <ChevronUp size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      ) : (
                        <ChevronDown size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      )}
                    </View>
                  </View>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {training.team?.name} • {sessions.length > 0 ? `${sessions.length} sessions` : `${training.drill_count ?? 0} drills`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Expanded Sessions */}
              {isExpanded && (
                <View>
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <View style={styles.lineContainer}>
                        <View style={[styles.smallLine, { backgroundColor: colors.border }]} />
                      </View>
                      <View style={styles.loadingContent}>
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      </View>
                    </View>
                  ) : sessions.length > 0 ? (
                    sessions.map((session, sIdx) => {
                      const isActive = session.status === 'active';
                      const isSessionLast = sIdx === sessions.length - 1 && isLast;
                      const stats = session.stats;

                      const formatTime = () => {
                        if (isActive) return 'Now';
                        const date = session.started_at ? new Date(session.started_at) : null;
                        if (!date) return '';
                        if (isToday(date)) return format(date, 'h:mm a');
                        if (isYesterday(date)) return 'Yesterday';
                        return format(date, 'MMM d');
                      };

                      return (
                        <TouchableOpacity
                          key={session.id}
                          style={styles.item}
                          onPress={() => handleSessionPress(session)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.lineContainer}>
                            <View style={[styles.smallDot, { backgroundColor: isActive ? colors.orange : colors.green }]}>
                              {isActive ? <Clock size={12} color="#fff" /> : <Crosshair size={12} color="#fff" />}
                            </View>
                            {!isSessionLast && <View style={[styles.smallLine, { backgroundColor: colors.border }]} />}
                          </View>

                          <View style={[styles.smallContent, { borderBottomColor: isSessionLast ? 'transparent' : colors.border }]}>
                            <View style={styles.contentHeader}>
                              <Text style={[styles.smallTitle, { color: colors.text }]} numberOfLines={1}>
                                {session.drill_name || 'Session'}
                              </Text>
                              <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime()}</Text>
                            </View>
                            <Text style={[styles.smallSubtitle, { color: colors.textMuted }]}>
                              {session.user_full_name || 'You'}
                              {stats?.shots_fired ? ` • ${stats.shots_fired} shots` : ''}
                              {stats?.accuracy_pct ? ` • ${stats.accuracy_pct}%` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyRow}>
                      <View style={styles.lineContainer}>
                        <View style={[styles.smallLine, { backgroundColor: colors.border }]} />
                      </View>
                      <TouchableOpacity
                        style={[styles.emptyContent, { borderBottomColor: isLast ? 'transparent' : colors.border }]}
                        onPress={() => handleViewTraining(training)}
                      >
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sessions yet</Text>
                        <Text style={[styles.linkText, { color: colors.indigo }]}>Start training →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  timeline: {},
  item: {
    flexDirection: 'row',
    minHeight: 64,
  },
  lineContainer: {
    width: 36,
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
  },
  time: {
    fontSize: 13,
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Small items (sessions)
  smallDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  smallLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginLeft: 6,
  },
  smallContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 12,
    paddingTop: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  smallSubtitle: {
    fontSize: 12,
  },

  // Loading/empty
  loadingRow: {
    flexDirection: 'row',
    height: 40,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 14,
  },
  emptyRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  emptyContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default TrainingsSection;
