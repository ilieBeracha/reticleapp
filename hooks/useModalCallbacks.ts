import { useEffect } from 'react';
import { useModals } from '@/contexts/ModalContext';

interface UseModalCallbacksProps {
  onTeamCreated: () => void;
  onSessionCreated: () => void;
}

export function useModalCallbacks({ onTeamCreated, onSessionCreated }: UseModalCallbacksProps) {
  const { setOnTeamCreated, setOnSessionCreated } = useModals();

  useEffect(() => {
    setOnTeamCreated(() => onTeamCreated);
    setOnSessionCreated(() => onSessionCreated);

    return () => {
      setOnTeamCreated(null);
      setOnSessionCreated(null);
    };
  }, [onTeamCreated, onSessionCreated, setOnTeamCreated, setOnSessionCreated]);
}
