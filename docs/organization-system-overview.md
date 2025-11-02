# Scopes Organization Hierarchy - AI-Optimized Technical Reference

**Complete Code Documentation for AI Assistants & Development Teams**

> Machine-readable reference with complete type definitions, function signatures, integration patterns, and usage examples.

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Type Definitions](#type-definitions)
3. [Database Schema Reference](#database-schema-reference)
4. [SQL Function Reference](#sql-function-reference)
5. [Service Layer Reference](#service-layer-reference)
6. [Store Reference](#store-reference)
7. [Hooks Reference](#hooks-reference)
8. [Component Patterns](#component-patterns)
9. [Common Scenarios](#common-scenarios)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Testing Patterns](#testing-patterns)
12. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Quick Reference

### System Overview

```
Authentication Flow:
  User logs in → Clerk generates JWT → JWT contains user_id in user_metadata
  → Supabase validates JWT → RLS policies use auth.jwt() -> 'user_metadata' ->> 'user_id'

Data Flow:
  Component → Hook → Store → Service → Supabase → PostgreSQL

Permission Flow:
  Root Commander → Has full tree access
  Local Commander → Has org + children access
  Member → Can edit content, no admin
  Viewer → Read-only access
```

### File Structure

```
src/
├── types/
│   └── organizations.ts          # All TypeScript interfaces
├── lib/
│   └── authenticatedClient.ts    # Supabase client wrapper
├── services/
│   └── organizationsService.ts   # Database operations
├── store/
│   └── organizationsStore.ts     # Zustand state management
├── hooks/
│   ├── useIsOrganizationCommander.ts
│   ├── useIsRootCommander.ts
│   ├── useCurrentOrg.ts
│   ├── useOrgPermissions.ts
│   ├── useOrgHierarchy.ts
│   ├── useRequireOrganization.ts
│   └── useRequirePermission.ts
├── contexts/
│   └── OrganizationSwitchProvider.tsx
└── components/
    ├── CreateOrg.tsx
    └── OrganizationSwitcherModal.tsx
```

---

## Type Definitions

### Complete TypeScript Interfaces

```typescript
// types/organizations.ts

/**
 * Base organization entity from database
 * Maps 1:1 to organizations table
 */
export interface Organization {
  id: string;                    // UUID - Primary key
  name: string;                  // Display name (e.g., "Alpha Company")
  org_type: string;              // User-defined type (e.g., "Company", "Battalion")
  parent_id: string | null;      // UUID - Reference to parent org, NULL for root
  root_id: string;               // UUID - Reference to tree root (self for root orgs)
  path: string[];                // Array of ancestor UUIDs ['root', 'parent', 'this']
  depth: number;                 // Integer - Distance from root (0 = root)
  description: string | null;    // Optional text description
  created_by: string;            // Clerk user_id who created this org
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

/**
 * User's membership in an organization with hierarchy context
 * Returned by get_user_orgs() SQL function
 */
export interface UserOrg {
  org_id: string;                // UUID - Organization ID
  org_name: string;              // Organization display name
  org_type: string;              // Organization type
  root_id: string;               // Root of this org's tree
  root_name: string;             // Root org's name
  parent_id: string | null;      // Parent org ID
  parent_name: string | null;    // Parent org's name
  depth: number;                 // Depth in tree
  role: OrgRole;                 // User's role in this org
  full_path: string;             // Human-readable path "Battalion → Company → Platoon"
}

/**
 * Organization membership record
 * Maps users to organizations with roles
 */
export interface OrgMembership {
  id: string;                    // UUID - Primary key
  user_id: string;               // Clerk user_id
  org_id: string;                // UUID - Organization reference
  role: OrgRole;                 // User's role
  created_at: string;            // ISO timestamp
}

/**
 * Role types with permission implications
 */
export type OrgRole = 'commander' | 'member' | 'viewer';

/**
 * Input for creating root organization
 */
export interface CreateRootOrgInput {
  name: string;                  // Required - Organization name
  orgType: string;               // Required - Type (e.g., "Battalion")
  description?: string;          // Optional - Description
}

/**
 * Input for creating child organization
 */
export interface CreateChildOrgInput {
  name: string;                  // Required - Organization name
  orgType: string;               // Required - Type (e.g., "Company")
  parentId: string;              // Required - UUID of parent org
  description?: string;          // Optional - Description
}

/**
 * Org children with metadata
 * Returned by get_org_children() SQL function
 */
export interface OrgChild {
  id: string;                    // UUID - Child org ID
  name: string;                  // Child org name
  org_type: string;              // Child org type
  depth: number;                 // Depth in tree
  member_count: number;          // Number of direct members
  has_children: boolean;         // Whether this child has children
}

/**
 * Organization subtree node
 * Returned by get_org_subtree() SQL function
 */
export interface OrgSubtree {
  id: string;                    // UUID - Org ID
  name: string;                  // Org name
  org_type: string;              // Org type
  parent_id: string | null;      // Parent UUID
  depth: number;                 // Depth in tree
  full_path: string;             // Human-readable path
  member_count: number;          // Direct members
}

/**
 * Tree node for hierarchical display
 * Returned by get_org_tree() SQL function
 */
export interface OrgTreeNode {
  id: string;                    // UUID - Org ID
  name: string;                  // Org name
  type: string;                  // Org type
  depth: number;                 // Depth in tree
  parent_id: string | null;      // Parent UUID
  path: string;                  // Human-readable path
  children?: OrgTreeNode[];      // Nested children (recursive)
}

/**
 * Current organization context with permissions
 * Returned by useCurrentOrg() hook
 */
export interface CurrentOrgInfo {
  org: UserOrg | null;           // Full org object if org selected
  isPersonal: boolean;           // True if no org selected (personal mode)
  isCommander: boolean;          // True if user is commander of current org
  isMember: boolean;             // True if user is member of current org
  isViewer: boolean;             // True if user is viewer of current org
  canEdit: boolean;              // Can edit content (commander or member)
  canInvite: boolean;            // Can invite members (commander only)
  canDelete: boolean;            // Can delete org (commander only)
}

/**
 * Detailed permission set for current context
 * Returned by useOrgPermissions() hook
 */
export interface OrgPermissions {
  // View permissions
  canViewOrg: boolean;           // Can view org details
  
  // Organization management
  canEditOrg: boolean;           // Can edit org settings (local commander)
  canDeleteOrg: boolean;         // Can delete org (local commander)
  canCreateChild: boolean;       // Can create child orgs (root or local commander)
  
  // Member management
  canInviteMembers: boolean;     // Can invite new members (root or local commander)
  canRemoveMembers: boolean;     // Can remove members (root or local commander)
  canEditMembers: boolean;       // Can change member roles (root or local commander)
  
  // Content permissions
  canCreateTraining: boolean;    // Can create trainings (commander or member)
  canEditTraining: boolean;      // Can edit trainings (commander or member)
  canDeleteTraining: boolean;    // Can delete trainings (root or local commander)
  canCreateSession: boolean;     // Can create sessions (commander or member)
  canEditSession: boolean;       // Can edit sessions (commander or member)
  canDeleteSession: boolean;     // Can delete sessions (root or local commander)
  
  // Weapon management
  canManageWeapons: boolean;     // Can manage weapons (root or local commander)
  
  // Role and admin status
  role: OrgRole | null;          // User's role in current org (null if personal)
  isRootCommander: boolean;      // True if commander of root (full tree access)
}

/**
 * Hierarchical relationships
 * Returned by useOrgHierarchy() hook
 */
export interface OrgHierarchy {
  current: UserOrg | null;       // Currently selected org
  root: UserOrg | null;          // Root of current tree
  parent: UserOrg | null;        // Parent of current org
  children: UserOrg[];           // Direct children of current org
  siblings: UserOrg[];           // Orgs with same parent
  ancestors: UserOrg[];          // All ancestors (root to parent)
  isRoot: boolean;               // True if current org is root
  hasChildren: boolean;          // True if current org has children
  depth: number;                 // Depth of current org in tree
}
```

---

## Database Schema Reference

### Table: `organizations`

**Purpose**: Stores organizational hierarchy tree with materialized paths.

**Schema DDL**:
```sql
CREATE TABLE organizations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  description TEXT,
  
  -- Hierarchy (auto-maintained by trigger)
  parent_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  root_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  path TEXT[] NOT NULL DEFAULT '{}',
  depth INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (depth >= 0),
  CHECK (
    (parent_id IS NULL AND depth = 0) OR 
    (parent_id IS NOT NULL AND depth > 0)
  )
);

-- Indexes for performance
CREATE INDEX idx_orgs_parent ON organizations(parent_id);
CREATE INDEX idx_orgs_root ON organizations(root_id);
CREATE INDEX idx_orgs_path ON organizations USING GIN(path);
CREATE INDEX idx_orgs_created_by ON organizations(created_by);
CREATE INDEX idx_orgs_depth ON organizations(depth);
```

**Field Reference**:

| Field | Type | Nullable | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | UUID | No | Primary key, auto-generated | `a7b2c3d4-e5f6-...` |
| `name` | TEXT | No | Display name | `"Alpha Company"` |
| `org_type` | TEXT | No | User-defined category | `"Company"` |
| `description` | TEXT | Yes | Optional description | `"Primary assault unit"` |
| `parent_id` | UUID | Yes | Parent org reference | `NULL` for roots |
| `root_id` | UUID | No | Root org reference | Same as `id` for roots |
| `path` | TEXT[] | No | Materialized path array | `['root', 'parent', 'id']` |
| `depth` | INTEGER | No | Distance from root | `0` = root, `1` = child |
| `created_by` | TEXT | No | Clerk user_id of creator | `"user_2abc123xyz"` |
| `created_at` | TIMESTAMPTZ | No | Creation timestamp | `2024-01-15T10:30:00Z` |
| `updated_at` | TIMESTAMPTZ | No | Last update timestamp | `2024-01-16T14:20:00Z` |

**Automatic Trigger Maintenance**:

```sql
-- This trigger automatically sets hierarchy fields
CREATE TRIGGER trg_set_org_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_org_hierarchy();

-- Trigger function (don't call directly)
CREATE OR REPLACE FUNCTION set_org_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT[];
  parent_depth INTEGER;
  parent_root UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Root organization
    NEW.root_id := NEW.id;
    NEW.path := ARRAY[NEW.id::TEXT];
    NEW.depth := 0;
  ELSE
    -- Child organization
    SELECT path, depth, root_id 
    INTO parent_path, parent_depth, parent_root
    FROM organizations
    WHERE id = NEW.parent_id;
    
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent organization not found';
    END IF;
    
    NEW.root_id := parent_root;
    NEW.path := parent_path || NEW.id::TEXT;
    NEW.depth := parent_depth + 1;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Query Patterns**:

```sql
-- Get all descendants (entire subtree)
SELECT * FROM organizations 
WHERE path @> ARRAY['parent_org_id'];

-- Get direct children only
SELECT * FROM organizations 
WHERE parent_id = 'parent_org_id';

-- Get all at specific depth
SELECT * FROM organizations 
WHERE depth = 2 AND root_id = 'root_org_id';

-- Get all ancestors
SELECT * FROM organizations 
WHERE id = ANY((SELECT path FROM organizations WHERE id = 'target_id')::UUID[])
ORDER BY depth;

-- Get siblings
SELECT * FROM organizations 
WHERE parent_id = (SELECT parent_id FROM organizations WHERE id = 'org_id')
AND id != 'org_id';

-- Get root of org
SELECT * FROM organizations 
WHERE id = (SELECT root_id FROM organizations WHERE id = 'org_id');

-- Check if org A is ancestor of org B (O(1))
SELECT 'org_a_id' = ANY((SELECT path FROM organizations WHERE id = 'org_b_id')::TEXT[]);
```

---

### Table: `org_memberships`

**Purpose**: Maps users to organizations with roles.

**Schema DDL**:
```sql
CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('commander', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- Indexes
CREATE INDEX idx_memberships_user ON org_memberships(user_id);
CREATE INDEX idx_memberships_org ON org_memberships(org_id);
CREATE INDEX idx_memberships_user_role ON org_memberships(user_id, role);
```

**Field Reference**:

| Field | Type | Nullable | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | UUID | No | Primary key | `f1e2d3c4-...` |
| `user_id` | TEXT | No | Clerk user_id | `"user_2abc123xyz"` |
| `org_id` | UUID | No | Organization reference | `a7b2c3d4-...` |
| `role` | TEXT | No | One of: commander, member, viewer | `"commander"` |
| `created_at` | TIMESTAMPTZ | No | Join timestamp | `2024-01-15T10:30:00Z` |

**Role Hierarchy**:

```
commander > member > viewer

commander:
  - Full control of organization
  - Can invite/remove members
  - Can create child organizations
  - Can delete organization
  - Can edit org settings
  - Inherits to all descendants if root commander

member:
  - Can create/edit content (trainings, sessions)
  - Can view org data
  - Cannot manage organization
  - Cannot invite members

viewer:
  - Read-only access
  - Can view org data
  - Cannot create/edit content
```

**Query Patterns**:

```sql
-- Get all memberships for user
SELECT om.*, o.name, o.org_type 
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = 'user_id';

-- Get all members of org
SELECT om.*, u.email 
FROM org_memberships om
LEFT JOIN users u ON u.id = om.user_id
WHERE om.org_id = 'org_id';

-- Check if user is commander
SELECT EXISTS (
  SELECT 1 FROM org_memberships 
  WHERE user_id = 'user_id' 
  AND org_id = 'org_id' 
  AND role = 'commander'
);

-- Get commanders of org
SELECT user_id FROM org_memberships 
WHERE org_id = 'org_id' AND role = 'commander';

-- Count members by role
SELECT role, COUNT(*) FROM org_memberships 
WHERE org_id = 'org_id' GROUP BY role;
```

---

## SQL Function Reference

### Read Functions

#### `get_user_orgs(user_id)`

**Purpose**: Get all organizations where user has direct membership.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_user_orgs(p_user_id TEXT)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_type TEXT,
  root_id UUID,
  root_name TEXT,
  parent_id UUID,
  parent_name TEXT,
  depth INTEGER,
  role TEXT,
  full_path TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE;
```

**Returns**: Array of UserOrg objects

**Example Usage**:
```sql
-- Get user's orgs
SELECT * FROM get_user_orgs('user_2abc123xyz');

-- Filter by role
SELECT * FROM get_user_orgs('user_2abc123xyz') 
WHERE role = 'commander';

-- Get root orgs only
SELECT * FROM get_user_orgs('user_2abc123xyz') 
WHERE depth = 0;
```

**TypeScript Usage**:
```typescript
const { data } = await client.rpc('get_user_orgs', {
  p_user_id: userId
});
// data: UserOrg[]
```

---

#### `get_user_accessible_orgs(user_id)`

**Purpose**: Get ALL organizations in trees where user has membership (includes orgs they're not direct members of).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_user_accessible_orgs(p_user_id TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  parent_id UUID,
  root_id UUID,
  path TEXT[],
  depth INTEGER,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE;
```

**Returns**: Array of Organization objects (all visible orgs)

**Example Usage**:
```sql
-- Get all visible orgs
SELECT * FROM get_user_accessible_orgs('user_2abc123xyz');

-- Get only root orgs user can see
SELECT * FROM get_user_accessible_orgs('user_2abc123xyz') 
WHERE depth = 0;

-- Get orgs of specific type
SELECT * FROM get_user_accessible_orgs('user_2abc123xyz') 
WHERE org_type = 'Company';
```

**TypeScript Usage**:
```typescript
const { data } = await client.rpc('get_user_accessible_orgs', {
  p_user_id: userId
});
// data: Organization[]
```

---

#### `get_org_children(org_id)`

**Purpose**: Get direct children of an organization with metadata.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_org_children(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  depth INTEGER,
  member_count BIGINT,
  has_children BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE;
```

**Returns**: Array of OrgChild objects

**Example Usage**:
```sql
-- Get direct children
SELECT * FROM get_org_children('battalion_id');

-- Count children
SELECT COUNT(*) FROM get_org_children('battalion_id');
```

**TypeScript Usage**:
```typescript
const { data } = await client.rpc('get_org_children', {
  p_org_id: orgId
});
// data: OrgChild[]
```

---

#### `get_org_subtree(org_id)`

**Purpose**: Get entire subtree (all descendants recursively).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_org_subtree(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  parent_id UUID,
  depth INTEGER,
  full_path TEXT,
  member_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE;
```

**Returns**: Array of OrgSubtree objects (flattened tree)

**Example Usage**:
```sql
-- Get entire subtree
SELECT * FROM get_org_subtree('battalion_id') ORDER BY depth, name;

-- Get only level 2 descendants
SELECT * FROM get_org_subtree('battalion_id') WHERE depth = 2;
```

**TypeScript Usage**:
```typescript
const { data } = await client.rpc('get_org_subtree', {
  p_org_id: orgId
});
// data: OrgSubtree[]
```

---

#### `get_org_tree(root_id)`

**Purpose**: Get organization tree as nested JSON structure.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_org_tree(p_root_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  depth INTEGER,
  parent_id UUID,
  path TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE;
```

**Returns**: Array of OrgTreeNode objects

**Example Usage**:
```sql
-- Get tree structure
SELECT * FROM get_org_tree('battalion_id');
```

**TypeScript Usage**:
```typescript
const { data } = await client.rpc('get_org_tree', {
  p_root_id: rootId
});
// data: OrgTreeNode[]

// Build nested structure client-side
const buildTree = (nodes: OrgTreeNode[], parentId: string | null = null) => {
  return nodes
    .filter(n => n.parent_id === parentId)
    .map(n => ({
      ...n,
      children: buildTree(nodes, n.id)
    }));
};

const tree = buildTree(data);
```

---

### Write Functions

#### `create_root_organization(name, org_type, description, user_id)`

**Purpose**: Create new root organization and add creator as commander.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION create_root_organization(
  p_name TEXT,
  p_org_type TEXT,
  p_description TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  parent_id UUID,
  root_id UUID,
  path TEXT[],
  depth INTEGER,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

**Returns**: Created Organization object

**Business Logic**:
1. Validates inputs (name required, user_id exists)
2. Creates organization with parent_id = NULL
3. Automatically adds creator as commander
4. Returns created organization

**Example Usage**:
```sql
SELECT * FROM create_root_organization(
  '1st Battalion',
  'Battalion',
  'Primary training battalion',
  'user_2abc123xyz'
);
```

**TypeScript Usage**:
```typescript
const { data, error } = await client.rpc('create_root_organization', {
  p_name: 'Alpha Company',
  p_org_type: 'Company',
  p_description: 'Primary assault unit',
  p_user_id: userId
});

if (error) throw new Error(error.message);
const newOrg: Organization = data[0];
```

**Error Cases**:
- Name is empty → Exception: "Organization name cannot be empty"
- User ID invalid → Exception: "Invalid user ID"

---

#### `create_child_organization(name, org_type, parent_id, description, user_id)`

**Purpose**: Create child organization under existing parent. Validates user is commander in parent's tree.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION create_child_organization(
  p_name TEXT,
  p_org_type TEXT,
  p_parent_id UUID,
  p_description TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  parent_id UUID,
  root_id UUID,
  path TEXT[],
  depth INTEGER,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

**Returns**: Created Organization object

**Business Logic**:
1. Validates parent exists
2. Checks user is commander in parent's tree
3. Creates organization with parent_id set
4. Trigger automatically sets root_id, path, depth
5. Does NOT auto-add membership (assumes inherited)
6. Returns created organization

**Example Usage**:
```sql
SELECT * FROM create_child_organization(
  'Alpha Company',
  'Company',
  'battalion_uuid',
  'Primary assault company',
  'user_2abc123xyz'
);
```

**TypeScript Usage**:
```typescript
const { data, error } = await client.rpc('create_child_organization', {
  p_name: '1st Platoon',
  p_org_type: 'Platoon',
  p_parent_id: companyId,
  p_description: 'First platoon',
  p_user_id: userId
});

if (error) throw new Error(error.message);
const newOrg: Organization = data[0];
```

**Error Cases**:
- Parent not found → Exception: "Parent organization not found"
- User not commander → Exception: "User is not a commander in this organization tree"
- Name empty → Exception: "Organization name cannot be empty"

---

#### `update_organization(org_id, name, org_type, description, user_id)`

**Purpose**: Update organization details. Validates user permissions.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION update_organization(
  p_org_id UUID,
  p_name TEXT,
  p_org_type TEXT,
  p_description TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type TEXT,
  parent_id UUID,
  root_id UUID,
  path TEXT[],
  depth INTEGER,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

**Returns**: Updated Organization object

**Business Logic**:
1. Validates org exists
2. Checks user is commander in org's tree
3. Updates fields (NULL values = no change)
4. Sets updated_at timestamp
5. Returns updated organization

**Example Usage**:
```sql
SELECT * FROM update_organization(
  'org_uuid',
  'Renamed Company',  -- New name
  NULL,               -- Keep existing type
  'Updated desc',     -- New description
  'user_2abc123xyz'
);
```

**TypeScript Usage**:
```typescript
const { data, error } = await client.rpc('update_organization', {
  p_org_id: orgId,
  p_name: 'New Name',
  p_org_type: null,  // Keep existing
  p_description: 'New description',
  p_user_id: userId
});

if (error) throw new Error(error.message);
const updatedOrg: Organization = data[0];
```

**Error Cases**:
- Org not found → Exception: "Organization not found"
- User not commander → Exception: "User is not a commander in this organization tree"

---

#### `delete_organization(org_id, user_id)`

**Purpose**: Delete organization. Cascades to children and memberships.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION delete_organization(
  p_org_id UUID,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

**Returns**: TRUE on success

**Business Logic**:
1. Validates org exists
2. Checks user is commander in org's tree
3. Deletes organization (CASCADE handles children and memberships)
4. Returns TRUE

**Example Usage**:
```sql
SELECT delete_organization('org_uuid', 'user_2abc123xyz');
```

**TypeScript Usage**:
```typescript
const { data, error } = await client.rpc('delete_organization', {
  p_org_id: orgId,
  p_user_id: userId
});

if (error) throw new Error(error.message);
// data: boolean (should be true)
```

**Error Cases**:
- Org not found → Exception: "Organization not found"
- User not commander → Exception: "User is not a commander in this organization tree"

**Cascade Behavior**:
- All child organizations deleted
- All org_memberships deleted
- All trainings/sessions set organization_id = NULL (if ON DELETE SET NULL)

---

## Service Layer Reference

### OrganizationsService

**Location**: `src/services/organizationsService.ts`

**Purpose**: Provides type-safe API for organization operations. All methods are static.

#### Complete API Reference

```typescript
import { AuthenticatedClient } from '@/lib/authenticatedClient';
import type {
  Organization,
  UserOrg,
  OrgMembership,
  CreateRootOrgInput,
  CreateChildOrgInput,
  OrgChild,
  OrgSubtree,
  OrgTreeNode,
} from '@/types/organizations';

export class OrganizationsService {
  
  // ============================================================
  // READ OPERATIONS
  // ============================================================
  
  /**
   * Get user's direct organization memberships
   * @param userId - Clerk user_id
   * @returns Array of organizations where user is a member
   * @throws Error if query fails
   */
  static async getUserOrgs(userId: string): Promise<UserOrg[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('get_user_orgs', {
      p_user_id: userId
    });
    
    if (error) throw new Error(`Failed to get user orgs: ${error.message}`);
    return data || [];
  }
  
  /**
   * Get all accessible organizations (entire visible tree)
   * @param userId - Clerk user_id
   * @returns Array of all organizations in trees where user has membership
   * @throws Error if query fails
   */
  static async getAllOrgs(userId: string): Promise<Organization[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('get_user_accessible_orgs', {
      p_user_id: userId
    });
    
    if (error) throw new Error(`Failed to get orgs: ${error.message}`);
    return data || [];
  }
  
  /**
   * Get direct children of an organization
   * @param orgId - Organization UUID
   * @returns Array of direct child organizations with metadata
   * @throws Error if query fails
   */
  static async getOrgChildren(orgId: string): Promise<OrgChild[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('get_org_children', {
      p_org_id: orgId
    });
    
    if (error) throw new Error(`Failed to get org children: ${error.message}`);
    return data || [];
  }
  
  /**
   * Get entire subtree (all descendants)
   * @param orgId - Organization UUID
   * @returns Flattened array of all descendant organizations
   * @throws Error if query fails
   */
  static async getOrgSubtree(orgId: string): Promise<OrgSubtree[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('get_org_subtree', {
      p_org_id: orgId
    });
    
    if (error) throw new Error(`Failed to get org subtree: ${error.message}`);
    return data || [];
  }
  
  /**
   * Get organization tree structure
   * @param rootId - Root organization UUID
   * @returns Array of tree nodes (build nested structure client-side)
   * @throws Error if query fails
   */
  static async getOrgTree(rootId: string): Promise<OrgTreeNode[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('get_org_tree', {
      p_root_id: rootId
    });
    
    if (error) throw new Error(`Failed to get org tree: ${error.message}`);
    return data || [];
  }
  
  // ============================================================
  // WRITE OPERATIONS
  // ============================================================
  
  /**
   * Create root organization
   * Automatically adds creator as commander
   * @param input - Organization details
   * @param userId - Creator's Clerk user_id
   * @returns Created organization
   * @throws Error if creation fails or validation fails
   */
  static async createRootOrg(
    input: CreateRootOrgInput,
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('create_root_organization', {
      p_name: input.name,
      p_org_type: input.orgType,
      p_description: input.description || null,
      p_user_id: userId,
    });
    
    if (error) throw new Error(`Failed to create org: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('No data returned from create');
    }
    
    return data[0];
  }
  
  /**
   * Create child organization
   * User must be commander in parent's tree
   * @param input - Organization details including parent_id
   * @param userId - Creator's Clerk user_id
   * @returns Created organization
   * @throws Error if creation fails, parent not found, or permission denied
   */
  static async createChildOrg(
    input: CreateChildOrgInput,
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('create_child_organization', {
      p_name: input.name,
      p_org_type: input.orgType,
      p_parent_id: input.parentId,
      p_description: input.description || null,
      p_user_id: userId,
    });
    
    if (error) throw new Error(`Failed to create child org: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('No data returned from create');
    }
    
    return data[0];
  }
  
  /**
   * Update organization
   * User must be commander in org's tree
   * Pass null for fields you don't want to update
   * @param orgId - Organization UUID
   * @param updates - Partial organization updates
   * @param userId - Clerk user_id
   * @returns Updated organization
   * @throws Error if update fails or permission denied
   */
  static async updateOrg(
    orgId: string,
    updates: Partial<Pick<Organization, 'name' | 'org_type' | 'description'>>,
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client.rpc('update_organization', {
      p_org_id: orgId,
      p_name: updates.name || null,
      p_org_type: updates.org_type || null,
      p_description: updates.description !== undefined ? updates.description : null,
      p_user_id: userId,
    });
    
    if (error) throw new Error(`Failed to update org: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('No data returned from update');
    }
    
    return data[0];
  }
  
  /**
   * Delete organization
   * Cascades to all children and memberships
   * User must be commander in org's tree
   * @param orgId - Organization UUID
   * @param userId - Clerk user_id
   * @throws Error if delete fails or permission denied
   */
  static async deleteOrg(orgId: string, userId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();
    
    const { error } = await client.rpc('delete_organization', {
      p_org_id: orgId,
      p_user_id: userId,
    });
    
    if (error) throw new Error(`Failed to delete org: ${error.message}`);
  }
  
  // ============================================================
  // MEMBERSHIP OPERATIONS
  // ============================================================
  
  /**
   * Add user to organization
   * @param input - Membership details
   * @returns Created membership
   * @throws Error if user already member or org not found
   */
  static async addMember(input: {
    orgId: string;
    userId: string;
    role: 'commander' | 'member' | 'viewer';
  }): Promise<OrgMembership> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client
      .from('org_memberships')
      .insert({
        org_id: input.orgId,
        user_id: input.userId,
        role: input.role,
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to add member: ${error.message}`);
    return data;
  }
  
  /**
   * Remove user from organization
   * @param userId - Clerk user_id
   * @param orgId - Organization UUID
   * @throws Error if removal fails
   */
  static async removeMember(userId: string, orgId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();
    
    const { error } = await client
      .from('org_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId);
    
    if (error) throw new Error(`Failed to remove member: ${error.message}`);
  }
  
  /**
   * Update member's role
   * @param userId - Clerk user_id
   * @param orgId - Organization UUID
   * @param role - New role
   * @returns Updated membership
   * @throws Error if update fails
   */
  static async updateMemberRole(
    userId: string,
    orgId: string,
    role: 'commander' | 'member' | 'viewer'
  ): Promise<OrgMembership> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client
      .from('org_memberships')
      .update({ role })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update member role: ${error.message}`);
    return data;
  }
}
```

---

## Store Reference

### OrganizationsStore (Zustand)

**Location**: `src/store/organizationsStore.ts`

**Purpose**: Global state management for organizations.

```typescript
import { create } from 'zustand';
import { OrganizationsService } from '@/services/organizationsService';
import type { Organization, UserOrg, OrgChild } from '@/types/organizations';

interface OrganizationsStore {
  // ============================================================
  // STATE
  // ============================================================
  
  /** User's direct organization memberships */
  userOrgs: UserOrg[];
  
  /** All accessible organizations (visible tree) */
  allOrgs: Organization[];
  
  /** Currently selected organization UUID (null = personal mode) */
  selectedOrgId: string | null;
  
  /** Children of currently selected org */
  orgChildren: OrgChild[];
  
  /** Loading state for async operations */
  loading: boolean;
  
  /** Error message from last failed operation */
  error: string | null;
  
  // ============================================================
  // READ ACTIONS
  // ============================================================
  
  /**
   * Fetch user's organization memberships
   * Sets userOrgs state
   * @param userId - Clerk user_id
   */
  fetchUserOrgs: (userId: string) => Promise<void>;
  
  /**
   * Fetch all accessible organizations
   * Sets allOrgs state
   * @param userId - Clerk user_id
   */
  fetchAllOrgs: (userId: string) => Promise<void>;
  
  /**
   * Fetch children of an organization
   * Sets orgChildren state
   * @param orgId - Organization UUID
   */
  fetchOrgChildren: (orgId: string) => Promise<void>;
  
  // ============================================================
  // WRITE ACTIONS
  // ============================================================
  
  /**
   * Create root organization
   * Refreshes userOrgs and allOrgs after creation
   * @param input - Organization details
   * @param userId - Creator's Clerk user_id
   * @returns Created organization or null on error
   */
  createRootOrg: (
    input: { name: string; orgType: string; description?: string },
    userId: string
  ) => Promise<Organization | null>;
  
  /**
   * Create child organization
   * Refreshes userOrgs and allOrgs after creation
   * @param input - Organization details with parent_id
   * @param userId - Creator's Clerk user_id
   * @returns Created organization or null on error
   */
  createChildOrg: (
    input: {
      name: string;
      orgType: string;
      parentId: string;
      description?: string;
    },
    userId: string
  ) => Promise<Organization | null>;
  
  /**
   * Update organization
   * Refreshes userOrgs and allOrgs after update
   * @param orgId - Organization UUID
   * @param updates - Partial updates
   * @returns Updated organization or null on error
   */
  updateOrg: (
    orgId: string,
    updates: Partial<{ name: string; org_type: string; description: string }>
  ) => Promise<Organization | null>;
  
  /**
   * Delete organization
   * Refreshes userOrgs and allOrgs after deletion
   * Resets selectedOrgId if deleted org was selected
   * @param orgId - Organization UUID
   */
  deleteOrg: (orgId: string) => Promise<void>;
  
  // ============================================================
  // SELECTION ACTIONS
  // ============================================================
  
  /**
   * Set currently selected organization
   * Pass null for personal mode
   * @param orgId - Organization UUID or null
   */
  setSelectedOrg: (orgId: string | null) => void;
  
  /**
   * Reset all organization state
   * Clears userOrgs, allOrgs, selectedOrgId
   */
  resetOrganizations: () => void;
}

export const useOrganizationsStore = create<OrganizationsStore>((set, get) => ({
  // Initial state
  userOrgs: [],
  allOrgs: [],
  selectedOrgId: null,
  orgChildren: [],
  loading: false,
  error: null,
  
  // Read actions
  fetchUserOrgs: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const userOrgs = await OrganizationsService.getUserOrgs(userId);
      set({ userOrgs, loading: false });
    } catch (err: any) {
      console.error('Error fetching user orgs:', err);
      set({ error: err.message, userOrgs: [], loading: false });
    }
  },
  
  fetchAllOrgs: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const allOrgs = await OrganizationsService.getAllOrgs(userId);
      set({ allOrgs, loading: false });
    } catch (err: any) {
      console.error('Error fetching all orgs:', err);
      set({ error: err.message, allOrgs: [], loading: false });
    }
  },
  
  fetchOrgChildren: async (orgId: string) => {
    try {
      const orgChildren = await OrganizationsService.getOrgChildren(orgId);
      set({ orgChildren });
    } catch (err: any) {
      console.error('Error fetching org children:', err);
      set({ error: err.message, orgChildren: [] });
    }
  },
  
  // Write actions
  createRootOrg: async (input, userId) => {
    try {
      const org = await OrganizationsService.createRootOrg(input, userId);
      
      // Refresh data
      await get().fetchUserOrgs(userId);
      await get().fetchAllOrgs(userId);
      
      return org;
    } catch (err: any) {
      console.error('Error creating root org:', err);
      set({ error: err.message });
      return null;
    }
  },
  
  createChildOrg: async (input, userId) => {
    try {
      const org = await OrganizationsService.createChildOrg(input, userId);
      
      // Refresh data
      await get().fetchUserOrgs(userId);
      await get().fetchAllOrgs(userId);
      
      return org;
    } catch (err: any) {
      console.error('Error creating child org:', err);
      set({ error: err.message });
      return null;
    }
  },
  
  updateOrg: async (orgId, updates) => {
    try {
      // Get userId - implement based on your auth setup
      const userId = getUserId(); // Helper function
      
      const org = await OrganizationsService.updateOrg(orgId, updates, userId);
      
      // Update local state
      set((state) => ({
        userOrgs: state.userOrgs.map((o) =>
          o.org_id === orgId ? { ...o, org_name: updates.name || o.org_name } : o
        ),
        allOrgs: state.allOrgs.map((o) =>
          o.id === orgId ? { ...o, ...updates } : o
        ),
      }));
      
      return org;
    } catch (err: any) {
      console.error('Error updating org:', err);
      set({ error: err.message });
      return null;
    }
  },
  
  deleteOrg: async (orgId: string) => {
    try {
      const userId = getUserId(); // Helper function
      
      await OrganizationsService.deleteOrg(orgId, userId);
      
      // Clear selection if deleted org was selected
      const { selectedOrgId } = get();
      if (selectedOrgId === orgId) {
        set({ selectedOrgId: null });
      }
      
      // Remove from local state
      set((state) => ({
        userOrgs: state.userOrgs.filter((o) => o.org_id !== orgId),
        allOrgs: state.allOrgs.filter((o) => o.id !== orgId),
      }));
    } catch (err: any) {
      console.error('Error deleting org:', err);
      set({ error: err.message });
    }
  },
  
  // Selection actions
  setSelectedOrg: (orgId: string | null) => {
    set({ selectedOrgId: orgId });
  },
  
  resetOrganizations: () => {
    set({
      userOrgs: [],
      allOrgs: [],
      selectedOrgId: null,
      orgChildren: [],
      loading: false,
      error: null,
    });
  },
}));

// Helper to get current user ID
function getUserId(): string {
  // Implement based on your auth setup
  // Example with Clerk:
  const { userId } = require('@clerk/clerk-expo').useAuth.getState();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}
```

---

## Hooks Reference

### Permission Hooks

#### `useIsOrganizationCommander()`

**Purpose**: Check if user is commander of currently selected org.

**File**: `src/hooks/useIsOrganizationCommander.ts`

```typescript
import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';

/**
 * Check if current user is commander of the SELECTED organization
 * Returns false if in personal mode or user is not commander of current org
 * 
 * Use this for org-specific permissions (edit THIS org's settings)
 */
export function useIsOrganizationCommander(): boolean {
  const { userId } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId || !selectedOrgId) return false;

    const membership = userOrgs.find(org => org.org_id === selectedOrgId);
    return membership?.role === 'commander';
  }, [userId, selectedOrgId, userOrgs]);
}
```

**Usage Example**:
```typescript
import { useIsOrganizationCommander } from '@/hooks/useIsOrganizationCommander';

export function OrgSettingsButton() {
  const isCommander = useIsOrganizationCommander();
  
  if (!isCommander) return null;
  
  return <Button onPress={openSettings}>Edit Settings</Button>;
}
```

---

#### `useIsRootCommander()`

**Purpose**: Check if user is commander of root org (entire tree access).

**File**: `src/hooks/useIsRootCommander.ts`

```typescript
import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';

/**
 * Check if current user is commander of the ROOT organization
 * Returns true even when viewing child orgs
 * 
 * Use this for tree-wide admin actions (invite to any org, manage weapons)
 */
export function useIsRootCommander(): boolean {
  const { userId } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId || !selectedOrgId) return false;

    // Find the selected org
    const selectedOrg = userOrgs.find(org => org.org_id === selectedOrgId);
    if (!selectedOrg) return false;

    // Find the root org of the selected org's tree
    const rootOrg = userOrgs.find(org => org.org_id === selectedOrg.root_id);
    
    // Check if user is commander of the ROOT
    return rootOrg?.role === 'commander';
  }, [userId, selectedOrgId, userOrgs]);
}
```

**Usage Example**:
```typescript
import { useIsRootCommander } from '@/hooks/useIsRootCommander';

export function InviteMembersButton() {
  const isRootCommander = useIsRootCommander();
  
  // Root commanders can invite to any org in tree
  if (!isRootCommander) return null;
  
  return <Button onPress={openInvite}>Invite Members</Button>;
}
```

---

#### `useIsCommanderAnywhere()`

**Purpose**: Check if user is commander of any organization.

**File**: `src/hooks/useIsCommanderAnywhere.ts`

```typescript
import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';

/**
 * Check if user is commander of ANY organization
 * 
 * Use this for global UI features (show "Commander Tools" menu item)
 */
export function useIsCommanderAnywhere(): boolean {
  const { userId } = useAuth();
  const { userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId) return false;
    return userOrgs.some(org => org.role === 'commander');
  }, [userId, userOrgs]);
}
```

**Usage Example**:
```typescript
import { useIsCommanderAnywhere } from '@/hooks/useIsCommanderAnywhere';

