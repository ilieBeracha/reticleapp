import { SessionTargetWithResults } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================
interface TargetCardProps {
  target: SessionTargetWithResults;
  index: number;
  onPress: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const TargetCard = React.memo(function TargetCard({
  target,
  index,
  onPress,
}: TargetCardProps) {
  const isPaper = target.target_type === 'paper';
  
  // Determine target purpose: grouping (consistency) vs achievement (accuracy)
  const isGroupingTarget = isPaper && target.paper_result?.paper_type === 'grouping';
  const isAchievementTarget = isPaper && target.paper_result?.paper_type === 'achievement';

  // Extract results
  let hits = 0;
  let shots = 0;
  let dispersionCm: number | null = null;
  const hasImage = isPaper && target.paper_result?.scanned_image_url;

  if (isPaper && target.paper_result) {
    hits = target.paper_result.hits_total ?? 0;
    shots = target.paper_result.bullets_fired;
    dispersionCm = target.paper_result.dispersion_cm;
  } else if (!isPaper && target.tactical_result) {
    hits = target.tactical_result.hits;
    shots = target.tactical_result.bullets_fired;
  }

  const hasResult = (isPaper && target.paper_result) || (!isPaper && target.tactical_result);

  // Meta info
  const laneInfo = target.lane_number ? `Lane ${target.lane_number}` : null;
  const notesSnippet = target.notes ? target.notes.slice(0, 30) : null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail or Distance Badge */}
      {hasImage ? (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: target.paper_result!.scanned_image_url! }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.thumbnailOverlay}>
            <Text style={styles.thumbnailDistance}>{target.distance_m}m</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.distanceBadge, isPaper ? styles.distanceBadgePaper : styles.distanceBadgeTactical]}>
          <Text style={styles.distanceValue}>{target.distance_m || '—'}</Text>
          <Text style={styles.distanceUnit}>m</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Main line: different display for grouping vs achievement */}
        <View style={styles.header}>
          {hasResult ? (
            isGroupingTarget ? (
              // Grouping: show shot count and dispersion
              <Text style={styles.title}>
                {shots} shots{dispersionCm != null ? ` • ${dispersionCm.toFixed(1)}cm` : ''}
              </Text>
            ) : (
              // Achievement/Tactical: show hits
              <Text style={styles.title}>{hits}/{shots} hits</Text>
            )
          ) : (
            <Text style={styles.title}>No result</Text>
          )}
          {hasImage && (
            <View style={styles.imageTag}>
              <Ionicons name="image" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* Meta line */}
        <View style={styles.meta}>
          <Text style={[styles.typeTag, isGroupingTarget ? styles.typeTagGrouping : (isAchievementTarget ? styles.typeTagAchievement : styles.typeTagTactical)]}>
            {isGroupingTarget ? 'Grouping' : (isAchievementTarget ? 'Achievement' : (isPaper ? 'Paper' : 'Tactical'))}
          </Text>
          {laneInfo && (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{laneInfo}</Text>
            </>
          )}
          {notesSnippet && (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText} numberOfLines={1}>{notesSnippet}</Text>
            </>
          )}
        </View>
      </View>

      {/* Index */}
      <Text style={styles.index}>#{index}</Text>
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

  // Thumbnail
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  thumbnailDistance: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Distance Badge (when no image)
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
  imageTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 4,
    padding: 3,
    marginLeft: 6,
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
  typeTagAchievement: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
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

  // Index
  index: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
});

