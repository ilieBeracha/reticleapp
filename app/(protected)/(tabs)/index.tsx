import { UnifiedHomePage } from '@/components/home/UnifiedHomePage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/ui/useColors';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Unified Home Screen
 * 
 * Route: /(protected)/(tabs)/
 * 
 * Single dashboard showing:
 * - Active session (if any)
 * - Live trainings from any team
 * - Upcoming trainings across all teams
 * - Quick actions
 * - Team overview
 * 
 * Features:
 * - Error boundary for graceful error handling
 * - Sentry integration for error tracking
 * - Optimized rendering with React.memo
 * - Accessibility support
 */

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */
class HomeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        screen: 'HomeScreen',
      },
    });

    console.error('[HomeScreen] Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ThemedView style={styles.errorContainer}>
          <ThemedText type="title" style={styles.errorTitle}>
            Something went wrong
          </ThemedText>
          <ThemedText type="default" style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </ThemedText>
          <ThemedText 
            type="link" 
            onPress={this.handleReset}
            style={styles.errorRetry}
          >
            Try again
          </ThemedText>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

/**
 * Home Screen Component
 * Main entry point for the unified dashboard
 */
function HomeScreenContent() {
  return <UnifiedHomePage />;
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedHomeScreenContent = React.memo(HomeScreenContent);

/**
 * Default Export - Home Screen with Error Boundary
 */
export default function HomeScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Home',
          headerShown: true,
          // Optimize header rendering
          headerTransparent: false,
        }}
      />
      <HomeErrorBoundary>
        <MemoizedHomeScreenContent />
      </HomeErrorBoundary>
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorRetry: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