export function MainMenu() {
  const isCommander = useIsCommanderAnywhere();
  
  return (
    <View>
      <MenuItem title="Home" />
      {isCommander && <MenuItem title="Admin Tools" />}
    </View>
  );
}
```

---

#### `useOrgPermissions()`

**Purpose**: Get detailed permissions for current context.

**File**: `src/hooks/useOrgPermissions.ts`

```typescript
import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { useIsRootCommander } from './useIsRootCommander';
import type { OrgPermissions } from '@/types/organizations';

/**
 * Get detailed permissions for current user in selected organization
 * Returns comprehensive permission set for UI control
 */
export function useOrgPermissions(): OrgPermissions {
  const { userId } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();
  const isRootCommander = useIsRootCommander();

  return useMemo(() => {
    // Personal mode - can do everything for self
    if (!userId || !selectedOrgId) {
      return {
        canViewOrg: false,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: true,  // Can create personal trainings
        canEditTraining: true,
        canDeleteTraining: true,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: true,
        canManageWeapons: false,
        role: null,
        isRootCommander: false,
      };
    }

    const membership = userOrgs.find(org => org.org_id === selectedOrgId);
    const role = membership?.role || null;
    const isLocalCommander = role === 'commander';

    // Commander permissions
    if (isLocalCommander) {
      return {
        canViewOrg: true,
        canEditOrg: true,
        canDeleteOrg: true,
        canCreateChild: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canEditMembers: true,
        canCreateTraining: true,
        canEditTraining: true,
        canDeleteTraining: true,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: true,
        canManageWeapons: true,
        role,
        isRootCommander,
      };
    }

    // Member permissions
    if (role === 'member') {
      return {
        canViewOrg: true,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: isRootCommander,  // Root commander can invite anywhere
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: true,
        canEditTraining: true,
        canDeleteTraining: isRootCommander,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: isRootCommander,
        canManageWeapons: isRootCommander,
        role,
        isRootCommander,
      };
    }

    // Viewer permissions (read-only)
    if (role === 'viewer') {
      return {
        canViewOrg: true,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: false,
        canEditTraining: false,
        canDeleteTraining: false,
        canCreateSession: false,
        canEditSession: false,
        canDeleteSession: false,
        canManageWeapons: false,
        role,
        isRootCommander,
      };
    }

    // No membership - no permissions
    return {
      canViewOrg: false,
      canEditOrg: false,
      canDeleteOrg: false,
      canCreateChild: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canEditMembers: false,
      canCreateTraining: false,
      canEditTraining: false,
      canDeleteTraining: false,
      canCreateSession: false,
      canEditSession: false,
      canDeleteSession: false,
      canManageWeapons: false,
      role: null,
      isRootCommander: false,
    };
  }, [userId, selectedOrgId, userOrgs, isRootCommander]);
}
```

**Usage Example**:
```typescript
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

