/**
 * WatchChoiceModal
 *
 * Modal shown when starting a session with a connected Garmin watch.
 * Asks user if they want to use the watch or phone only for this session.
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Smartphone, Watch } from 'lucide-react-native';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WatchChoiceModalProps {
  visible: boolean;
  onChooseWatch: () => void;
  onChoosePhone: () => void;
}

export function WatchChoiceModal({
  visible,
  onChooseWatch,
  onChoosePhone,
}: WatchChoiceModalProps) {
  const colors = useColors();

  const handleChooseWatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChooseWatch();
  };

  const handleChoosePhone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChoosePhone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Watch size={32} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Garmin Watch Connected
          </Text>

          <Text style={[styles.description, { color: colors.textMuted }]}>
            Would you like to track this session with your watch or use your phone only?
          </Text>

          {/* Options */}
          <View style={styles.options}>
            {/* Use Watch Option */}
            <TouchableOpacity
              style={[styles.optionCard, styles.watchOption, { borderColor: colors.primary }]}
              onPress={handleChooseWatch}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Watch size={24} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Use Watch
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Track shots & timing on your Garmin
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Phone Only Option */}
            <TouchableOpacity
              style={[styles.optionCard, { borderColor: colors.border }]}
              onPress={handleChoosePhone}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.secondary }]}>
                <Smartphone size={24} color={colors.textMuted} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Phone Only
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Manual entry without watch
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            You can change this for each session
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  options: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  watchOption: {
    backgroundColor: 'rgba(147, 197, 253, 0.08)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default WatchChoiceModal;
