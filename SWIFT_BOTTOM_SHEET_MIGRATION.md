# Swift Bottom Sheet Migration Plan

## 📋 Current System vs Target System

### **Current System** (Gorhom Bottom Sheet):
```typescript
// _layout.tsx - All modals declared statically
<CreateTeamSheet ref={ref} onTeamCreated={callback} />
<InviteMembersSheet ref={ref} onMemberInvited={callback} />
// ... 8+ more sheets

// ModalContext - Manages refs
const createTeamSheetRef = useRef<BaseBottomSheetRef>(null);
const inviteMembersSheetRef = useRef<BaseBottomSheetRef>(null);

// Usage
const { createTeamSheetRef } = useModals();
createTeamSheetRef.current?.open();
```

### **Target System** (Swift Bottom Sheet):
```typescript
// ModalContext - Manages open state
const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);
const [sheetProps, setSheetProps] = useState<any>(null);

// Usage
const { openSheet } = useModals();
openSheet('createTeam', { workspaceId: '123' });

// _layout.tsx - Single dynamic sheet renderer
<SwiftSheetManager />
```

---

## 🎯 Implementation Strategy

### **Phase 1: Create Swift Bottom Sheet Wrapper**

#### File: `components/swift/bottom-sheet/SwiftBottomSheet.tsx`
```typescript
import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { useColors } from '@/hooks/ui/useColors';

interface SwiftBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  detents?: ('medium' | 'large' | number)[];
  dragIndicator?: 'automatic' | 'visible' | 'hidden';
}

export function SwiftBottomSheet({
  open,
  onOpenChange,
  children,
  detents = ['medium', 'large'],
  dragIndicator = 'automatic',
}: SwiftBottomSheetProps) {
  const colors = useColors();
  
  return (
    <Host>
      <BottomSheet
        isOpened={open}
        onIsOpenedChange={onOpenChange}
        presentationDetents={detents}
        presentationDragIndicator={dragIndicator}
      >
        {children}
      </BottomSheet>
    </Host>
  );
}
```

---

### **Phase 2: Create Sheet Manager Context**

#### File: `contexts/SwiftSheetContext.tsx`
```typescript
type SheetType = 
  | 'createTeam'
  | 'inviteMembers'
  | 'createSession'
  | 'teamPreview'
  | 'memberPreview'
  | 'createWorkspace'
  | 'acceptInvite';

interface SheetContextType {
  activeSheet: SheetType | null;
  sheetProps: any;
  openSheet: (type: SheetType, props?: any) => void;
  closeSheet: () => void;
}

export function SwiftSheetProvider({ children }: { children: ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);
  const [sheetProps, setSheetProps] = useState<any>(null);

  const openSheet = useCallback((type: SheetType, props?: any) => {
    setSheetProps(props);
    setActiveSheet(type);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
    setSheetProps(null);
  }, []);

  return (
    <SwiftSheetContext.Provider value={{ activeSheet, sheetProps, openSheet, closeSheet }}>
      {children}
    </SwiftSheetContext.Provider>
  );
}
```

---

### **Phase 3: Create Sheet Manager Component**

#### File: `components/swift/bottom-sheet/SwiftSheetManager.tsx`
```typescript
import { useSwiftSheets } from '@/contexts/SwiftSheetContext';
import { SwiftBottomSheet } from './SwiftBottomSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import { InviteMembersSheet } from '@/components/modals/InviteMembersSheet';
// ... other imports

export function SwiftSheetManager() {
  const { activeSheet, sheetProps, closeSheet } = useSwiftSheets();

  const renderSheet = () => {
    switch (activeSheet) {
      case 'createTeam':
        return <CreateTeamSheet {...sheetProps} onClose={closeSheet} />;
      case 'inviteMembers':
        return <InviteMembersSheet {...sheetProps} onClose={closeSheet} />;
      // ... other cases
      default:
        return null;
    }
  };

  return (
    <SwiftBottomSheet
      open={activeSheet !== null}
      onOpenChange={(open) => !open && closeSheet()}
      detents={getDetentsForSheet(activeSheet)}
    >
      {renderSheet()}
    </SwiftBottomSheet>
  );
}
```

---

### **Phase 4: Update Hook Pattern**

