/**
 * SessionCreationForm - Unified UI for solo & training sessions
 *
 * Same form for both contexts:
 * - Solo: User picks everything (purpose, weapon, distance, etc.)
 * - Training: Purpose + params pre-filled from drill, user confirms + picks weapon
 *
 * The form renders inline - parent controls the modal/sheet presentation.
 */

import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { useColors } from '@/hooks/ui/useColors';
import { getOrCreatePersonalProfile, getUserWeapon, type UserWeapon } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionContextStep } from './SessionContextStep';
import { SessionIntentStep } from './SessionIntentStep';
import type { Position, SessionContextState, SessionPurpose } from './sessionCreation.types';

// ============================================================================
// TYPES
// ============================================================================

export interface DrillContext {
  drillId: string;
  drillName: string;
  drillGoal: 'grouping' | 'engagement';
  targetType: 'paper' | 'tactical';
  distanceM: number;
  roundsPerShooter: number;
  timeLimitSeconds?: number | null;
  position?: string | null;
}

export interface TrainingContext {
  trainingId: string;
  teamId: string | null;
  drill: DrillContext;
}

export interface SessionFormValues {
  purpose: SessionPurpose;
  weaponId: string;
  weaponName: string;
  weaponCategory: string | null;
  distance: number;
  shotsPlanned: number;
  position: Position;
  targetType: 'paper' | 'tactical' | 'steel' | 'ipsc';
  timeLimit: number | null;
  stressDrill: boolean;
  notes: string;
}

