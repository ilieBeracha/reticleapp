# Design Document: Organization Switch Transition

## Overview

This design implements a full-screen loading transition experience when users switch organizations. The solution creates an app-level loading overlay that covers the entire screen, manages modal dismissal, handles navigation to the home page, and coordinates data refresh timing to ensure a smooth, polished experience that makes organization switching feel like switching to a completely different account.

## Architecture

### Component Hierarchy

```
App Root (_layout.tsx)
├── ClerkProvider
├── GestureHandlerRootView
├── ThemeProvider
├── Slot (Router Outlet)
└── OrganizationSwitchProvider (NEW)
    └── OrganizationSwitchOverlay (NEW)
```

### State Management Approach

We'll use React Context + Zustand for managing the organization switch state:

1. **Context Provider**: Wraps the app at the root level to provide switch functionality globally
2. **Zustand Store**: Manages the loading state, target organization info, and timing
3. **Expo Router**: Handles navigation reset and home page routing

### Key Design Decisions

1. **App-Level Overlay**: The loading overlay is rendered at the root level (in `_layout.tsx`) to ensure it covers all content including modals
2. **Minimum Duration**: Enforce a minimum 800ms loading duration to prevent jarring quick flashes
3. **Navigation Reset**: Use `router.replace()` to reset the navigation stack when switching
4. **Data Coordination**: Wait for both the Clerk organization switch AND initial data fetch before dismissing

## Components and Interfaces

### 1. OrganizationSwitchProvider (Context Provider)

**Location**: `hooks/organizations/useOrganizationSwitch.tsx`

**Purpose**: Provides organization switching functionality throughout the app

**Interface**:

```typescript
interface OrganizationSwitchContextValue {
  switchOrganization: (
    organizationId: string | null,
    organizationName: string
  ) => Promise<void>;
  isSwitching: boolean;
  targetOrganization: string | null;
}
```

**Responsibilities**:

- Expose `switchOrganization()` function to trigger the transition
- Manage the switching state and target organization info
- Coordinate with Clerk's `setActive()` API
- Handle navigation to home page
- Manage timing and animation states

### 2. OrganizationSwitchOverlay (UI Component)

**Location**: `components/OrganizationSwitchOverlay.tsx`

**Purpose**: Full-screen loading overlay displayed during organization switch

**Props**:

```typescript
interface OrganizationSwitchOverlayProps {
  visible: boolean;
  organizationName: string | null;
}
```

**Visual Design**:

- Full-screen dark overlay (rgba(0, 0, 0, 0.95))
- Centered content with animated spinner
- Text: "Switching to [Organization Name]..." or "Switching to Personal Workspace..."
- Smooth fade-in/fade-out animations using React Native Animated API
- High z-index (999999) to cover all content

### 3. useOrganizationSwitch Hook

**Location**: `hooks/organizations/useOrganizationSwitch.tsx`

**Purpose**: Custom hook to access organization switching functionality

**Returns**:

```typescript
{
  switchOrganization: (
    organizationId: string | null,
    organizationName: string
  ) => Promise<void>;
  isSwitching: boolean;
  targetOrganization: string | null;
}
```

### 4. Updated OrganizationSwitcherModal

**Location**: `components/modals/OrganizationSwitcherModal.tsx`

**Changes**:

- Replace local `handleSwitch` with `switchOrganization` from context
- Remove local `LoadingOverlay` (now handled at app level)
- Close modal immediately when switch is initiated

## Data Models

### OrganizationSwitchState (Zustand Store)

```typescript
interface OrganizationSwitchState {
  // State
  isSwitching: boolean;
  targetOrganizationId: string | null;
  targetOrganizationName: string | null;
  switchStartTime: number | null;

  // Actions
  startSwitch: (
    organizationId: string | null,
    organizationName: string
  ) => void;
  completeSwitch: () => void;
  cancelSwitch: () => void;
}
```

**Store Location**: `store/organizationSwitchStore.ts`

### Animation State

```typescript
interface AnimationState {
  fadeAnim: Animated.Value; // 0 to 1 for opacity
  scaleAnim: Animated.Value; // 0.95 to 1 for subtle scale effect
}
```

## Error Handling

### Error Scenarios

1. **Clerk API Failure**: If `setActive()` fails

   - Dismiss overlay immediately
   - Show toast/alert with error message
   - Keep user in current organization
   - Log error to console

2. **Navigation Failure**: If router navigation fails

   - Dismiss overlay
   - Show error message
   - Attempt to stay on current page

3. **Data Fetch Failure**: If home page data fails to load
   - Still complete the switch (organization change succeeded)
   - Dismiss overlay after minimum duration
   - Let home page handle its own error states

### Error Recovery

