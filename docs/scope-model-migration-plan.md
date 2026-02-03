# Scope Model Migration Plan

First-class `scope_type` column with Supabase Row Level Security.
All steps are dashboard-safe (Table Editor + SQL Editor). Every step is reversible.

---

## Scope Model (Canonical)

```
Scope =
  SOLO: owned by user, team_id IS NULL
  TEAM: owned by team, team_id IS NOT NULL

Invariant per row:
  (scope_type = 'solo' AND team_id IS NULL)
  OR
  (scope_type = 'team' AND team_id IS NOT NULL)
```

Solo is NOT a fake team. A user can belong to many teams. Every row belongs to exactly one scope. Scope is never inferred.

---

## 1. Table Classification

### Tables from requirements

| Table | Classification | Rationale |
|-------|---------------|-----------|
| `sessions` | **MIXED** | Has `user_id` (NOT NULL) and `team_id` (nullable). Solo when `team_id IS NULL`. Team when `team_id IS NOT NULL`. |
| `session_stats` | **MIXED** | Child of sessions. Has `user_id` and `session_id`. No `team_id` currently. |
| `session_participants` | **MIXED** | Child of sessions. Has `user_id` and `session_id`. No `team_id` currently. |
| `trainings` | **TEAM ONLY** | Has `team_id` (NOT NULL). Schema comment: "Required - trainings always belong to a team." |
| `target_stats` | **DOES NOT EXIST** | Nearest: `session_targets` (MIXED, child of sessions). |
| `target_engagements` | **DOES NOT EXIST** | Nearest: `engagements` (MIXED, child of sessions). |
| `group_scores` | **DOES NOT EXIST** | No equivalent table in current schema. |

### Table name mapping (actual schema)

- `target_stats` -> `session_targets` (per-target records within a session), with children `paper_target_results` and `tactical_target_results`.
- `target_engagements` -> `engagements` (atomic execution unit), with child `engagement_participants`.
- `group_scores` -> no existing table.

### Additional tables needing scope

| Table | Classification | Rationale |
|-------|---------------|-----------|
| `session_targets` | **MIXED** | Child of sessions. Has `session_id`. No `team_id`. |
| `engagements` | **MIXED** | Child of sessions. Has `session_id`, `training_id`. No `team_id`. |
| `engagement_participants` | **MIXED** | Child of engagements. Has `engagement_id`, `session_id`, `user_id`. No `team_id`. |
| `session_features` | **MIXED** | Already has `team_id` (nullable) and `user_id`. |
| `paper_target_results` | **MIXED** | Grandchild: `session_target_id` -> `session_targets` -> `sessions`. No `session_id`, no `team_id`. |
| `tactical_target_results` | **MIXED** | Same as paper_target_results. |
| `session_timelines` | **MIXED** | Child of sessions. Has `session_id` only. |
| `session_insights` | **MIXED** | Child of sessions. Has `session_id` and `user_id`. |
| `training_drills` | **TEAM ONLY** | Child of trainings. |
| `drill_templates` | **MIXED** | Has `owner_type` ('user'/'team'), `owner_id`, `team_id` (nullable). Already has its own scope via `owner_type`. |

### Tables already correctly scoped (no changes needed)

- **TEAM ONLY**: `team_members`, `team_drill_presets`, `team_weapons`, `team_standards`, `team_standard_modifiers`, `team_invitations`, `teams`
- **SOLO ONLY**: `user_weapons`, `user_baselines`, `user_insight_triggers`, `push_tokens`, `notifications`, `notification_history`, `profiles`
- **GLOBAL**: `weapons`, `drills`

### Note on `session_mode` vs `scope_type`

`session_mode` ('solo'/'group') describes participation format (how many people). `scope_type` ('solo'/'team') describes data ownership (who owns the row). They are independent. A team training drill executed by one person has `session_mode='solo'` and `scope_type='team'`. Do not conflate them.

---

## 2. Dashboard-Safe Migration Steps (Reversible)

### Execution order

Complete each tier before starting the next. Within a tier, order does not matter.

- **TIER 1**: Root tables that already have `team_id` -- add `scope_type` only
- **TIER 2**: Child tables with `session_id` -- add `scope_type` + `team_id`
- **TIER 3**: Grandchild tables -- add `scope_type` + `team_id` (denormalized from parent chain)

---

### TIER 1A: `sessions`

Current columns: `team_id` (nullable), `user_id` (NOT NULL), `session_mode` ('solo'/'group').

**Step 1: Add column**

```sql
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scope_type text;
```

**Step 2: Backfill**

