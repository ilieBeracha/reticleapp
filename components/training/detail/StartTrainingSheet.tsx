/**
 * StartTrainingSheet Component
 * Confirmation sheet for starting a training
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { StartTrainingSheetProps } from './types';

export function StartTrainingSheet({ visible, onClose, onStart, colors }: StartTrainingSheetProps) {
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setTimeout(onStart, 150);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 24) + 16,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.content}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Play size={32} color={colors.primary} fill={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Start Training?</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>
              This will set the status to{' '}
              <Text style={{ color: colors.green, fontWeight: '700' }}>LIVE</Text> and notify all
              assigned team members.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.text }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Play size={20} color={colors.background} fill={colors.background} />
            <Text style={[styles.confirmBtnText, { color: colors.background }]}>Confirm Start</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.6}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Not yet</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
