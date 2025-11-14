import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefObject, useEffect } from 'react';

const WELCOME_SHEET_KEY = '@reticle/should_show_welcome';

/**
 * Hook to manage the organization welcome sheet
 * Shows the sheet automatically after login if needed
 */
export function useWelcomeSheet(sheetRef: RefObject<BottomSheetModal | null>) {
  useEffect(() => {
    checkAndShowWelcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAndShowWelcome = async () => {
    try {
      const shouldShow = await AsyncStorage.getItem(WELCOME_SHEET_KEY);
      console.log('shouldShow', shouldShow);
      if (shouldShow === 'true') {
        // Small delay to ensure layout is ready
        setTimeout(() => {
          sheetRef.current?.present();
        }, 300);
        
        // Clear the flag
        await AsyncStorage.removeItem(WELCOME_SHEET_KEY);
      }
    } catch (error) {
      console.error('Error checking welcome sheet flag:', error);
    }
  };

  return null;
}

/**
 * Set flag to show welcome sheet on next home page mount
 */
export async function setShowWelcomeSheet() {
  try {
    await AsyncStorage.setItem(WELCOME_SHEET_KEY, 'true');
  } catch (error) {
    console.error('Error setting welcome sheet flag:', error);
  }
}

