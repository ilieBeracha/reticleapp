# Scopes Sniper Training App - Complete Database Structure

## Overview

This document describes the complete PostgreSQL database schema for the Scopes Sniper Training App, built on **Supabase** with **Clerk** authentication integration. The database uses Row Level Security (RLS) policies to enforce multi-tenancy and user-based permissions.

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Authentication Integration](#authentication-integration)
3. [Database Tables](#database-tables)
4. [Enums](#enums)
5. [Indexes](#indexes)
6. [RLS Policies](#rls-policies)
7. [Functions & Triggers](#functions--triggers)
8. [Relationships & Foreign Keys](#relationships--foreign-keys)
9. [Multi-tenancy Pattern](#multi-tenancy-pattern)

---

## Architecture Principles

### Core Design Patterns

1. **Multi-tenancy Support**: All tables support both personal and organization contexts
2. **Clerk Authentication**: Uses Clerk JWT tokens for RLS enforcement
3. **Audit Columns**: `created_at` and `updated_at` on all tables
4. **Soft Deletes**: `is_active` flags instead of hard deletes (where applicable)
5. **UUID Primary Keys**: All tables use `uuid` with `gen_random_uuid()` default
6. **Foreign Key Cascades**: Proper cascade rules for data integrity

### JWT Token Claims (from Clerk)

All RLS policies rely on these JWT claims:

```typescript
{
  sub: string;        // Clerk user_id (user_*)
  org_id: string;     // Clerk organization_id (org_*)
  role: string;       // User role
  org_role: string;   // Organization role
}
```

Access in SQL: `auth.jwt() ->> 'sub'`, `auth.jwt() ->> 'org_id'`

---

## Authentication Integration

### The Clerk-Supabase Separation of Concerns

**IMPORTANT**: This application uses a **split authentication architecture** where Clerk and Supabase have distinct, complementary roles:

#### Clerk's Responsibilities (User & Organization Management)
✅ **User Authentication** - Sign up, sign in, password reset, MFA
✅ **User Management** - User profiles, email verification, account settings
✅ **Organization Management** - Creating orgs, inviting members, roles, permissions
✅ **Session Management** - Active sessions, token refresh, device management
✅ **Social Auth** - Google, GitHub, Apple, etc. OAuth providers
✅ **JWT Token Generation** - Issues signed JWT tokens with user/org claims

**Clerk is the SOURCE OF TRUTH for:**
- Who the user is (`user_id`)
- What organizations they belong to (`org_id`)
- What roles they have (`role`, `org_role`)
- User profile data (email, name, avatar)

#### Supabase's Responsibilities (Data Storage & Authorization)
✅ **Database** - PostgreSQL for all application data
✅ **Row Level Security (RLS)** - Authorization enforcement based on JWT claims
✅ **Data Queries** - CRUD operations on tables
✅ **Realtime** - Subscriptions to data changes
✅ **Storage** - File uploads (images, documents)

**Supabase is the SOURCE OF TRUTH for:**
- Application data (sessions, trainings, weapons, loadouts)
- Business logic and relationships
- Data access permissions (who can see/edit what)

---

### How They Work Together: The Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER OPENS APP                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: USER SIGNS IN WITH CLERK                                │
│  - User enters email/password (or OAuth)                         │
│  - Clerk validates credentials                                   │
│  - Clerk creates session                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: CLERK GENERATES JWT TOKEN                               │
│                                                                   │
│  Token Claims:                                                   │
│  {                                                                │
│    "sub": "user_2abc123xyz",           ← Clerk User ID          │
│    "org_id": "org_2def456uvw",         ← Current Organization   │
│    "role": "admin",                     ← User Role             │
│    "org_role": "org:member",           ← Org-specific Role      │
│    "email": "john@example.com",                                  │
│    "iat": 1698765432,                   ← Issued At             │
│    "exp": 1698769032                    ← Expires In 1 hour     │
│  }                                                                │
│                                                                   │
│  Token is signed with Supabase JWT secret (configured in Clerk)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: APP CALLS SUPABASE WITH JWT TOKEN                       │
│                                                                   │
│  // In service layer                                             │
│  const client = await AuthenticatedClient.getClient();           │
│                                                                   │
│  // AuthenticatedClient automatically:                           │
│  // 1. Gets current Clerk session                                │
│  // 2. Extracts JWT token                                        │
│  // 3. Injects token into Supabase client headers                │
│                                                                   │
│  const { data } = await client.from("sessions").select("*");     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: SUPABASE VALIDATES JWT & ENFORCES RLS                   │
│                                                                   │
│  1. Supabase receives request with JWT in Authorization header   │
│  2. Validates JWT signature (using shared secret)                │
│  3. Extracts claims (sub, org_id, role, etc.)                    │
│  4. Makes claims available via auth.jwt() function               │
│  5. Applies RLS policies using JWT claims                        │
│  6. Returns only authorized rows                                 │
│                                                                   │
│  Example RLS Policy:                                             │
│  CREATE POLICY "sessions_select" ON sessions                     │
│  FOR SELECT USING (                                              │
│    created_by = auth.jwt() ->> 'sub'          ← User's sessions  │
│    OR organization_id = auth.jwt() ->> 'org_id'  ← Org sessions  │
│  );                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: DATA RETURNED TO APP                                    │
│  - Only rows user is authorized to see                           │
│  - No application-level filtering needed                         │
│  - Database enforces security automatically                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Why This Architecture?

#### ✅ Benefits of Clerk-Supabase Split

**1. Best of Both Worlds**
- Clerk: World-class authentication UX, organization management, social auth
- Supabase: Powerful PostgreSQL, RLS, realtime, file storage

**2. Security in Depth**
- **Clerk**: Handles sensitive auth operations (passwords, tokens, OAuth)
- **Supabase**: Enforces data access at database level (RLS cannot be bypassed)

**3. Simplified User Management**
- Inviting users? → Clerk handles it
- User roles? → Clerk manages them
- Organization switching? → Clerk's UI components
- No need to build authentication UI or manage user tables

**4. Automatic Token Management**
- Clerk refreshes tokens automatically
- `AuthenticatedClient` always gets fresh token
- No manual token handling in app code

**5. Multi-tenancy Built-in**
- Clerk provides `org_id` in JWT automatically
- RLS policies use `org_id` to filter data
- Context switching is just changing active org in Clerk

#### ⚠️ Trade-offs

**1. Two Systems to Configure**
- Need to set up Clerk project
- Need to set up Supabase project
- Must configure JWT template in Clerk to match Supabase

**2. Slightly Higher Complexity**
- Developers need to understand both systems
- JWT token flow adds a layer of abstraction
- Debugging requires checking both Clerk and Supabase logs

**3. Cost**
- Two services to pay for (Clerk + Supabase)
- But: Both have generous free tiers

---

### Critical Configuration: Clerk JWT Template

For this architecture to work, Clerk **MUST** be configured with a custom JWT template named `"supabase"`:

#### JWT Template Configuration (in Clerk Dashboard)

**Name**: `supabase`

**Claims**:
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "org_id": "{{org.id}}",
  "role": "{{user.public_metadata.role}}",
  "org_role": "{{org.role}}"
}
```

**Signing Key**: Must be the **same secret** as Supabase's `JWT_SECRET`

**Where to find Supabase JWT Secret**:
1. Go to Supabase Dashboard → Project Settings → API
2. Copy `JWT Secret` (service_role key section)
3. Paste into Clerk JWT Template signing configuration

---

### How AuthenticatedClient Works

The `AuthenticatedClient` class (in `/lib/authenticatedClient.ts`) is the **bridge** between Clerk and Supabase:

```typescript
// Simplified implementation
import { useAuth } from "@clerk/clerk-expo";
import { createClient } from "@supabase/supabase-js";

class AuthenticatedClient {
  static async getClient() {
    // 1. Get current Clerk session
    const { getToken } = useAuth();
    
    // 2. Get JWT token from Clerk (using "supabase" template)
    const token = await getToken({ template: "supabase" });
    
    if (!token) {
      throw new AuthenticationError("Not authenticated");
    }
    
    // 3. Create Supabase client with JWT in headers
    const client = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,  // ← JWT injected here
          },
        },
      }
    );
    
    return client;
  }
}
```

**Key Points**:
- Service layer calls `AuthenticatedClient.getClient()` for every request
- Token is fetched fresh from Clerk (auto-refreshed if expired)
- Supabase receives token and validates it
- RLS policies use `auth.jwt()` to access token claims

---

### What Clerk Controls

#### 1. User Identity
```typescript
// Clerk provides
const { userId, user } = useAuth();

// userId = "user_2abc123xyz"
// user.emailAddresses[0].emailAddress = "john@example.com"
// user.firstName = "John"
// user.imageUrl = "https://..."
```

#### 2. Organization Membership
```typescript
// Clerk provides
const { orgId, organization } = useOrganization();

// orgId = "org_2def456uvw"
// organization.name = "SWAT Team Alpha"
// organization.membersCount = 15
```

#### 3. Organization Switching
```typescript
// Clerk handles switching between orgs
import { useOrganizationList } from "@clerk/clerk-expo";

const { setActive, userMemberships } = useOrganizationList();

// Switch to different org
await setActive({ organization: "org_xyz" });

// JWT now contains new org_id
// Supabase RLS automatically filters data for new org
```

#### 4. User Invitations
```typescript
// Clerk handles inviting users to organizations
const { invitations } = useOrganization();

await invitations.create({
  emailAddress: "newmember@example.com",
  role: "org:member",
});

// User receives email, accepts invite
// Clerk adds them to organization
// They immediately have access to org data via RLS
```

---

### What Supabase Controls

#### 1. Application Data
All business data lives in Supabase:
- Sessions, trainings, weapons, loadouts
- Reference data (weapon models, sight models)
- User-generated content

#### 2. Data Access Rules (RLS Policies)
```sql
-- Supabase enforces who can see what
CREATE POLICY "sessions_select" ON sessions
FOR SELECT USING (
  created_by = auth.jwt() ->> 'sub'           -- ← Uses Clerk user_id
  OR organization_id = auth.jwt() ->> 'org_id' -- ← Uses Clerk org_id
);
```

#### 3. Data Relationships
```sql
-- Supabase manages foreign keys, cascades, constraints
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  training_id uuid REFERENCES trainings(id) ON DELETE CASCADE,
  -- ...
);
```

---

### User Profile Mirroring

The `profiles` table exists in Supabase to cache basic user info:

```sql
CREATE TABLE profiles (
  user_id text PRIMARY KEY,      -- Mirrors Clerk user_id
  email text,                     -- Cached from Clerk
  display_name text,              -- Cached from Clerk
  avatar_url text,                -- Cached from Clerk
  updated_at timestamptz
);
```

**Why mirror?**
- Performance: Don't call Clerk API for every user lookup
- Joins: Can join `profiles` with `sessions.created_by` in SQL
- Offline: Cache user data for offline mode

**Source of Truth**: Still Clerk
- Profiles table is a **read-only cache**
- Updates happen via Clerk webhooks (or periodic sync)
- Never modify profiles directly in Supabase

---

### Token Lifetime & Refresh

**Default Token Expiry**: 1 hour (configurable in Clerk)

**Automatic Refresh Flow**:
```
1. User signs in → Clerk issues token (expires in 1 hour)
2. After 55 minutes → Clerk SDK detects expiry approaching
3. Clerk automatically requests new token
4. New token issued with fresh claims
5. AuthenticatedClient.getClient() always gets fresh token
6. No user action required
```

**What Happens on Logout**:
```typescript
// User logs out
await clerk.signOut();

// 1. Clerk destroys session
// 2. JWT tokens become invalid
// 3. Subsequent Supabase requests fail (no token)
// 4. RLS denies all access
// 5. User redirected to login screen
```

---

### Organization Context Switching

When user switches organizations in Clerk:

```typescript
// User switches from Org A to Org B
await setActive({ organization: "org_B" });

// 1. Clerk updates active organization
// 2. New JWT issued with org_id = "org_B"
// 3. Next Supabase query uses new token
// 4. RLS policies filter for org_B data
// 5. UI automatically shows org_B data
```

**Data Isolation**: 
- Org A data becomes invisible (RLS blocks it)
- Org B data becomes visible (RLS allows it)
- No application code changes needed
- Security enforced at database level

---

### Security Model: Defense in Depth

#### Layer 1: Clerk Authentication
- Validates user credentials
- Issues signed JWT tokens
- Manages sessions and refresh tokens
- Prevents unauthorized access to app

#### Layer 2: Network (HTTPS)
- All requests encrypted in transit
- JWT tokens never exposed in plaintext
- CORS policies prevent unauthorized domains

#### Layer 3: Supabase JWT Validation
- Validates JWT signature (prevents tampering)
- Checks token expiration
- Extracts claims for RLS

#### Layer 4: Row Level Security (RLS)
- Filters rows based on JWT claims
- **Cannot be bypassed** (enforced by PostgreSQL)
- Even if app has bugs, RLS protects data
- Runs for every query, including joins

**Example Attack Scenarios**:

❌ **Scenario 1**: Malicious user modifies app code to query all sessions
```typescript
// Attacker tries to bypass service layer
const client = await AuthenticatedClient.getClient();
const { data } = await client.from("sessions").select("*");
```
✅ **RLS Blocks It**: Only returns sessions where `created_by = user_id` or `organization_id = org_id`

❌ **Scenario 2**: User forges JWT token with different `org_id`
```typescript
// Attacker creates fake token: { sub: "user_123", org_id: "org_target" }
```
✅ **Supabase Rejects It**: JWT signature validation fails (token not signed with correct secret)

❌ **Scenario 3**: User tries SQL injection
```typescript
await client.from("sessions").select("*").eq("name", "'; DROP TABLE sessions; --");
```
✅ **Supabase Protects**: Parameterized queries prevent SQL injection

---

### Troubleshooting Authentication Issues

#### Issue 1: "JWT Expired" Errors
**Cause**: Token older than 1 hour
**Solution**: Clerk SDK auto-refreshes. Check if:
- Clerk session is still active: `const { isSignedIn } = useAuth()`
- Network connectivity is working

#### Issue 2: Empty Query Results (Data Exists)
**Cause**: RLS blocking access due to wrong `org_id` in token
**Debug**:
```sql
-- In Supabase SQL Editor (as admin)
SELECT auth.jwt(); -- Check token claims

SELECT * FROM sessions; -- See all data (bypasses RLS as admin)

-- Check if org_id matches
SELECT * FROM sessions WHERE organization_id = 'org_xxx';
```

#### Issue 3: "Not Authenticated" Errors
**Cause**: No JWT token in request
**Check**:
```typescript
const { isLoaded, isSignedIn } = useAuth();

if (!isLoaded) {
  return <LoadingSpinner />;
}

if (!isSignedIn) {
  // Redirect to sign-in
  router.push("/sign-in");
}
```

#### Issue 4: Wrong Organization Data Showing
**Cause**: User's active org in Clerk doesn't match expected org
**Debug**:
```typescript
const { orgId } = useOrganization();
console.log("Current org:", orgId);

// Check if user is in expected org
const { userMemberships } = useOrganizationList();
console.log("User orgs:", userMemberships.data?.map(m => m.organization.id));
```

---

### Developer Mental Model

When working with this architecture, think of it this way:

```
┌─────────────────────────────────────────────┐
│  CLERK = "WHO YOU ARE"                      │
│  - Identity (user_id)                        │
│  - Context (org_id)                          │
│  - Permissions (role)                        │
└─────────────────────────────────────────────┘
                    ↓
          (JWT Token carries this)
                    ↓
┌─────────────────────────────────────────────┐
│  SUPABASE = "WHAT YOU CAN ACCESS"           │
│  - Data (sessions, weapons, etc.)            │
│  - Rules (RLS policies)                      │
│  - Relationships (foreign keys)              │
└─────────────────────────────────────────────┘
```

**Your Code's Job**: 
- Get user/org from Clerk: `const { userId, orgId } = useAuth()`
- Call service layer: `await getSessionsService(userId, orgId)`
- Service layer handles rest: token injection, RLS enforcement, data return

**You DON'T**:
- Manually attach tokens to requests (AuthenticatedClient does it)
- Filter data by org_id in app code (RLS does it)
- Check permissions in JavaScript (RLS enforces it)

---

### Extension Requirements

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
```

Provides `gen_random_uuid()` function for UUID generation.

---

## Database Tables

### 1. `profiles`

**Purpose**: Mirror basic user profile data from Clerk (Clerk remains source of truth)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `text` | PRIMARY KEY | Clerk user ID (user_*) |
| `email` | `text` | | User email address |
| `display_name` | `text` | | User display name |
| `avatar_url` | `text` | | Profile avatar URL |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Relationships**: None (standalone table)

**Notes**: 
- No `created_at` column (uses `updated_at` only)
- No foreign keys (Clerk is source of truth)
- Used for caching user info from Clerk

---

### 2. `projects`

**Purpose**: Example tenant-scoped table demonstrating organization-based data (template/reference)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique project ID |
| `organization_id` | `text` | NOT NULL | Clerk organization ID (org_*) |
| `owner_id` | `text` | NOT NULL | Clerk user ID who owns project (user_*) |
| `name` | `text` | NOT NULL | Project name |
| `description` | `text` | | Project description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |

**Relationships**: None (template table)

**Indexes**:
- `idx_projects_org` on `organization_id`
- `idx_projects_owner` on `owner_id`

**Notes**: This is a **template/example table** showing the multi-tenant pattern. Not actively used in the app.

---

### 3. `trainings`

**Purpose**: Top-level training programs/courses (e.g., "Basic Marksmanship", "Advanced Sniper Course")

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique training ID |
| `organization_id` | `text` | NOT NULL | Clerk organization ID (org_*) |
| `name` | `text` | NOT NULL | Training name |
| `description` | `text` | | Training description/notes |
| `created_by` | `text` | NOT NULL | Clerk user ID who created (user_*) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Relationships**:
- **One-to-Many** with `sessions` (one training has many sessions)

**Indexes**:
- `idx_trainings_org` on `organization_id`
- `idx_trainings_created_by` on `created_by`

**Trigger**: `update_trainings_updated_at` (updates `updated_at` on row update)

---

### 4. `sessions`

**Purpose**: Individual training sessions within a training program (e.g., "Morning Steel Shooting - June 1")

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session ID |
| `training_id` | `uuid` | REFERENCES trainings(id) ON DELETE CASCADE | Parent training (nullable) |
| `organization_id` | `text` | | Clerk organization ID (org_*) |
| `name` | `text` | NOT NULL | Session name |
| `session_type` | `session_type` | NOT NULL | Type of session (steel/paper) |
| `day_period` | `day_period` | NOT NULL | Time of day (day/night) |
| `created_by` | `text` | NOT NULL | Clerk user ID who created (user_*) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Relationships**:
- **Many-to-One** with `trainings` (many sessions belong to one training)

**Indexes**:
- `idx_sessions_training` on `training_id`
- `idx_sessions_org` on `organization_id`
- `idx_sessions_created_by` on `created_by`
- `idx_sessions_type` on `session_type`
- `idx_sessions_created_at` on `created_at DESC` (for sorting)

**Trigger**: `update_sessions_updated_at` (updates `updated_at` on row update)

**Notes**: 
- `training_id` is nullable (allows standalone sessions not part of a training program)
- `organization_id` is nullable (supports personal sessions)

---

### 5. `weapon_models`

**Purpose**: Reference library of weapon models (e.g., "Barrett M82", "Dragunov SVD") - **PUBLIC DATA**

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique model ID |
| `name` | `text` | NOT NULL, UNIQUE(name, caliber) | Model name |
| `weapon_name` | `text` | | Full weapon name |
| `manufacturer` | `text` | | Manufacturer/country |
| `weapon_type` | `text` | | Type (e.g., "sniper rifle") |
| `caliber` | `text` | UNIQUE(name, caliber) | Caliber/cartridge size |
| `cartridge_raw` | `text` | | Raw cartridge specification |
| `effective_range_m` | `int` | | Effective range in meters |
| `barrel_length_cm` | `numeric` | | Barrel length in centimeters |
| `twist_rate` | `text` | | Barrel twist rate |
| `origin` | `text` | | Country of origin |
| `year` | `int` | | Year introduced |
| `metadata` | `jsonb` | DEFAULT '{}' | Additional metadata |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | Active status |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Relationships**:
- **One-to-Many** with `weapons` (one model can have many physical weapons)

**Unique Constraints**: `UNIQUE (name, caliber)` - Prevents duplicate model variants

**Trigger**: `update_weapon_models_updated_at`

**Notes**: 
- **Public reference data** - anyone can read, authenticated users can suggest additions
- Pre-seeded with 217+ weapon models from seed data
- No organization/user ownership (shared globally)

---

### 6. `sight_models`

**Purpose**: Reference library of sight/optic models (e.g., "Leupold Mark 4", "Trijicon ACOG") - **PUBLIC DATA**

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique model ID |
| `name` | `text` | NOT NULL | Sight model name |
| `manufacturer` | `text` | | Manufacturer name |
| `kind` | `text` | NOT NULL | Type (scope/optic/thermal/red dot) |
| `mount_type` | `text` | | Mount type (Picatinny/Dovetail/etc) |
| `metadata` | `jsonb` | DEFAULT '{}' | Additional specifications |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | Active status |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Relationships**:
- **One-to-Many** with `sights` (one model can have many physical sights)

**Trigger**: `update_sight_models_updated_at`

**Notes**: 
- **Public reference data** - similar to `weapon_models`
- No pre-seeded data (can be populated via app)

---

### 7. `weapons`

**Purpose**: Organization's physical weapon inventory (serialized weapons owned by an organization)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique weapon ID |
| `weapon_model_id` | `uuid` | NOT NULL, REFERENCES weapon_models(id) ON DELETE CASCADE | FK to weapon model |
| `serial_number` | `text` | NOT NULL, UNIQUE | Serial number |
| `organization_id` | `text` | NOT NULL | Clerk organization ID (owner) |
| `last_maintenance_date` | `date` | | Last maintenance date |
| `round_count` | `int` | DEFAULT 0 | Total rounds fired |
| `condition` | `text` | | Weapon condition notes |
| `notes` | `text` | | Additional notes |
| `is_active` | `boolean` | DEFAULT true | Active status |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Relationships**:
- **Many-to-One** with `weapon_models` (many weapons belong to one model)
- **One-to-Many** with `user_loadouts` (one weapon can be in many loadouts)

**Indexes**:
- `idx_weapons_org` on `organization_id`
- `idx_weapons_model` on `weapon_model_id`
- `idx_weapons_serial` on `serial_number`

**Unique Constraints**: `UNIQUE (serial_number)` - Prevents duplicate serial numbers

**Trigger**: `update_weapons_updated_at`

**Notes**: 
- **Organization-scoped data** - only accessible to org members
- Tracks maintenance and usage (round_count)

---

### 8. `sights`

**Purpose**: Organization's physical sight/optic inventory (serialized sights owned by an organization)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique sight ID |
| `sight_model_id` | `uuid` | NOT NULL, REFERENCES sight_models(id) ON DELETE CASCADE | FK to sight model |
| `serial_number` | `text` | NOT NULL, UNIQUE | Serial number |
| `organization_id` | `text` | NOT NULL | Clerk organization ID (owner) |
| `last_calibration_date` | `date` | | Last calibration date |
| `condition` | `text` | | Sight condition notes |
| `notes` | `text` | | Additional notes |
| `is_active` | `boolean` | DEFAULT true | Active status |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Relationships**:
- **Many-to-One** with `sight_models` (many sights belong to one model)
- **One-to-Many** with `user_loadouts` (one sight can be in many loadouts)

**Indexes**:
- `idx_sights_org` on `organization_id`
- `idx_sights_model` on `sight_model_id`
- `idx_sights_serial` on `serial_number`

**Unique Constraints**: `UNIQUE (serial_number)` - Prevents duplicate serial numbers

**Trigger**: `update_sights_updated_at`

**Notes**: 
- **Organization-scoped data** - only accessible to org members
- Tracks calibration and maintenance

---

### 9. `user_loadouts`

**Purpose**: User-defined weapon configurations (pairing a weapon + sight with settings)

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique loadout ID |
| `user_id` | `text` | NOT NULL, UNIQUE(user_id, name) | Clerk user ID (owner) |
| `organization_id` | `text` | | Clerk organization ID (context) |
| `name` | `text` | NOT NULL, UNIQUE(user_id, name) | Loadout name (e.g., "Competition Setup") |
| `weapon_id` | `uuid` | REFERENCES weapons(id) | FK to weapon (nullable) |
| `sight_id` | `uuid` | REFERENCES sights(id) | FK to sight (nullable) |
| `zero_distance_m` | `int` | | Zero distance in meters |
| `zero_conditions` | `jsonb` | | Zero conditions metadata |
| `is_active` | `boolean` | DEFAULT true | Active status |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Relationships**:
- **Many-to-One** with `weapons` (many loadouts can use one weapon)
- **Many-to-One** with `sights` (many loadouts can use one sight)

**Indexes**:
- `idx_user_loadouts_user` on `user_id`
- `idx_user_loadouts_org` on `organization_id`
- `idx_user_loadouts_weapon` on `weapon_id`
- `idx_user_loadouts_sight` on `sight_id`

**Unique Constraints**: `UNIQUE (user_id, name)` - User can't have duplicate loadout names

**Trigger**: `update_user_loadouts_updated_at`

**Notes**: 
- **User-owned data** - users can only CRUD their own loadouts
- Can be viewed by org members (read-only for others)
- `organization_id` tracks context where loadout was created
- Weapon and sight are nullable (allows partial configurations)

---

## Enums

### `session_type`

**Purpose**: Categorize the type of shooting target used in a session

**Values**:
- `steel` - Steel targets (reactive, audible feedback)
- `paper` - Paper targets (for scoring precision)

**Usage**: `sessions.session_type` column

**Creation**:
```sql
CREATE TYPE session_type AS ENUM ('steel', 'paper');
```

---

### `day_period`

**Purpose**: Indicate the time of day for a session (lighting conditions)

**Values**:
- `day` - Daytime session (natural light)
- `night` - Nighttime session (low light/NVG)

**Usage**: `sessions.day_period` column

**Creation**:
```sql
CREATE TYPE day_period AS ENUM ('day', 'night');
```

---

## Indexes

### Performance Indexes

All foreign keys and frequently queried columns are indexed:

#### Multi-tenancy Indexes
```sql
-- Organization filtering (most critical for performance)
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_trainings_org ON trainings(organization_id);
CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_weapons_org ON weapons(organization_id);
CREATE INDEX idx_sights_org ON sights(organization_id);
CREATE INDEX idx_user_loadouts_org ON user_loadouts(organization_id);

-- User ownership filtering
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_trainings_created_by ON trainings(created_by);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_user_loadouts_user ON user_loadouts(user_id);
```

#### Foreign Key Indexes
```sql
-- Relationships
CREATE INDEX idx_sessions_training ON sessions(training_id);
CREATE INDEX idx_weapons_model ON weapons(weapon_model_id);
CREATE INDEX idx_sights_model ON sights(sight_model_id);
CREATE INDEX idx_user_loadouts_weapon ON user_loadouts(weapon_id);
CREATE INDEX idx_user_loadouts_sight ON user_loadouts(sight_id);
```

#### Query Optimization Indexes
```sql
-- Filtering/sorting
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Unique lookups
CREATE INDEX idx_weapons_serial ON weapons(serial_number);
CREATE INDEX idx_sights_serial ON sights(serial_number);
```

---

## RLS Policies

**All tables have RLS enabled**: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`

RLS policies enforce multi-tenancy and user permissions at the database level.

### Policy Naming Convention

```
[table]_[operation]_[condition]
```

Examples: `sessions_select`, `weapons_insert`, `trainings_update`

---

### Profiles Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `profiles_select_self` | SELECT | User can read their own profile (`user_id = auth.jwt()->>'sub'`) |
| `profiles_upsert_self_insert` | INSERT | User can insert their own profile |
| `profiles_upsert_self_update` | UPDATE | User can update their own profile |

**Access Pattern**: Users can only access their own profile data.

---

### Projects Policies (Template)

| Policy | Operation | Rule |
|--------|-----------|------|
| `projects_select_by_org` | SELECT | Read if in same organization (`organization_id = auth.jwt()->>'org_id'`) |
| `projects_mutate_owner_in_org` | ALL | Insert/update/delete if owner AND in same org |

**Access Pattern**: 
- Read: Anyone in the organization
- Write: Only the owner within their organization

---

### Trainings Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `trainings_select` | SELECT | Created by user OR in user's current organization |
| `trainings_insert` | INSERT | User is authenticated (`created_by = auth.jwt()->>'sub'`) |
| `trainings_update` | UPDATE | User created the training |
| `trainings_delete` | DELETE | User created the training |

**Access Pattern**:
```sql
-- SELECT: See your own OR org trainings
created_by = auth.jwt()->>'sub'
OR (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
)

-- INSERT: Must match your user_id
created_by = auth.jwt()->>'sub'

-- UPDATE/DELETE: Only your own
created_by = auth.jwt()->>'sub'
```

**Multi-tenancy Support**:
- **Personal Context**: Can see trainings where `created_by = user_id`
- **Org Context**: Can see all trainings in `organization_id = org_id`
- **Write Operations**: Always restricted to creator only

---

### Sessions Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `sessions_select` | SELECT | Created by user OR in user's current organization |
| `sessions_insert` | INSERT | User is authenticated |
| `sessions_update` | UPDATE | User created the session |
| `sessions_delete` | DELETE | User created the session |

**Access Pattern**: Identical to `trainings` (same multi-tenant pattern)

---

### Weapon Models Policies (Public Reference Data)

| Policy | Operation | Rule |
|--------|-----------|------|
| `weapon_models_select` | SELECT | **PUBLIC** - Anyone can read (even anonymous) |
| `weapon_models_insert` | INSERT | Authenticated users can suggest new models |

**Access Pattern**: 
- **Read**: Open to everyone (including non-authenticated users)
- **Write**: Authenticated users only (community contributions)

---

### Sight Models Policies (Public Reference Data)

| Policy | Operation | Rule |
|--------|-----------|------|
| `sight_models_select` | SELECT | **PUBLIC** - Anyone can read |
| `sight_models_insert` | INSERT | Authenticated users can suggest new models |

**Access Pattern**: Same as `weapon_models`

---

### Weapons Policies (Org Inventory)

| Policy | Operation | Rule |
|--------|-----------|------|
| `weapons_select` | SELECT | User is in the weapon's organization |
| `weapons_insert` | INSERT | User is in organization AND org_id is set |
| `weapons_update` | UPDATE | User is in the weapon's organization |
| `weapons_delete` | DELETE | User is in the weapon's organization |

**Access Pattern**:
```sql
-- All operations: Must be in org
organization_id = auth.jwt() ->> 'org_id'
AND auth.jwt() ->> 'org_id' IS NOT NULL
```

**Multi-tenancy Support**:
- **Organization-only data** (no personal context)
- Any org member can CRUD org weapons
- Non-org members have zero access

---

### Sights Policies (Org Inventory)

| Policy | Operation | Rule |
|--------|-----------|------|
| `sights_select` | SELECT | User is in the sight's organization |
| `sights_insert` | INSERT | User is in organization AND org_id is set |
| `sights_update` | UPDATE | User is in the sight's organization |
| `sights_delete` | DELETE | User is in the sight's organization |

**Access Pattern**: Identical to `weapons` (same org-only pattern)

---

### User Loadouts Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `user_loadouts_select` | SELECT | User owns loadout OR in same organization |
| `user_loadouts_insert` | INSERT | User can only create their own loadouts |
| `user_loadouts_update` | UPDATE | User can only update their own loadouts |
| `user_loadouts_delete` | DELETE | User can only delete their own loadouts |

**Access Pattern**:
```sql
-- SELECT: Your own OR same org
user_id = auth.jwt() ->> 'sub'
OR (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
)

-- INSERT/UPDATE/DELETE: Only your own
user_id = auth.jwt() ->> 'sub'
```

**Multi-tenancy Support**:
- **Read**: Can view own loadouts + loadouts of org members
- **Write**: Can only modify own loadouts (even in org context)
- Supports both personal and org contexts

---

## Functions & Triggers

### Function: `update_updated_at_column()`

**Purpose**: Automatically update `updated_at` timestamp when a row is modified

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Type**: Trigger function (called before UPDATE)

**Behavior**: Sets `updated_at = now()` on every row update

---

### Triggers

All tables with `updated_at` column have this trigger:

| Trigger Name | Table | Event | Function |
|--------------|-------|-------|----------|
| `update_trainings_updated_at` | `trainings` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sessions_updated_at` | `sessions` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_weapon_models_updated_at` | `weapon_models` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sight_models_updated_at` | `sight_models` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_weapons_updated_at` | `weapons` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_sights_updated_at` | `sights` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_user_loadouts_updated_at` | `user_loadouts` | BEFORE UPDATE | `update_updated_at_column()` |

**Creation Example**:
```sql
CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Relationships & Foreign Keys

### Entity Relationship Diagram (Textual)

```
weapon_models (PUBLIC)
    ↓ (1:N)
weapons (ORG INVENTORY)
    ↓ (1:N)
user_loadouts (USER-OWNED)

sight_models (PUBLIC)
    ↓ (1:N)
sights (ORG INVENTORY)
    ↓ (1:N)
user_loadouts (USER-OWNED)

trainings (MULTI-TENANT)
    ↓ (1:N)
sessions (MULTI-TENANT)

profiles (USER DATA)
    (standalone)

projects (TEMPLATE)
    (standalone)
```

### Foreign Key Details

| Child Table | Column | References | ON DELETE |
|-------------|--------|------------|-----------|
| `sessions` | `training_id` | `trainings(id)` | CASCADE |
| `weapons` | `weapon_model_id` | `weapon_models(id)` | CASCADE |
| `sights` | `sight_model_id` | `sight_models(id)` | CASCADE |
| `user_loadouts` | `weapon_id` | `weapons(id)` | No action (nullable) |
| `user_loadouts` | `sight_id` | `sights(id)` | No action (nullable) |

**Cascade Behavior**:
- Deleting a `training` deletes all its `sessions`
- Deleting a `weapon_model` deletes all inventory `weapons` (use `is_active` instead)
- Deleting a `sight_model` deletes all inventory `sights` (use `is_active` instead)
- Deleting a `weapon` or `sight` does NOT delete loadouts (FK is nullable)

---

## Multi-tenancy Pattern

### Data Access Contexts

Every user operates in one of two contexts:

#### 1. Personal Context
```typescript
orgId = undefined
```

**Access**:
- See data where `created_by = user_id`
- Cannot access organization inventory (`weapons`, `sights`)
- Own `user_loadouts` only

#### 2. Organization Context
```typescript
orgId = "org_xxx"
```

**Access**:
- See data where `organization_id = org_id` OR `created_by = user_id`
- Full access to organization inventory
- Can view all org members' loadouts

### Implementation in Service Layer

```typescript
export async function getSessionsService(
  userId: string,
  orgId?: string
): Promise<Session[]> {
  const client = await AuthenticatedClient.getClient();

  let query = client.from("sessions").select("*");

  if (orgId) {
    // ORGANIZATION CONTEXT: Get all sessions in org
    query = query.eq("organization_id", orgId);
  } else {
    // PERSONAL CONTEXT: Get only user's sessions
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message);
  return data;
}
```

### RLS Enforcement

RLS policies enforce permissions at the database level, even if service layer is bypassed:

```sql
-- Example: sessions SELECT policy
CREATE POLICY "sessions_select"
ON sessions FOR SELECT
USING (
  -- Personal access
  created_by = auth.jwt()->>'sub'
  OR (
    -- Org access (if user has org_id in JWT)
    organization_id = auth.jwt()->>'org_id'
    AND auth.jwt()->>'org_id' IS NOT NULL
  )
);
```

**Security**: Even if a malicious client tries to query all sessions, RLS filters results to allowed rows only.

---

## Data Categories

### 1. Public Reference Data
- `weapon_models`
- `sight_models`

**Characteristics**:
- No ownership columns
- Public read access
- Authenticated write access (community contributions)
- Shared globally across all users/orgs

---

### 2. Organization Inventory
- `weapons`
- `sights`

**Characteristics**:
- `organization_id` required
- No personal context support
- All org members have full CRUD access
- Zero access for non-members

---

### 3. Multi-tenant Data (Personal + Org)
- `trainings`
- `sessions`

**Characteristics**:
- `organization_id` nullable
- `created_by` required
- Supports both personal and org contexts
- Creator has full control
- Org members have read access

---

### 4. User-owned Data
- `profiles`
- `user_loadouts`

**Characteristics**:
- `user_id` ownership
- Read access: Owner + org members (for loadouts)
- Write access: Owner only
- Org context tracked but doesn't grant write permissions

---

## Seed Data

### Weapon Models (217 models pre-seeded)

From `supabase/seed.sql`, includes:
- 217 sniper rifle models
- Historical to modern weapons (1886-2023)
- Multiple countries (US, Russia, Germany, UK, Finland, etc.)
- Calibers ranging from 5.45mm to 23mm

**Examples**:
- `Barrett M82` (.50 BMG, 1980)
- `Dragunov SVD` (7.62×54mmR, 1958)
- `Accuracy International Arctic Warfare` (7.62×51mm NATO, 1982)
- `McMillan TAC-50` (.50 BMG, 1980)

**Query**:
```sql
SELECT name, caliber, manufacturer, year 
FROM weapon_models 
WHERE is_active = true 
ORDER BY year DESC;
```

---

## Database Statistics

| Category | Count |
|----------|-------|
| **Tables** | 9 |
| **Enums** | 2 |
| **Indexes** | 20+ |
| **RLS Policies** | 27 |
| **Functions** | 1 |
| **Triggers** | 7 |
| **Pre-seeded Models** | 217 |

---

## Migration Files

| File | Purpose |
|------|---------|
| `20251017013210_init-clerk-auth-sync.sql` | Initial Clerk auth setup, profiles, projects (template) |
| `20251018150244_create_trainings_sessions.sql` | Trainings/sessions with enums, RLS, triggers |
| `20251027113941_loadouts.sql` | Weapon system (models, inventory, loadouts) |

---

## Common Query Patterns

### Get User's Sessions (Personal Context)
```sql
SELECT * FROM sessions 
WHERE created_by = auth.jwt() ->> 'sub';
```

### Get Org Sessions (Org Context)
```sql
SELECT * FROM sessions 
WHERE organization_id = auth.jwt() ->> 'org_id';
```

### Get User's Loadouts with Weapon/Sight Details
```sql
SELECT 
  ul.*,
  w.serial_number as weapon_serial,
  wm.name as weapon_model_name,
  s.serial_number as sight_serial,
  sm.name as sight_model_name
FROM user_loadouts ul
LEFT JOIN weapons w ON ul.weapon_id = w.id
LEFT JOIN weapon_models wm ON w.weapon_model_id = wm.id
LEFT JOIN sights s ON ul.sight_id = s.id
LEFT JOIN sight_models sm ON s.sight_model_id = sm.id
WHERE ul.user_id = auth.jwt() ->> 'sub';
```

### Get Available Weapons for Current Org
```sql
SELECT 
  w.*,
  wm.name as model_name,
  wm.caliber
FROM weapons w
JOIN weapon_models wm ON w.weapon_model_id = wm.id
WHERE w.organization_id = auth.jwt() ->> 'org_id'
  AND w.is_active = true;
```

---

## Security Best Practices

### 1. Never Bypass RLS
- Always use authenticated Supabase client (via `AuthenticatedClient.getClient()`)
- Never use service role key in client-side code
- RLS is the final security layer - even if app logic fails, RLS protects data

### 2. Use Service Layer
```typescript
// ✅ CORRECT - Service layer with auto token injection
const sessions = await getSessionsService(userId, orgId);

// ❌ WRONG - Direct client in component
const client = await getAuthenticatedClient();
const { data } = await client.from("sessions").select();
```

### 3. Validate Input at Service Layer
```typescript
export async function createSessionService(
  input: CreateSessionInput,
  userId: string,
  orgId: string
): Promise<Session> {
  // Validate required fields
  if (!input.name || !input.session_type) {
    throw new ValidationError("Name and session type required");
  }

  const client = await AuthenticatedClient.getClient();
  // ... rest of implementation
}
```

### 4. Context-based Filtering
```typescript
// Always check orgId to determine context
if (orgId) {
  // Organization context logic
} else {
  // Personal context logic
}
```

---

## Future Enhancements

Potential schema extensions:

### 1. Shot/Score Tracking
```sql
CREATE TABLE session_shots (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  shot_number int,
  target_distance_m int,
  score numeric,
  coordinates jsonb, -- { x, y, ring }
  created_at timestamptz DEFAULT now()
);
```

### 2. Weather Conditions
```sql
CREATE TABLE session_conditions (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  temperature_c numeric,
  wind_speed_kmh numeric,
  wind_direction text,
  humidity_percent int,
  created_at timestamptz DEFAULT now()
);
```

### 3. Ammo Tracking
```sql
CREATE TABLE ammunition (
  id uuid PRIMARY KEY,
  organization_id text NOT NULL,
  caliber text NOT NULL,
  manufacturer text,
  lot_number text,
  quantity int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### 4. User Qualifications
```sql
CREATE TABLE user_qualifications (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  training_id uuid REFERENCES trainings(id),
  qualification_date date,
  score numeric,
  valid_until date,
  created_at timestamptz DEFAULT now()
);
```

---

## Troubleshooting

### Common Issues

#### RLS Denies Access
**Symptom**: Query returns empty results even though data exists

**Causes**:
1. JWT token missing `org_id` claim (check Clerk JWT template)
2. User not in correct organization context
3. RLS policy too restrictive

**Debug**:
```sql
-- Check current JWT claims
SELECT auth.jwt();

-- Test policy (as superuser)
SELECT * FROM sessions WHERE id = 'xxx';
```

#### Foreign Key Violations
**Symptom**: "violates foreign key constraint" error

**Causes**:
1. Referenced record doesn't exist
2. Referenced record belongs to different org
3. Trying to delete parent with CASCADE dependencies

**Solution**:
```typescript
// Check if weapon exists and is accessible
const weapon = await client
  .from("weapons")
  .select("*")
  .eq("id", weaponId)
  .single();

if (!weapon.data) {
  throw new NotFoundError("Weapon not found or not accessible");
}
```

#### Token Expiration
**Symptom**: Intermittent "JWT expired" errors

**Solution**: `AuthenticatedClient` automatically refreshes tokens via Clerk

---

## Type Generation

After any schema changes, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

This creates type-safe interfaces for all tables, including:
- `Row` types (SELECT return type)
- `Insert` types (INSERT input type)
- `Update` types (UPDATE input type)

**Usage**:
```typescript
import type { Database } from "@/types/database";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type CreateSessionInput = Database["public"]["Tables"]["sessions"]["Insert"];
type UpdateSessionInput = Database["public"]["Tables"]["sessions"]["Update"];
```

---

## Summary

The Scopes database is designed with:

✅ **Multi-tenancy** - Supports personal and organization contexts
✅ **Security** - RLS policies enforce all permissions at DB level
✅ **Scalability** - Proper indexing on all foreign keys and filters
✅ **Auditability** - Timestamps and ownership tracking on all tables
✅ **Flexibility** - JSONB metadata columns for extensibility
✅ **Type Safety** - Generated TypeScript types from schema
✅ **Data Integrity** - Foreign key constraints with CASCADE rules
✅ **Public Reference Data** - Shared weapon/sight models library

### Core Philosophy: Separation of Concerns

**The Complexity Explained**:

This app uses **two specialized systems** working together, not because it's overly complex, but because each does one thing **extremely well**:

#### 🔐 Clerk = User & Organization Boss
- **Controls**: Who users are, what orgs they're in, who can invite whom
- **Why**: Building auth UX is hard. Clerk is production-ready out of the box.
- **Result**: No need to build login screens, password reset flows, email verification, org invites, etc.

#### 🗄️ Supabase = Data & Permissions Boss  
- **Controls**: Application data, who can access what data (via RLS)
- **Why**: PostgreSQL + RLS is unbeatable for multi-tenant data security
- **Result**: Database enforces permissions automatically - even malicious code can't bypass it

#### 🌉 The Bridge: JWT Tokens
- Clerk generates signed token: `{ user_id: "user_123", org_id: "org_456" }`
- Supabase validates token and uses claims in RLS: `WHERE created_by = token.user_id`
- `AuthenticatedClient` automatically injects fresh token into every request
- **You never manually handle tokens** - it's all automatic

### Why This Architecture Wins

**Instead of building**:
- ❌ Custom login/signup UI
- ❌ Password reset emails
- ❌ Email verification system  
- ❌ Organization invite system
- ❌ User management dashboard
- ❌ Session management
- ❌ Token refresh logic
- ❌ Permission checking in every API route

**You get**:
- ✅ World-class auth UI (Clerk)
- ✅ Automatic token management
- ✅ Organization management built-in
- ✅ Database-level security (RLS)
- ✅ Context switching (personal ↔ org) with zero code
- ✅ Service layer that "just works"

### Developer Experience

```typescript
// This is ALL you need to do:

// 1. Get user context from Clerk
const { userId, orgId } = useAuth();

// 2. Call service function
const sessions = await getSessionsService(userId, orgId);

// 3. Done. Token injection, RLS enforcement, security - all automatic
```

**The "complexity" is hidden complexity** - the infrastructure handles it so you don't have to.

### Trade-off: Two Services vs. Custom Auth

**Option A: This Architecture (Clerk + Supabase)**
- Setup time: 2 hours (configure both services)
- Maintenance: Near zero (both services handle updates)
- Security: Enterprise-grade (both are battle-tested)
- Cost: ~$25-50/month for small apps (free tiers available)

**Option B: Custom Auth + Supabase**
- Setup time: 2-4 weeks (build auth UI, email system, org management)
- Maintenance: Ongoing (security patches, feature requests)
- Security: Your responsibility (easy to make mistakes)
- Cost: Your engineering time + email service + hosting

**The choice is clear**: Unless you have very unique auth requirements, the Clerk-Supabase split pays for itself immediately.

---

**Bottom Line**: 
- **Clerk** = You never think about authentication again
- **Supabase** = You never worry about data security again  
- **Together** = You focus on building your app's unique features

The "complexity" is in the infrastructure diagram, not in your day-to-day code. Once configured, it's invisible.

---

*Generated for Scopes Sniper Training App - Database Version 1.0*
*Last Updated: November 1, 2025*

