/**
 * CommanderActionsSheet Component
 * Action menu for training commanders
 */

import * as Haptics from 'expo-haptics';
import { CheckCircle2, Crosshair, Plus, Settings, Target, XCircle } from 'lucide-react-native';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CommanderActionsSheetProps } from './types';

export function CommanderActionsSheet({
  visible,
  onClose,
  onAddDrill,
  onAddCustomSession,
  onAssignWeapon,
  onFinishTraining,
  onSettings,
  onCancel,
  trainingStatus,
  colors,
}: CommanderActionsSheetProps) {
  const insets = useSafeAreaInsets();

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setTimeout(action, 150);
  };

  if (!visible) return null;

  const isOngoing = trainingStatus === 'ongoing';
  const isPlanned = trainingStatus === 'planned';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Sheet */}
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
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.title, { color: colors.textMuted }]}>Mission Control</Text>

          <View style={styles.menuContainer}>
            {/* Primary Actions Grid */}
            <View style={styles.gridActions}>
              {/* Add Drill - Always useful if editable */}
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: colors.card }]}
                onPress={() => handleAction(onAddDrill)}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Plus size={24} color={colors.primary} />
                </View>
                <Text style={[styles.gridLabel, { color: colors.text }]}>Add Drill</Text>
              </TouchableOpacity>

              {/* Add Custom Session to plan - only during ongoing training */}
              {isOngoing && (
                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: colors.card }]}
                  onPress={() => handleAction(onAddCustomSession)}
                >
                  <View style={[styles.gridIcon, { backgroundColor: colors.green + '15' }]}>
                    <Crosshair size={24} color={colors.green} />
                  </View>
                  <Text style={[styles.gridLabel, { color: colors.text }]}>Custom</Text>
                </TouchableOpacity>
              )}

              {/* Assign Weapon */}
              <TouchableOpacity
                style={[styles.gridBtn, { backgroundColor: colors.card }]}
                onPress={() => handleAction(onAssignWeapon)}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.yellow + '15' }]}>
                  <Target size={24} color={colors.yellow} />
                </View>
                <Text style={[styles.gridLabel, { color: colors.text }]}>Assign</Text>
              </TouchableOpacity>

              {/* Settings */}
              {isOngoing && (
                <TouchableOpacity
                  style={[styles.gridBtn, { backgroundColor: colors.card }]}
                  onPress={() => handleAction(onSettings)}
                >
                  <View style={[styles.gridIcon, { backgroundColor: colors.text + '10' }]}>
                    <Settings size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.gridLabel, { color: colors.text }]}>Settings</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Critical Actions List */}
            <View style={styles.listActions}>
              {isOngoing && (
                <TouchableOpacity
                  style={[styles.listBtn, { backgroundColor: colors.green + '10' }]}
                  onPress={() => handleAction(onFinishTraining)}
                >
                  <CheckCircle2 size={20} color={colors.green} />
                  <Text style={[styles.listLabel, { color: colors.green }]}>Complete Training</Text>
                </TouchableOpacity>
              )}

              {isPlanned && (
                <TouchableOpacity
                  style={[styles.listBtn, { backgroundColor: colors.red + '10' }]}
                  onPress={() => handleAction(onCancel)}
                >
                  <XCircle size={20} color={colors.red} />
                  <Text style={[styles.listLabel, { color: colors.red }]}>Cancel Training</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.textMuted }]}>Close Menu</Text>
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
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.6,
  },
  menuContainer: {
    gap: 20,
  },
  gridActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridBtn: {
    minWidth: '28%',
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  listActions: {
    gap: 10,
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