```sql
UPDATE public.sessions
SET scope_type = CASE
  WHEN team_id IS NULL THEN 'solo'
  ELSE 'team'
END
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.sessions
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.sessions
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: Add CHECK constraint (NOT VALID)**

```sql
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

`NOT VALID` skips scanning existing rows. Only new/updated rows are checked. Prevents table-wide lock.

**Revert:**

```sql
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_scope_check;
ALTER TABLE public.sessions ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS scope_type;
```

---

### TIER 1B: `trainings`

Current columns: `team_id` (NOT NULL). Always team-scoped.

**Step 1: Add column with default**

```sql
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'team';
```

**Step 2: Backfill**

```sql
UPDATE public.trainings
SET scope_type = 'team'
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL**

```sql
ALTER TABLE public.trainings
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.trainings
  ADD CONSTRAINT trainings_scope_check CHECK (
    scope_type = 'team' AND team_id IS NOT NULL
  ) NOT VALID;
```

**Revert:**

```sql
ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_scope_check;
ALTER TABLE public.trainings ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.trainings ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.trainings DROP COLUMN IF EXISTS scope_type;
```

---

### TIER 1C: `session_features`

Current columns: `team_id` (nullable), `user_id` (NOT NULL).

**Step 1: Add column**

```sql
ALTER TABLE public.session_features
  ADD COLUMN IF NOT EXISTS scope_type text;
```

**Step 2: Backfill**

```sql
UPDATE public.session_features
SET scope_type = CASE
  WHEN team_id IS NULL THEN 'solo'
  ELSE 'team'
END
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.session_features
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.session_features
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.session_features
  ADD CONSTRAINT session_features_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Revert:**

```sql
ALTER TABLE public.session_features DROP CONSTRAINT IF EXISTS session_features_scope_check;
ALTER TABLE public.session_features ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.session_features ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.session_features DROP COLUMN IF EXISTS scope_type;
```

---

### TIER 2A: `session_stats`

Current columns: `session_id` (NOT NULL), `user_id` (NOT NULL). No `team_id`.

**Step 1: Add columns**

```sql
ALTER TABLE public.session_stats
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill from parent sessions**

```sql
UPDATE public.session_stats ss
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.sessions s
WHERE ss.session_id = s.id
  AND ss.scope_type IS NULL;
