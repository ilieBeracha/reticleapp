import { Header } from "@/components/Header";
import { WorkspaceSwitcherRef } from "@/components/modals";
import { UserMenuBottomSheetRef } from "@/components/modals/UserMenuBottomSheet";
import { ModalProvider } from "@/contexts/ModalContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import { Stack } from "expo-router";
import { useRef } from "react";


export default function ProtectedLayout() {
  const userMenuSheetRef = useRef<UserMenuBottomSheetRef>(null);
  const workspaceSwitcherSheetRef = useRef<WorkspaceSwitcherRef>(null);
  const colors = useColors();
  return (
    <ThemeProvider>     
    <ModalProvider>
      <Stack        
      screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitle: () => (
            <Header
              onNotificationPress={() => {}}
                  onUserPress={() => userMenuSheetRef.current?.open()}
              onWorkspacePress={() => workspaceSwitcherSheetRef.current?.open()}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,

          
        }}
      >
        <Stack.Screen name="workspace" />
        <Stack.Screen name="settings" />
      </Stack>
    </ModalProvider>
    </ThemeProvider>
  );
}