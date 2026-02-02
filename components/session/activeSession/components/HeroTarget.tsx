/**
 * HeroTarget
 *
 * Large preview card for the most recent target result.
 * Shows image (if scanned), distance badge, type badge, and key metric.
 */

import { isGroupingPaper, isPaperTarget } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeroTargetProps {
  target: any;
  onPress: () => void;
}

export function HeroTarget({ target, onPress }: HeroTargetProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const isPaper = isPaperTarget(target.target_type);
  const paperResult = target.paper_result;
  const tacticalResult = target.tactical_result;

  const imageUrl = paperResult?.scanned_image_url;
  const hasImage = !!imageUrl;

  const isScanned = isPaper && !!paperResult?.scanned_image_url;
  const isGrouping = isPaper && isGroupingPaper(paperResult?.paper_type);

  const distance = target.distance_m;
  const dispersion = paperResult?.dispersion_cm;
  const bullets = tacticalResult?.bullets_fired ?? 0;
  const hits = paperResult?.hits_total ?? tacticalResult?.hits ?? 0;
  const accuracy = bullets > 0 ? Math.round((hits / bullets) * 100) : 0;

  const typeLabel = isGrouping
    ? t('session.grouping')
    : isScanned
      ? t('session.scannedLabel')
      : t('session.manualLabel');

  function getTypeColor(): string {
    if (isGrouping) return '#22C55E';
    if (isScanned) return '#A78BFA';
    return '#60A5FA';
  }
  const typeColor = getTypeColor();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasImage ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
          <Target size={32} color={colors.textMuted} />
        </View>
      )}

      {/* Top badges: Distance + Type */}
      <View style={styles.badgeRow}>
        {distance && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distance}m</Text>
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Bottom: Key metric */}
      <View style={styles.overlay}>
        <View style={styles.hitsRow}>
          <Text style={styles.metricValue}>
            {isGrouping && dispersion != null 
              ? `${dispersion.toFixed(1)}cm` 
              : bullets > 0 ? `${hits}/${bullets}` : `${hits}`}
          </Text>
          {!isGrouping && bullets > 0 && (
            <View style={[styles.accuracyBadge, getAccuracyStyle(accuracy)]}>
              <Text style={styles.accuracyText}>{accuracy}%</Text>
            </View>
          )}
        </View>
        <Text style={styles.metricLabel}>
          {isGrouping ? t('session.groupSize') : isScanned ? t('session.detected') : t('session.hits')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getAccuracyStyle(accuracy: number) {
  if (accuracy >= 80) return styles.accuracyGood;
  if (accuracy >= 50) return styles.accuracyOk;
  return styles.accuracyPoor;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  hitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accuracyGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  accuracyOk: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  accuracyPoor: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  accuracyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
