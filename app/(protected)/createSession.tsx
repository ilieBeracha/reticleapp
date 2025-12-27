/**
 * CREATE SESSION - Solo Practice
 * 
 * Uses the unified SessionFormSheet component for consistent UI.
 * Personal solo sessions have team_id: null.
 */
import { SessionFormSheet, useSessionForm } from '@/components/session';
import { useColors } from '@/hooks/ui/useColors';
import {
  createSession,
  deleteSession,
  getMyActiveSession
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  View,
} from 'react-native';

export default function CreateSessionScreen() {
  const colors = useColors();
  const { loadSessions } = useSessionStore();
  const [checkingSession, setCheckingSession] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION FORM (unified hook)
  // ─────────────────────────────────────────────────────────────────────────
  
  const form = useSessionForm({
    context: {
      teamId: null, // Personal solo session
    },
    onSubmit: async (config) => {
      try {
        const session = await createSession(config);
        await loadSessions();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        router.replace({
          pathname: '/(protected)/activeSession',
          params: { sessionId: session.id },
        });
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message || 'Failed to start session');
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK FOR ACTIVE SESSION
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const checkActiveSession = async () => {
        try {
          const activeSession = await getMyActiveSession();
          if (activeSession) {
            Alert.alert(
              'Active Session',
              `You have an active session${activeSession.drill_name ? ` for "${activeSession.drill_name}"` : ''}. What would you like to do?`,
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    router.replace({
                      pathname: '/(protected)/activeSession',
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: 'Delete & Start New',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteSession(activeSession.id);
                      setCheckingSession(false);
                    } catch (err) {
                      console.error('Failed to delete session:', err);
                      Alert.alert('Error', 'Failed to delete session');
                      router.back();
                    }
                  },
                },
                { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
              ]
            );
          } else {
            setCheckingSession(false);
          }
        } catch {
          setCheckingSession(false);
        }
      };

      checkActiveSession();
    }, [])
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <View className="flex-1 justify-center items-center gap-4" style={{ paddingTop: 60 }}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={{ color: colors.textMuted }} className="text-sm">
          Checking sessions...
        </Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SessionFormSheet
      form={form}
      title="Solo Practice"
      submitLabel="Start Session"
      showNameInput={true}
    />
  );
}
