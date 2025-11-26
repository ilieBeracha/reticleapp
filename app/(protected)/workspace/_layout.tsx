import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Cross-platform icon helper - memoize the function itself
const getTabIcon = (
  sfSymbol: string, 
  ionicon: keyof typeof Ionicons.glyphMap,
): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

/**
 * Workspace Layout
 * 
 * OPTIMIZED:
 * - Uses refs to track mode changes and prevent unnecessary navigations
 * - Stable key generation for tab remounting
 * - Memoized tab configuration
 */
export default function WorkspaceLayout() {
  const colors = useColors();
  const router = useRouter();
  const { activeWorkspace } = useAppContext();
  
  // Determine mode
  const isPersonalMode = !activeWorkspace?.id;
  
  // Track mode changes to force navigation to index
  const prevModeRef = useRef<boolean | null>(null);
  const [forceKey, setForceKey] = useState(0);
  const isNavigatingRef = useRef(false);
  
  // Handle mode changes - navigate to index and force remount
  useEffect(() => {
    // Skip initial render
    if (prevModeRef.current === null) {
      prevModeRef.current = isPersonalMode;
      return;
    }
    
    // Mode changed - force remount and go to index
    if (prevModeRef.current !== isPersonalMode && !isNavigatingRef.current) {
      prevModeRef.current = isPersonalMode;
      isNavigatingRef.current = true;
      
      setForceKey(k => k + 1);
      
      // Navigate to index after a tick
      requestAnimationFrame(() => {
        router.replace('/(protected)/workspace' as any);
        // Reset navigation flag after navigation completes
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 100);
      });
    }
  }, [isPersonalMode, router]);

  // Create stable key that changes when mode or workspace changes
  const tabsKey = useMemo(() => {
    return isPersonalMode 
      ? `personal-${forceKey}` 
      : `org-${activeWorkspace?.id}-${forceKey}`;
  }, [isPersonalMode, activeWorkspace?.id, forceKey]);

  // Memoize tab bar style to prevent re-creation
  const tabBarStyle = useMemo(() => ({ 
    backgroundColor: colors.background 
  }), [colors.background]);

  // Memoize indicator color
  const activeIndicatorColor = useMemo(() => 
    colors.primary + '20', 
    [colors.primary]
  );

  return (
    <Tabs 
      key={tabsKey}
      rippleColor={colors.primary} 
      sidebarAdaptable
      tabBarStyle={tabBarStyle}
      activeIndicatorColor={activeIndicatorColor}
      tabBarActiveTintColor={colors.primary}
      tabBarInactiveTintColor={colors.textMuted}
    >
      {/* HOME - Always visible */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => getTabIcon('house', focused ? 'home' : 'home-outline'),
        }}
      />
      
      {/* INSIGHTS - Personal mode only */}
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarItemHidden: !isPersonalMode,
          tabBarIcon: ({ focused }) => getTabIcon('chart.bar', focused ? 'bar-chart' : 'bar-chart-outline'),
        }}
      />
      
      {/* TRAININGS - Org mode only */}
      <Tabs.Screen
        name="trainings"
        options={{
          title: 'Trainings',
          tabBarItemHidden: isPersonalMode,
          tabBarIcon: ({ focused }) => getTabIcon('target', focused ? 'fitness' : 'fitness-outline'),
        }}
      />
      
      {/* MANAGE - Org mode only */}
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarItemHidden: isPersonalMode,
          tabBarIcon: ({ focused }) => getTabIcon('person.2.fill', focused ? 'people' : 'people-outline'),
        }}
      />
      
      {/* SETTINGS - Personal mode only */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarItemHidden: !isPersonalMode,
          tabBarIcon: ({ focused }) => getTabIcon('gear', focused ? 'settings' : 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
