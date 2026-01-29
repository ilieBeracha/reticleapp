/**
 * CompactStats
 *
 * Horizontal stats bar showing session totals.
 * Adapts display based on target types (manual/scan/grouping).
 */

import { isGroupingPaper, isPaperTarget } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface CompactStatsProps {
  targets: any[];
}

export function CompactStats({ targets }: CompactStatsProps) {
  const colors = useColors();
  const { t } = useTranslation();

  let manualShots = 0;
  let manualHits = 0;
  let scannedHoles = 0;
  let bestDispersion: number | null = null;
  let groupingCount = 0;
  let scanCount = 0;
  let manualCount = 0;

  for (const t of targets) {
    const isPaper = isPaperTarget(t.target_type);
    const paperResult = t.paper_result;
    const tacticalResult = t.tactical_result;
    const isScanned = isPaper && !!paperResult?.scanned_image_url;
    const isGrouping = isPaper && isGroupingPaper(paperResult?.paper_type);

    if (isGrouping) {
      groupingCount++;
      const disp = paperResult?.dispersion_cm;
      if (disp != null && (bestDispersion == null || disp < bestDispersion)) {
        bestDispersion = disp;
      }
    } else if (isScanned) {
      scanCount++;
      scannedHoles += paperResult?.hits_total ?? 0;
    } else {
      manualCount++;
      manualShots += paperResult?.bullets_fired ?? tacticalResult?.bullets_fired ?? 0;
      manualHits += paperResult?.hits_total ?? tacticalResult?.hits ?? 0;
    }
  }

  const manualAccuracy = manualShots > 0 ? Math.round((manualHits / manualShots) * 100) : 0;
  const totalTargets = targets.length;

  const hasManual = manualCount > 0;
  const hasScan = scanCount > 0;
  const hasGrouping = groupingCount > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.item}>
        <Text style={[styles.value, { color: colors.text }]}>{totalTargets}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.targetsLabel', { count: totalTargets })}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {hasManual ? (
        <>
          <View style={styles.item}>
            <Text
              style={[
                styles.value,
                { color: manualAccuracy >= 70 ? '#22C55E' : manualAccuracy >= 50 ? '#F59E0B' : colors.text },
              ]}
            >
              {manualAccuracy}%
            </Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.accuracy')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <Text style={[styles.value, { color: colors.text }]}>
              {manualHits}/{manualShots}
            </Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.hits')}</Text>
          </View>
        </>
      ) : hasScan ? (
        <>
          <View style={styles.item}>
            <Text style={[styles.value, { color: '#A78BFA' }]}>{scannedHoles}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.holes')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <Text style={[styles.value, { color: colors.textMuted, fontSize: 11 }]}>{t('session.noAcc')}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.scannedLabel')}</Text>
          </View>
        </>
      ) : hasGrouping && bestDispersion != null ? (
        <>
          <View style={styles.item}>
            <Text style={[styles.value, { color: '#22C55E' }]}>{bestDispersion.toFixed(1)}cm</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.best')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <Text style={[styles.value, { color: colors.text }]}>{groupingCount}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.groups', { count: groupingCount })}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.item}>
            <Text style={[styles.value, { color: colors.textMuted }]}>-</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.awaiting')}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.item}>
            <Text style={[styles.value, { color: colors.textMuted }]}>-</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.data')}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
  },
});
