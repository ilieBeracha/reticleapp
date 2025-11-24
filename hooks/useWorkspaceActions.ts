import { useModals } from '@/contexts/ModalContext';
import { useCallback } from 'react';

interface UseWorkspaceActionsReturn {
  onStartSession: () => void;
  onCreateTeam: () => void;
  onSettingsPress: () => void;
}

export function useWorkspaceActions(): UseWorkspaceActionsReturn {
  const { createTeamSheetRef, createSessionSheetRef } = useModals();

  const onStartSession = useCallback(() => {
    createSessionSheetRef.current?.open();
  }, [createSessionSheetRef]);

  const onCreateTeam = useCallback(() => {
    createTeamSheetRef.current?.open();
  }, [createTeamSheetRef]);

  const onSettingsPress = useCallback(() => {
    // TODO: Navigate to settings or show settings modal
  }, []);

  return {
    onStartSession,
    onCreateTeam,
    onSettingsPress,
  };
}
