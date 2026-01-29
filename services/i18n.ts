import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './i18n-locales/en.json';
import he from './i18n-locales/he.json';

export const LANGUAGE_KEY = '@app_language';
export type Language = 'en' | 'he';

export const isRTLLanguage = (lang: Language): boolean => lang === 'he';

export const getStoredLanguage = async (): Promise<Language | null> => {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (stored === 'en' || stored === 'he') {
    return stored;
  }
  return null;
};

export const setStoredLanguage = async (lang: Language): Promise<void> => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export const getDeviceLanguage = (): Language => {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === 'he' ? 'he' : 'en';
};

export const initI18n = async (): Promise<Language> => {
  const stored = await getStoredLanguage();
  const defaultLang = stored ?? getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return defaultLang;
};

export default i18n;
