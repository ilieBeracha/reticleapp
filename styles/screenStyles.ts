import { StyleSheet, ViewStyle } from 'react-native';

/**
 * Common screen layout styles used across the app.
 * Centralizes container, scrollView, and content patterns to avoid duplication.
 */
export const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  contentCompact: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 32,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

/**
 * Helper to create themed container style with background color
 */
export const createThemedContainer = (backgroundColor: string): ViewStyle[] => [
  screenStyles.container,
  { backgroundColor },
];
