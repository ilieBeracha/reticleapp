import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { useColorScheme } from '@/hooks/ui/useColorScheme';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

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
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return <RootLayoutInner />;
});

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <GluestackUIProvider mode={mode as 'dark' | 'light' | 'system'}>
      <ModalProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <GestureHandlerRootView>
                <Slot />
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              </GestureHandlerRootView>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ModalProvider>
    </GluestackUIProvider>
  );
}
