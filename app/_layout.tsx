import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ThemeProvider } from '@/theme/themeProvider';
import { Stack } from 'expo-router';

function RootLayoutInner() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Stack 
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
          }}
        >
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="index" />
        </Stack>
      </ProfileProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}