```

**Step 2b: Handle orphan rows (no matching session)**

```sql
UPDATE public.session_stats
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.session_stats
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.session_stats
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.session_stats
  ADD CONSTRAINT session_stats_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index for RLS performance**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_stats_team_id
  ON public.session_stats (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_session_stats_team_id;
ALTER TABLE public.session_stats DROP CONSTRAINT IF EXISTS session_stats_scope_check;
ALTER TABLE public.session_stats ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.session_stats ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.session_stats DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_stats DROP COLUMN IF EXISTS team_id;
```

---

### TIER 2B: `session_participants`

Current columns: `session_id` (NOT NULL), `user_id` (NOT NULL). No `team_id`.

**Step 1: Add columns**

```sql
ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill**

```sql
UPDATE public.session_participants sp
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.sessions s
WHERE sp.session_id = s.id
  AND sp.scope_type IS NULL;
```

**Step 2b: Handle orphans**

```sql
UPDATE public.session_participants
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.session_participants
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.session_participants
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.session_participants
  ADD CONSTRAINT session_participants_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_participants_team_id
  ON public.session_participants (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_session_participants_team_id;
ALTER TABLE public.session_participants DROP CONSTRAINT IF EXISTS session_participants_scope_check;
ALTER TABLE public.session_participants ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.session_participants ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.session_participants DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_participants DROP COLUMN IF EXISTS team_id;
```

---

### TIER 2C: `engagements`

Current columns: `session_id` (NOT NULL), `shooter_id` (nullable), `training_id` (nullable). No `team_id`.

**Step 1: Add columns**

```sql
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill**

```sql
UPDATE public.engagements e
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.sessions s
WHERE e.session_id = s.id
  AND e.scope_type IS NULL;
```

**Step 2b: Handle orphans**

```sql
UPDATE public.engagements
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.engagements
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.engagements
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.engagements
  ADD CONSTRAINT engagements_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_team_id
  ON public.engagements (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_engagements_team_id;
ALTER TABLE public.engagements DROP CONSTRAINT IF EXISTS engagements_scope_check;
ALTER TABLE public.engagements ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.engagements ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.engagements DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.engagements DROP COLUMN IF EXISTS team_id;
```

---

### TIER 2D: `session_targets`

Current columns: `session_id` (NOT NULL). No `team_id`.

**Step 1: Add columns**

```sql
ALTER TABLE public.session_targets
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill**

```sql
UPDATE public.session_targets st
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.sessions s
WHERE st.session_id = s.id
  AND st.scope_type IS NULL;
```

**Step 2b: Handle orphans**

```sql
UPDATE public.session_targets
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.session_targets
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.session_targets
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.session_targets
  ADD CONSTRAINT session_targets_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_targets_team_id
  ON public.session_targets (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_session_targets_team_id;
ALTER TABLE public.session_targets DROP CONSTRAINT IF EXISTS session_targets_scope_check;
ALTER TABLE public.session_targets ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.session_targets ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.session_targets DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_targets DROP COLUMN IF EXISTS team_id;
```

---

### TIER 2E: `engagement_participants`

Current columns: `engagement_id` (NOT NULL), `session_id` (nullable), `user_id` (NOT NULL). No `team_id`.

**Step 1: Add columns**

```sql
ALTER TABLE public.engagement_participants
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill (primary path: through session_id)**

```sql
UPDATE public.engagement_participants ep
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.sessions s
WHERE ep.session_id = s.id
  AND ep.scope_type IS NULL;
```

**Step 2b: Backfill (fallback: through engagement -> session)**

```sql
UPDATE public.engagement_participants ep
SET
  scope_type = CASE WHEN s.team_id IS NULL THEN 'solo' ELSE 'team' END,
  team_id = s.team_id
FROM public.engagements e
JOIN public.sessions s ON s.id = e.session_id
WHERE ep.engagement_id = e.id
  AND ep.scope_type IS NULL;
```

**Step 2c: Handle orphans**

```sql
UPDATE public.engagement_participants
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.engagement_participants
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.engagement_participants
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.engagement_participants
  ADD CONSTRAINT engagement_participants_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagement_participants_team_id
  ON public.engagement_participants (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_engagement_participants_team_id;
ALTER TABLE public.engagement_participants DROP CONSTRAINT IF EXISTS engagement_participants_scope_check;
ALTER TABLE public.engagement_participants ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.engagement_participants ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.engagement_participants DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.engagement_participants DROP COLUMN IF EXISTS team_id;
```

---

### TIER 3A: `paper_target_results`

Current columns: `session_target_id` (NOT NULL). No `session_id`, no `team_id`. Grandchild table.

Prerequisite: TIER 2D (`session_targets`) must be completed first.

**Step 1: Add columns**

```sql
ALTER TABLE public.paper_target_results
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill from parent session_targets**

```sql
UPDATE public.paper_target_results ptr
SET
  scope_type = st.scope_type,
  team_id = st.team_id
FROM public.session_targets st
WHERE ptr.session_target_id = st.id
  AND ptr.scope_type IS NULL;
```

**Step 2b: Handle orphans**

```sql
UPDATE public.paper_target_results
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.paper_target_results
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.paper_target_results
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.paper_target_results
  ADD CONSTRAINT paper_target_results_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paper_target_results_team_id
  ON public.paper_target_results (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_paper_target_results_team_id;
ALTER TABLE public.paper_target_results DROP CONSTRAINT IF EXISTS paper_target_results_scope_check;
ALTER TABLE public.paper_target_results ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.paper_target_results ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.paper_target_results DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.paper_target_results DROP COLUMN IF EXISTS team_id;
```

---

### TIER 3B: `tactical_target_results`

Current columns: `session_target_id` (NOT NULL). No `session_id`, no `team_id`. Grandchild table.

Prerequisite: TIER 2D (`session_targets`) must be completed first.

**Step 1: Add columns**

```sql
ALTER TABLE public.tactical_target_results
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS team_id uuid;
```

**Step 2: Backfill from parent session_targets**

```sql
UPDATE public.tactical_target_results ttr
SET
  scope_type = st.scope_type,
  team_id = st.team_id
FROM public.session_targets st
WHERE ttr.session_target_id = st.id
  AND ttr.scope_type IS NULL;
```

**Step 2b: Handle orphans**

```sql
UPDATE public.tactical_target_results
SET scope_type = 'solo', team_id = NULL
WHERE scope_type IS NULL;
```

**Step 3: Set NOT NULL and default**

```sql
ALTER TABLE public.tactical_target_results
  ALTER COLUMN scope_type SET DEFAULT 'solo';

ALTER TABLE public.tactical_target_results
  ALTER COLUMN scope_type SET NOT NULL;
```

**Step 4: CHECK constraint**

```sql
ALTER TABLE public.tactical_target_results
  ADD CONSTRAINT tactical_target_results_scope_check CHECK (
    (scope_type = 'solo' AND team_id IS NULL)
    OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  ) NOT VALID;
```

**Step 5: Index**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tactical_target_results_team_id
  ON public.tactical_target_results (team_id)
  WHERE team_id IS NOT NULL;
```

**Revert:**

```sql
DROP INDEX IF EXISTS public.idx_tactical_target_results_team_id;
ALTER TABLE public.tactical_target_results DROP CONSTRAINT IF EXISTS tactical_target_results_scope_check;
ALTER TABLE public.tactical_target_results ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.tactical_target_results ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.tactical_target_results DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.tactical_target_results DROP COLUMN IF EXISTS team_id;
```

---

### Validation query (run after all tiers)

Verify zero rows violate the scope invariant:

```sql
SELECT 'sessions' AS tbl, COUNT(*) AS violations
FROM public.sessions
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'session_stats', COUNT(*)
FROM public.session_stats
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'session_participants', COUNT(*)
FROM public.session_participants
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'engagements', COUNT(*)
FROM public.engagements
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'session_targets', COUNT(*)
FROM public.session_targets
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'engagement_participants', COUNT(*)
FROM public.engagement_participants
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'trainings', COUNT(*)
FROM public.trainings
WHERE NOT (scope_type = 'team' AND team_id IS NOT NULL)
UNION ALL
SELECT 'session_features', COUNT(*)
FROM public.session_features
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'paper_target_results', COUNT(*)
FROM public.paper_target_results
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
UNION ALL
SELECT 'tactical_target_results', COUNT(*)
FROM public.tactical_target_results
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
);
```

Expected: all rows show 0 violations.

---

## 3. Shadow RLS Setup

### Context

RLS is already enabled on all target tables with existing policies. The shadow approach creates a temporary permissive catch-all per table. When old policies are dropped and new scope-based policies are added, the shadow ensures nothing breaks during the transition.

**Security note**: While `shadow_allow_all` is active, access control is effectively disabled for that table. The transition window (drop old -> add new -> drop shadow) should happen in one SQL Editor session per table.

### Add shadow policies

```sql
CREATE POLICY "shadow_allow_all" ON public.sessions
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.session_stats
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.session_participants
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.engagements
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.engagement_participants
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.session_targets
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.paper_target_results
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.tactical_target_results
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.trainings
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "shadow_allow_all" ON public.session_features
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
```

### Why this is safe

1. PERMISSIVE policies are OR'd together. Adding `shadow_allow_all` alongside existing policies only widens access. Nothing that previously worked will break.
2. The shadow is named distinctively. It cannot be confused with real policies.
3. It is removed in Section 5 (Enforcement).

### Revert (remove all shadow policies)

```sql
DROP POLICY IF EXISTS "shadow_allow_all" ON public.sessions;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_stats;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_participants;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.engagements;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.engagement_participants;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_targets;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.paper_target_results;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.tactical_target_results;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.trainings;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_features;
```

---

## 4. Real RLS Policies (Copy-Paste Ready)

### Prerequisite: existing helper functions

These SECURITY DEFINER functions already exist. No new helpers created.

- `is_team_member(p_team_id uuid, p_user_id uuid DEFAULT auth.uid()) -> boolean`
- `is_team_admin(p_team_id uuid, p_user_id uuid DEFAULT auth.uid()) -> boolean`
- `get_my_team_ids() -> SETOF uuid`

### Naming convention

New policies prefixed with `scope_`. Legacy policies remain until enforcement step.

---

### 4A. `sessions`

**Drop old policies** (only after shadow_allow_all is confirmed active):

```sql
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own and team sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.sessions
  FOR SELECT USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_select_team" ON public.sessions
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.sessions
  FOR INSERT WITH CHECK (
    scope_type = 'solo'
    AND team_id IS NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "scope_insert_team" ON public.sessions
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_team_member(team_id)
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.sessions
  FOR UPDATE
  USING (scope_type = 'solo' AND user_id = auth.uid())
  WITH CHECK (scope_type = 'solo' AND user_id = auth.uid());

CREATE POLICY "scope_update_team" ON public.sessions
  FOR UPDATE
  USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_team_member(team_id)
  )
  WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
  );
```

**DELETE**:

```sql
CREATE POLICY "scope_delete_solo" ON public.sessions
  FOR DELETE USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_delete_team" ON public.sessions
  FOR DELETE USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
  );
