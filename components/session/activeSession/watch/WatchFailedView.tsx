/**
 * WatchFailedView
 *
 * Shown when watch connection fails.
 * Offers options to retry watch or continue with phone.
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Watch, X } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from '../activeSession.styles';

interface WatchFailedViewProps {
  insets: EdgeInsets;
  drillName: string;
  watchStarting: boolean;
  onClose: () => void;
  onRetry: () => void;
  onContinueWithoutWatch: () => void;
  isTeamTraining: boolean;
}

export function WatchFailedView({
  insets,
  drillName,
  watchStarting,
  onClose,
  onRetry,
  onContinueWithoutWatch,
  isTeamTraining,
}: WatchFailedViewProps) {
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
        <View style={{ width: 36 }} />
      </View>

      <View style={sharedStyles.watchWaitingContainer}>
        <View style={[styles.iconLarge, { backgroundColor: colors.secondary }]}>
          <Watch size={56} color={colors.textMuted} strokeWidth={1.5} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Watch Not Responding</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>No worries — you can continue on your phone</Text>

        <View style={[styles.actions, { marginTop: 32 }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.text }]}
            onPress={onContinueWithoutWatch}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.background} />
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>Use Phone</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subtleBtn, { borderColor: colors.border, marginTop: 12 }]}
            onPress={onRetry}
            disabled={watchStarting}
          >
            {watchStarting ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Text style={[styles.subtleBtnText, { color: colors.textMuted }]}>Try Watch Again</Text>
            )}
          </TouchableOpacity>
        </View>
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
  actions: {
    width: '100%',
    paddingHorizontal: 32,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
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
