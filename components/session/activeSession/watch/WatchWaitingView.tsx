/**
 * WatchWaitingView
 *
 * Shown while session is running on watch.
 * Phone is passive - shows status and offers end option.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionDrillConfig } from '@/services/session/types';
import { MapPin, Target, Watch, X } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from '../activeSession.styles';

interface WatchWaitingViewProps {
  insets: EdgeInsets;
  drillName: string;
  drill: SessionDrillConfig | null | undefined;
  isWatchConnected: boolean;
  ending: boolean;
  onClose: () => void;
  onEndSession: () => void;
  isTeamTraining: boolean;
}

export function WatchWaitingView({
  insets,
  drillName,
  drill,
  isWatchConnected,
  ending,
  onClose,
  onEndSession,
  isTeamTraining,
}: WatchWaitingViewProps) {
  const colors = useColors();

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
        <View style={[styles.statusBadge, { backgroundColor: isWatchConnected ? '#10B98120' : '#F59E0B20' }]}>
          <View style={[styles.statusDot, { backgroundColor: isWatchConnected ? '#10B981' : '#F59E0B' }]} />
          <Text style={[styles.statusText, { color: isWatchConnected ? '#10B981' : '#F59E0B' }]}>
            {isWatchConnected ? 'Active' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={sharedStyles.watchWaitingContainer}>
        <View style={[styles.iconLarge, { backgroundColor: isWatchConnected ? '#10B98115' : colors.secondary }]}>
          <Watch size={56} color={isWatchConnected ? '#10B981' : colors.textMuted} strokeWidth={1.5} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Session Running on Watch</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Focus on your shooting. Check your wrist for time.
        </Text>

        {drill && (
          <View style={[styles.drillChip, { backgroundColor: colors.card }]}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[styles.drillChipText, { color: colors.text }]}>{drill.distance_m}m</Text>
            <View style={[styles.drillChipDivider, { backgroundColor: colors.border }]} />
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.drillChipText, { color: colors.text }]}>{drill.rounds_per_shooter} shots</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.subtleBtn, { borderColor: colors.border }]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={[styles.subtleBtnText, { color: colors.textMuted }]}>End Session from Phone</Text>
          )}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