export interface SessionCreationFormProps {
  /** Training context - when provided, form is pre-filled from drill */
  trainingContext?: TrainingContext;
  /** Pre-selected weapon (from team assignment, etc.) */
  initialWeapon?: UserWeapon | null;
  /** Loading weapon state */
  loadingWeapon?: boolean;
  /** Team ID for weapon picker filtering */
  teamId?: string | null;
  /** Hide weapon selection (for training planning - soldiers pick weapon later) */
  hideWeapon?: boolean;
  /** Called when form is ready to submit */
  onSubmit: (values: SessionFormValues) => void;
  /** Loading state for submit button */
  isSubmitting?: boolean;
  /** Submit button text */
  submitLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionCreationForm({
  trainingContext,
  initialWeapon,
  loadingWeapon = false,
  teamId,
  hideWeapon = false,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Continue',
}: SessionCreationFormProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  // Purpose (step 1) - pre-filled from drill if in training context
  const [purpose, setPurpose] = useState<SessionPurpose | null>(trainingContext?.drill.drillGoal || null);

  // Weapon
  const [selectedWeapon, setSelectedWeapon] = useState<UserWeapon | null>(initialWeapon || null);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [convertingWeapon, setConvertingWeapon] = useState(false);

  // Context (step 2) - pre-filled from drill if in training context
  const [context, setContext] = useState<SessionContextState>(() => {
    if (trainingContext?.drill) {
      const d = trainingContext.drill;
      return {
        weaponId: initialWeapon?.id || null,
        weaponName: initialWeapon?.name || null,
        weaponCategory: initialWeapon?.category || null,
        distance: d.distanceM,
        position: (d.position as Position) || 'any',
        targetType: d.targetType,
        shotsPlanned: d.roundsPerShooter,
        timeLimit: d.timeLimitSeconds || null,
        stressDrill: false,
        ammoType: null,
        windCondition: null,
        timeOfDay: 'day',
        notes: '',
      };
    }
    return {
      weaponId: initialWeapon?.id || null,
      weaponName: initialWeapon?.name || null,
      weaponCategory: initialWeapon?.category || null,
      distance: 25,
      position: 'any',
      targetType: 'paper',
      shotsPlanned: 5,
      timeLimit: null,
      stressDrill: false,
      ammoType: null,
      windCondition: null,
      timeOfDay: 'day',
      notes: '',
    };
  });

  // Helper to set weapon in both state and context
  const setWeaponState = useCallback((weapon: UserWeapon) => {
    setSelectedWeapon(weapon);
    setContext((prev) => ({
      ...prev,
      weaponId: weapon.id,
      weaponName: weapon.name,
      weaponCategory: weapon.category || null,
    }));
  }, []);

  // Update weapon in context when selected
  const handleWeaponSelect = useCallback(
    async (weapon: UserWeapon) => {
      setShowWeaponPicker(false);

      // If this is a team weapon (has team_id), convert to personal profile
      // This ensures weapon_id used in session is a user_weapon ID
      if ('team_id' in weapon && weapon.team_id) {
        try {
          setConvertingWeapon(true);
          const personalProfile = await getOrCreatePersonalProfile(weapon.id);
          setWeaponState(personalProfile);
        } catch (error) {
          console.error('[SessionCreationForm] Failed to create personal profile:', error);
          // Fallback to using the weapon directly
          setWeaponState(weapon);
        } finally {
          setConvertingWeapon(false);
        }
      } else {
        // Already a user weapon
        setWeaponState(weapon);
      }
    },
    [setWeaponState]
  );

  const handleWeaponCreatedById = useCallback(
    async (weaponId: string) => {
      setShowCreateWeapon(false);
      try {
        const weapon = await getUserWeapon(weaponId);
        if (weapon) {
          handleWeaponSelect(weapon);
        }
      } catch (error) {
        console.error('[SessionCreationForm] Failed to fetch created weapon:', error);
      }
    },
    [handleWeaponSelect]
  );

  const handleUpdateContext = useCallback((partial: Partial<SessionContextState>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────────────────────────────────

  const isFromDrill = !!trainingContext?.drill;
  const canSubmit = purpose !== null && (hideWeapon || selectedWeapon !== null) && !convertingWeapon;

  // Current step for non-drill flow
  const currentStep = useMemo(() => {
    if (isFromDrill) return 'context'; // Skip intent step when drill provides it
    if (purpose === null) return 'intent';
    return 'context';
  }, [purpose, isFromDrill]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handlePurposeSelect = useCallback((p: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurpose(p);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !purpose) return;
    if (!hideWeapon && !selectedWeapon) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    onSubmit({
      purpose,
      weaponId: selectedWeapon?.id || '',
      weaponName: selectedWeapon?.name || '',
      weaponCategory: selectedWeapon?.category || null,
      distance: context.distance,
      shotsPlanned: context.shotsPlanned,
      position: context.position,
      targetType: context.targetType,
      timeLimit: context.timeLimit,
      stressDrill: context.stressDrill,
      notes: context.notes,
    });
  }, [canSubmit, purpose, selectedWeapon, context, onSubmit, hideWeapon]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Drill Header (when in training context) */}
        {isFromDrill && trainingContext && (
          <View style={[styles.drillHeader, { backgroundColor: colors.card }]}>
            <View style={[styles.drillIcon, { backgroundColor: colors.primary + '15' }]}>
              <Target size={24} color={colors.primary} />
            </View>
            <View style={styles.drillInfo}>
              <Text style={[styles.drillName, { color: colors.text }]}>{trainingContext.drill.drillName}</Text>
              <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
                {trainingContext.drill.distanceM}m • {trainingContext.drill.roundsPerShooter} rounds
                {trainingContext.drill.timeLimitSeconds ? ` • ${trainingContext.drill.timeLimitSeconds}s` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Step 1: Intent (only if not from drill) */}
        {currentStep === 'intent' && (
          <SessionIntentStep selectedPurpose={purpose} onSelectPurpose={handlePurposeSelect} />
        )}

        {/* Step 2: Context */}
        {currentStep === 'context' && purpose && (
          <>
            {/* Weapon Selector (only if not hidden) */}
            {!hideWeapon && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
                {loadingWeapon || convertingWeapon ? (
                  <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>
                      {convertingWeapon ? 'Setting up weapon...' : 'Loading...'}
                    </Text>
                  </View>
                ) : selectedWeapon ? (
                  <TouchableOpacity
                    style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Crosshair size={20} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>{selectedWeapon.name}</Text>
                      {selectedWeapon.category && (
                        <Text style={[styles.weaponCategory, { color: colors.textMuted }]}>
                          {selectedWeapon.category}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.weaponEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponEmptyIcon, { backgroundColor: colors.secondary }]}>
                      <Plus size={20} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.weaponEmptyText, { color: colors.textMuted }]}>Select Weapon</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Session Details */}
            <SessionContextStep
              purpose={purpose}
              context={context}
              onUpdateContext={handleUpdateContext}
              onBack={() => setPurpose(null)}
              weaponCategory={selectedWeapon?.category}
              hideWeaponSection
            />
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? colors.text : colors.secondary,
              opacity: canSubmit ? 1 : 0.6,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.background }]}>{submitLabel}</Text>
          )}
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
          selectedWeaponId={selectedWeapon?.id || null}
          onSelect={handleWeaponSelect}
          onClose={() => setShowWeaponPicker(false)}
          onAddNew={() => {
            setShowWeaponPicker(false);
            setShowCreateWeapon(true);
          }}
          teamId={teamId || undefined}
        />
      </Modal>

      <Modal
        visible={showCreateWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateWeapon(false)}
      >
        <CreateWeaponFlow
          onComplete={handleWeaponCreatedById}
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Drill Header
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 14,
  },
  drillIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
    gap: 2,
  },
  drillName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  drillMeta: {
    fontSize: 13,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weapon Card
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  weaponIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  weaponCategory: {
    fontSize: 12,
  },
  weaponLoadingText: {
    fontSize: 14,
  },
  weaponEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
  },
  weaponEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
