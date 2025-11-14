import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  const { background } = useColors();
  const { user } = useAuth();
  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  return (
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: {
            backgroundColor: background,
          },
          headerShadowVisible: false,
          headerTitle: () => <Header onNotificationPress={handleNotificationPress} />,
          headerTitleAlign: 'left',
          
        }}
      >
          <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal', headerBlurEffect: 'light' }} />
          <Stack.Screen name="index" options={{ headerShown: true }} />
      </Stack>
  );
}
