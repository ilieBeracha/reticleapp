import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

interface UseWorkspaceActionsReturn {
  onStartSession: () => void;
  onCreateTeam: () => void;
  onSettingsPress: () => void;
}

export function useWorkspaceActions(): UseWorkspaceActionsReturn {
  const onStartSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createSession' as any);
  }, []);

  const onCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  }, []);

  const onSettingsPress = useCallback(() => {
    // TODO: Navigate to settings or show settings modal
  }, []);

  return {
    onStartSession,
    onCreateTeam,
    onSettingsPress,
  };
}
