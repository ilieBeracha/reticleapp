/**
 * SessionWeaponStep - "Which weapon?"
 *
 * Step 2 in the 3-step flow. Simple weapon selection from user's arsenal.
 * No weapon creation here - user should add weapons in their arsenal first.
 */

import { WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { UserWeapon } from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Crosshair, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { Position, SessionContextState } from './sessionCreation.types';

// ============================================================================
// TYPES
// ============================================================================

interface SessionWeaponStepProps {
  context: SessionContextState;
  onUpdateContext: (partial: Partial<SessionContextState>) => void;
  onContinue: () => void;
  isLoadingWeapon?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionWeaponStep({
  context,
  onUpdateContext,
  onContinue,
  isLoadingWeapon = false,
}: SessionWeaponStepProps) {
  const colors = useColors();
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);

  const effectiveCategory = context.weaponCategory as WeaponCategory | null;
  const categoryConfig = useMemo(
    () => (effectiveCategory ? getCategoryConfig(effectiveCategory) : null),
    [effectiveCategory]
  );

  const hasWeapon = context.weaponId !== null;

  const handleWeaponSelect = useCallback(
    (weapon: UserWeapon) => {
      const config = weapon.category ? getCategoryConfig(weapon.category) : null;
      const update: Partial<SessionContextState> = {
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponCategory: weapon.category || null,
      };
      if (config) {
        update.distance = config.distances.zeroDistance;
        update.position = config.drillDefaults.defaultPosition as Position;
      }
      onUpdateContext(update);
      setShowWeaponPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-advance after selection
      setTimeout(() => {
        onContinue();
      }, 200);
    },
    [onUpdateContext, onContinue]
  );

  const openPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Loading State - waiting for default weapon */}
      {isLoadingWeapon ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your weapon...
          </Text>
        </View>
      ) : hasWeapon ? (
        /* Selected Weapon State */
        <Animated.View entering={FadeIn.duration(200)}>
          {/* Compact header when weapon is selected */}
          <View style={styles.selectedHeader}>
            <Text style={[styles.selectedLabel, { color: colors.textMuted }]}>Weapon</Text>
            <TouchableOpacity 
              onPress={openPicker} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.changeLink, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Selected weapon card */}
          <TouchableOpacity
            style={[styles.selectedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={openPicker}
            activeOpacity={0.7}
          >
            <View style={[styles.selectedIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Crosshair size={24} color={colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
                {context.weaponName}
              </Text>
              {categoryConfig && (
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
                    {categoryConfig.label}
                  </Text>
                </View>
              )}
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Context hint */}
          <Text style={[styles.contextHint, { color: colors.textMuted }]}>
            Tap "Change" to switch weapon
          </Text>
        </Animated.View>
      ) : (
        /* Empty State - No weapon available */
        <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyContainer}>
          {/* Icon */}
          <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.textMuted}08` }]}>
            <View style={[styles.emptyIconInner, { borderColor: `${colors.textMuted}20` }]}>
              <Target size={40} color={colors.textMuted} strokeWidth={1.2} />
            </View>
          </View>

          {/* Text */}
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No weapon selected
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Choose from your arsenal to continue
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.text }]}
            onPress={openPicker}
            activeOpacity={0.8}
          >
            <Crosshair size={18} color={colors.background} strokeWidth={2} />
            <Text style={[styles.selectButtonText, { color: colors.background }]}>
              Choose Weapon
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Weapon Picker Modal */}
      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <WeaponPicker
          selectedWeaponId={context.weaponId}
          onSelect={handleWeaponSelect}
          onClose={() => setShowWeaponPicker(false)}
          hideAddNew
        />
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SELECTED STATE
  // ─────────────────────────────────────────────────────────────────────────
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    flex: 1,
    gap: 4,
  },
  selectedName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  contextHint: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
