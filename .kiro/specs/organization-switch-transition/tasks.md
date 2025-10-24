# Implementation Plan

- [x] 1. Create organization switch state management

  - Create Zustand store for managing switch state (isSwitching, target org info, timing)
  - Implement state actions: startSwitch, completeSwitch, cancelSwitch
  - Add timing utilities for minimum duration enforcement
  - _Requirements: 1.1, 1.3, 6.1, 6.2_

- [x] 2. Build OrganizationSwitchOverlay component
- [x] 2.1 Create base overlay component with full-screen styling

  - Implement full-screen container with high z-index
  - Add dark background overlay (rgba(0, 0, 0, 0.95))
  - Create centered content layout for spinner and text
  - _Requirements: 1.1, 1.3_

- [x] 2.2 Implement fade animations

  - Set up Animated.Value for opacity
  - Create fade-in animation (200ms duration)
  - Create fade-out animation (300ms duration)
  - Use useNativeDriver for performance
  - _Requirements: 1.4, 4.1, 4.2, 4.4_

- [x] 2.3 Add dynamic text display

  - Show "Switching to [Organization Name]..." for organizations
  - Show "Switching to Personal Workspace..." for personal account
  - Use themed text color
  - _Requirements: 6.4_

- [x] 3. Create organization switch context and hook
- [x] 3.1 Implement OrganizationSwitchProvider

  - Create React Context with switch functionality
  - Integrate with Zustand store for state management
  - Implement switchOrganization function with Clerk setActive
  - Add navigation logic using Expo Router
  - Handle minimum duration timing (800ms)
  - _Requirements: 1.1, 3.1, 3.2, 6.1, 6.2_

- [x] 3.2 Add error handling

  - Wrap Clerk API calls in try-catch
  - Implement error state management
  - Add console logging for debugging
  - Handle navigation failures gracefully
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.3 Create useOrganizationSwitch hook

  - Export hook to access context values
  - Provide switchOrganization function
  - Expose isSwitching and targetOrganization state
  - _Requirements: 1.1_

- [x] 4. Integrate provider and overlay into app root

  - Wrap app content with OrganizationSwitchProvider in \_layout.tsx
  - Render OrganizationSwitchOverlay at root level
  - Ensure overlay is above all other content
  - _Requirements: 1.1, 1.3_

- [x] 5. Update OrganizationSwitcherModal to use new context

  - Import and use useOrganizationSwitch hook
  - Replace local handleSwitch with switchOrganization from context
  - Remove local LoadingOverlay component usage
  - Close modal immediately when switch is initiated
  - Remove local switching state management
  - _Requirements: 2.1, 2.2_

- [x] 6. Add navigation reset and home page coordination

  - Use router.replace() to reset navigation stack
  - Ensure Home component refetches data on organization change
  - Verify useEffect dependencies in Home component trigger on orgId change
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement timing coordination

  - Calculate elapsed time from switch start
  - Enforce minimum 800ms total duration
  - Wait for both Clerk API and minimum duration before dismissing
  - Add maximum timeout (10 seconds) for safety
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Add edge case handling

  - Prevent switching while already switching (debounce)
  - Skip transition if switching to current organization
  - Handle app backgrounding scenarios
  - _Requirements: 1.3, 5.1_

- [-] 9. Polish animations and transitions
- [x] 9.1 Fine-tune animation timing curves

  - Use easing functions for smooth animations
  - Test fade-in/fade-out feel
  - Ensure 60fps performance
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 9.2 Add optional home page content animation

  - Implement subtle fade-in for home page content
  - Add optional slide-up animation
  - _Requirements: 4.3_

- [x] 10. Clean up old loading overlay component
  - Remove LoadingOverlay from OrganizationSwitcher components folder
  - Update any imports or references
  - _Requirements: 2.1_
