/**
 * HeroTarget
 *
 * Large preview card for the most recent target result.
 * Shows image (if scanned), distance badge, type badge, and key metric.
 */

import { isGroupingPaper, isPaperTarget } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react-native';
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

  const imageUrl = paperResult?.scanned_image_url;
  const hasImage = !!imageUrl;

  const isScanned = isPaper && !!paperResult?.scanned_image_url;
  const isGrouping = isPaper && isGroupingPaper(paperResult?.paper_type);

  const distance = target.distance_m;
  const dispersion = paperResult?.dispersion_cm;
  const hits = paperResult?.hits_total ?? target.tactical_result?.hits ?? 0;

  const typeLabel = isGrouping
    ? t('session.grouping')
    : isScanned
      ? t('session.scannedLabel')
      : t('session.manualLabel');
  const typeColor = isGrouping ? '#22C55E' : isScanned ? '#A78BFA' : '#60A5FA';

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

      {/* Bottom: Key metric only */}
      <View style={styles.overlay}>
        <Text style={styles.metricValue}>
          {isGrouping && dispersion != null ? `${dispersion.toFixed(1)}cm` : `${hits} ${isScanned ? t('session.holes') : t('session.hits')}`}
        </Text>
        <Text style={styles.metricLabel}>
          {isGrouping ? t('session.groupSize') : isScanned ? t('session.detected') : t('session.recorded')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 160,
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
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
