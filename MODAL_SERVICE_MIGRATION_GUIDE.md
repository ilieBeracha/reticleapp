# State-Based Modal Service Migration Guide

## Overview

We've migrated from a **ref-based** modal system to a **state-based** modal system using Zustand. This is necessary for the Swift BottomSheet component which uses `open` boolean + `onOpenChange` callback instead of imperative refs.

## Key Changes

### Before (Ref-Based)
```tsx
// Old pattern with refs
const modalRef = useRef<BaseBottomSheetRef>(null);

// Open modal
modalRef.current?.open();

// Component
<BaseBottomSheet ref={modalRef}>
  {/* content */}
</BaseBottomSheet>
```

### After (State-Based)
```tsx
// New pattern with state
const isOpen = useModalService((state) => state.createSessionOpen);
const close = useModalService((state) => state.closeCreateSession);

// Open modal (from anywhere in app)
const open = useModalService.getState().openCreateSession;
open();

// Component
<SwiftBottomSheet open={isOpen} onOpenChange={(open) => !open && close()}>
  {/* content */}
</SwiftBottomSheet>
```

## Modal Service API

### Available Modals

```tsx
import { useModalService } from '@/services/modalService';

// Get state and actions
const {
  // States
  userMenuOpen,
  workspaceSwitcherOpen,
  createWorkspaceOpen,
  createSessionOpen,
  createTeamOpen,
  inviteMembersOpen,
  acceptInviteOpen,
  teamPreviewOpen,
  memberPreviewOpen,
  chartDetailsOpen,
  comingSoonOpen,
  
  // Actions
  openUserMenu,
  closeUserMenu,
  openCreateSession,
  closeCreateSession,
  // ... etc
  
  // Data
  selectedTeam,
  selectedMember,
  
  // Data actions
  openTeamPreview,  // Takes team object
  openMemberPreview, // Takes member object
} = useModalService();
```

### Selective Subscription (Optimized)

```tsx
// Only subscribe to what you need (prevents unnecessary re-renders)
const isOpen = useModalService((state) => state.createSessionOpen);
const close = useModalService((state) => state.closeCreateSession);
```

## Migration Steps

### 1. Modal Component Migration

**Before:**
```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { BaseBottomSheet, type BaseBottomSheetRef } from './BaseBottomSheet';

interface CreateSessionSheetProps {
  onSessionCreated?: () => void;
}

export const CreateSessionSheet = forwardRef<BaseBottomSheetRef, CreateSessionSheetProps>(
  ({ onSessionCreated }, ref) => {
    const bottomSheetRef = useRef<BaseBottomSheetRef>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.open(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleSubmit = () => {
      bottomSheetRef.current?.close();
      onSessionCreated?.();
    };

    return (
      <BaseBottomSheet ref={bottomSheetRef}>
        {/* content */}
      </BaseBottomSheet>
    );
  }
);
```

**After:**
```tsx
import SwiftBottomSheet from '@/components/swift/bottom-sheet';
import { useModalService } from '@/services/modalService';

interface CreateSessionSheetProps {
  onSessionCreated?: () => void;
}

export function CreateSessionSheet({ onSessionCreated }: CreateSessionSheetProps) {
  const isOpen = useModalService((state) => state.createSessionOpen);
  const close = useModalService((state) => state.closeCreateSession);

  const handleClose = (open: boolean) => {
    if (!open) close();
  };

  const handleSubmit = () => {
    close();
    onSessionCreated?.();
  };

  return (
    <SwiftBottomSheet open={isOpen} onOpenChange={handleClose}>
      {/* content */}
    </SwiftBottomSheet>
  );
}
```

### 2. Opening Modals

**Before:**
```tsx
import { useModals } from '@/contexts/ModalContext';

function MyComponent() {
  const { createSessionSheetRef } = useModals();

  const handlePress = () => {
    createSessionSheetRef.current?.open();
  };

  return <Button onPress={handlePress} />;
}
```

**After:**
```tsx
import { useModalService } from '@/services/modalService';

function MyComponent() {
  const openCreateSession = useModalService((state) => state.openCreateSession);

  return <Button onPress={openCreateSession} />;
}
```

### 3. Opening with Data

