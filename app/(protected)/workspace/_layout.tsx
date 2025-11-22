import Tabs from '@/components/withLayoutContext';
import { useModals } from '@/contexts/ModalContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

function ProtectedLayoutContent() {
  const { primary } = useColors();
  
  const navigation = useNavigation();
  const {
    chartDetailsSheetRef,
    createSessionSheetRef,
    createTeamSheetRef,
    acceptInviteSheetRef,
    workspaceSwitcherSheetRef,
    onSessionCreated,
    onTeamCreated,
    onInviteAccepted,
    onWorkspaceCreated,
    createWorkspaceSheetRef,
    } = useModals();

  // Listen for navigation to organizations tab and open switcher
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e: any) => {
      const state = e.data.state;
      if (state) {
        const currentRoute = state.routes[state.index];
        if (currentRoute?.name === 'handleorg') {
          // Open workspace switcher when organizations tab is pressed
          workspaceSwitcherSheetRef.current?.open();
          // Navigate back to home tab to prevent staying on organizations screen
          setTimeout(() => {
            navigation.navigate('index' as never);
          }, 50);
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  // No redirect - let users see the app even without orgs

  return (
    <>
      <Tabs rippleColor={primary} minimizeBehavior={'automatic'} sidebarAdaptable={true}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: () => ({ sfSymbol: 'house' }),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: () => ({ sfSymbol: 'calendar' }),
          }}
        />
        <Tabs.Screen
          name="organization"  
          options={{
            role:'search',
            title: 'Organization',
            tabBarIcon: () => ({ sfSymbol: 'building.2' }),
          }}
          
        />
      </Tabs>

     
    </>
  );
}

export default function ProtectedLayout() {
  return (
    <OrgRoleProvider>
      <ProtectedLayoutContent />
    </OrgRoleProvider>
  );
}
