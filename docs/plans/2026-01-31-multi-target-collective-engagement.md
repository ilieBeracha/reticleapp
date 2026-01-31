# Multi-Target Engagement + Collective Squad Results

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-target engagement support (target_count > 1 with per-target results) and collective measurement scope (squad records shared totals instead of per-user) to the engagement system.

**Architecture:** Additive DB migration adds `target_results` JSONB column to `engagement_participants` and `measurement_scope` + `target_count` to `training_drills`. Service layer computes aggregate totals from per-target results. UI changes are scoped to AddDrillStep (config), SquadSessionView (entry), and trainingDetail (display).

**Tech Stack:** React Native / Expo Router, Supabase (PostgreSQL), TypeScript, i18next

---

## Pre-Implementation: Key Decisions

### Terminology
- **Canonical field name:** `shots_fired` (already exists in DB)
- **UI label:** "Rounds" (consistent with existing `rounds_per_shooter`)
- **Rule:** `shots_fired` = total shots across all targets; accuracy = hits / shots_fired

### Measurement Scope
- **`individual`** (default): Each participant records their own shots + hits
- **`collective`**: One shared result for the whole squad (stored on commander's participant row with `details.measurement_scope = 'collective'`)

### Multi-Target
- `target_count` stored on `training_drills` (commander config)
- Per-target results stored as JSONB array on `engagement_participants.target_results`
- Aggregate `shots_fired` / `hits` columns always kept in sync

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260131000000_add_multi_target_and_scope.sql`

**Step 1: Write the migration SQL**

```sql
-- Multi-target engagement + collective measurement scope
-- Backward compatible: all new columns are nullable with defaults

-- 1. Add target_results JSONB to engagement_participants
-- Shape: [{"target_number": 1, "shots_fired": 10, "hits": 8}, ...]
ALTER TABLE public.engagement_participants
  ADD COLUMN IF NOT EXISTS target_results jsonb DEFAULT NULL;

-- 2. Add measurement_scope to training_drills
-- 'individual' = each participant records own results (default)
-- 'collective' = squad records one shared result
ALTER TABLE public.training_drills
  ADD COLUMN IF NOT EXISTS measurement_scope text DEFAULT NULL;

-- 3. Ensure target_count exists on training_drills (may already exist)
-- Used for multi-target drills (default 1)
-- Column already exists in schema, this is a safety check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'training_drills'
    AND column_name = 'target_count'
  ) THEN
    ALTER TABLE public.training_drills ADD COLUMN target_count integer DEFAULT NULL;
  END IF;
END $$;

-- 4. Add comment for documentation
COMMENT ON COLUMN public.engagement_participants.target_results IS
  'Per-target results as JSONB array: [{"target_number": 1, "shots_fired": N, "hits": N}]. NULL when target_count=1.';
COMMENT ON COLUMN public.training_drills.measurement_scope IS
  'Measurement scope: individual (per-person results) or collective (shared squad results). NULL defaults to individual.';
```

**Step 2: Run the migration**

Run: `npx supabase db push` or `npx supabase migration up`
Expected: Migration applies cleanly, no errors

**Step 3: Commit**

```bash
git add supabase/migrations/20260131000000_add_multi_target_and_scope.sql
git commit -m "feat: add multi-target and measurement scope migration"
```

---

## Task 2: Type Definitions

**Files:**
- Modify: `types/session.ts` (add TargetResultEntry, MeasurementScope, update EngagementParticipant)
- Modify: `types/workspace.ts` (add measurement_scope to TrainingDrill)
- Modify: `services/drills/drillService.ts` (add measurement_scope to DrillConfig, TrainingDrillItem)

**Step 1: Add new types to `types/session.ts`**

Add after `export type EngagementRole = 'shooter' | 'spotter';` (line 85):

```typescript
/** Per-target result entry for multi-target engagements */
export interface TargetResultEntry {
  target_number: number;
  shots_fired: number;
  hits: number;
}

