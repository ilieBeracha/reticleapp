import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';

/**
 * A StatusBar component that automatically adjusts its style based on the current theme.
 * Use this instead of manually setting StatusBar barStyle based on theme.
 */
export const ThemedStatusBar = React.memo(function ThemedStatusBar() {
  const { theme } = useTheme();
  const barStyle: StatusBarStyle = theme === 'dark' ? 'light-content' : 'dark-content';

  return <StatusBar barStyle={barStyle} />;
});

export default ThemedStatusBar;
