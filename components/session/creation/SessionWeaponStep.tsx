/**
 * SessionWeaponStep - "Which weapon?"
 *
 * Step 2 in the 3-step flow. Premium 3D-style weapon selection.
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { createUserWeapon, type GlobalWeapon, type UserWeapon } from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Check, Crosshair, RefreshCw } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Position, SessionContextState } from './sessionCreation.types';

// ============================================================================
// TYPES
// ============================================================================

interface SessionWeaponStepProps {
  context: SessionContextState;
  onUpdateContext: (partial: Partial<SessionContextState>) => void;
  onContinue: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionWeaponStep({
  context,
  onUpdateContext,
  onContinue,
}: SessionWeaponStepProps) {
  const colors = useColors();
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

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
    },
    [onUpdateContext]
  );

  const handleCatalogWeaponSelect = useCallback(
    async (catalogWeapon: GlobalWeapon) => {
      try {
        const userWeapon = await createUserWeapon({
          name: catalogWeapon.name,
          base_weapon_id: catalogWeapon.id,
          category: catalogWeapon.category,
          caliber: catalogWeapon.caliber || undefined,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const config = userWeapon.category ? getCategoryConfig(userWeapon.category) : null;
        const update: Partial<SessionContextState> = {
          weaponId: userWeapon.id,
          weaponName: userWeapon.name,
          weaponCategory: userWeapon.category || null,
        };
        if (config) {
          update.distance = config.distances.zeroDistance;
          update.position = config.drillDefaults.defaultPosition as Position;
        }
        onUpdateContext(update);
        setShowWeaponPicker(false);
      } catch {
        setShowWeaponPicker(false);
        setShowCreateWeapon(true);
      }
    },
    [onUpdateContext]
  );

  const handleWeaponCreated = useCallback(
    async (weaponId: string) => {
      setShowCreateWeapon(false);
      try {
        const { getUserWeapon } = await import('@/services/weaponService');
        const weapon = await getUserWeapon(weaponId);
        if (weapon) {
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
        }
      } catch {
        setPickerKey((k) => k + 1);
        setShowWeaponPicker(true);
      }
    },
    [onUpdateContext]
  );

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  }, [onContinue]);

  const openPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.question, { color: colors.text }]}>Which weapon?</Text>

      {/* 3D Weapon Card */}
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={openPicker}
        activeOpacity={0.9}
      >
        {/* Shadow layers for 3D effect */}
        <View style={[styles.cardShadow3, { backgroundColor: colors.border }]} />
        <View style={[styles.cardShadow2, { backgroundColor: colors.secondary }]} />
        <View style={[styles.cardShadow1, { backgroundColor: colors.card }]} />

        {/* Main card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {hasWeapon ? (
            // Selected weapon display
            <>
              {/* Icon with glow effect */}
              <View style={styles.iconWrapper}>
                <View style={[styles.iconGlow, { backgroundColor: colors.text, opacity: 0.1 }]} />
                <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                  <Crosshair size={36} color={colors.text} strokeWidth={1.5} />
                </View>
              </View>

              {/* Weapon info */}
              <View style={styles.weaponInfo}>
                <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
                  {context.weaponName}
                </Text>
                {categoryConfig && (
                  <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                      {categoryConfig.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Check indicator */}
              <View style={[styles.checkCircle, { backgroundColor: colors.text }]}>
                <Check size={16} color={colors.background} strokeWidth={3} />
              </View>
            </>
          ) : (
            // Empty state
            <>
              <View style={styles.iconWrapper}>
                <View style={[styles.iconGlow, { backgroundColor: colors.textMuted, opacity: 0.05 }]} />
                <View style={[styles.iconCircle, styles.iconCircleEmpty, { backgroundColor: colors.secondary }]}>
                  <Crosshair size={36} color={colors.textMuted} strokeWidth={1.5} />
                </View>
              </View>

              <View style={styles.weaponInfo}>
                <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
                  Tap to select
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.border }]}>
                  Choose from your arsenal
                </Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Change weapon button - only when weapon selected */}
      {hasWeapon && (
        <TouchableOpacity
          style={[styles.changeButton, { backgroundColor: colors.card }]}
          onPress={openPicker}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.changeText, { color: colors.textMuted }]}>
            Change weapon
          </Text>
        </TouchableOpacity>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Continue Button - 3D style */}
      <View style={styles.continueWrapper}>
        {hasWeapon && (
          <View style={[styles.continueShadow, { backgroundColor: colors.border }]} />
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: hasWeapon ? colors.text : colors.secondary,
              transform: hasWeapon ? [{ translateY: -2 }] : [],
            },
          ]}
          onPress={handleContinue}
          disabled={!hasWeapon}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.continueText,
              { color: hasWeapon ? colors.background : colors.textMuted },
            ]}
          >
            Continue
          </Text>
          <ArrowRight
            size={20}
            color={hasWeapon ? colors.background : colors.textMuted}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <WeaponPicker
          key={pickerKey}
          selectedWeaponId={context.weaponId}
          onSelect={handleWeaponSelect}
          onSelectCatalog={handleCatalogWeaponSelect}
          onAddNew={() => {
            setShowWeaponPicker(false);
            setShowCreateWeapon(true);
          }}
          onClose={() => setShowWeaponPicker(false)}
        />
      </Modal>

      <Modal
        visible={showCreateWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateWeapon(false)}
      >
        <CreateWeaponFlow
          onComplete={handleWeaponCreated}
          onCancel={() => {
            setShowCreateWeapon(false);
            setShowWeaponPicker(true);
          }}
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
  question: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 32,
  },

  // 3D Card wrapper
  cardWrapper: {
    position: 'relative',
    height: 180,
    marginBottom: 16,
  },

  // Shadow layers for 3D depth
  cardShadow3: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 170,
    borderRadius: 20,
    opacity: 0.3,
  },
  cardShadow2: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    height: 172,
    borderRadius: 22,
  },
  cardShadow1: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 6,
    height: 174,
    borderRadius: 24,
    opacity: 0.7,
  },

  // Main card
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: 172,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    // Android shadow
    elevation: 12,
  },

  // Icon with glow
  iconWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircleEmpty: {
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.2)',
    borderStyle: 'dashed',
  },

  // Weapon info
  weaponInfo: {
    flex: 1,
    gap: 8,
  },
  weaponName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
  },

  // Check indicator
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Change button
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  changeText: {
    fontSize: 15,
    fontWeight: '500',
  },

  spacer: {
    flex: 1,
  },

  // Continue button with 3D
  continueWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  continueShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    borderRadius: 14,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 14,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