export function TrainingScreen() {
  const {
    canCreateTraining,
    canEditTraining,
    canDeleteTraining,
    role
  } = useOrgPermissions();
  
  return (
    <View>
      <Text>Your role: {role || 'Personal'}</Text>
      
      {canCreateTraining && (
        <Button onPress={createTraining}>+ Create Training</Button>
      )}
      
      {trainings.map(training => (
        <TrainingCard
          key={training.id}
          training={training}
          onEdit={canEditTraining ? handleEdit : undefined}
          onDelete={canDeleteTraining ? handleDelete : undefined}
        />
      ))}
    </View>
  );
}
```

---

#### `useCurrentOrg()`

**Purpose**: Get current organization with basic permissions.

**File**: `src/hooks/useCurrentOrg.ts`

```typescript
import { useMemo } from 'react';
import { useOrganizationsStore } from '@/store/organizationsStore';
import type { CurrentOrgInfo } from '@/types/organizations';

/**
 * Get current organization details and basic permissions
 * Simpler alternative to useOrgPermissions for common cases
 */
export function useCurrentOrg(): CurrentOrgInfo {
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!selectedOrgId) {
      return {
        org: null,
        isPersonal: true,
        isCommander: false,
        isMember: false,
        isViewer: false,
        canEdit: false,
        canInvite: false,
        canDelete: false,
      };
    }

    const org = userOrgs.find(o => o.org_id === selectedOrgId) || null;
    const role = org?.role;

    return {
      org,
      isPersonal: false,
      isCommander: role === 'commander',
      isMember: role === 'member',
      isViewer: role === 'viewer',
      canEdit: role === 'commander' || role === 'member',
      canInvite: role === 'commander',
      canDelete: role === 'commander',
    };
  }, [selectedOrgId, userOrgs]);
}
```

**Usage Example**:
```typescript
import { useCurrentOrg } from '@/hooks/useCurrentOrg';