```

---

### 4B. `session_stats`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can insert own session stats" ON public.session_stats;
DROP POLICY IF EXISTS "Users can view own session stats" ON public.session_stats;
DROP POLICY IF EXISTS "Users can update own session stats" ON public.session_stats;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.session_stats
  FOR SELECT USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_select_team" ON public.session_stats
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.session_stats
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "scope_insert_team" ON public.session_stats
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_team_member(team_id)
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.session_stats
  FOR UPDATE
  USING (scope_type = 'solo' AND user_id = auth.uid())
  WITH CHECK (scope_type = 'solo' AND user_id = auth.uid());

CREATE POLICY "scope_update_team" ON public.session_stats
  FOR UPDATE
  USING (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid());
```

**DELETE**: Cascaded from sessions. No policy needed.

---

### 4C. `session_participants`

**Drop old policies**: Verify in dashboard. No named CRUD policies found in baseline for this table.

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.session_participants
  FOR SELECT USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_select_team" ON public.session_participants
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.session_participants
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "scope_insert_team" ON public.session_participants
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.session_participants
  FOR UPDATE
  USING (scope_type = 'solo' AND user_id = auth.uid())
  WITH CHECK (scope_type = 'solo' AND user_id = auth.uid());

CREATE POLICY "scope_update_team" ON public.session_participants
  FOR UPDATE
  USING (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid());
