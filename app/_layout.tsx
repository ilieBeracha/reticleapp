import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/ui/useColorScheme';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return <RootLayoutInner />;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
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
    </GluestackUIProvider>
  );
}
