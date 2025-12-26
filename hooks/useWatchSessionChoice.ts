/**
 * useWatchSessionChoice
 *
 * Per-session hook to ask user if they want to use their connected Garmin watch.
 * Returns the user's choice and a modal trigger.
 *
 * @example
 * ```tsx
 * const { useWatch, showChoiceModal, ChoiceModal } = useWatchSessionChoice();
 *
 * // Guard Garmin code:
 * if (useWatch && garminStatus === 'CONNECTED') {
 *   sendToGarmin('SESSION_START', { ... });
 * }
 *
 * // Render modal:
 * <ChoiceModal />
 * ```
 */

import { useGarminStore } from '@/store/garminStore';
import { useCallback, useEffect, useState } from 'react';

export type WatchChoice = 'pending' | 'use_watch' | 'phone_only';

export interface UseWatchSessionChoiceResult {
  /** Whether user chose to use the watch for this session */
  useWatch: boolean;
  /** Current choice state */
  choice: WatchChoice;
  /** Whether the choice modal should be shown */
  showChoiceModal: boolean;
  /** User chose to use watch */
  onChooseWatch: () => void;
  /** User chose phone only */
  onChoosePhone: () => void;
  /** Whether watch is connected (convenience) */
  isWatchConnected: boolean;
}

export function useWatchSessionChoice(): UseWatchSessionChoiceResult {
  const { status: garminStatus, watchEnabled } = useGarminStore();
  const isWatchConnected = garminStatus === 'CONNECTED' && watchEnabled;

  // Per-session choice: null = not asked yet, true = use watch, false = phone only
  const [choice, setChoice] = useState<WatchChoice>('pending');

  // Determine if we should show the modal
  // Only show if watch is connected AND user hasn't made a choice yet
  const showChoiceModal = isWatchConnected && choice === 'pending';

  // If watch is not connected, auto-set to phone_only (no need to ask)
  useEffect(() => {
    if (!isWatchConnected && choice === 'pending') {
      setChoice('phone_only');
    }
  }, [isWatchConnected, choice]);

  const onChooseWatch = useCallback(() => {
    setChoice('use_watch');
  }, []);

  const onChoosePhone = useCallback(() => {
    setChoice('phone_only');
  }, []);

  return {
    useWatch: choice === 'use_watch',
    choice,
    showChoiceModal,
    onChooseWatch,
    onChoosePhone,
    isWatchConnected,
  };
}

export default useWatchSessionChoice;
