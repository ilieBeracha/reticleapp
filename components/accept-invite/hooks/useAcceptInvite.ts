import { acceptTeamInvitation, getInvitationByCode } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import type { AcceptedResult, AcceptInviteActions, AcceptInviteState, ValidatedInvite } from '../types';

export function useAcceptInvite(): AcceptInviteState & AcceptInviteActions {
  const [inviteCode, setInviteCode] = useState('');
  const [validatedInvite, setValidatedInvite] = useState<ValidatedInvite | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedResult, setAcceptedResult] = useState<AcceptedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      console.error('Failed to validate invite:', err);
      const message = err instanceof Error ? err.message : 'Invalid or expired invite code';
      setError(message);
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
      await useTeamStore.getState().loadTeams();

      setAcceptedResult(result);
      setIsAccepted(true);
      setIsAccepting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.error('Failed to accept invitation:', err);
      const message = err instanceof Error ? err.message : 'Failed to join team';
      Alert.alert('Error', message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAccepting(false);
    }
  }, [validatedInvite]);

  const handleDecline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Decline Invitation',
      "Are you sure you don't want to join this team?",
      [
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
      ]
    );
  }, []);

  const handleReset = useCallback(() => {
    setInviteCode('');
    setValidatedInvite(null);
    setError(null);
  }, []);

  const handleSetInviteCode = useCallback((code: string) => {
    setInviteCode(code.toUpperCase());
    setError(null);
  }, []);

  return {
    inviteCode,
    validatedInvite,
    isValidating,
    isAccepting,
    isAccepted,
    acceptedResult,
    error,
    setInviteCode: handleSetInviteCode,
    handleValidate,
    handleAccept,
    handleDecline,
    handleReset,
    handleCloseSheet,
    handleOpenTeam,
  };
}
