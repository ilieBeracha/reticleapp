import i18n, { getDeviceLanguage, getStoredLanguage, isRTLLanguage, Language, setStoredLanguage } from '@/lib/i18n';
import * as Updates from 'expo-updates';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager } from 'react-native';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  isLoading: boolean;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState<boolean>(I18nManager.isRTL);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  // Load saved language on mount
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const stored = await getStoredLanguage();
        const lang = stored ?? getDeviceLanguage();
        const newIsRTL = isRTLLanguage(lang);
        const currentSwap = (I18nManager as any).doLeftAndRightSwapInRTL;
        const needsRTLChange = I18nManager.isRTL !== newIsRTL;
        const needsSwapChange = newIsRTL && currentSwap !== true;

        setLanguageState(lang);
        setIsRTL(newIsRTL);

        // Ensure i18n is set to the correct language
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
        }

        // Ensure RTL support is configured (swap left/right styles in RTL)
        // Note: applying these changes fully requires an app restart.
        I18nManager.allowRTL(true);
        I18nManager.swapLeftAndRightInRTL(true);
        I18nManager.forceRTL(newIsRTL);

        if (needsRTLChange || needsSwapChange) {
          Alert.alert(t('settings.restartRequired'), t('settings.restartMessage'), [
            { text: t('settings.restartLater'), style: 'cancel' },
            {
              text: t('settings.restartNow'),
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (error) {
                  Alert.alert(t('common.error'), t('settings.restartManually'));
                }
              },
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initLanguage();
  }, []);

  const setLanguage = useCallback(
    async (lang: Language) => {
      try {
        const newIsRTL = isRTLLanguage(lang);
        const currentSwap = (I18nManager as any).doLeftAndRightSwapInRTL;
        const needsRTLChange = I18nManager.isRTL !== newIsRTL;
        const needsSwapChange = newIsRTL && currentSwap !== true;

        // Save the preference
        await setStoredLanguage(lang);

        // Update i18n
        await i18n.changeLanguage(lang);

        // Update state
        setLanguageState(lang);
        setIsRTL(newIsRTL);

        // Ensure swap left/right styles in RTL (affects many layouts that use `left`, `marginLeft`, etc.)
        I18nManager.allowRTL(true);
        I18nManager.swapLeftAndRightInRTL(true);

        // Handle RTL and/or swap change - requires app restart
        if (needsRTLChange || needsSwapChange) {
          I18nManager.forceRTL(newIsRTL);

          // Show restart prompt
          Alert.alert(t('settings.restartRequired'), t('settings.restartMessage'), [
            {
              text: t('settings.restartLater'),
              style: 'cancel',
            },
            {
              text: t('settings.restartNow'),
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (error) {
                  // If Updates.reloadAsync fails (e.g., in dev mode), inform the user
                  Alert.alert(t('common.error'), t('settings.restartManually'));
                }
              },
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to set language:', error);
        throw error;
      }
    },
    [t]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        isRTL,
        isLoading,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