#### File: `hooks/useSwiftSheets.ts` (similar to useModalCallbacks.ts)
```typescript
import { useEffect } from 'react';
import { useSwiftSheets } from '@/contexts/SwiftSheetContext';

interface UseSwiftSheetsProps {
  onTeamCreated?: () => void;
  onMemberInvited?: () => void;
  onSessionCreated?: () => void;
}

export function useSwiftSheetCallbacks({
  onTeamCreated,
  onMemberInvited,
  onSessionCreated,
}: UseSwiftSheetsProps) {
  const { registerCallback } = useSwiftSheets();

  useEffect(() => {
    registerCallback('teamCreated', onTeamCreated);
    registerCallback('memberInvited', onMemberInvited);
    registerCallback('sessionCreated', onSessionCreated);

    return () => {
      registerCallback('teamCreated', null);
      registerCallback('memberInvited', null);
      registerCallback('sessionCreated', null);
    };
  }, [onTeamCreated, onMemberInvited, onSessionCreated]);
}
```

---

### **Phase 5: Update _layout.tsx**

#### Before:
```typescript
<CreateTeamSheet ref={createTeamSheetRef} onTeamCreated={...} />
<InviteMembersSheet ref={inviteMembersSheetRef} onMemberInvited={...} />
<CreateSessionSheet ref={createSessionSheetRef} onSessionCreated={...} />
// ... 8+ more sheets
```

#### After:
```typescript
<SwiftSheetManager />
// That's it! Single component
```

---

### **Phase 6: Update Usage**

#### Before:
```typescript
const { createTeamSheetRef } = useModals();
createTeamSheetRef.current?.open();
```

#### After:
```typescript
const { openSheet } = useSwiftSheets();
openSheet('createTeam', { workspaceId: activeWorkspaceId });
```

---

## 🚀 Migration Steps

### Step 1: Create New Infrastructure
- [ ] Create `contexts/SwiftSheetContext.tsx`
- [ ] Create `components/swift/bottom-sheet/SwiftBottomSheet.tsx` (improved)
- [ ] Create `components/swift/bottom-sheet/SwiftSheetManager.tsx`
- [ ] Create `hooks/useSwiftSheets.ts`

### Step 2: Update Existing Modals
- [ ] Convert modal components to work without refs
- [ ] Add `onClose` prop to all modal components
- [ ] Update modal props to receive data directly

### Step 3: Migrate _layout.tsx
- [ ] Wrap app with `SwiftSheetProvider`
- [ ] Replace all static sheets with `<SwiftSheetManager />`
- [ ] Test each modal

### Step 4: Update Usage Sites
- [ ] Replace `useModals()` with `useSwiftSheets()` across app
- [ ] Replace `ref.current?.open()` with `openSheet(type, props)`
- [ ] Update all usage sites (manage.tsx, etc.)

### Step 5: Cleanup
- [ ] Remove old `ModalContext.tsx`
- [ ] Remove `useModalCallbacks.ts`
- [ ] Remove refs from modal components

---

## ✅ Benefits

1. **Single Modal Mount Point** - Only one sheet in DOM
2. **Better Performance** - No multiple refs or renders
3. **Cleaner API** - `openSheet('type')` vs `ref.current?.open()`
4. **Type Safety** - TypeScript knows which props each sheet needs
5. **Native iOS Feel** - Uses SwiftUI bottom sheets
6. **Easier Maintenance** - One place to manage all sheets

---

## ⚠️ Considerations

1. **iOS Only** - Swift bottom sheets only work on iOS
   - Need Android fallback
   - Can keep Gorhom for Android

2. **Props Pattern** - Pass data via props instead of refs
   ```typescript
   // Old: Set data in context, then open
   setSelectedTeam(team);
   teamPreviewSheetRef.current?.open();
   
   // New: Pass data directly
   openSheet('teamPreview', { team });
   ```

3. **Callback Pattern** - Use callback registration
   ```typescript
   // In screen
   useSwiftSheetCallbacks({
     onTeamCreated: () => loadTeams(),
   });
   
   // In modal
   props.onTeamCreated?.();
   closeSheet();
   ```

---

## 📝 Example Implementation

### Usage Example:
```typescript
// In manage.tsx
const { openSheet } = useSwiftSheets();

useSwiftSheetCallbacks({
  onTeamCreated: () => loadTeams(),
  onMemberInvited: () => loadMembers(),
});

const handleTeamPress = (team) => {
  openSheet('teamPreview', { team });
};
```

### Sheet Component Example:
```typescript
// TeamPreviewSheet.tsx
interface TeamPreviewSheetProps {
  team: Team;
  onClose: () => void;
}

export function TeamPreviewSheet({ team, onClose }: TeamPreviewSheetProps) {
  return (
    <View>
      <Text>{team.name}</Text>
      <Button onPress={onClose}>Close</Button>
    </View>
  );
}
```

---

**Ready to implement?** I can start with Step 1 and build out the full system!

