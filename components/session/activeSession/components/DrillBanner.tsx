/**
 * DrillBanner
 *
 * Shows drill requirements and progress for structured drills.
 * Displays distance, shots, time limit, accuracy requirement, and completion progress.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionDrillConfig, SessionWithDetails } from '@/types/session';
import { formatMaxShots } from '@/utils/drillShots';
import { Camera, Check, Clock, Focus, Lock, MapPin, Target, Trophy, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../activeSession.constants';
import { formatDistanceDisplay, formatTime } from '../activeSession.helpers';
import type { DrillProgress } from '@/types/activeSession';

interface DrillBannerProps {
  session: SessionWithDetails;
  drill: SessionDrillConfig;
  drillProgress: DrillProgress | null;
  targets: any[];
  isGroupingDrill: boolean;
  isTacticalDrill: boolean;
  weaponName?: string | null;
  isLocked?: boolean;
}

export function DrillBanner({
  session,
  drill,
  drillProgress,
  targets,
  isGroupingDrill,
  isTacticalDrill,
  weaponName,
  isLocked = false,
}: DrillBannerProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.inner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <View style={[styles.typeIcon, { backgroundColor: isLocked ? colors.primary + '20' : colors.secondary }]}>
            {isLocked ? (
              <Lock size={16} color={colors.primary} />
            ) : isGroupingDrill ? (
              <Focus size={16} color={colors.text} />
            ) : (
              <Trophy size={16} color={colors.text} />
            )}
          </View>
          <View style={styles.infoText}>
            <View style={styles.requirements}>
              {weaponName && (
                <View style={styles.reqItem}>
                  <Target size={12} color={colors.primary} />
                  <Text style={[styles.reqText, { color: colors.primary, fontWeight: '600' }]}>{weaponName}</Text>
                </View>
              )}
              <View style={styles.reqItem}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={[styles.reqText, { color: colors.text }]}>
                  {/* Soldier's choice first, then commander's distance/category */}
                  {session.soldier_distance_m
                    ? `${session.soldier_distance_m}m`
                    : formatDistanceDisplay(drill.distance_m, drill.distance_category, t)}
                </Text>
              </View>
              <View style={styles.reqItem}>
                {isTacticalDrill ? (
                  <>
                    <Zap size={12} color={colors.textMuted} />
                    <Text style={[styles.reqText, { color: colors.text }]}>
                      {t('session.shotsPerRound', {
                        shots: drillProgress?.bulletsPerRound ?? drill.rounds_per_shooter,
                      })}
                    </Text>
                  </>
                ) : (
                  <>
                    <Camera size={12} color={colors.textMuted} />
                    <Text style={[styles.reqText, { color: colors.text }]}>
                      {t('session.scanMax', { max: formatMaxShots(drill.rounds_per_shooter) })}
                    </Text>
                  </>
                )}
              </View>
              {drill.time_limit_seconds && (
                <View style={styles.reqItem}>
                  <Clock size={12} color={drillProgress?.overTime ? COLORS.error : colors.textMuted} />
                  <Text style={[styles.reqText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
                    {formatTime(drill.time_limit_seconds)}
                  </Text>
                </View>
              )}
              {drill.min_accuracy_percent && (
                <View style={styles.reqItem}>
                  <Target size={12} color={colors.textMuted} />
                  <Text style={[styles.reqText, { color: colors.text }]}>{drill.min_accuracy_percent}%</Text>
                </View>
              )}
            </View>
          </View>
          {drillProgress?.isComplete && (
            <View style={[styles.completeBadge, { backgroundColor: colors.secondary }]}>
              <Check size={14} color={colors.text} />
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${drillProgress?.targetsProgress || 0}%`,
                  backgroundColor: drillProgress?.isComplete ? colors.green : colors.text,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {t('session.entries', { current: targets.length, required: drillProgress?.requiredTargets ?? 1 })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  requirements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  completeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
