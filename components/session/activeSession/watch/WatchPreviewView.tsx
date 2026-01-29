/**
 * WatchPreviewView
 *
 * Shown when watch is ready but waiting for user to tap.
 * Displays drill info and waiting status.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionDrillConfig } from '@/types/session';
import { MapPin, Target, Watch, X, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { formatDistanceDisplay } from '@/utils/activeSession.helpers';
import { styles as sharedStyles } from '../activeSession.styles';

interface WatchPreviewViewProps {
  insets: EdgeInsets;
  drillName: string;
  drill: SessionDrillConfig | null | undefined;
  isWatchConnected: boolean;
  watchAppNotOpen: boolean;
  ending: boolean;
  onClose: () => void;
  onContinueWithoutWatch: () => void;
  weaponName?: string | null;
  isTeamTraining: boolean;
}

export function WatchPreviewView({
  insets,
  drillName,
  drill,
  watchAppNotOpen,
  ending,
  onClose,
  onContinueWithoutWatch,
  weaponName,
  isTeamTraining,
}: WatchPreviewViewProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={[sharedStyles.container, { backgroundColor: colors.background }]}>
      <View style={[sharedStyles.header, { paddingTop: insets.top + 12 }]}>
        {isTeamTraining ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity style={[sharedStyles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={sharedStyles.headerCenter}>
          <Text style={[sharedStyles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={sharedStyles.watchWaitingContainer}>
        <View style={[styles.iconLarge, { backgroundColor: watchAppNotOpen ? '#F59E0B15' : '#10B98115' }]}>
          <Watch size={56} color={watchAppNotOpen ? '#F59E0B' : '#10B981'} strokeWidth={1.5} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {watchAppNotOpen ? t('session.openWatchApp') : t('session.tapWatchToStart')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, paddingHorizontal: 40 }]}>
          {watchAppNotOpen ? t('session.openReticleIQOnGarmin') : t('session.sessionReadyTapWatch')}
        </Text>

        {drill && (
          <View style={[styles.drillChip, { backgroundColor: colors.card }]}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[styles.drillChipText, { color: colors.text }]}>
              {formatDistanceDisplay(drill.distance_m, drill.distance_category, t)}
            </Text>
            <View style={[styles.drillChipDivider, { backgroundColor: colors.border }]} />
            <Zap size={14} color={colors.textMuted} />
            <Text style={[styles.drillChipText, { color: colors.text }]}>
              {t('session.shotsCount', { count: drill.rounds_per_shooter })}
            </Text>
          </View>
        )}

        {weaponName && (
          <View style={[styles.drillChip, { backgroundColor: colors.card, marginTop: 8 }]}>
            <Target size={14} color={colors.primary} />
            <Text style={[styles.drillChipText, { color: colors.text }]}>{weaponName}</Text>
          </View>
        )}

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[{ fontSize: 12, marginTop: 8 }, { color: colors.textMuted }]}>{t('session.waiting')}</Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.subtleBtn, { borderColor: colors.border }]}
          onPress={onContinueWithoutWatch}
          disabled={ending}
        >
          <Text style={[styles.subtleBtnText, { color: colors.textMuted }]}>{t('session.usePhoneInstead')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  drillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 28,
  },
  drillChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  drillChipDivider: {
    width: 1,
    height: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subtleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  subtleBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
