# .context/ - AI Context Documentation

**Start here:** Read `MASTER.md` first for complete overview.

## Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `MASTER.md` | Complete app overview, architecture, quick start | **Always read first** |
| `SCHEMA.md` | Database tables, RLS policies, functions | Working with data/RLS |
| `COMPONENTS.md` | UI components, modals, refs, callbacks | Working with UI |
| `HOWTO.md` | Step-by-step guides for common tasks | Adding features |
| `CHANGELOG.md` | Recent changes, what was done | Understanding history |

## Quick Reference

### Key Files to Know
- `app/(protected)/_layout.tsx` - All modals live here
- `contexts/ModalContext.tsx` - Modal refs + callbacks
- `contexts/OrgRoleContext.tsx` - Role detection
- `hooks/useAppContext.ts` - App-wide state

### Role Hierarchy
```
ORG: owner > admin > instructor > member
TEAM: commander > squad_commander > soldier
```

### Most Used Patterns
```tsx
// Open modal
createTrainingSheetRef.current?.open();

// Register refresh callback
setOnTrainingCreated(() => fetchFn);

// Check permissions
const canCreate = isAdmin || isCommander;
```

### RLS Policy Pattern
```sql
-- Admin/Owner check
EXISTS (SELECT 1 FROM workspace_access WHERE member_id = auth.uid() AND role IN ('owner','admin'))

-- Commander check  
EXISTS (SELECT 1 FROM team_members WHERE user_id = auth.uid() AND role = 'commander')
```