export function OrgHeader() {
  const { org, isPersonal, isCommander } = useCurrentOrg();
  
  return (
    <View>
      <Text>{org?.org_name || 'Personal Workspace'}</Text>
      <Text>{org?.org_type}</Text>
      {isCommander && <Badge>Commander</Badge>}
    </View>
  );
}
```

---

#### `useOrgHierarchy()`

**Purpose**: Get hierarchical relationships for navigation.

**File**: `src/hooks/useOrgHierarchy.ts`

```typescript
import { useMemo } from 'react';
import { useOrganizationsStore } from '@/store/organizationsStore';
import type { OrgHierarchy } from '@/types/organizations';

/**
 * Get hierarchical relationships for current organization
 * Useful for navigation, breadcrumbs, org explorer
 */
export function useOrgHierarchy(): OrgHierarchy {
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!selectedOrgId) {
      return {
        current: null,
        root: null,
        parent: null,
        children: [],
        siblings: [],
        ancestors: [],
        isRoot: false,
        hasChildren: false,
        depth: 0,
      };
    }

    const current = userOrgs.find(org => org.org_id === selectedOrgId) || null;
    
    if (!current) {
      return {
        current: null,
        root: null,
        parent: null,
        children: [],
        siblings: [],
        ancestors: [],
        isRoot: false,
        hasChildren: false,
        depth: 0,
      };
    }

    const root = userOrgs.find(org => org.org_id === current.root_id) || null;
    const parent = current.parent_id 
      ? userOrgs.find(org => org.org_id === current.parent_id) || null
      : null;

    // Children are orgs with this org as parent
    const children = userOrgs.filter(org => org.parent_id === selectedOrgId);

    // Siblings are orgs with same parent
    const siblings = current.parent_id
      ? userOrgs.filter(org => 
          org.parent_id === current.parent_id && org.org_id !== selectedOrgId
        )
      : [];

    // Ancestors - parse from full_path
    const pathParts = current.full_path.split(' → ');
    const ancestors = pathParts.slice(0, -1).map(name => 
      userOrgs.find(org => org.org_name === name)
    ).filter(Boolean) as typeof userOrgs;

    return {
      current,
      root,
      parent,
      children,
      siblings,
      ancestors,
      isRoot: current.depth === 0,
      hasChildren: children.length > 0,
      depth: current.depth,
    };
  }, [selectedOrgId, userOrgs]);
}
```

**Usage Example**:
```typescript
import { useOrgHierarchy } from '@/hooks/useOrgHierarchy';
import { useOrganizationsStore } from '@/store/organizationsStore';

