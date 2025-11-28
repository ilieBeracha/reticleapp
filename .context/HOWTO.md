# HOW-TO REFERENCE

## Add New Modal

1. Create component in `components/modals/NewSheet.tsx`:
```tsx
export interface NewSheetRef {
  open: (data?: any) => void;
  close: () => void;
}

export const NewSheet = forwardRef<NewSheetRef, Props>(({ onComplete }, ref) => {
  const sheetRef = useRef<BaseBottomSheetRef>(null);
  
  useImperativeHandle(ref, () => ({
    open: (data) => { /* set state */ sheetRef.current?.open(); },
    close: () => sheetRef.current?.close(),
  }));
  
  return (
    <BaseBottomSheet ref={sheetRef} snapPoints={['70%']}>
      {/* content */}
    </BaseBottomSheet>
  );
});
```

2. Add to `contexts/ModalContext.tsx`:
```tsx
// In interface
newSheetRef: React.RefObject<NewSheetRef | null>;
onNewComplete: (() => void) | null;
setOnNewComplete: (callback: (() => void) | null) => void;

// In provider
const newSheetRef = useRef<NewSheetRef>(null);
const [onNewComplete, setOnNewComplete] = useState<(() => void) | null>(null);

// In value
newSheetRef, onNewComplete, setOnNewComplete,
```

3. Add to `app/(protected)/_layout.tsx`:
```tsx
const { newSheetRef, onNewComplete } = useModals();

// In render
<NewSheet
  ref={newSheetRef}
  onComplete={() => {
    if (onNewComplete) onNewComplete();
    newSheetRef.current?.close();
  }}
/>
```

---

## Add RLS Policy

Use MCP:
```typescript
mcp_supabase_apply_migration({
  name: "policy_name",
  query: `
    DROP POLICY IF EXISTS "old_policy" ON "table";
    
    CREATE POLICY "new_policy" ON "table"
    FOR INSERT/SELECT/UPDATE/DELETE
    USING (/* condition */)
    WITH CHECK (/* for INSERT/UPDATE */);
  `
})
```

Common checks:
```sql
-- User is owner/admin
EXISTS (SELECT 1 FROM workspace_access WHERE org_workspace_id = table.org_workspace_id AND member_id = auth.uid() AND role IN ('owner', 'admin'))

-- User is team commander
EXISTS (SELECT 1 FROM team_members WHERE team_id = table.team_id AND user_id = auth.uid() AND role = 'commander')

-- User is team member
EXISTS (SELECT 1 FROM team_members WHERE team_id = table.team_id AND user_id = auth.uid())

-- User owns record
table.user_id = auth.uid()
```

---

## Add New Service Function

1. Create in `services/newService.ts`:
```typescript
import { AuthenticatedClient } from './authenticatedClient';

export async function doSomething(params: Params): Promise<Result> {
  const supabase = await AuthenticatedClient.getClient();
  
  const { data, error } = await supabase
    .from('table')
    .insert(params)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

2. Add types to `types/workspace.ts` if needed

---

## Add Tab to Workspace

1. Create `app/(protected)/workspace/newtab.tsx`:
```tsx
export default function NewTab() {
  return <MyComponent />;
}
```

2. Add to `app/(protected)/workspace/_layout.tsx`:
```tsx
<Tabs.Screen
  name="newtab"
  options={{
    title: 'New Tab',
    tabBarIcon: ({ color }) => (
      <TabBarIcon name="icon-name" color={color} />
    ),
  }}
/>
```

---

## Role-Based UI

```tsx
const { orgRole, isAdmin, isCommander, teamInfo } = useOrgRole();

// Check permissions
const canCreate = isAdmin || (isCommander && teamInfo);
const canDelete = orgRole === 'owner' || orgRole === 'admin';

// Conditional render
{canCreate && <Button onPress={handleCreate}>Create</Button>}

// Filter data for commanders
const filteredTeams = isAdmin 
  ? allTeams 
  : allTeams.filter(t => userTeams.includes(t.id));
```

---

## Refresh Data After Action

In the component that displays data:
```tsx
const { setOnXxxCreated } = useModals();

useEffect(() => {
  // Single function - just pass the reference
  setOnXxxCreated(() => fetchData);
  
  // Multiple functions - MUST use double arrow!
  // Because setState(fn) calls fn as updater, so () => { doStuff() } runs immediately
  setOnXxxCreated(() => () => {
    fetchData();
    fetchOtherData();
  });
  
  return () => setOnXxxCreated(null);
}, [fetchData]);
```

**⚠️ COMMON MISTAKE:**
```tsx
// WRONG - executes immediately during render!
setOnXxxCreated(() => {
  fetchData();
  doOther();
});

// CORRECT - stores a function
setOnXxxCreated(() => () => {
  fetchData();
  doOther();
});
```

---

## Debug RLS Issues

1. Check error code: `42501` = RLS violation
2. Identify table from error message
3. Check policies:
```typescript
mcp_supabase_execute_sql({
  query: `
    SELECT polname, polcmd, polroles, polqual, polwithcheck
    FROM pg_policies
    WHERE tablename = 'your_table';
  `
})
```
4. Test as user:
```typescript
mcp_supabase_execute_sql({
  query: `
    SELECT auth.uid();  -- Current user
    SELECT * FROM workspace_access WHERE member_id = auth.uid();  -- User's roles
    SELECT * FROM team_members WHERE user_id = auth.uid();  -- Team memberships
  `
})
```

---

## Cross-Platform Icons

```tsx
// In tab bar
tabBarIcon: ({ focused }) => ({
  sfSymbol: focused ? 'house.fill' : 'house',  // iOS
  ionicon: focused ? 'home' : 'home-outline',   // Android
})

// In components
<Ionicons name="home-outline" size={24} color={color} />
```

---

## Suppress Warnings

In `app/_layout.tsx`:
```tsx
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'SF Symbols are not supported',
  'Unable to get the view config',
  'SafeAreaView has been deprecated',
]);
```

