import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import i18n, {
  Language,
  LANGUAGE_KEY,
  getDeviceLanguage,
  getStoredLanguage,
  isRTLLanguage,
  setStoredLanguage,
} from '@/lib/i18n';
import { useTranslation } from 'react-i18next';

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
        setLanguageState(lang);
        setIsRTL(isRTLLanguage(lang));

        // Ensure i18n is set to the correct language
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
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
        const needsRTLChange = I18nManager.isRTL !== newIsRTL;

        // Save the preference
        await setStoredLanguage(lang);

        // Update i18n
        await i18n.changeLanguage(lang);

        // Update state
        setLanguageState(lang);
        setIsRTL(newIsRTL);

        // Handle RTL change - requires app restart
        if (needsRTLChange) {
          I18nManager.allowRTL(true);
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
                  Alert.alert(
                    t('common.error'),
                    'Please close and reopen the app to apply the language change.'
                  );
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