```

**DELETE**: Cascaded from sessions.

---

### 4D. `engagements`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can create engagements for their sessions" ON public.engagements;
DROP POLICY IF EXISTS "Users can view engagements" ON public.engagements;
DROP POLICY IF EXISTS "Users can update engagements" ON public.engagements;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.engagements
  FOR SELECT USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = engagements.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_select_team" ON public.engagements
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.engagements
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = engagements.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_insert_team" ON public.engagements
  FOR INSERT WITH CHECK (
    scope_type = 'team' AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = engagements.session_id AND s.user_id = auth.uid()
    )
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.engagements
  FOR UPDATE
  USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = engagements.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'solo' AND team_id IS NULL);

CREATE POLICY "scope_update_team" ON public.engagements
  FOR UPDATE
  USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = engagements.session_id AND s.user_id = auth.uid()
      )
      OR public.is_team_admin(team_id)
    )
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**: Cascaded from sessions.

---

### 4E. `engagement_participants`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Engagement owner can add participants" ON public.engagement_participants;
DROP POLICY IF EXISTS "Engagement owner can delete participants" ON public.engagement_participants;
DROP POLICY IF EXISTS "Engagement owner can update participants" ON public.engagement_participants;
DROP POLICY IF EXISTS "Users can view engagement participants" ON public.engagement_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.engagement_participants;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.engagement_participants
  FOR SELECT USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_select_team" ON public.engagement_participants
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.engagement_participants
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "scope_insert_team" ON public.engagement_participants
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**UPDATE**:

```sql
-- Own record (any scope)
CREATE POLICY "scope_update_own" ON public.engagement_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team: session owner can update any participant
CREATE POLICY "scope_update_team_owner" ON public.engagement_participants
  FOR UPDATE
  USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.engagements e
      JOIN public.sessions s ON s.id = e.session_id
      WHERE e.id = engagement_participants.engagement_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**:

```sql
CREATE POLICY "scope_delete_solo" ON public.engagement_participants
  FOR DELETE USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.engagements e
      JOIN public.sessions s ON s.id = e.session_id
      WHERE e.id = engagement_participants.engagement_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_delete_team" ON public.engagement_participants
  FOR DELETE USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.engagements e
      JOIN public.sessions s ON s.id = e.session_id
      WHERE e.id = engagement_participants.engagement_id
        AND s.user_id = auth.uid()
    )
  );
```

---

### 4F. `session_targets`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can insert targets for own sessions" ON public.session_targets;
DROP POLICY IF EXISTS "Users can view targets from own sessions" ON public.session_targets;
DROP POLICY IF EXISTS "Commanders can view targets from team trainings" ON public.session_targets;
DROP POLICY IF EXISTS "session_targets_insert_policy" ON public.session_targets;
DROP POLICY IF EXISTS "session_targets_select_policy" ON public.session_targets;
DROP POLICY IF EXISTS "session_targets_update_policy" ON public.session_targets;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.session_targets
  FOR SELECT USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_targets.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_select_team" ON public.session_targets
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.session_targets
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_targets.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_insert_team" ON public.session_targets
  FOR INSERT WITH CHECK (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_targets.session_id AND s.user_id = auth.uid()
    )
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.session_targets
  FOR UPDATE
  USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_targets.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'solo' AND team_id IS NULL);

CREATE POLICY "scope_update_team" ON public.session_targets
  FOR UPDATE
  USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_targets.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**: Cascaded from sessions.

---

