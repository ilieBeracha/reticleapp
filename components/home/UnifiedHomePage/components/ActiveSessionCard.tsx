/**
 * ActiveSessionCard Component
 *
 * Displays the currently active session with live indicator,
 * mini stats display, and dropdown menu for cancel action.
 */

import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Circle,
  Clock,
  MoreVertical,
  Ruler,
  Target,
  Trash2,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';
import { styles } from '../UnifiedHomePage.styles';
import type { ActiveSessionCardProps } from '../UnifiedHomePage.types';

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(startedAt: Date | null): string {
  if (!startedAt) return '--';
  const now = new Date();
  const diffMs = now.getTime() - startedAt.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActiveSessionCard({ session, colors, onPress, onCancel }: ActiveSessionCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(true);
  };

  const handleCancel = () => {
    setShowMenu(false);
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session? All data will be lost.',
      [
        { text: 'Keep Session', style: 'cancel' },
        {
          text: 'Cancel Session',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onCancel?.();
          },
        },
      ]
    );
  };

  // Extract data from session
  const drillConfig = session.sourceSession?.drill_config;
  const distance = drillConfig?.distance_m;
  const roundsPlanned = drillConfig?.rounds_per_shooter;
  const weaponName = session.sourceSession?.weapon_name;
  const shotsFired = session.stats?.shots ?? 0;

  return (
    <>
      <TouchableOpacity
        style={[localStyles.card, { backgroundColor: colors.card, borderColor: colors.green }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Top Row: Live indicator + Menu */}
        <View style={localStyles.topRow}>
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={styles.liveLabel}>IN PROGRESS</Text>
          </View>
          {onCancel && (
            <TouchableOpacity
              style={localStyles.menuBtn}
              onPress={handleMenuPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreVertical size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title + Duration */}
        <View style={localStyles.titleRow}>
          <Text style={[styles.activeTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drillName || 'Practice Session'}
          </Text>
          <View style={localStyles.durationBadge}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[localStyles.durationText, { color: colors.textMuted }]}>
              {formatDuration(session.startedAt)}
            </Text>
          </View>
        </View>

        {/* Mini Stats Row */}
        <View style={localStyles.statsRow}>
          {weaponName && (
            <View style={localStyles.statItem}>
              <Target size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[localStyles.statText, { color: colors.text }]} numberOfLines={1}>
                {weaponName}
              </Text>
            </View>
          )}
          {distance && (
            <View style={localStyles.statItem}>
              <Ruler size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[localStyles.statText, { color: colors.text }]}>{distance}m</Text>
            </View>
          )}
          {(roundsPlanned || shotsFired > 0) && (
            <View style={localStyles.statItem}>
              <Circle size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[localStyles.statText, { color: colors.text }]}>
                {shotsFired}
                {roundsPlanned ? `/${roundsPlanned}` : ''} shots
              </Text>
            </View>
          )}
        </View>

        {/* Continue Arrow */}
        <View style={[styles.activeArrow, { backgroundColor: colors.green }]}>
          <ArrowRight size={18} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Dropdown Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={localStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[localStyles.menuContainer, { backgroundColor: colors.card }]}
          >
            <View style={[localStyles.menuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[localStyles.menuTitle, { color: colors.text }]}>Session Options</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={localStyles.menuItem} onPress={handleCancel} activeOpacity={0.7}>
              <Trash2 size={18} color="#EF4444" />
              <Text style={[localStyles.menuItemText, { color: '#EF4444' }]}>
                Cancel Session
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const localStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuBtn: {
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 100,
  },

  // Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