```typescript
try {
  await setActive({ organization: organizationId });
  await router.replace("/(home)");
  // Wait for minimum duration
  await waitForMinimumDuration();
} catch (error) {
  console.error("Organization switch failed:", error);
  cancelSwitch();
  Alert.alert(
    "Switch Failed",
    "Could not switch organization. Please try again."
  );
}
```

## Testing Strategy

### Unit Tests

1. **OrganizationSwitchStore Tests**

   - Test state transitions (idle → switching → complete)
   - Test timing calculations
   - Test state reset on cancel

2. **useOrganizationSwitch Hook Tests**
   - Test hook returns correct values
   - Test switchOrganization function behavior
   - Test error handling

### Integration Tests

1. **Full Switch Flow**

   - User clicks organization in switcher
   - Modal closes immediately
   - Overlay appears with correct organization name
   - Navigation occurs to home page
   - Overlay dismisses after minimum duration
   - Home page shows correct organization data

2. **Error Scenarios**
   - Test Clerk API failure handling
   - Test navigation failure handling
   - Verify user stays in current org on failure

### Manual Testing Checklist

- [ ] Switch from personal to organization
- [ ] Switch from organization to personal
- [ ] Switch between different organizations
- [ ] Verify overlay covers all UI elements
- [ ] Verify smooth animations (60fps)
- [ ] Test on iOS and Android
- [ ] Test with slow network (3G simulation)
- [ ] Verify minimum duration feels natural
- [ ] Test rapid switching (spam clicks)
- [ ] Verify error messages display correctly

## Performance Considerations

### Animation Performance

- Use `useNativeDriver: true` for opacity animations
- Avoid layout animations during transition
- Pre-render overlay component (don't mount/unmount)
- Use `shouldComponentUpdate` or `React.memo` for overlay

### Memory Management

- Clean up timers on unmount
- Cancel in-flight requests if user navigates away
- Avoid memory leaks in context provider

### Timing Optimization

```typescript
const MINIMUM_DURATION = 800; // ms
const FADE_IN_DURATION = 200; // ms
const FADE_OUT_DURATION = 300; // ms
```

These values balance perceived responsiveness with smooth UX.

## Implementation Flow

### Sequence Diagram

```
User                Modal               Context              Clerk API          Router           Home Page
 |                   |                    |                     |                  |                 |
 |-- Click Org ----->|                    |                     |                  |                 |
 |                   |                    |                     |                  |                 |
 |                   |-- switchOrg() ---->|                     |                  |                 |
 |                   |                    |                     |                  |                 |
 |                   |<-- Close Modal ----|                     |                  |                 |
 |                   |                    |                     |                  |                 |
 |<===== Show Full-Screen Overlay ========|                     |                  |                 |
 |                   |                    |                     |                  |                 |
 |                   |                    |-- setActive() ----->|                  |                 |
 |                   |                    |                     |                  |                 |
 |                   |                    |<-- Success ---------|                  |                 |
 |                   |                    |                     |                  |                 |
 |                   |                    |-- replace('/') -----|----------------->|                 |
 |                   |                    |                     |                  |                 |
 |                   |                    |                     |                  |-- Mount ------->|
 |                   |                    |                     |                  |                 |
 |                   |                    |                     |                  |<-- Fetch Data --|
 |                   |                    |                     |                  |                 |
 |                   |                    |<-- Wait Min Duration (800ms) ---------|                 |
 |                   |                    |                     |                  |                 |
 |<===== Fade Out Overlay ================|                     |                  |                 |
 |                   |                    |                     |                  |                 |
 |<===== Show Home Page ==================|                     |                  |                 |
```

### Step-by-Step Flow

1. **Initiation**

   - User clicks organization in switcher modal
   - Modal calls `switchOrganization(orgId, orgName)`
   - Context updates state: `isSwitching = true`
   - Modal closes immediately

2. **Overlay Display**

   - OrganizationSwitchOverlay detects `isSwitching = true`
   - Fade-in animation starts (200ms)
   - Display text: "Switching to [Org Name]..."

3. **Organization Switch**

   - Context calls Clerk's `setActive({ organization: orgId })`
   - Record start time for minimum duration calculation
   - Wait for API response

4. **Navigation**

   - On success, call `router.replace('/(home)')`
   - This resets navigation stack and mounts Home component
   - Home component's useEffect triggers data fetch

5. **Timing Coordination**

   - Calculate elapsed time since switch started
   - If elapsed < 800ms, wait for remaining time
   - This ensures overlay doesn't flash too quickly

6. **Completion**
   - Fade-out animation starts (300ms)
   - After animation completes, set `isSwitching = false`
   - User sees home page with fresh data

### Edge Cases

1. **Rapid Switching**: Debounce or disable switching while `isSwitching = true`
2. **App Backgrounding**: Pause timers, resume on foreground
3. **Network Timeout**: Set maximum wait time (e.g., 10 seconds)
4. **Same Organization**: Skip transition if already in target org