### 4G. `paper_target_results`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can insert paper results for own session targets" ON public.paper_target_results;
DROP POLICY IF EXISTS "Users can view paper results from own sessions" ON public.paper_target_results;
DROP POLICY IF EXISTS "Users can update paper results from own sessions" ON public.paper_target_results;
DROP POLICY IF EXISTS "Commanders can view paper results from team trainings" ON public.paper_target_results;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.paper_target_results
  FOR SELECT USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = paper_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_select_team" ON public.paper_target_results
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.paper_target_results
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = paper_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_insert_team" ON public.paper_target_results
  FOR INSERT WITH CHECK (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = paper_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.paper_target_results
  FOR UPDATE
  USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = paper_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'solo' AND team_id IS NULL);

CREATE POLICY "scope_update_team" ON public.paper_target_results
  FOR UPDATE
  USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = paper_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**: Cascaded from session_targets.

---

### 4H. `tactical_target_results`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can insert tactical results for own session targets" ON public.tactical_target_results;
DROP POLICY IF EXISTS "Users can view tactical results from own sessions" ON public.tactical_target_results;
DROP POLICY IF EXISTS "Users can update tactical results from own sessions" ON public.tactical_target_results;
DROP POLICY IF EXISTS "Commanders can view tactical results from team trainings" ON public.tactical_target_results;
DROP POLICY IF EXISTS "tactical_target_results_insert_policy" ON public.tactical_target_results;
DROP POLICY IF EXISTS "tactical_target_results_select_policy" ON public.tactical_target_results;
DROP POLICY IF EXISTS "tactical_target_results_update_policy" ON public.tactical_target_results;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.tactical_target_results
  FOR SELECT USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = tactical_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_select_team" ON public.tactical_target_results
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.tactical_target_results
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = tactical_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "scope_insert_team" ON public.tactical_target_results
  FOR INSERT WITH CHECK (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = tactical_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.tactical_target_results
  FOR UPDATE
  USING (
    scope_type = 'solo'
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = tactical_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'solo' AND team_id IS NULL);

CREATE POLICY "scope_update_team" ON public.tactical_target_results
  FOR UPDATE
  USING (
    scope_type = 'team' AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_targets st
      JOIN public.sessions s ON s.id = st.session_id
      WHERE st.id = tactical_target_results.session_target_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**: Cascaded from session_targets.

---

### 4I. `trainings`

Trainings are TEAM ONLY. No solo policies.

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Commanders can create trainings" ON public.trainings;
DROP POLICY IF EXISTS "Owners and commanders can create trainings" ON public.trainings;
DROP POLICY IF EXISTS "Owners and commanders can update trainings" ON public.trainings;
DROP POLICY IF EXISTS "Owners and commanders can delete trainings" ON public.trainings;
DROP POLICY IF EXISTS "Owners can delete trainings" ON public.trainings;
DROP POLICY IF EXISTS "Users can view team trainings" ON public.trainings;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_team" ON public.trainings
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_team" ON public.trainings
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND created_by = auth.uid()
    AND public.is_team_admin(team_id)
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_team" ON public.trainings
  FOR UPDATE
  USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_admin(team_id)
  )
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL);
```

**DELETE**:

```sql
CREATE POLICY "scope_delete_team" ON public.trainings
  FOR DELETE USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND (created_by = auth.uid() OR public.is_team_admin(team_id))
  );
```

---

### 4J. `session_features`

**Drop old policies**:

```sql
DROP POLICY IF EXISTS "Users can view own session features" ON public.session_features;
DROP POLICY IF EXISTS "Users can insert own session features" ON public.session_features;
DROP POLICY IF EXISTS "Users can update own session features" ON public.session_features;
DROP POLICY IF EXISTS "Users can delete own session features" ON public.session_features;
```

**SELECT**:

```sql
CREATE POLICY "scope_select_solo" ON public.session_features
  FOR SELECT USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_select_team" ON public.session_features
  FOR SELECT USING (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND public.is_team_member(team_id)
  );
