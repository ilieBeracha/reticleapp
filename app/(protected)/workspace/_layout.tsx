import { AcceptInviteSheet } from '@/components/modals/AcceptInviteSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import Tabs from '@/components/withLayoutContext';
import { useModals } from '@/contexts/ModalContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

function ProtectedLayoutContent() {
  const { primary, accent, background } = useColors();
  
  const navigation = useNavigation();
  const {
    chartDetailsSheetRef,
    createSessionSheetRef,
    createTeamSheetRef,
    inviteMembersSheetRef,
    acceptInviteSheetRef,
    workspaceSwitcherSheetRef,
    onSessionCreated,
    onTeamCreated,
    onMemberInvited,
    onInviteAccepted,
    onWorkspaceSwitched,
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

      {/* CHART DETAILS */}
      <ComingSoonSheet
        ref={chartDetailsSheetRef}
        title="Detailed Analytics"
        subtitle="Get insights into your training patterns"
        icon="bar-chart"
      />

      {/* CREATE SESSION */}
      <CreateSessionSheet
        ref={createSessionSheetRef}
        onSessionCreated={() => {
          createSessionSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onSessionCreated) {
            onSessionCreated();
          }
        }}
      />

      {/* CREATE TEAM */}
      <CreateTeamSheet
        ref={createTeamSheetRef}
        onTeamCreated={() => {
          createTeamSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onTeamCreated) {
            onTeamCreated();
          }
        }}
      />

      {/* ACCEPT INVITE */}
      <AcceptInviteSheet
        ref={acceptInviteSheetRef}
        onInviteAccepted={() => {
          acceptInviteSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onInviteAccepted) {
            onInviteAccepted();
          }
        }}
      />
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