/** Measurement scope: who owns the results */
export type MeasurementScope = 'individual' | 'collective';
```

**Step 2: Update EngagementParticipant in `types/session.ts`**

Add after `hits?: number | null;` (line 106):

```typescript
  /** Per-target results for multi-target engagements. NULL when target_count=1 */
  target_results?: TargetResultEntry[] | null;
```

**Step 3: Add measurement_scope to TrainingDrill in `types/workspace.ts`**

Add after `engagement_mode?: 'solo' | 'squad' | null;` (line 228):

```typescript
  /** Measurement scope for engagement drills:
   * 'individual' = each participant records own results (default)
   * 'collective' = squad records one shared result */
  measurement_scope?: 'individual' | 'collective' | null;
```

**Step 4: Update DrillConfig in `services/drills/drillService.ts`**

Add to `DrillConfig` interface (after `strings_count: number;` line 81):

```typescript
  /** Number of targets (default 1, only for engagement drills) */
  target_count?: number | null;
  /** Measurement scope: individual or collective */
  measurement_scope?: 'individual' | 'collective' | null;
```

**Step 5: Update TrainingDrillItem in `services/drills/drillService.ts`**

No changes needed - TrainingDrillItem uses `DrillConfig` which now includes target_count and measurement_scope.

**Step 6: Commit**

```bash
git add types/session.ts types/workspace.ts services/drills/drillService.ts
git commit -m "feat: add multi-target and measurement scope types"
```

---

## Task 3: Select Clauses Update

**Files:**
- Modify: `services/session/selectClauses.ts`

**Step 1: Add `target_results` to all engagement_participants subselects**

In `SESSION_SELECT_WITH_WEAPON`, `SESSION_SELECT_MINIMAL`, `SESSION_SELECT_WITH_FULL_DRILL`: find every `engagement_participants(` block and add `target_results` after `hits`.

Before:
```
engagement_participants(
  id,
  user_id,
  state,
  role,
  shots_fired,
  hits
)
```

After:
```
engagement_participants(
  id,
  user_id,
  state,
  role,
  shots_fired,
  hits,
  target_results
)
```

Also add `measurement_scope` to the `training_drills:drill_id(...)` selects where the fields are explicitly listed (not the `(*)` wildcard ones). In `SESSION_SELECT_WITH_WEAPON` and `SESSION_SELECT_MINIMAL`, add `measurement_scope` to the training_drills field list. In `SESSION_SELECT_WITH_FULL_DRILL`, add it to the explicit list too.

**Step 2: Commit**

```bash
git add services/session/selectClauses.ts
git commit -m "feat: add target_results and measurement_scope to select clauses"
```

---

## Task 4: Participants Service - Multi-Target Results Writer

**Files:**
- Modify: `services/session/participants.ts`

**Step 1: Import new types**

Update the import from `@/types/session` to include:
```typescript
import type {
  Engagement,
  EngagementMode,
  EngagementParticipant,
  EngagementRole,
  EngagementStatus,
  MeasurementScope,
  ParticipantState,
  TargetResultEntry,
} from '@/types/session';
```

**Step 2: Add `computeAggregateTotals` helper**

Add after the existing `calculateGroupTotals` function (after line 593):

```typescript
/**
 * Compute aggregate totals from per-target results.
 * Used when target_count > 1 to derive shots_fired and hits from target_results.
 */
export function computeAggregateTotals(targetResults: TargetResultEntry[]): {
  shots_fired: number;
  hits: number;
} {
  return targetResults.reduce(
    (acc, t) => ({
      shots_fired: acc.shots_fired + (t.shots_fired || 0),
      hits: acc.hits + (t.hits || 0),
    }),
    { shots_fired: 0, hits: 0 }
  );
}
```

**Step 3: Add `updateEngagementResults` function**

Add after the new `computeAggregateTotals`:

```typescript
/**
 * Update engagement results for a participant.
 * Handles both single-target and multi-target scenarios.
 *
 * Rules:
 * - If targetCount > 1: require targetResults, compute aggregates
 * - If targetCount === 1: use shotsFired + hits directly, target_results = null
 * - For collective scope: results go on the commander's participant row
 */
export async function updateEngagementResults(params: {
  engagementId: string;
  userId: string;
  targetCount: number;
  targetResults?: TargetResultEntry[] | null;
  shotsFired?: number;
  hits?: number;
}): Promise<EngagementParticipant> {
  const { engagementId, userId, targetCount, targetResults, shotsFired, hits } = params;

  let finalShotsFired: number;
  let finalHits: number;
  let finalTargetResults: TargetResultEntry[] | null = null;

  if (targetCount > 1 && targetResults && targetResults.length > 0) {
    // Multi-target: compute aggregates from per-target results
    const aggregates = computeAggregateTotals(targetResults);
    finalShotsFired = aggregates.shots_fired;
    finalHits = aggregates.hits;
    finalTargetResults = targetResults;
  } else {
    // Single-target: use direct values
    finalShotsFired = shotsFired ?? 0;
    finalHits = hits ?? 0;
    finalTargetResults = null;
  }

  const { data, error } = await supabase
    .from('engagement_participants')
    .update({
      shots_fired: finalShotsFired,
      hits: finalHits,
      target_results: finalTargetResults,
    })
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .single();

  if (error) throw error;

  // Get profile for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}
```

**Step 4: Update `getEngagementParticipants` to include `target_results`**

In the `.select()` call (line 180), add `target_results`:

Before:
```typescript
.select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits')
```

After:
```typescript
.select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
```

And in the return mapping (around line 204), add:
```typescript
target_results: row.target_results || null,
```

**Step 5: Update `addParticipant` to include `target_results` in select and reset**

In the re-invitation update (line 330-337), add `target_results: null` to the update payload.
In both `.select()` calls (lines 339, 353), add `target_results`.
In the return mapping, add `target_results: data.target_results || null`.

**Step 6: Update remaining participant mutation functions**

In `updateParticipantState`, `updateParticipantRole`, `updateParticipantResults` - add `target_results` to their `.select()` calls and return mappings.

**Step 7: Commit**

```bash
git add services/session/participants.ts
git commit -m "feat: add multi-target results writer and update participant selects"
```

---

## Task 5: Training Service - Persist New Drill Fields

**Files:**
- Modify: `services/trainingService.ts` (the function that builds drill insert payloads)

**Step 1: Find `buildDrillInsertPayload` or equivalent**

Search for where `training_drills` are inserted. Add `measurement_scope` and `target_count` to the insert payload.

Add to the drill insert object:
```typescript
measurement_scope: drill.measurement_scope || null,
target_count: drill.target_count || null,
```

Also update the `updateTrainingDrill` function to pass these fields through.

**Step 2: Commit**

```bash
git add services/trainingService.ts
git commit -m "feat: persist measurement_scope and target_count in training drills"
```

---

## Task 6: AddDrillStep - Squad Configuration Fix

**Files:**
- Modify: `components/training/create/steps/AddDrillStep.tsx`

This is the biggest UI change. Currently squad mode shows only distance. We need to:
1. Rename Mode labels to "Individual" / "Collective"
2. Show full configuration for squad (not just distance)
3. Add target_count selector for engagement drills
4. Include measurement_scope and target_count in submitted drill config

**Step 1: Add state for target count**

After `const [executionCount, setExecutionCount] = useState(1);` (line 247), add:
```typescript
const [targetCount, setTargetCount] = useState(1);
```

**Step 2: Rename engagement mode labels**

Change the mode toggle labels. Replace `t('training.solo')` with `t('training.individual')` and `t('training.squadType')` with `t('training.collective')` in the mode selector buttons (lines 492-509).

Note: Add i18n keys `training.individual` = "Individual" and `training.collective` = "Collective" (or use hardcoded strings initially if i18n not set up for these).

**Step 3: Remove squad distance-only constraint**

Replace the entire `{effectiveEngagementMode === 'squad' && (` section (lines 663-731) with the same `SessionContextStep` used for solo mode. This means squad now gets the full configuration form.

Replace lines 663-731 with:
```tsx
{effectiveEngagementMode === 'squad' && executionPolicy !== 'free' && (
  <View style={styles.formSection}>
    <Text style={[styles.formSectionLabel, { color: colors.textMuted }]}>
      {t('training.configuration', 'CONFIGURATION')}
    </Text>
    <View style={[styles.formSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.squadNotice, { backgroundColor: colors.primary + '10' }]}>
        <Users size={18} color={colors.primary} />
        <View style={styles.freeNoticeText}>
          <Text style={[styles.freeNoticeTitle, { color: colors.text }]}>{t('training.collectiveSession')}</Text>
          <Text style={[styles.freeNoticeDesc, { color: colors.textMuted }]}>
            {t('training.collectiveSessionDescription')}
          </Text>
        </View>
      </View>
      <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
      <SessionContextStep
        purpose={purpose}
        context={context}
        onUpdateContext={handleUpdateContext}
        onBack={() => {}}
        hideWeaponSection
        showRangeCategory
      />
    </View>
  </View>
)}
```

**Step 4: Add target count selector for engagement drills**

After the Configuration section and before the Execution Count section, add a new section (only visible when `purpose === 'engagement'`):

```tsx
{purpose === 'engagement' && (
  <View style={styles.formSection}>
    <Text style={[styles.formSectionLabel, { color: colors.textMuted }]}>
      {t('training.targets', 'TARGETS')}
    </Text>
    <View style={[styles.formSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.executionHeader}>
        <Target size={16} color={colors.textMuted} />
        <Text style={[styles.executionHintText, { color: colors.textMuted }]}>
          {t('training.howManyTargets', 'How many targets per drill?')}
        </Text>
      </View>
      <View style={[styles.executionRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.executionBtn, { opacity: targetCount <= 1 ? 0.3 : 1 }]}
          onPress={() => {
            if (targetCount > 1) {
              Haptics.selectionAsync();
              setTargetCount((c) => c - 1);
            }
          }}
          disabled={targetCount <= 1}
        >
          <Minus size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.executionValue}>
          <Text style={[styles.executionNumber, { color: colors.text }]}>{targetCount}</Text>
          <Text style={[styles.executionLabel, { color: colors.textMuted }]}>
            {targetCount === 1 ? t('training.target', 'target') : t('training.targetsPlural', 'targets')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.executionBtn, { opacity: targetCount >= 5 ? 0.3 : 1 }]}
          onPress={() => {
            if (targetCount < 5) {
              Haptics.selectionAsync();
              setTargetCount((c) => c + 1);
            }
          }}
          disabled={targetCount >= 5}
        >
          <Plus size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
```

**Step 5: Update handleSubmit to include new fields**

In `handleSubmit` (line 302), update the `newSession` object's `config` to include:
```typescript
config: {
  distance_m: hasDistanceCategory ? null : hasDistance ? context.distance : null,
  distance_category: hasDistanceCategory ? effectiveDistanceCategory : null,
  rounds: hasRounds ? context.shotsPlanned : null,
  time_limit_seconds: context.timeLimit,
  position: mapPosition(context.position),
  strings_count: 1,
  target_count: purpose === 'engagement' ? targetCount : null,
  measurement_scope: effectiveEngagementMode === 'squad' ? 'collective' : 'individual',
},
```

**Step 6: Reset targetCount on close/submit**

Add `setTargetCount(1);` to `handleClose` and `handleSubmit` reset blocks.

**Step 7: Update handlePurposeSelect**

When switching to grouping, reset target count:
```typescript
if (p === 'grouping') {
  setEngagementMode('solo');
  setTargetCount(1);
}
```

**Step 8: Commit**

```bash
git add components/training/create/steps/AddDrillStep.tsx
git commit -m "feat: add target count selector and full squad config in AddDrillStep"
```

---

## Task 7: SquadSessionView - Individual vs Collective + Multi-Target Entry

**Files:**
- Modify: `components/session/activeSession/SquadSessionView.tsx`

**Step 1: Update props to include drill config with new fields**

Update the `session` prop's `drill_config` type:
```typescript
drill_config?: {
  drill_goal?: string;
  distance_m?: number;
  rounds_per_shooter?: number;
  target_count?: number | null;
  measurement_scope?: string | null;
} | null;
```

**Step 2: Add state for multi-target entry**

Add after existing state declarations:
```typescript
const [targetResults, setTargetResults] = useState<Array<{ target_number: number; shots_fired: number; hits: number }>>([]);
```

**Step 3: Derive measurement scope and target count**

After the existing computed values section:
```typescript
const measurementScope = session.drill_config?.measurement_scope || 'individual';
const isCollective = measurementScope === 'collective';
const targetCount = session.drill_config?.target_count || 1;
const isMultiTarget = targetCount > 1;
```

**Step 4: Update results entry sheet for multi-target**

When `isMultiTarget` is true, the shots entry modal should show per-target inputs instead of a single counter. Replace the shots counter section inside the results sheet Modal with:

```tsx
{/* Counter Section */}
{isMultiTarget ? (
  // Multi-target: per-target shots + hits entry
  <View style={styles.counterSection}>
    <Text style={[styles.counterLabel, { color: colors.textMuted }]}>
      {t('session.perTargetResults', 'PER-TARGET RESULTS')}
    </Text>
    {Array.from({ length: targetCount }, (_, i) => i + 1).map((targetNum) => {
      const tr = targetResults.find((r) => r.target_number === targetNum) || {
        target_number: targetNum,
        shots_fired: 0,
        hits: 0,
      };
      return (
        <View key={targetNum} style={[styles.targetResultRow, { backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginBottom: 8 }]}>
          <Text style={[styles.targetLabel, { color: colors.text, fontWeight: '600', marginBottom: 8 }]}>
            {t('session.targetNumber', { number: targetNum })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }]}>
                {t('session.shotsFired')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTargetResults((prev) => {
                      const updated = [...prev];
                      const idx = updated.findIndex((r) => r.target_number === targetNum);
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], shots_fired: Math.max(0, updated[idx].shots_fired - 1) };
                      }
                      return updated;
                    });
                  }}
                >
                  <Minus size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={[{ color: colors.text, fontSize: 20, fontWeight: '700', minWidth: 30, textAlign: 'center' }]}>
                  {tr.shots_fired}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTargetResults((prev) => {
                      const updated = [...prev];
                      const idx = updated.findIndex((r) => r.target_number === targetNum);
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], shots_fired: updated[idx].shots_fired + 1 };
                      } else {
                        updated.push({ target_number: targetNum, shots_fired: 1, hits: 0 });
                      }
                      return updated;
                    });
                  }}
                >
                  <Plus size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }]}>
                {t('session.hits')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTargetResults((prev) => {
                      const updated = [...prev];
                      const idx = updated.findIndex((r) => r.target_number === targetNum);
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], hits: Math.max(0, updated[idx].hits - 1) };
                      }
                      return updated;
                    });
                  }}
                >
                  <Minus size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={[{ color: colors.green, fontSize: 20, fontWeight: '700', minWidth: 30, textAlign: 'center' }]}>
                  {tr.hits}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTargetResults((prev) => {
                      const updated = [...prev];
                      const idx = updated.findIndex((r) => r.target_number === targetNum);
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], hits: Math.min(updated[idx].shots_fired, updated[idx].hits + 1) };
                      } else {
                        updated.push({ target_number: targetNum, shots_fired: 0, hits: 1 });
                      }
                      return updated;
                    });
                  }}
                >
                  <Plus size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    })}
  </View>
) : (
  // Single-target: existing counter UI (unchanged)
  <View style={styles.counterSection}>
    {/* ... existing shots counter code ... */}
  </View>
)}
```

**Step 5: Initialize targetResults when opening sheet**

In `handleOpenResultsSheet`:
```typescript
const handleOpenResultsSheet = () => {
  setShotCount(myParticipant?.shots_fired || 0);
  // Initialize per-target results
  if (isMultiTarget) {
    const existing = myParticipant?.target_results;
    if (existing && Array.isArray(existing)) {
      setTargetResults(existing);
    } else {
      setTargetResults(
        Array.from({ length: targetCount }, (_, i) => ({
          target_number: i + 1,
          shots_fired: 0,
          hits: 0,
        }))
      );
    }
  }
  setShowResultsSheet(true);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
```

**Step 6: Update handleSaveResults to use new service method**

Import the new function:
```typescript
import { calculateGroupTotals, updateEngagementResults, updateParticipantResults, updateParticipantState } from '@/services/session/participants';
```

Update `handleSaveResults`:
```typescript
const handleSaveResults = async () => {
  if (!currentUserId || !engagementId) return;

  setSaving(true);
  try {
    if (isMultiTarget) {
      await updateEngagementResults({
        engagementId,
        userId: currentUserId,
        targetCount,
        targetResults,
      });
    } else {
      await updateEngagementResults({
        engagementId,
        userId: currentUserId,
        targetCount: 1,
        shotsFired: shotCount,
        hits: 0, // Hits entered separately by commander
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowResultsSheet(false);
    onRefresh();
  } catch (error) {
    console.error('[SquadSessionView] Failed to save:', error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Error', 'Failed to save results. Please try again.');
  } finally {
    setSaving(false);
  }
};
```

**Step 7: Update collective scope behavior**

For collective scope, change the UI labels:
- Section title: "Squad Results" instead of "My Results"
- Button: "Enter Squad Results" instead of "Enter Your Shots"
- Only one person (commander) enters results

```typescript
// Near the "My Results" / "Enter Shots" sections, wrap in scope check:
const showMyResults = !isCollective || isCommander;
const resultsLabel = isCollective ? t('session.squadResults') : t('session.yourShots');
const enterLabel = isCollective ? t('session.enterSquadResults') : t('session.enterYourShots');
```

For collective scope, hide the per-user "Enter Your Shots" button for non-commanders:
```typescript
{!isViewOnly && !hasSubmitted && showMyResults && myParticipant?.role === 'shooter' && (
  // ... existing add results card, but with enterLabel
)}
```

**Step 8: For collective + multi-target: combine shots and hits entry**

When `isCollective && isMultiTarget`, the commander enters per-target shots AND hits in one sheet (not the two-step flow). The multi-target entry already includes both shots and hits per target, so this is handled by step 4.

For `isCollective && !isMultiTarget`: the commander enters shots + hits together in one sheet. Update the single-target entry to include a hits counter:

```tsx
{isCollective && !isMultiTarget && (
  // Show both shots and hits counters in the same sheet
  // (instead of the two-step shots-then-hits flow)
)}
```

**Step 9: Commit**

```bash
git add components/session/activeSession/SquadSessionView.tsx
git commit -m "feat: add multi-target entry and collective scope to SquadSessionView"
```

---

## Task 8: Training Detail - Multi-Target Results Display

**Files:**
- Modify: `app/(protected)/trainingDetail.tsx`

**Step 1: Update ExpandableSquadRow to show per-target breakdown**

In the `ExpandableSquadRow` component, when a participant has `target_results`, show the breakdown:

In the expanded participant list, after showing participant shots/hits, add:

```tsx
{/* Per-target breakdown (if multi-target) */}
{isExpanded && p.target_results && Array.isArray(p.target_results) && p.target_results.length > 1 && (
  <View style={{ paddingLeft: 36, paddingBottom: 4 }}>
    {p.target_results.map((tr: any) => (
      <Text key={tr.target_number} style={[{ color: colors.textMuted, fontSize: 11, paddingVertical: 1 }]}>
        {t('session.targetNumber', { number: tr.target_number })}: {tr.shots_fired} {t('session.shots')} / {tr.hits} {t('session.hits')}
      </Text>
    ))}
  </View>
)}
```

**Step 2: Handle collective scope display**

For collective engagements, the expandable row should show "Squad" as the label instead of listing per-user results:

```typescript
// In ExpandableSquadRow:
const measurementScope = session.drill_config?.measurement_scope;
const isCollective = measurementScope === 'collective';
```

When collective, show a single "Squad Results" section instead of per-user breakdown.

**Step 3: Commit**

```bash
git add app/(protected)/trainingDetail.tsx
git commit -m "feat: show multi-target breakdown in training detail results"
```

---

## Task 9: Training Service - Include New Fields in Drill Insert

**Files:**
- Modify: `services/trainingService.ts`

**Step 1: Find the drill insert/update logic**

Search for where `training_drills` insert happens and ensure `measurement_scope` and `target_count` from the drill config get persisted.

The TrainingDrillItem from AddDrillStep contains `config.target_count` and `config.measurement_scope`. The training service's `buildDrillInsertPayload` (or equivalent) needs to map these to the DB columns.

Add to the insert payload:
```typescript
target_count: drill.config?.target_count || null,
measurement_scope: drill.config?.measurement_scope || null,
```

**Step 2: Commit**

```bash
git add services/trainingService.ts
git commit -m "feat: persist target_count and measurement_scope in training drill inserts"
```

---

## Task 10: End-to-End Verification

**Files:** None (verification only)

**Step 1: TypeScript build check**

Run: `npx tsc --noEmit`
Expected: No type errors related to our changes

**Step 2: Verify backward compatibility mentally**

Walk through these scenarios:
1. **Existing sessions without target_results**: `target_results` is null, aggregate `shots_fired`/`hits` still used - no change
2. **Grouping drills**: Not affected - always solo, no engagement mode change, target_count forced to 1
3. **Solo engagement drills**: No change - single target, individual scope by default
4. **New multi-target drill**: `target_count=2`, per-target results stored as JSONB, aggregates computed
5. **New collective drill**: `measurement_scope='collective'`, commander enters squad totals
6. **Queries**: All select clauses include `target_results` but handle null safely

**Step 3: Commit final verification**

```bash
git add -A
git commit -m "feat: multi-target engagement + collective squad results complete"
```

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260131...sql` | Create | Add target_results, measurement_scope columns |
| `types/session.ts` | Modify | Add TargetResultEntry, MeasurementScope types |
| `types/workspace.ts` | Modify | Add measurement_scope to TrainingDrill |
| `services/drills/drillService.ts` | Modify | Add target_count, measurement_scope to DrillConfig |
| `services/session/selectClauses.ts` | Modify | Add target_results to all engagement_participants selects |
| `services/session/participants.ts` | Modify | Add updateEngagementResults, computeAggregateTotals |
| `services/trainingService.ts` | Modify | Persist new drill fields |
| `components/training/create/steps/AddDrillStep.tsx` | Modify | Target count selector, full squad config, scope labels |
| `components/session/activeSession/SquadSessionView.tsx` | Modify | Multi-target entry, collective scope UI |
| `app/(protected)/trainingDetail.tsx` | Modify | Multi-target breakdown display |

## Backward Compatibility Guarantees

- All new DB columns are nullable with defaults
- `target_results = NULL` keeps old behavior
- `measurement_scope = NULL` defaults to 'individual'
- `target_count = NULL` defaults to 1
- No existing DB columns renamed or removed
- No existing function signatures broken (new function added, existing kept)
- No grouping behavior changed
