import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { GluestackUIProvider } from '@/components/shared/ui/gluestack-ui-provider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import i18n, { initI18n } from '@/services/i18n';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
// Suppress non-critical warnings on Android
// SF Symbols warning: Tab icons fall back to default on Android - proper icons should be added later
// ExpoUI warning: Swift UI components are iOS-only, fallback components are used on Android
if (Platform.OS === 'android') {
  LogBox.ignoreLogs([
    'SF Symbols are not supported on Android',
    'Unable to get the view config for',
    'SafeAreaView has been deprecated',
  ]);
}

Sentry.init({
  dsn: 'https://6b988aab11e9428cfd2db3c3cc4521aa@o4510334793744384.ingest.de.sentry.io/4510370355675216',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((error) => {
        console.error('Failed to initialize i18n:', error);
        setI18nReady(true); // Continue with fallback
      });
  }, []);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady]);

  // Wait for both fonts and i18n to be ready
  if (!fontsLoaded || !i18nReady) {
    return null;
  }

  // ThemeProvider must wrap everything that uses useTheme/useColors
  // I18nextProvider and LanguageProvider handle translations and RTL
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <LanguageProvider>
          <RootLayoutInner />
        </LanguageProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
});

function RootLayoutInner() {
  const { theme } = useTheme();
  return (
    <GluestackUIProvider mode={theme}>
      <ModalProvider>
        <AuthProvider>
          <LayoutWithLoadingOverlay colorScheme={theme} />
        </AuthProvider>
      </ModalProvider>
    </GluestackUIProvider>
  );
}

function LayoutWithLoadingOverlay({ colorScheme }: { colorScheme: 'light' | 'dark' | null }) {
  const { transitioning } = useAuth();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <Slot />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          {/* Global loading overlay for auth transitions */}
          {transitioning && <LoadingScreen overlay />}
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
