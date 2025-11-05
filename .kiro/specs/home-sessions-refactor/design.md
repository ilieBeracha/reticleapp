# Design Document

## Overview

This design outlines the refactoring of the Home component to extract sessions-related functionality into dedicated, modular components. The refactor will create a cleaner separation of concerns while maintaining the existing visual appearance and functionality. The design follows the established project architecture patterns with feature-specific components in dedicated directories.

## Architecture

### Current State Analysis

The current Home component contains:

- Organization switching animation logic
- Sessions data fetching and state management
- Statistics display logic
- Sessions list rendering
- Layout composition and styling

### Target Architecture

The refactored architecture will separate these concerns into:

1. **Home Component**: Lightweight composition layer
2. **Sessions Hook**: Data management and business logic
3. **Sessions Components**: Dedicated UI components for different aspects
4. **Animation Hook**: Reusable animation logic

## Components and Interfaces

### 1. Home Component (Refactored)

**Location**: `modules/home/components/Home.tsx`

**Responsibilities**:

- Layout composition and orchestration
- Animation coordination
- Theme color management
- User and organization data extraction

**Interface**:

```typescript
export function Home(): JSX.Element;
```

**Key Changes**:

- Remove direct sessions store usage
- Remove sessions fetching logic
- Remove inline StatItem component
- Delegate to specialized components

### 2. Sessions Hook

**Location**: `modules/home/hooks/useSessions.ts`

**Responsibilities**:

- Sessions data fetching and management
- Organization switching awareness
- Authentication token handling
- Integration with sessionsStore

**Interface**:

```typescript
interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refreshSessions: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn;
```

**Key Features**:

- Handles organization switching lifecycle
- Manages loading and error states
- Provides refresh functionality
- Integrates with existing Zustand store

### 3. Animation Hook

**Location**: `modules/home/hooks/useHomeAnimations.ts`

**Responsibilities**:

- Organization switch animation management
- Content fade and slide animations
- Animation state tracking

**Interface**:

```typescript
interface UseHomeAnimationsReturn {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  animatedStyle: {
    opacity: Animated.Value;
    transform: [{ translateY: Animated.Value }];
  };
}

export function useHomeAnimations(): UseHomeAnimationsReturn;
```

### 4. Sessions Statistics Component

**Location**: `modules/home/components/sessions/SessionsStats.tsx`

**Responsibilities**:

- Display session statistics in a row layout
- Handle individual stat item rendering
- Theme-aware styling

**Interface**:

```typescript
interface SessionsStatsProps {
  sessionsCount: number;
  averageTime?: string;
  progressPercentage?: string;
}

export function SessionsStats(props: SessionsStatsProps): JSX.Element;
```

**Sub-components**:

- `StatItem`: Individual statistic display component

### 5. Sessions List Component

**Location**: `modules/home/components/sessions/SessionsList.tsx`

**Responsibilities**:

- Render list of recent sessions
- Handle loading and empty states
- Session item formatting and styling

**Interface**:

```typescript
interface SessionsListProps {
  sessions: Session[];
  loading: boolean;
  maxItems?: number;
  onSessionPress?: (session: Session) => void;
}

export function SessionsList(props: SessionsListProps): JSX.Element;
```

**Sub-components**:

- `SessionItem`: Individual session display component

### 6. Sessions Section Component

**Location**: `modules/home/components/sessions/SessionsSection.tsx`

**Responsibilities**:

- Compose sessions statistics and list
- Provide section-level layout and spacing
- Handle section title and overall structure

**Interface**:

```typescript
interface SessionsSectionProps {
  sessions: Session[];
  loading: boolean;
}

export function SessionsSection(props: SessionsSectionProps): JSX.Element;
```

## Data Models

### Session Interface

```typescript
interface Session {
  id: string;
  created_at: string;
  // Additional session properties as defined in existing types
}
```

### Statistics Data

```typescript
interface SessionStats {
  totalSessions: number;
  averageTime: string;
  progressPercentage: string;
}
```

## Error Handling

### Sessions Hook Error Handling

- Catch and expose API errors through error state
- Provide retry mechanisms via refreshSessions method
- Log errors for debugging while maintaining user experience

### Component Error Boundaries

- Sessions components will gracefully handle missing or invalid data
- Loading states will prevent rendering issues during data fetching
- Empty states will provide meaningful feedback to users

### Animation Error Handling

- Animation failures will not block component rendering
- Fallback to non-animated states if animation setup fails
- Cleanup animation resources on component unmount

## Testing Strategy

### Unit Testing Approach

**Sessions Hook Testing**:

- Mock sessionsStore and authentication dependencies
- Test organization switching scenarios
- Verify loading and error state management
- Test refresh functionality

**Component Testing**:

- Test component rendering with various prop combinations
- Verify theme integration and styling
- Test user interaction handlers
- Snapshot testing for visual regression prevention

**Animation Testing**:

- Test animation lifecycle during organization switching
- Verify animation cleanup on unmount
- Test animation state transitions

### Integration Testing

**Home Component Integration**:

- Test complete user flow from organization switch to sessions display
- Verify data flow between hooks and components
- Test error scenarios and recovery

### Testing Files Structure

```
modules/home/components/__tests__/
├── Home.test.tsx
├── sessions/
│   ├── SessionsStats.test.tsx
│   ├── SessionsList.test.tsx
│   └── SessionsSection.test.tsx
└── hooks/
    ├── useSessions.test.ts
    └── useHomeAnimations.test.ts
```

## Migration Strategy

### Phase 1: Extract Hooks

1. Create `useSessions` hook with existing logic
2. Create `useHomeAnimations` hook
3. Update Home component to use new hooks
4. Verify functionality remains unchanged

### Phase 2: Extract Components

1. Create SessionsStats component
2. Create SessionsList component
3. Create SessionsSection component
4. Update Home component to use new components
5. Remove inline components and styles

### Phase 3: Cleanup and Optimization

1. Remove unused imports and code
2. Optimize component re-renders
3. Add comprehensive testing
4. Update documentation

## Performance Considerations

### Memoization Strategy

- Memoize expensive calculations in sessions hook
- Use React.memo for pure components where appropriate
- Optimize re-renders during organization switching

### Animation Performance

- Use native driver for animations where possible
- Cleanup animation listeners on unmount
- Optimize animation timing for smooth transitions

### Data Fetching Optimization

- Prevent unnecessary API calls during organization switching
- Implement proper cleanup for pending requests
- Cache sessions data appropriately
