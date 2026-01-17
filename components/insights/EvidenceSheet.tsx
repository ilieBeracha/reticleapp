/**
 * Evidence Sheet
 *
 * Modal/sheet showing sessions that back an insight.
 * Displays target images, shot timing, HR overlay, and notes.
 */

import { useColors } from '@/hooks/ui/useColors';
import { getSessionById } from '@/services/session/queries';
import type { SessionWithDetails } from '@/services/session/types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Activity,
  Calendar,
  ChevronRight,
  Target,
  X
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EvidenceContext } from './insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface EvidenceSheetProps {
  visible: boolean;
  context: EvidenceContext | null;
  onClose: () => void;
}

// ============================================================================
// SESSION CARD COMPONENT
// ============================================================================

interface SessionCardProps {
  session: SessionWithDetails;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function SessionCard({ session, onPress, colors }: SessionCardProps) {
  const formattedDate = format(new Date(session.started_at), 'MMM d, yyyy');
  const formattedTime = format(new Date(session.started_at), 'h:mm a');

  return (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: colors.card }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionName, { color: colors.text }]}>
            {session.drill_name || session.drill_config?.name || 'Session'}
          </Text>
          <View style={styles.sessionMeta}>
            <Calendar size={12} color={colors.textMuted} />
            <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
      </View>

      {/* Stats Row */}
      {session.stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {session.stats.shots_fired}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
          </View>

          {session.stats.accuracy_pct > 0 && (
            <View style={styles.statItem}>
              <Activity size={14} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {session.stats.accuracy_pct}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>accuracy</Text>
            </View>
          )}

          {session.stats.best_dispersion_cm != null && (
            <View style={styles.statItem}>
              <Ionicons name="resize" size={14} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(session.stats.best_dispersion_cm * 10) / 10}cm
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>group</Text>
            </View>
          )}

          {session.stats.avg_distance_m != null && (
            <View style={styles.statItem}>
              <Ionicons name="location" size={14} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(session.stats.avg_distance_m)}m
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>distance</Text>
            </View>
          )}
        </View>
      )}

      {/* Context badges */}
      <View style={styles.badgesRow}>
        {session.weapon_name && (
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
              {session.weapon_name}
            </Text>
          </View>
        )}

        {session.drill_config?.position && (
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
              {session.drill_config.position}
            </Text>
          </View>
        )}

        {session.team_name && (
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
              {session.team_name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textMuted }]}>
        Loading sessions...
      </Text>
    </View>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions found</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        The sessions backing this insight are no longer available
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EvidenceSheet({ visible, context, onClose }: EvidenceSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Load sessions when context changes
  useEffect(() => {
    if (!visible || !context || context.sessionIds.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    async function loadSessions() {
      try {
        const loadedSessions: SessionWithDetails[] = [];
        // Load sessions in parallel (max 10)
        const sessionPromises = context!.sessionIds.slice(0, 10).map((id) =>
          getSessionById(id).catch(() => null)
        );
        const results = await Promise.all(sessionPromises);
        results.forEach((session) => {
          if (session) loadedSessions.push(session);
        });
        setSessions(loadedSessions);
      } catch (e) {
        console.error('Failed to load evidence sessions:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, [visible, context]);

  const handleSessionPress = useCallback(
    (session: SessionWithDetails) => {
      onClose();
      // Navigate to session detail
      router.push(`/(protected)/session/${session.id}` as any);
    },
    [router, onClose]
  );

  if (!context) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Evidence</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {context.title}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={onClose}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.card }]}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              These sessions contributed to the insight "{context.title}"
            </Text>
          </View>

          {loading ? (
            <LoadingState colors={colors} />
          ) : sessions.length === 0 ? (
            <EmptyState colors={colors} />
          ) : (
            <View style={styles.sessionsList}>
              <Text style={[styles.sessionsCount, { color: colors.textMuted }]}>
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </Text>
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onPress={() => handleSessionPress(session)}
                  colors={colors}
                />
              ))}
              {context.sessionIds.length > 10 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{context.sessionIds.length - 10} more sessions
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Sessions list
  sessionsList: {
    gap: 12,
  },
  sessionsCount: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Session card
  sessionCard: {
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // More text
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default EvidenceSheet;