**Before:**
```tsx
const { teamPreviewSheetRef, setSelectedTeam } = useModals();

const handleViewTeam = (team) => {
  setSelectedTeam(team);
  teamPreviewSheetRef.current?.open();
};
```

**After:**
```tsx
const openTeamPreview = useModalService((state) => state.openTeamPreview);

const handleViewTeam = (team) => {
  openTeamPreview(team); // Single call handles both state and data
};
```

### 4. Using Callbacks (Already Updated)

The `useModalCallbacks` hook has been updated to work with the new service:

```tsx
import { useModalCallbacks } from '@/hooks/useModalCallbacks';

function MyScreen() {
  useModalCallbacks({
    onTeamCreated: () => {
      refetchTeams();
    },
    onSessionCreated: () => {
      refetchSessions();
    },
  });
  
  return (/* ... */);
}
```

### 5. Layout Update

**Before:**
```tsx
export default function ProtectedLayout() {
  const userMenuRef = useRef(null);
  const { createSessionSheetRef } = useModals();

  return (
    <>
      <Stack />
      <UserMenuBottomSheet ref={userMenuRef} />
      <CreateSessionSheet ref={createSessionSheetRef} />
    </>
  );
}
```

**After:**
```tsx
export default function ProtectedLayout() {
  return (
    <>
      <Stack />
      {/* No refs needed - modals manage their own state */}
      <UserMenuBottomSheet />
      <CreateSessionSheet />
    </>
  );
}
```

## Benefits

1. **Simpler API**: No need for refs and `forwardRef`
2. **Better TypeScript**: Type-safe state and actions
3. **Easier Testing**: Direct access to modal state
4. **No Prop Drilling**: Access modals from anywhere
5. **Performance**: Selective subscriptions prevent unnecessary re-renders
6. **Swift Compatible**: Works perfectly with state-based Swift BottomSheet

## Quick Reference

### Opening Modals
```tsx
const open = useModalService((state) => state.openCreateSession);
open();
```

### Closing Modals
```tsx
const close = useModalService((state) => state.closeCreateSession);
close();
```

### Checking State
```tsx
const isOpen = useModalService((state) => state.createSessionOpen);
```

### Opening with Data
```tsx
const openTeamPreview = useModalService((state) => state.openTeamPreview);
openTeamPreview({ id: '123', name: 'Team Alpha' });
```

### Getting Data
```tsx
const selectedTeam = useModalService((state) => state.selectedTeam);
```

### Setting Callbacks
```tsx
const setOnSessionCreated = useModalService((state) => state.setOnSessionCreated);
setOnSessionCreated(() => {
  console.log('Session created!');
});
```

## Migration Checklist

- [ ] Install zustand if not already: `npm install zustand`
- [ ] Copy `services/modalService.ts`
- [ ] Update `hooks/useModalCallbacks.ts`
- [ ] Update modal components one by one
- [ ] Update components that open modals
- [ ] Update layout to remove refs
- [ ] Test all modals
- [ ] Remove old ModalContext (optional, keep for backward compatibility)

## Coexistence

Both systems can coexist during migration:
- New Swift-based modals use the service
- Old ref-based modals continue to work
- Migrate incrementally

## Example: Complete Modal Component

```tsx
import SwiftBottomSheet from '@/components/swift/bottom-sheet';
import { useModalService } from '@/services/modalService';
import { useColors } from '@/hooks/ui/useColors';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export function CreateTeamSheet() {
  const colors = useColors();
  const isOpen = useModalService((state) => state.createTeamOpen);
  const close = useModalService((state) => state.closeCreateTeam);
  const onTeamCreated = useModalService((state) => state.onTeamCreated);

  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = (open: boolean) => {
    if (!open) {
      close();
      setTeamName('');
    }
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) return;

    setLoading(true);
    try {
      // Create team logic
      await createTeam({ name: teamName });
      
      close();
      setTeamName('');
      onTeamCreated?.();
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwiftBottomSheet open={isOpen} onOpenChange={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Create Team</Text>

        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          placeholder="Team name"
          placeholderTextColor={colors.textMuted}
          value={teamName}
          onChangeText={setTeamName}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading || !teamName.trim()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </SwiftBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

