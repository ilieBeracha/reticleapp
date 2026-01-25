import { useColors } from '@/hooks/ui/useColors';
import { getCurrentUserId } from '@/services/authService';
import { acceptTeamInvitation, getInvitationByCode } from '@/services/teamService';
import { assignTeamWeapon, getTeamWeapon } from '@/services/weaponService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamInvitation, TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Crosshair } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * ACCEPT INVITE SHEET - Team Invitations
 *
 * Team-First Architecture: Users join teams directly via invite code.
 */
export default function AcceptInviteSheet() {
  const colors = useColors();

  const [inviteCode, setInviteCode] = useState('');
  const [validatedInvite, setValidatedInvite] = useState<(TeamInvitation & { team_name?: string }) | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedResult, setAcceptedResult] = useState<{ team_id: string; team_name: string; role: TeamRole } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Pre-assigned weapon info
  const [preassignedWeapon, setPreassignedWeapon] = useState<{ id: string; name: string; caliber?: string } | null>(
    null
  );

  // Load pre-assigned weapon details when invitation is validated
  useEffect(() => {
    async function loadWeaponDetails() {
      const weaponId = validatedInvite?.details?.weapon_id;
      if (!weaponId) {
        setPreassignedWeapon(null);
        return;
      }
      try {
        const weapon = await getTeamWeapon(weaponId);
        if (weapon) {
          setPreassignedWeapon({ id: weapon.id, name: weapon.name, caliber: weapon.caliber ?? undefined });
        }
      } catch (err) {
        console.error('Failed to load pre-assigned weapon:', err);
        setPreassignedWeapon(null);
      }
    }
    loadWeaponDetails();
  }, [validatedInvite]);

  const handleCloseSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  const handleOpenTeam = useCallback((teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    useTeamStore.getState().setActiveTeam(teamId);
    Promise.all([
      useTeamStore.getState().loadActiveTeam(),
      useTrainingStore.getState().loadTeamTrainings(teamId),
    ]).catch((e) => console.warn('Post-invite refresh failed:', e));

    router.back();
    setTimeout(() => {
      router.replace('/(protected)/(tabs)');
    }, 50);
  }, []);

  const handleValidate = useCallback(async () => {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setError('Please enter an invite code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (code.length !== 8) {
      setError('Invite code must be 8 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Keyboard.dismiss();
    setIsValidating(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const invite = await getInvitationByCode(code);
      if (invite) {
        setValidatedInvite(invite);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError('Invalid or expired invite code');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error('Failed to validate invite:', error);
      setError(error.message || 'Invalid or expired invite code');
      setValidatedInvite(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsValidating(false);
    }
  }, [inviteCode]);

  const handleAccept = useCallback(async () => {
    if (!validatedInvite) return;

    setIsAccepting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await acceptTeamInvitation(validatedInvite.invite_code);

      // If there's a pre-assigned weapon, assign it to the new member
      const weaponId = validatedInvite.details?.weapon_id;
      if (weaponId) {
        try {
          const userId = await getCurrentUserId();
          if (userId) {
            await assignTeamWeapon(weaponId, userId);
          }
        } catch (weaponErr) {
          // Don't fail the whole join - just log the weapon assignment error
          console.warn('Failed to auto-assign weapon:', weaponErr);
        }
      }

      await useTeamStore.getState().loadTeams();

      setAcceptedResult(result);
      setIsAccepted(true);
      setIsAccepting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAccepting(false);
    }
  }, [validatedInvite]);

  const handleDecline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Decline Invitation', "Are you sure you don't want to join this team?", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          setInviteCode('');
          setValidatedInvite(null);
          setError(null);
        },
      },
    ]);
  }, []);

  const handleReset = useCallback(() => {
    setInviteCode('');
    setValidatedInvite(null);
    setError(null);
    setPreassignedWeapon(null);
  }, []);

  const getRoleColor = (role: TeamRole | string | null | undefined) => {
    const roleColors: Record<string, string> = {
      owner: '#5B6B8C',
      commander: '#7C3AED',
      team_commander: '#7C3AED',
      squad_commander: '#3B82F6',
      soldier: '#6B8FA3',
    };
    if (!role) return '#6B8FA3';
    return roleColors[String(role)] || '#6B8FA3';
  };

  const getRoleIcon = (role: TeamRole | string | null | undefined): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      owner: 'shield-checkmark',
      commander: 'shield',
      team_commander: 'shield',
      squad_commander: 'shield-half',
      soldier: 'person',
    };
    if (!role) return 'person';
    return icons[String(role)] || 'person';
  };

  const getRoleLabel = (role: TeamRole | string | null | undefined): string => {
    const labels: Record<string, string> = {
      owner: 'Owner',
      commander: 'Team Commander',
      team_commander: 'Team Commander',
      squad_commander: 'Squad Commander',
      soldier: 'Soldier',
    };
    if (!role) return 'Soldier';
    return labels[String(role)] || String(role);
  };

  if (isAccepted && acceptedResult) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.successScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetHeader}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleCloseSheet}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.successIcon, { backgroundColor: colors.primary + '18', borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={66} color={colors.primary} />
        </View>

        <Text style={[styles.successTitle, { color: colors.text }]}>You’re in</Text>
        <Text style={[styles.successTeam, { color: colors.text }]} numberOfLines={1}>
          {acceptedResult.team_name}
        </Text>

        <View
          style={[
            styles.successBadge,
            { backgroundColor: getRoleColor(acceptedResult.role) + '18', borderColor: colors.border },
          ]}
        >
          <Ionicons name={getRoleIcon(acceptedResult.role)} size={16} color={getRoleColor(acceptedResult.role)} />
          <Text style={[styles.successRole, { color: getRoleColor(acceptedResult.role) }]}>
            Joined as {getRoleLabel(acceptedResult.role)}
          </Text>
        </View>

        {preassignedWeapon && (
          <View style={[styles.successWeaponChip, { backgroundColor: colors.green + '15' }]}>
            <Crosshair size={14} color={colors.green} />
            <Text style={[styles.successWeaponText, { color: colors.green }]}>{preassignedWeapon.name} assigned</Text>
          </View>
        )}

        <View style={styles.successActions}>
          <TouchableOpacity
            style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenTeam(acceptedResult.team_id)}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Open Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleCloseSheet}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.sheetHeader}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={handleCloseSheet}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="enter" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Join Team</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {validatedInvite ? 'Review invitation' : 'Enter invite code to get started'}
        </Text>

        {validatedInvite && (
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.secondary, marginTop: 12 }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
            <Text style={[styles.resetBtnText, { color: colors.text }]}>Enter Different Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {!validatedInvite ? (
        <>
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              <Ionicons name="key-outline" size={14} color={colors.text} /> Invite Code
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. ABC123XY"
                placeholderTextColor={colors.textMuted}
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text.toUpperCase());
                  setError(null);
                }}
                autoCapitalize="characters"
                maxLength={8}
                returnKeyType="go"
                onSubmitEditing={handleValidate}
                autoFocus
              />
            </View>
            <Text style={[styles.inputHint, { color: colors.textMuted }]}>8 characters • letters and numbers</Text>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.validateButton,
              {
                backgroundColor: isValidating ? colors.secondary : colors.primary,
                opacity: isValidating || !inviteCode.trim() ? 0.7 : 1,
              },
            ]}
            onPress={handleValidate}
            disabled={isValidating || !inviteCode.trim()}
            activeOpacity={0.8}
          >
            {isValidating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.validateButtonText}>Validate Code</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.helpCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
            <View style={styles.helpContent}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>How to get an invite code?</Text>
              <Text style={[styles.helpText, { color: colors.textMuted }]}>
                Ask a team owner or commander to generate an invite code for you. They can share it via any messaging
                app.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.inviteCardTopRow}>
              <View style={[styles.sectionPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.sectionPillText, { color: colors.textMuted }]}>INVITATION</Text>
              </View>
            </View>

            <View style={styles.teamHeaderRow}>
              <View style={[styles.teamIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="people" size={28} color={colors.primary} />
              </View>

              <View style={styles.teamHeaderText}>
                <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                  {validatedInvite.team_name || 'Team'}
                </Text>
                <Text style={[styles.teamSubtitle, { color: colors.textMuted }]}>
                  Review details, then join the team
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Role</Text>
              </View>
              <View
                style={[
                  styles.roleChip,
                  { backgroundColor: getRoleColor(validatedInvite.role) + '18', borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={getRoleIcon(validatedInvite.role)}
                  size={14}
                  color={getRoleColor(validatedInvite.role)}
                />
                <Text style={[styles.roleChipText, { color: getRoleColor(validatedInvite.role) }]}>
                  {getRoleLabel(validatedInvite.role)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Expires</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(validatedInvite.expires_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="key-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Code</Text>
              </View>
              <Text style={[styles.detailValueMono, { color: colors.text }]}>
                ••••{' '}
                {String(validatedInvite.invite_code || '')
                  .slice(-4)
                  .toUpperCase()}
              </Text>
            </View>

            {/* Pre-assigned Weapon */}
            {preassignedWeapon && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Crosshair size={14} color={colors.textMuted} />
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Weapon</Text>
                </View>
                <View style={[styles.weaponChip, { backgroundColor: colors.green + '18', borderColor: colors.border }]}>
                  <Crosshair size={12} color={colors.green} />
                  <Text style={[styles.weaponChipText, { color: colors.green }]} numberOfLines={1}>
                    {preassignedWeapon.name}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Accept/Decline Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.declineButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.secondary,
                },
              ]}
              onPress={handleDecline}
              disabled={isAccepting}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.text} />
              <Text style={[styles.declineButtonText, { color: colors.text }]}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                {
                  backgroundColor: isAccepting ? colors.secondary : colors.primary,
                  opacity: isAccepting ? 0.7 : 1,
                },
              ]}
              onPress={handleAccept}
              disabled={isAccepting}
              activeOpacity={0.8}
            >
              {isAccepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.acceptButtonText}>Join Team</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {},
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28 },

  sheetHeader: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  headerSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
  },
  resetBtn: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  inputCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  inputHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Validate Button
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  helpContent: { flex: 1 },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Team Card
  teamCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  inviteCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  teamSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailValueMono: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  weaponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
  },
  weaponChipText: {
    fontSize: 13,
    fontWeight: '700',
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  successScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  successTeam: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
  },
  successRole: {
    fontSize: 14,
    fontWeight: '600',
  },
  successWeaponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  successWeaponText: {
    fontSize: 13,
    fontWeight: '600',
  },

  successActions: {
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
