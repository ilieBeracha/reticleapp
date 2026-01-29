/**
 * WatchStartingView
 *
 * Shown while connecting to watch.
 * Simple loading state with minimal UI.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { Watch, X } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from '../activeSession.styles';

interface WatchStartingViewProps {
  insets: EdgeInsets;
  drillName: string;
  onClose: () => void;
  isTeamTraining: boolean;
}

export function WatchStartingView({ insets, drillName, onClose, isTeamTraining }: WatchStartingViewProps) {
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
        <View style={[styles.iconLarge, { backgroundColor: colors.secondary }]}>
          <Watch size={56} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('session.connectingToWatch')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('session.justAMoment')}</Text>
        <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 24 }} />
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
});
