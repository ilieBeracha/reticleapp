import Tabs from '@/components/withLayoutContext';
import { useModals } from '@/contexts/ModalContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

function ProtectedLayoutContent() {
  const { primary } = useColors();
  const { activeWorkspace } = useAppContext();
  
  // Check if organization is selected
  
  const navigation = useNavigation();
  const { workspaceSwitcherSheetRef } = useModals();

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
        {/* Only show Training tab when organization is selected */}
          <Tabs.Screen
            name="trainings"  
            options={{
              sceneStyle: {
                display: activeWorkspace?.id ? 'flex' : 'none',
              },
              title: 'Trainings',
              tabBarItemHidden: !activeWorkspace?.id,
              tabBarIcon: () => ({ sfSymbol: 'target' }),
            }}
          />
          <Tabs.Screen
            name="manage"  
            options={{
              sceneStyle: {
                display: activeWorkspace?.id ? 'flex' : 'none',
              },
              title: 'Manage',
              tabBarItemHidden: !activeWorkspace?.id,
              tabBarIcon: () => ({ sfSymbol: 'gear' }),
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
