/**
 * Session Detail Sheet
 * 
 * Shows session summary, stats, image previews, and timeline.
 * Opens as a formSheet modal above tabs.
 */
import { useColors } from '@/hooks/ui/useColors';
import {
  calculateSessionStats,
  getSessionById,
  getSessionTargetsWithResults,
  type SessionStats,
  type SessionTargetWithResults,
  type SessionWithDetails,
} from '@/services/sessionService';
import { format, intervalToDuration } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Crosshair,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function SessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [loading, setLoading] = useState(true);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sessionData, sessionStats, sessionTargets] = await Promise.all([
          getSessionById(sessionId),
          calculateSessionStats(sessionId),
          getSessionTargetsWithResults(sessionId),
        ]);
        setSession(sessionData);
        setStats(sessionStats);
        setTargets(sessionTargets);
      } catch (error) {
        console.error('Failed to load session details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  // Get images from targets
  const targetImages = useMemo(() => {
    return targets
      .filter((t) => t.paper_result?.scanned_image_url)
      .map((t) => ({
        id: t.id,
        url: t.paper_result!.scanned_image_url!,
        sequence: t.sequence_in_session,
        hits: t.paper_result?.hits_total ?? 0,
        shots: t.paper_result?.bullets_fired ?? 0,
      }));
  }, [targets]);

  // Calculate session duration
  const getDuration = useCallback(() => {
    if (!session) return null;
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = intervalToDuration({ start, end });

    const parts = [];
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (duration.seconds && !duration.hours) parts.push(`${duration.seconds}s`);

    return parts.join(' ') || '< 1m';
  }, [session]);

  const handleViewFullSession = () => {
    if (session) {
      router.back();
      setTimeout(() => {
        router.push(`/(protected)/activeSession?sessionId=${session.id}`);
      }, 100);
    }
  };

  if (loading) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24}]}
        showsVerticalScrollIndicator={false}
      > 
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading session...</Text>
        </View>

      </ScrollView>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Session not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const title = session.drill_name || session.training_title || 'Solo Practice';
  const source = session.team_name || 'Personal';
  const sessionDate = format(new Date(session.started_at), 'MMM d, yyyy');
  const sessionTime = format(new Date(session.started_at), 'HH:mm');
  const isCompleted = session.status === 'completed';

  return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24}]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View
              style={[
                styles.sourceTag,
                { backgroundColor: session.team_id ? `${colors.green}22` : `${colors.indigo}22` },
              ]}
            >
              {session.team_id ? (
                <Users size={12} color={colors.green} />
              ) : (
                <Target size={12} color={colors.indigo} />
              )}
              <Text style={[styles.sourceText, { color: session.team_id ? colors.green : colors.indigo }]}>
                {source}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isCompleted ? `${colors.green}22` : `${colors.orange}22` },
              ]}
            >
              <Text style={[styles.statusText, { color: isCompleted ? colors.green : colors.orange }]}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{sessionDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{sessionTime}</Text>
            </View>
            {getDuration() && (
              <View style={styles.metaItem}>
                <Zap size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{getDuration()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        {stats && stats.targetCount > 0 ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
                  <Crosshair size={18} color={colors.indigo} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.accuracyPct}%</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.green}22` }]}>
                  <Target size={18} color={colors.green} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.totalHits}/{stats.totalShotsFired}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hits / Shots</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                  <Award size={18} color={colors.orange} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.targetCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Targets</Text>
              </View>
              {stats.bestDispersionCm !== null && (
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.red}22` }]}>
                    <TrendingUp size={18} color={colors.red} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.bestDispersionCm}cm</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Group</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : stats?.targetCount === 0 ? (
          <View style={[styles.emptyStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Target size={32} color={colors.textMuted} />
            <Text style={[styles.emptyStatsText, { color: colors.textMuted }]}>No targets recorded</Text>
          </View>
        ) : null}

        {/* Image Gallery */}
        {targetImages.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.imagesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Target Scans</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScroll}
            >
              {targetImages.map((img, index) => (
                <TouchableOpacity
                  key={img.id}
                  style={[styles.imageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: img.url }} style={styles.targetImage} contentFit="cover" transition={200} />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageLabel}>#{img.sequence || index + 1}</Text>
                    <Text style={styles.imageHits}>
                      {img.hits}/{img.shots}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Timeline */}
        {targets.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.timelineSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Timeline</Text>
            <View style={styles.timeline}>
              {targets.map((target, index) => {
                const isPaper = target.target_type === 'paper';
                const result = isPaper ? target.paper_result : target.tactical_result;
                const shots = result?.bullets_fired;
                const hits = isPaper ? target.paper_result?.hits_total : target.tactical_result?.hits;
                const accuracy = shots && hits ? Math.round((hits / shots) * 100) : null;

                return (
                  <View key={target.id} style={styles.timelineItem}>
                    {/* Connector line */}
                    {index < targets.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}

                    {/* Dot */}
                    <View style={[styles.timelineDot, { backgroundColor: colors.indigo }]}>
                      <Text style={styles.timelineDotText}>{index + 1}</Text>
                    </View>

                    {/* Content */}
                    <View
                      style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={styles.timelineHeader}>
                        <View
                          style={[
                            styles.targetTypeBadge,
                            { backgroundColor: isPaper ? `${colors.indigo}22` : `${colors.orange}22` },
                          ]}
                        >
                          <Text
                            style={[styles.targetTypeText, { color: isPaper ? colors.indigo : colors.orange }]}
                          >
                            {isPaper ? 'Paper' : 'Tactical'}
                          </Text>
                        </View>
                        {target.distance_m && (
                          <Text style={[styles.distanceText, { color: colors.textMuted }]}>
                            {target.distance_m}m
                          </Text>
                        )}
                      </View>

                      {result && (
                        <View style={styles.timelineStats}>
                          <View style={styles.timelineStat}>
                            <Text style={[styles.timelineStatValue, { color: colors.text }]}>{shots || 0}</Text>
                            <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>shots</Text>
                          </View>
                          <View style={styles.timelineStat}>
                            <Text style={[styles.timelineStatValue, { color: colors.text }]}>{hits || 0}</Text>
                            <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>hits</Text>
                          </View>
                          {accuracy !== null && (
                            <View style={styles.timelineStat}>
                              <Text
                                style={[
                                  styles.timelineStatValue,
                                  {
                                    color:
                                      accuracy >= 70 ? colors.green : accuracy >= 50 ? colors.orange : colors.red,
                                  },
                                ]}
                              >
                                {accuracy}%
                              </Text>
                              <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>acc</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {target.notes && (
                        <Text style={[styles.targetNotes, { color: colors.textMuted }]} numberOfLines={2}>
                          {target.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        
          <LinearGradient
            style={[styles.viewFullButton, { backgroundColor: colors.indigo }]}
            colors={[colors.ring, colors.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.viewFullButtonText}>Analyze Session</Text>
            <ChevronRight size={18} color="#fff" />
          </LinearGradient>
      </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  scrollView: {
    flex: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStats: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  emptyStatsText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Images Section
  imagesSection: {
    marginBottom: 24,
  },
  imagesScroll: {
    gap: 12,
  },
  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  targetImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  imageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  imageHits: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },

  // Timeline Section
  timelineSection: {
    marginBottom: 24,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 32,
    bottom: -16,
    width: 2,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  timelineContent: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStats: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineStat: {
    alignItems: 'center',
  },
  timelineStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  targetNotes: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // View Full Button
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  viewFullButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
