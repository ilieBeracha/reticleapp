/**
 * TrainingSettingsModal Component
 * Modal for training settings like auto-close
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timer, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { updateTraining } from '@/services/trainingService';
import type { TrainingSettingsModalProps } from './types';

export function TrainingSettingsModal({
  visible,
  onClose,
  training,
  onUpdate,
  colors,
}: TrainingSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(!!training?.auto_close_at);
  const [hours, setHours] = useState('2');
  const [mins, setMins] = useState('0');

  useEffect(() => {
    if (training?.auto_close_at) {
      const now = new Date();
      const end = new Date(training.auto_close_at);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setHours(String(h));
      setMins(String(m));
      setAutoCloseEnabled(true);
    } else {
      setAutoCloseEnabled(false);
      setHours('2');
      setMins('0');
    }
  }, [training?.auto_close_at, visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let autoCloseAt: string | null = null;
      if (autoCloseEnabled) {
        const h = parseInt(hours, 10) || 0;
        const m = parseInt(mins, 10) || 0;
        if (h > 0 || m > 0) {
          const closeTime = new Date();
          closeTime.setHours(closeTime.getHours() + h);
          closeTime.setMinutes(closeTime.getMinutes() + m);
          autoCloseAt = closeTime.toISOString();
        }
      }

      await updateTraining(training.id, { auto_close_at: autoCloseAt });
      onUpdate({ ...training, auto_close_at: autoCloseAt });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <XCircle size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Timer size={20} color={colors.text} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Auto-close</Text>
                  <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                    Automatically finish training
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  { backgroundColor: autoCloseEnabled ? colors.green : colors.secondary },
                ]}
                onPress={() => setAutoCloseEnabled(!autoCloseEnabled)}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.background,
                      transform: [{ translateX: autoCloseEnabled ? 18 : 2 }],
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>

            {autoCloseEnabled && (
              <View style={styles.timeInputRow}>
                <Text style={[styles.timeInputLabel, { color: colors.textMuted }]}>Close in:</Text>
                <View style={styles.timeInputs}>
                  <View style={[styles.timeInputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[styles.timeInput, { color: colors.text }]}
                      value={hours}
                      onChangeText={setHours}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={[styles.timeInputUnit, { color: colors.textMuted }]}>h</Text>
                  </View>
                  <View style={[styles.timeInputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[styles.timeInput, { color: colors.text }]}
                      value={mins}
                      onChangeText={setMins}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={[styles.timeInputUnit, { color: colors.textMuted }]}>m</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.text }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.background }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  timeInputLabel: {
    fontSize: 14,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  timeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  timeInput: {
    fontSize: 16,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  timeInputUnit: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