```

**INSERT**:

```sql
CREATE POLICY "scope_insert_solo" ON public.session_features
  FOR INSERT WITH CHECK (
    scope_type = 'solo' AND team_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "scope_insert_team" ON public.session_features
  FOR INSERT WITH CHECK (
    scope_type = 'team'
    AND team_id IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_team_member(team_id)
  );
```

**UPDATE**:

```sql
CREATE POLICY "scope_update_solo" ON public.session_features
  FOR UPDATE
  USING (scope_type = 'solo' AND user_id = auth.uid())
  WITH CHECK (scope_type = 'solo' AND user_id = auth.uid());

CREATE POLICY "scope_update_team" ON public.session_features
  FOR UPDATE
  USING (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid());
```

**DELETE**:

```sql
CREATE POLICY "scope_delete_solo" ON public.session_features
  FOR DELETE USING (
    scope_type = 'solo' AND user_id = auth.uid()
  );

CREATE POLICY "scope_delete_team" ON public.session_features
  FOR DELETE USING (
    scope_type = 'team' AND team_id IS NOT NULL AND user_id = auth.uid()
  );
```

---

## 5. Enforcement Step (Do Last)

### 5.1 Validate constraints

Convert NOT VALID constraints to VALID (scans all rows):

```sql
ALTER TABLE public.sessions VALIDATE CONSTRAINT sessions_scope_check;
ALTER TABLE public.trainings VALIDATE CONSTRAINT trainings_scope_check;
ALTER TABLE public.session_features VALIDATE CONSTRAINT session_features_scope_check;
ALTER TABLE public.session_stats VALIDATE CONSTRAINT session_stats_scope_check;
ALTER TABLE public.session_participants VALIDATE CONSTRAINT session_participants_scope_check;
ALTER TABLE public.engagements VALIDATE CONSTRAINT engagements_scope_check;
ALTER TABLE public.session_targets VALIDATE CONSTRAINT session_targets_scope_check;
ALTER TABLE public.engagement_participants VALIDATE CONSTRAINT engagement_participants_scope_check;
ALTER TABLE public.paper_target_results VALIDATE CONSTRAINT paper_target_results_scope_check;
ALTER TABLE public.tactical_target_results VALIDATE CONSTRAINT tactical_target_results_scope_check;
```

If any VALIDATE fails, investigate:

```sql
SELECT * FROM public.<table>
WHERE NOT (
  (scope_type = 'solo' AND team_id IS NULL)
  OR (scope_type = 'team' AND team_id IS NOT NULL)
)
LIMIT 10;
```

### 5.2 Remove shadow policies

```sql
DROP POLICY IF EXISTS "shadow_allow_all" ON public.sessions;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_stats;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_participants;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.engagements;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.engagement_participants;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_targets;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.paper_target_results;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.tactical_target_results;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.trainings;
DROP POLICY IF EXISTS "shadow_allow_all" ON public.session_features;
```

### 5.3 FORCE RLS (optional, not recommended yet)

```sql
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_stats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.engagements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.paper_target_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_target_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trainings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_features FORCE ROW LEVEL SECURITY;
```

**Warning**: FORCE RLS affects SECURITY DEFINER functions (`auto_close_training_if_complete`, `create_session`, `auto_start_trainings`). Do not enable until those functions are verified or have explicit policies for the postgres role.

### Emergency revert (30 seconds)

Paste this block into SQL Editor to restore all access immediately:

```sql
CREATE POLICY "shadow_allow_all" ON public.sessions AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.session_stats AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.session_participants AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.engagements AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.engagement_participants AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.session_targets AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.paper_target_results AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.tactical_target_results AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.trainings AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shadow_allow_all" ON public.session_features AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
```

### Full nuclear revert (drop all scope work)

```sql
-- 1. Drop all scope_ policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'scope_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 2. Drop all shadow policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'shadow_allow_all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. Drop constraints, columns, indexes (TIER 3 first, then 2, then 1)

-- TIER 3
ALTER TABLE public.paper_target_results DROP CONSTRAINT IF EXISTS paper_target_results_scope_check;
ALTER TABLE public.paper_target_results DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.paper_target_results DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_paper_target_results_team_id;

ALTER TABLE public.tactical_target_results DROP CONSTRAINT IF EXISTS tactical_target_results_scope_check;
ALTER TABLE public.tactical_target_results DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.tactical_target_results DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_tactical_target_results_team_id;

-- TIER 2
ALTER TABLE public.session_stats DROP CONSTRAINT IF EXISTS session_stats_scope_check;
ALTER TABLE public.session_stats DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_stats DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_session_stats_team_id;

ALTER TABLE public.session_participants DROP CONSTRAINT IF EXISTS session_participants_scope_check;
ALTER TABLE public.session_participants DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_participants DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_session_participants_team_id;

ALTER TABLE public.engagements DROP CONSTRAINT IF EXISTS engagements_scope_check;
ALTER TABLE public.engagements DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.engagements DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_engagements_team_id;

ALTER TABLE public.session_targets DROP CONSTRAINT IF EXISTS session_targets_scope_check;
ALTER TABLE public.session_targets DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.session_targets DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_session_targets_team_id;

ALTER TABLE public.engagement_participants DROP CONSTRAINT IF EXISTS engagement_participants_scope_check;
ALTER TABLE public.engagement_participants DROP COLUMN IF EXISTS scope_type;
ALTER TABLE public.engagement_participants DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS public.idx_engagement_participants_team_id;

-- TIER 1
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_scope_check;
ALTER TABLE public.sessions ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS scope_type;

ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_scope_check;
ALTER TABLE public.trainings ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.trainings ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.trainings DROP COLUMN IF EXISTS scope_type;

ALTER TABLE public.session_features DROP CONSTRAINT IF EXISTS session_features_scope_check;
ALTER TABLE public.session_features ALTER COLUMN scope_type DROP NOT NULL;
ALTER TABLE public.session_features ALTER COLUMN scope_type DROP DEFAULT;
ALTER TABLE public.session_features DROP COLUMN IF EXISTS scope_type;
```

After nuclear revert, re-create old policies from `baseline.sql` lines 4861-5466.

---

## 6. Final Safety Checklist

### Operations that MUST FAIL

| # | Operation | Reason |
|---|-----------|--------|
| 1 | User B SELECTs user A's solo session | scope_type='solo', B is not owner |
| 2 | User C (non-member) SELECTs team T1 session | C not in team_members for T1 |
| 3 | INSERT session with scope_type='solo' AND team_id = (UUID) | CHECK constraint violation |
| 4 | INSERT session with scope_type='team' AND team_id IS NULL | CHECK constraint violation |
| 5 | Non-member INSERTs team session for T1 | RLS INSERT rejects non-member |
| 6 | Non-admin UPDATEs training for T1 | is_team_admin returns false |
| 7 | INSERT session_stats with scope_type='team' AND team_id IS NULL | CHECK constraint violation |

### Operations that MUST SUCCEED

| # | Operation | Reason |
|---|-----------|--------|
| 1 | User A SELECTs own solo sessions | scope_type='solo', user_id = auth.uid() |
| 2 | Team T1 member SELECTs T1 sessions | scope_type='team', is_team_member returns true |
| 3 | User A INSERTs solo session with team_id NULL | Correct scope, user owns it |
| 4 | Team T1 member INSERTs team session for T1 | Correct scope, member verified |
| 5 | Team T1 member SELECTs T1 trainings | is_team_member returns true |
| 6 | T1 commander UPDATEs T1 training | is_team_admin returns true |
| 7 | User A SELECTs own solo session_stats | scope_type='solo', user_id = auth.uid() |
| 8 | Team T1 member SELECTs T1 session_stats | scope_type='team', is_team_member returns true |

### Verification queries

```sql
-- Constraint violation test (must error)
INSERT INTO public.sessions (user_id, scope_type, team_id, session_mode)
VALUES (auth.uid(), 'solo', gen_random_uuid(), 'solo');
-- Expected: ERROR violates check constraint "sessions_scope_check"

INSERT INTO public.sessions (user_id, scope_type, team_id, session_mode)
VALUES (auth.uid(), 'team', NULL, 'solo');
-- Expected: ERROR violates check constraint "sessions_scope_check"
```

### Scope consistency check (run periodically)

Verify child table scope matches parent:

```sql
SELECT 'session_stats' AS tbl, ss.id, ss.scope_type AS child_scope, s.scope_type AS parent_scope
FROM public.session_stats ss
JOIN public.sessions s ON s.id = ss.session_id
WHERE ss.scope_type != s.scope_type
   OR ss.team_id IS DISTINCT FROM s.team_id

UNION ALL

SELECT 'engagements', e.id, e.scope_type, s.scope_type
FROM public.engagements e
JOIN public.sessions s ON s.id = e.session_id
WHERE e.scope_type != s.scope_type
   OR e.team_id IS DISTINCT FROM s.team_id

UNION ALL

SELECT 'session_targets', st.id, st.scope_type, s.scope_type
FROM public.session_targets st
JOIN public.sessions s ON s.id = st.session_id
WHERE st.scope_type != s.scope_type
   OR st.team_id IS DISTINCT FROM s.team_id

UNION ALL

SELECT 'session_participants', sp.id, sp.scope_type, s.scope_type
FROM public.session_participants sp
JOIN public.sessions s ON s.id = sp.session_id
WHERE sp.scope_type != s.scope_type
   OR sp.team_id IS DISTINCT FROM s.team_id;
```

Expected: 0 rows.

---

## Tables Not Covered (follow-up pass)

These tables have RLS but were not migrated in this document. They follow the same patterns:

- `session_timelines` -- same as session_targets (child of sessions)
- `session_insights` -- same as session_stats (has user_id + session_id)
- `session_standards_verdicts` -- same as session_stats (child of sessions)
- `user_drill_completions` -- references trainings (team) and sessions (mixed)
- `drill_templates` -- has existing `owner_type`/`owner_id` scope system
- `training_drills` -- child of trainings, always team-scoped