export function OrgBreadcrumbs() {
  const { ancestors, current } = useOrgHierarchy();
  const { setSelectedOrg } = useOrganizationsStore();
  
  return (
    <View style={styles.breadcrumbs}>
      {ancestors.map((ancestor, i) => (
        <Fragment key={ancestor.org_id}>
          <TouchableOpacity onPress={() => setSelectedOrg(ancestor.org_id)}>
            <Text>{ancestor.org_name}</Text>
          </TouchableOpacity>
          <Text> → </Text>
        </Fragment>
      ))}
      <Text style={styles.current}>{current?.org_name}</Text>
    </View>
  );
}

export function OrgNavigator() {
  const { parent, children } = useOrgHierarchy();
  const { setSelectedOrg } = useOrganizationsStore();
  
  return (
    <View>
      {parent && (
        <Button onPress={() => setSelectedOrg(parent.org_id)}>
          ← Back to {parent.org_name}
        </Button>
      )}
      
      {children.map(child => (
        <Button 
          key={child.org_id}
          onPress={() => setSelectedOrg(child.org_id)}
        >
          → {child.org_name}
        </Button>
      ))}
    </View>
  );
}
```

---

### Guard Hooks

#### `useRequireOrganization()`

**Purpose**: Require that user has selected an organization (not personal mode).

**File**: `src/hooks/useRequireOrganization.ts`

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { Alert } from 'react-native';

/**
 * Require that user is in an organization (not Personal mode)
 * Shows alert and redirects if in personal mode
 * 
 * Use this to protect org-only features
 * 
 * @param message - Custom alert message
 * @returns true if org selected, false otherwise
 */
export function useRequireOrganization(message?: string): boolean {
  const router = useRouter();
  const { selectedOrgId } = useOrganizationsStore();

  useEffect(() => {
    if (!selectedOrgId) {
      Alert.alert(
        'Organization Required',
        message || 'This feature requires an organization. Please select or create one.',
        [
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [selectedOrgId, message, router]);

  return selectedOrgId !== null;
}
```

