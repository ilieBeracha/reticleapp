import type { MissPoint, SessionTargetWithResults } from '@/types/session';
import { Ionicons } from '@expo/vector-icons';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================
interface TargetCardProps {
  target: SessionTargetWithResults;
  index: number;
  onPress: () => void;
  isExpanded?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const TargetCard = React.memo(function TargetCard({ target, index, onPress, isExpanded = false }: TargetCardProps) {
  const { t } = useTranslation();
  const isPaper = target.target_type === 'paper';

  // Determine target purpose: grouping (consistency) vs achievement (accuracy)
  const isGroupingTarget = isPaper && target.paper_result?.paper_type === 'grouping';
  const isEngagementTarget =
    isPaper && (target.paper_result?.paper_type === 'achievement' || target.paper_result?.paper_type === 'engagement');

  // Check if this was scanned (AI detection) vs manual entry
  const isScanned = isPaper && !!target.paper_result?.scanned_image_url;

  // Extract results
  let hits = 0;
  let shots = 0;
  let dispersionCm: number | null = null;
  let actualShotsDeclared: number | null = null;

  // Miss points for tactical targets
  let missPoints: MissPoint[] = [];

  if (isPaper && target.paper_result) {
    hits = target.paper_result.hits_total ?? 0;
    shots = target.paper_result.bullets_fired;
    dispersionCm = target.paper_result.dispersion_cm;
    actualShotsDeclared = target.paper_result.actual_shots_declared ?? null;
  } else if (!isPaper && target.tactical_result) {
    hits = target.tactical_result.hits;
    shots = target.tactical_result.bullets_fired;
    missPoints = target.tactical_result.miss_points ?? [];
  }
  
  const hasMissData = missPoints.length > 0;

  // For scanned achievement targets, only show accuracy if user declared actual shots
  const canShowAccuracy = !isScanned || actualShotsDeclared != null;
  const effectiveShots = isScanned && actualShotsDeclared ? actualShotsDeclared : shots;
  const accuracy = canShowAccuracy && effectiveShots > 0 ? Math.round((hits / effectiveShots) * 100) : null;

  const hasResult = (isPaper && target.paper_result) || (!isPaper && target.tactical_result);

  // Meta info
  const laneInfo = target.lane_number ? t('session.lane', { number: target.lane_number }) : null;
  const notesSnippet = target.notes ? target.notes.slice(0, 30) : null;

  function renderTitle() {
    if (!hasResult) {
      return <Text style={styles.title}>{t('session.noResult')}</Text>;
    }

    if (isGroupingTarget) {
      return (
        <Text style={styles.title}>
          {dispersionCm != null ? `${dispersionCm.toFixed(1)}cm` : t('session.shotsCount', { count: shots })}
          {dispersionCm != null && <Text style={styles.titleMuted}> • {t('session.shotsCount', { count: shots })}</Text>}
        </Text>
      );
    }

    if (isScanned && !actualShotsDeclared) {
      return <Text style={styles.title}>{t('session.holesCount', { count: hits })}</Text>;
    }

    if (isScanned && actualShotsDeclared) {
      return (
        <Text style={styles.title}>
          {hits}/{actualShotsDeclared} <Text style={styles.titleAccuracy}>({accuracy}%)</Text>
        </Text>
      );
    }

    return (
      <Text style={styles.title}>
        {hits}/{shots} <Text style={styles.titleAccuracy}>({accuracy}%)</Text>
      </Text>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Distance Badge - always show (click to expand and see image) */}
      <View style={[styles.distanceBadge, isPaper ? styles.distanceBadgePaper : styles.distanceBadgeTactical]}>
        <Text style={styles.distanceValue}>{target.distance_m || '—'}</Text>
        <Text style={styles.distanceUnit}>m</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Main line: different display based on entry method */}
        <View style={styles.header}>
          {renderTitle()}
          {/* Entry method indicator */}
          <View style={[styles.entryTag, isScanned ? styles.entryTagScan : styles.entryTagManual]}>
            <Ionicons name={isScanned ? 'scan' : 'create'} size={10} color="#fff" />
          </View>
          {/* Miss indicator badge */}
          {hasMissData && (
            <View style={styles.missBadge}>
              <Text style={styles.missBadgeText}>{missPoints.length} {t('session.misses', 'misses')}</Text>
            </View>
          )}
        </View>

        {/* Meta line */}
        <View style={styles.meta}>
          {/* Target type badge */}
          <Text
            style={[
              styles.typeTag,
              isGroupingTarget
                ? styles.typeTagGrouping
                : isEngagementTarget
                  ? styles.typeTagEngagement
                  : styles.typeTagTactical,
            ]}
          >
            {isGroupingTarget ? t('session.grouping') : isPaper ? t('session.engagement') : t('session.tactical')}
          </Text>
          {/* Entry method for achievement/tactical */}
          {!isGroupingTarget && isPaper && (
            <>
              <View style={styles.dot} />
              <Text style={[styles.metaText, isScanned ? styles.metaTextScan : styles.metaTextManual]}>
                {isScanned ? t('session.scannedLabel') : t('session.manualLabel')}
              </Text>
            </>
          )}
          {laneInfo && (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{laneInfo}</Text>
            </>
          )}
          {notesSnippet && (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText} numberOfLines={1}>
                {notesSnippet}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Expand/collapse indicator */}
      <View style={styles.expandIndicator}>
        {isExpanded ? (
          <ChevronUp size={20} color="rgba(255,255,255,0.5)" />
        ) : (
          <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
        )}
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  // Distance Badge
  distanceBadge: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadgePaper: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  distanceBadgeTactical: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  distanceUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: -2,
  },

  // Content
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  titleMuted: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  titleAccuracy: {
    color: '#22C55E',
    fontWeight: '700',
  },
  imageTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 4,
    padding: 3,
    marginLeft: 6,
  },
  imageTagWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  entryTag: {
    borderRadius: 4,
    padding: 3,
    marginLeft: 6,
  },
  entryTagScan: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)', // Purple for AI scan
  },
  entryTagManual: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)', // Blue for manual
  },
  missBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  missBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Meta
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  typeTagGrouping: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
  },
  typeTagEngagement: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#F59E0B',
  },
  typeTagTactical: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },
  metaTextScan: {
    color: '#A78BFA', // Purple for scanned
  },
  metaTextManual: {
    color: '#60A5FA', // Blue for manual
  },

  // Expand indicator
  expandIndicator: {
    padding: 4,
  },
});
