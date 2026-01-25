/**
 * CustomSessionCard - Bottom sheet form for creating a custom session within a training
 *
 * Shows a button that opens a bottom sheet with the session creation form
 * (purpose toggle + SessionContextStep). On submit, starts the session immediately.
 */

import { CaptureModePickerInline, type CaptureMode } from '@/components/session/CaptureModePicker';
import { SessionContextStep } from '@/components/session/creation';
import type { SessionContextState, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Crosshair, Play, Target } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomSessionConfig {
  purpose: SessionPurpose;
  distance: number;
  shotsPlanned: number;
  position: string | null;
  targetType: 'paper' | 'tactical';
  timeLimit: number | null;
  watchControlled: boolean;
  detectionSensitivity?: number;
}

interface CustomSessionCardProps {
  onStartSession: (config: CustomSessionConfig) => Promise<void>;
  hasWeapon: boolean;
  isStarting: boolean;
  isWatchConnected: boolean;
  /** Controlled mode: if provided, modal visibility is controlled externally */
  visible?: boolean;
  /** Controlled mode: callback when modal should close */
  onClose?: () => void;
  /** Hide the trigger button (use when controlled) */
  hideTrigger?: boolean;
}

// ============================================================================
// DEFAULT FORM STATE
// ============================================================================

const DEFAULT_CONTEXT: SessionContextState = {
  weaponId: null,
  weaponName: null,
  weaponCategory: null,
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

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomSessionCard({
  onStartSession,
  hasWeapon,
  isStarting,
  isWatchConnected,
  visible,
  onClose,
  hideTrigger = false,
}: CustomSessionCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [internalShowSheet, setInternalShowSheet] = useState(false);
  const [purpose, setPurpose] = useState<SessionPurpose>('grouping');
  const [context, setContext] = useState<SessionContextState>(DEFAULT_CONTEXT);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('phone');
  const [sensitivity, setSensitivity] = useState(3.5); // Default: 3.5

  // Use controlled visibility if provided, otherwise internal state
  const showSheet = visible !== undefined ? visible : internalShowSheet;
  const setShowSheet = visible !== undefined ? (v: boolean) => !v && onClose?.() : setInternalShowSheet;

  // Reset state when sheet closes
  useEffect(() => {
    if (!showSheet) {
      setPurpose('grouping');
      setContext(DEFAULT_CONTEXT);
      setCaptureMode('phone');
      setSensitivity(2);
    }
  }, [showSheet]);

  const handlePurposeSelect = useCallback((p: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurpose(p);
  }, []);

  const handleUpdateContext = useCallback((partial: Partial<SessionContextState>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const mapPosition = (pos: string | null): string | null => {
    if (!pos || pos === 'any') return null;
    if (pos === 'seated') return 'sitting';
    return pos;
  };

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSheet(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowSheet(false);
  }, []);

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isWatchMode = captureMode === 'watch';

    await onStartSession({
      purpose,
      distance: context.distance,
      shotsPlanned: context.shotsPlanned,
      position: mapPosition(context.position),
      targetType: context.targetType === 'paper' || context.targetType === 'tactical' ? context.targetType : 'paper',
      timeLimit: context.timeLimit,
      watchControlled: isWatchMode,
      detectionSensitivity: isWatchMode ? sensitivity : undefined,
    });

    // Close sheet (state resets via useEffect)
    setShowSheet(false);
  }, [purpose, context, captureMode, sensitivity, onStartSession]);

  return (
    <>
      {/* Trigger Button - hidden in controlled mode */}
      {!hideTrigger && (
        <TouchableOpacity
          style={[styles.triggerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <View style={[styles.triggerIcon, { backgroundColor: colors.primary + '12' }]}>
            <Target size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.triggerTitle, { color: colors.text }]}>Custom Session</Text>
            <Text style={[styles.triggerHint, { color: colors.textMuted }]}>Configure your own drill</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <Modal visible={showSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]} onPress={handleClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Custom Session</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Form */}
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Purpose Toggle */}
            <View style={styles.purposeRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal</Text>
              <View style={[styles.purposeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.purposeOption,
                    purpose === 'grouping' && [styles.purposeOptionActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => handlePurposeSelect('grouping')}
                  activeOpacity={0.7}
                >
                  <Crosshair size={16} color={purpose === 'grouping' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.purposeText, { color: purpose === 'grouping' ? '#fff' : colors.text }]}>
                    Grouping
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.purposeOption,
                    purpose === 'engagement' && [styles.purposeOptionActive, { backgroundColor: colors.orange }],
                  ]}
                  onPress={() => handlePurposeSelect('engagement')}
                  activeOpacity={0.7}
                >
                  <Target size={16} color={purpose === 'engagement' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.purposeText, { color: purpose === 'engagement' ? '#fff' : colors.text }]}>
                    Engagement
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Session Details */}
            <SessionContextStep
              purpose={purpose}
              context={context}
              onUpdateContext={handleUpdateContext}
              onBack={() => {}}
              hideWeaponSection
            />

            {/* Capture Mode - only show when watch is connected */}
            {isWatchConnected && (
              <View style={styles.captureModeSection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Recording</Text>
                <CaptureModePickerInline
                  selectedMode={captureMode}
                  onModeChange={setCaptureMode}
                  sensitivity={sensitivity}
                  onSensitivityChange={setSensitivity}
                  showSensitivity={true}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.sheetFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            {!hasWeapon && (
              <Text style={[styles.noWeaponHint, { color: colors.orange }]}>
                Select a weapon first to start a session
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.sheetSubmitBtn,
                {
                  backgroundColor: hasWeapon ? colors.primary : colors.secondary,
                  opacity: hasWeapon ? 1 : 0.5,
                },
              ]}
              onPress={handleStart}
              disabled={!hasWeapon || isStarting}
              activeOpacity={0.85}
            >
              {isStarting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text style={styles.sheetSubmitText}>Start Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Trigger button
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  triggerHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Sheet
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  noWeaponHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  sheetSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Purpose Toggle
  purposeRow: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Capture mode section
  captureModeSection: {
    marginTop: 16,
  },
  purposeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  purposeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  purposeOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