**Usage Example**:
```typescript
import { useRequireOrganization } from '@/hooks/useRequireOrganization';

export function CalendarScreen() {
  const hasOrg = useRequireOrganization(
    'Calendar is only available in organizations'
  );
  
  // Will show alert and redirect if no org
  if (!hasOrg) return null;
  
  return (
    <View>
      <Calendar />
    </View>
  );
}
```

---

#### `useRequirePermission()`

**Purpose**: Require specific permission, redirect if not authorized.

**File**: `src/hooks/useRequirePermission.ts`

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useOrgPermissions } from './useOrgPermissions';
import { Alert } from 'react-native';

type PermissionKey = keyof ReturnType<typeof useOrgPermissions>;

/**
 * Require specific permission, shows alert and redirects if denied
 * 
 * Use this to protect permission-gated screens
 * 
 * @param permission - Permission key from useOrgPermissions
 * @param message - Custom alert message
 * @returns true if permission granted, false otherwise
 */
export function useRequirePermission(
  permission: PermissionKey,
  message?: string
): boolean {
  const router = useRouter();
  const permissions = useOrgPermissions();

  useEffect(() => {
    if (!permissions[permission]) {
      Alert.alert(
        'Permission Denied',
        message || `You don't have permission to access this feature.`,
        [
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [permissions, permission, message, router]);

  return Boolean(permissions[permission]);
}
```

**Usage Example**:
```typescript
import { useRequirePermission } from '@/hooks/useRequirePermission';

export function InviteMembersScreen() {
  const canInvite = useRequirePermission(
    'canInviteMembers',
    'Only commanders can invite members.'
  );
  
  // Will show alert and redirect if no permission
  if (!canInvite) return null;
  
  return (
    <View>
      <InviteForm />
    </View>
  );
}
```

---

## Component Patterns

### Organization Switcher Modal

**Purpose**: Allow users to switch between personal mode and organizations.

**Key Features**:
- Shows user's personal workspace
- Lists root organizations only (depth = 0)
- Shows role badges (COMMANDER, MEMBER, VIEWER)
- Active indicator (green dot)
- Create organization button

**Complete Component**:

```typescript
// components/OrganizationSwitcherModal.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { useOrganizationSwitch } from '@/hooks/useOrganizationSwitch';
import BaseBottomSheet from './BaseBottomSheet';
import { CreateOrgModal } from './CreateOrg';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcherModal({ visible, onClose }: Props) {
  const { user } = useUser();
  const { userId } = useAuth();
  const { userOrgs, selectedOrgId, loading, fetchUserOrgs } = useOrganizationsStore();
  const { switchOrganization } = useOrganizationSwitch();
  const [createOrgVisible, setCreateOrgVisible] = useState(false);

  // Refresh orgs when modal opens
  useEffect(() => {
    if (visible && userId) {
      fetchUserOrgs(userId);
    }
  }, [visible, userId]);

  const handleSwitch = async (orgId: string | null, orgName: string) => {
    onClose();
    await switchOrganization(orgId, orgName);
  };

  const handleCreateSuccess = () => {
    if (userId) fetchUserOrgs(userId);
  };

  const userName = user?.fullName || user?.firstName || 'Personal';
  const isPersonalActive = selectedOrgId === null;

  // Filter to show ONLY root organizations (depth = 0)
  const rootOrgs = userOrgs.filter((org) => org.depth === 0);

  const orgList = [
    {
      id: 'personal',
      name: `${userName} (Personal)`,
      active: isPersonalActive,
      role: null,
    },
    ...rootOrgs.map((org) => ({
      id: org.org_id,
      name: org.org_name,
      active: selectedOrgId === org.org_id,
      role: org.role,
    })),
  ];

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={['60%']}
        enablePanDownToClose
      >
        <View style={styles.header}>
          <Text style={styles.title}>Switch Organization</Text>
        </View>

        <FlatList
          data={orgList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orgRow}
              onPress={() =>
                handleSwitch(
                  item.id === 'personal' ? null : item.id,
                  item.name
                )
              }
            >
              <View style={styles.orgContent}>
                <View style={styles.orgInfo}>
                  <Text style={[styles.orgName, item.active && styles.activeOrgName]}>
                    {item.name}
                  </Text>

                  {item.role && (
                    <View style={[
                      styles.roleBadge,
                      item.role === 'commander' && styles.commanderBadge
                    ]}>
                      <Text style={styles.roleText}>
                        {item.role.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {item.active && <View style={styles.activeDot} />}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setCreateOrgVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Create Organization</Text>
            </TouchableOpacity>
          }
        />
      </BaseBottomSheet>

      <CreateOrgModal
        visible={createOrgVisible}
        onClose={() => setCreateOrgVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  orgRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  orgContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orgInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    color: '#fff',
  },
  activeOrgName: {
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  commanderBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#60a5fa',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  addButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addButtonText: {
    color: '#4da3ff',
    fontSize: 15,
    fontWeight: '500',
  },
});
```

---

### Create Organization Modal

**Purpose**: Form for creating new organizations.

**Key Features**:
- Organization name (required)
- Organization type (Battalion, Company, etc.)
- Description (optional)
- Auto-switches to new org after creation

**Complete Component**:

```typescript
// components/CreateOrg.tsx
import { Alert } from 'react-native';
import BaseBottomSheet from './BaseBottomSheet';
import useCreateOrg from '@/hooks/useCreateOrg';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateOrgModal({ visible, onClose, onSuccess }: Props) {
  const {
    organizationName,
    setOrganizationName,
    organizationType,
    setOrganizationType,
    description,
    setDescription,
    isSubmitting,
    createOrg,
  } = useCreateOrg();

  const handleCreate = async () => {
    try {
      const result = await createOrg();
      if (result) {
        onSuccess?.();
        onClose();
        Alert.alert('Success', `Organization "${organizationName}" created!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create organization');
    }
  };

  const handleClose = () => {
    setOrganizationName('');
    setOrganizationType('Organization');
    setDescription('');
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={['50%', '70%']}
      enablePanDownToClose={!isSubmitting}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Organization</Text>
        <Text style={styles.subtitle}>Create a new root organization</Text>
      </View>

      <View style={styles.form}>
        <BottomSheetTextInput
          style={styles.input}
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Organization name"
          autoFocus
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <BottomSheetTextInput
          style={styles.input}
          value={organizationType}
          onChangeText={setOrganizationType}
          placeholder="Type (e.g., Battalion, Company)"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <BottomSheetTextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          multiline
          numberOfLines={3}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          editable={!isSubmitting}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.createButton,
              (!organizationName.trim() || isSubmitting) && styles.buttonDisabled
            ]}
            onPress={handleCreate}
            disabled={!organizationName.trim() || isSubmitting}
          >
            {isSubmitting && <ActivityIndicator />}
            <Text>{isSubmitting ? 'Creating...' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseBottomSheet>
  );
}
```

---

## Common Scenarios

### Scenario 1: Display Organization-Specific Data

**Goal**: Fetch and display data for currently selected organization.

**Pattern**:
```typescript
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { useSessionsStore } from '@/store/sessionsStore';

export function SessionsScreen() {
  const { userId } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { sessions, fetchSessions } = useSessionsStore();

  // Refetch when org changes
  useEffect(() => {
    if (userId) {
      // selectedOrgId can be null (personal mode)
      fetchSessions(userId, selectedOrgId);
    }
  }, [userId, selectedOrgId]);

  return (
    <FlatList
      data={sessions}
      renderItem={({ item }) => <SessionCard session={item} />}
    />
  );
}
```

**Service Layer**:
```typescript
// services/sessionsService.ts
static async fetchSessions(
  userId: string,
  orgId: string | null
): Promise<Session[]> {
  const client = await AuthenticatedClient.getClient();
  
  let query = client
    .from('sessions')
    .select('*')
    .eq('created_by', userId);
  
  // Filter by org if one is selected
  if (orgId) {
    query = query.eq('organization_id', orgId);
  } else {
    // Personal mode - only sessions without org
    query = query.is('organization_id', null);
  }
  
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
```

---

### Scenario 2: Create Content in Organization

**Goal**: Create training/session in currently selected organization.

**Pattern**:
```typescript
import { useOrganizationsStore } from '@/store/organizationsStore';
import { TrainingsService } from '@/services/trainingsService';

export function CreateTrainingForm() {
  const { selectedOrgId } = useOrganizationsStore();
  
  const handleSubmit = async (formData) => {
    await TrainingsService.createTraining({
      ...formData,
      organization_id: selectedOrgId,  // Can be null for personal
      created_by: userId,
    });
  };
  
  return <TrainingForm onSubmit={handleSubmit} />;
}
```

---

### Scenario 3: Permission-Gated UI

**Goal**: Show/hide UI elements based on permissions.

**Pattern**:
```typescript
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

export function TrainingsScreen() {
  const {
    canCreateTraining,
    canEditTraining,
    canDeleteTraining,
  } = useOrgPermissions();
  
  return (
    <View>
      {canCreateTraining && (
        <Button onPress={handleCreate}>+ New Training</Button>
      )}
      
      {trainings.map(training => (
        <TrainingCard
          key={training.id}
          training={training}
          onEdit={canEditTraining ? handleEdit : undefined}
          onDelete={canDeleteTraining ? handleDelete : undefined}
        />
      ))}
    </View>
  );
}
```

---

### Scenario 4: Navigate Hierarchy

**Goal**: Allow users to browse organizational tree.

**Pattern**:
```typescript
import { useOrgHierarchy } from '@/hooks/useOrgHierarchy';
import { useOrganizationsStore } from '@/store/organizationsStore';

export function OrgExplorer() {
  const { current, parent, children } = useOrgHierarchy();
  const { setSelectedOrg } = useOrganizationsStore();
  
  return (
    <View>
      {/* Breadcrumbs */}
      <OrgBreadcrumbs />
      
      {/* Current org info */}
      <Text>{current?.org_name}</Text>
      <Text>{current?.org_type}</Text>
      
      {/* Parent navigation */}
      {parent && (
        <Button onPress={() => setSelectedOrg(parent.org_id)}>
          ← Back to {parent.org_name}
        </Button>
      )}
      
      {/* Children navigation */}
      {children.map(child => (
        <Button
          key={child.org_id}
          onPress={() => setSelectedOrg(child.org_id)}
        >
          {child.org_name} →
        </Button>
      ))}
    </View>
  );
}
```

---

### Scenario 5: Create Child Organization

**Goal**: Allow commanders to create sub-organizations.

**Pattern**:
```typescript
import { useOrganizationsStore } from '@/store/organizationsStore';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

export function CreateChildOrgButton() {
  const { selectedOrgId, createChildOrg } = useOrganizationsStore();
  const { canCreateChild } = useOrgPermissions();
  const { userId } = useAuth();
  
  // Only show if permission granted
  if (!canCreateChild || !selectedOrgId) return null;
  
  const handleCreate = async () => {
    await createChildOrg(
      {
        name: 'New Child Org',
        orgType: 'Unit',
        parentId: selectedOrgId,
        description: 'Child organization',
      },
      userId
    );
  };
  
  return <Button onPress={handleCreate}>+ Create Child Org</Button>;
}
```

---

## Error Handling Patterns

### Service Layer Errors

**Pattern**: Always throw descriptive errors from services.

```typescript
static async getUserOrgs(userId: string): Promise<UserOrg[]> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client.rpc('get_user_orgs', {
    p_user_id: userId
  });
  
  // Always check error first
  if (error) {
    // Wrap with context
    throw new Error(`Failed to get user orgs: ${error.message}`);
  }
  
  // Return data or empty array (never undefined)
  return data || [];
}
```

### Component Error Handling

**Pattern**: Try-catch with user-friendly alerts.

```typescript
const handleCreate = async () => {
  try {
    setLoading(true);
    await createOrg(formData);
    Alert.alert('Success', 'Organization created!');
    onClose();
  } catch (error: any) {
    // Show error to user
    Alert.alert(
      'Error',
      error.message || 'Failed to create organization'
    );
  } finally {
    setLoading(false);
  }
};
```

### Store Error Handling

**Pattern**: Catch and store errors in state.

```typescript
fetchUserOrgs: async (userId: string) => {
  try {
    set({ loading: true, error: null });
    const userOrgs = await OrganizationsService.getUserOrgs(userId);
    set({ userOrgs, loading: false });
  } catch (err: any) {
    console.error('Error fetching user orgs:', err);
    set({
      error: err.message,
      userOrgs: [],
      loading: false,
    });
  }
},
```

---

## Testing Patterns

### Unit Testing Services

```typescript
import { OrganizationsService } from '@/services/organizationsService';

describe('OrganizationsService', () => {
  describe('getUserOrgs', () => {
    it('should fetch user organizations', async () => {
      const userId = 'test_user_123';
      const orgs = await OrganizationsService.getUserOrgs(userId);
      
      expect(orgs).toBeInstanceOf(Array);
      if (orgs.length > 0) {
        expect(orgs[0]).toHaveProperty('org_id');
        expect(orgs[0]).toHaveProperty('org_name');
        expect(orgs[0]).toHaveProperty('role');
      }
    });
    
    it('should throw error on invalid userId', async () => {
      await expect(
        OrganizationsService.getUserOrgs('')
      ).rejects.toThrow();
    });
  });
  
  describe('createRootOrg', () => {
    it('should create root organization', async () => {
      const input = {
        name: 'Test Org',
        orgType: 'Unit',
        description: 'Test description',
      };
      const userId = 'test_user_123';
      
      const org = await OrganizationsService.createRootOrg(input, userId);
      
      expect(org).toHaveProperty('id');
      expect(org.name).toBe(input.name);
      expect(org.depth).toBe(0);
      expect(org.parent_id).toBeNull();
    });
  });
});
```

### Integration Testing Hooks

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

describe('useOrgPermissions', () => {
  it('should return personal mode permissions', () => {
    // Mock store with no org selected
    const { result } = renderHook(() => useOrgPermissions());
    
    expect(result.current.isPersonal).toBe(true);
    expect(result.current.canCreateTraining).toBe(true);
    expect(result.current.canInviteMembers).toBe(false);
  });
  
  it('should return commander permissions', () => {
    // Mock store with org selected + commander role
    const { result } = renderHook(() => useOrgPermissions());
    
    expect(result.current.isCommander).toBe(true);
    expect(result.current.canInviteMembers).toBe(true);
    expect(result.current.canDeleteOrg).toBe(true);
  });
});
```

---

## AI Assistant Guidelines

### When Helping with Organization Code

**1. Always Consider Permission Context**

When user asks for feature implementation, check:
- What role should have access?
- Is this org-specific or personal?
- Does hierarchy matter? (root commander vs local commander)

**2. Use Correct Hooks**

```typescript
// ❌ BAD - Direct state access
const { selectedOrgId, userOrgs } = useOrganizationsStore();
const isCommander = userOrgs.find(o => o.org_id === selectedOrgId)?.role === 'commander';

// ✅ GOOD - Use permission hook
const { canInviteMembers } = useOrgPermissions();
```

**3. Handle Both Personal and Org Modes**

```typescript
// ✅ GOOD - Handles both modes
const { selectedOrgId } = useOrganizationsStore();

useEffect(() => {
  fetchData(userId, selectedOrgId);  // Works with null (personal)
}, [userId, selectedOrgId]);

// ❌ BAD - Breaks in personal mode
useEffect(() => {
  if (selectedOrgId) {  // Never fetches in personal mode!
    fetchData(userId, selectedOrgId);
  }
}, [userId, selectedOrgId]);
```

**4. Always Use Service Layer**

```typescript
// ✅ GOOD - Use service
await OrganizationsService.createRootOrg(input, userId);

// ❌ BAD - Direct Supabase call
await client.from('organizations').insert({...});
```

**5. Proper Error Handling**

```typescript
// ✅ GOOD - Try-catch with user feedback
try {
  await createOrg(input);
  Alert.alert('Success', 'Organization created!');
} catch (error: any) {
  Alert.alert('Error', error.message);
}

// ❌ BAD - Silent failure
await createOrg(input);
```

### Code Generation Templates

#### Template 1: New Feature with Org Context

```typescript
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';

export function MyFeature() {
  const { userId } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { canCreateFeature } = useOrgPermissions();
  
  // Permission check
  if (!canCreateFeature) return null;
  
  const handleAction = async () => {
    await MyService.doAction({
      user_id: userId,
      organization_id: selectedOrgId,  // Can be null
    });
  };
  
  return <Button onPress={handleAction}>Action</Button>;
}
```

#### Template 2: New Service Method

```typescript
// services/myService.ts
static async doSomething(
  userId: string,
  orgId: string | null
): Promise<Result> {
  const client = await AuthenticatedClient.getClient();
  
  let query = client
    .from('my_table')
    .select('*')
    .eq('user_id', userId);
  
  // Handle org filter
  if (orgId) {
    query = query.eq('organization_id', orgId);
  } else {
    query = query.is('organization_id', null);
  }
  
  const { data, error } = await query;
  if (error) throw new Error(`Failed: ${error.message}`);
  return data || [];
}
```

#### Template 3: New RLS Policy

```sql
-- Template for org-aware RLS policy
CREATE POLICY "my_table_select"
ON my_table FOR SELECT
USING (
  -- User created this record
  user_id = auth.jwt() -> 'user_metadata' ->> 'user_id'
  OR
  -- Record is in org where user has membership
  (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = auth.jwt() -> 'user_metadata' ->> 'user_id'
    )
  )
);
```

---

**End of AI-Optimized Technical Reference**

This documentation is designed for:
- ✅ AI assistants (complete type definitions, patterns, examples)
- ✅ New developers (step-by-step scenarios, clear explanations)
- ✅ Experienced developers (API reference, advanced patterns)
- ✅ Code review (best practices, anti-patterns)

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Maintainer**: Scopes Development Team