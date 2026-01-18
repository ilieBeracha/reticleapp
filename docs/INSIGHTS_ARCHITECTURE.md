# Insights Page Architecture

**Author:** Staff Engineering Documentation  
**Scope:** Complete technical reference for the Insights Page system  
**Audience:** New engineers, maintainers, architecture reviewers, debugging

---

## Table of Contents

1. [High-Level Purpose](#1-high-level-purpose)
2. [Data Sources](#2-data-sources)
3. [Filter Flow](#3-filter-flow)
4. [Insights Engine (Core Logic)](#4-insights-engine-core-logic)
5. [Evidence Model](#5-evidence-model)
6. [AI Context Layer](#6-ai-context-layer-pinecone--llm)
7. [Async UI Flow](#7-async-ui-flow)
8. [Design Tradeoffs & Decisions](#8-design-tradeoffs--decisions)
9. [What This Enables Long-Term](#9-what-this-enables-long-term)

---

## 1. High-Level Purpose

### What the Insights Page Is

The Insights Page is a **deterministic analytics system** that transforms raw session data into actionable performance intelligence. It answers five distinct questions:

| Section | Question Answered |
|---------|-------------------|
| Totals | "What is my current performance state?" |
| Strengths | "What should I trust myself with?" |
| Weaknesses | "What is limiting my ceiling right now?" |
| Trends | "Am I improving or decaying?" |
| Recommendations | "What should I do next — concretely?" |

### What the Insights Page Is NOT

The Insights Page is **explicitly not a dashboard**. This distinction is critical:

| Dashboard | Insights Page |
|-----------|---------------|
| Shows what happened | Explains what it means |
| Displays raw data | Computes meaningful deltas |
| User interprets patterns | Engine identifies patterns |
| Reactive visualization | Proactive guidance |
| No advice | Actionable recommendations |

A dashboard answers "How many shots did I fire?" — the Insights Page answers "Your standing accuracy is 15% below baseline, and here's why that matters."

### Core Philosophy: Deterministic Engine vs AI Explanation

The system operates on a fundamental architectural principle:

> **"Deterministic engine decides. AI explains and contextualizes."**

This separation exists because:

1. **Trust** — Users must be able to verify why they're seeing specific insights
2. **Debugging** — When something looks wrong, engineers can trace exact calculations
3. **Consistency** — Same input always produces same output
4. **Auditability** — Every decision can be explained by code, not probabilistic models

The Insights Engine (`insights.engine.ts`) is the **sole authority** for:
- What qualifies as a strength
- What qualifies as a weakness
- Whether a trend is significant
- Which recommendations to show

AI (via `generate-insights` edge function) is **only allowed to**:
- Explain why a decided insight might exist
- Suggest possible contributing factors
- Find similar historical patterns

AI is **forbidden from**:
- Computing metrics
- Overriding thresholds
- Deciding what is/isn't significant
- Giving directive advice

### Why Trust and Explainability Matter

In shooting performance analysis:

1. **Life-affecting decisions** — Training priorities affect real-world readiness
2. **Domain expertise** — Users often know more than the system; they must be able to challenge insights
3. **Regression detection** — False positives (claiming weakness when strong) erode confidence
4. **Professional accountability** — In military/LE contexts, bad analytics advice is dangerous

Every insight must be:
- Traceable to specific sessions
- Verifiable by examining underlying data
- Explainable without AI involvement

---

## 2. Data Sources

### Primary Data Tables

| Source | What It Contains | How It's Used |
|--------|------------------|---------------|
| `sessions` | Session metadata, timestamps, drill config | Filter application, context |
| `session_stats` | Aggregated shot counts, accuracy, dispersion | Totals computation |
| `target_engagements` | Per-target hit data | Evidence for engagement sessions |
| `group_scores` | Grouping measurements (cm) | Evidence for grouping sessions |
| `user_weapons` | Weapon metadata | Category filtering |
| `training_drills` | Drill definitions | Drill type filtering |

### Session Data Structure

The engine operates on `SessionWithDetails[]` — enriched session objects containing:

```typescript
interface SessionWithDetails {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'aborted';
  started_at: string;
  ended_at: string | null;
  
  // Drill context
  drill_config: {
    drill_goal: 'grouping' | 'engagement';
    position: string;
    distance_m: number;
    time_limit_seconds?: number;
  } | null;
  
  // Weapon context
  weapon_id: string | null;
  weapon_name: string | null;
  weapon_category: string | null;
  
  // Team context
  team_id: string | null;
  team_name: string | null;
  
  // Aggregated stats
  stats: {
    shots_fired: number;
    hits_total: number;
    accuracy_pct: number;
    best_dispersion_cm: number | null;
    avg_distance_m: number | null;
    target_count: number;
  } | null;
}
```

### Data Ownership Model

**Data belongs to the user:**
- All session data
- All computed insights
- All evidence linkages

**Data is contextual metadata (never owned by teams or AI):**
- Weapon definitions (referenced, not owned)
- Drill templates (referenced, not owned)
- AI explanations (ephemeral, assistive)

**Critical principle:** The Insights Engine never queries team aggregates or organizational data to compute individual insights. Each user's insights are computed solely from their own session data.

---

## 3. Filter Flow

### Supported Filters

Defined in `insights.types.ts`:

```typescript
interface InsightsFilters {
  time: 'week' | 'month' | 'quarter' | 'year' | 'all';
  weaponId: string | null;
  weaponCategory: string | null;
  teamId: string | null;
  position: 'all' | 'prone' | 'standing' | 'kneeling' | 'sitting';
  distance: 'all' | 'close' | 'medium' | 'long' | 'precision';
  drillType: 'all' | 'grouping' | 'engagement' | 'stress';
  stressOnly: boolean;
  timedOnly: boolean;
}
```

### Distance Buckets

Distance filtering uses semantic buckets, not arbitrary ranges:

```typescript
const DISTANCE_BUCKETS = {
  close: { min: 0, max: 25, label: '≤25m' },
  medium: { min: 25, max: 100, label: '25-100m' },
  long: { min: 100, max: 300, label: '100-300m' },
  precision: { min: 300, max: Infinity, label: '300m+' },
};
```

### Where Filters Are Applied

Filters are applied **before any computation** in `applyFilters()`:

```typescript
export function applyFilters(
  sessions: SessionWithDetails[],
  filters: InsightsFilters
): SessionWithDetails[] {
  return sessions.filter((session) => {
    // Time filter
    if (filters.time !== 'all') { /* date comparison */ }
    
    // Weapon filter
    if (filters.weaponId && session.weapon_id !== filters.weaponId) return false;
    
    // Position filter
    if (filters.position !== 'all') { /* position match */ }
    
    // ... additional filters
    
    return true;
  });
}
```

The critical insight: filtering happens **first**, then all metrics (totals, strengths, weaknesses, trends) are computed on the filtered subset.

### Why Filters Are Additive, Not Mode Switches

Filters narrow the data set; they do not change **what questions are asked**.

**Example of wrong approach (avoided):**
- User selects "Prone only" → System switches to "Prone Analysis Mode" with different metrics

**Correct approach (implemented):**
- User selects "Prone only" → System computes same 5 sections (Totals, Strengths, Weaknesses, Trends, Recommendations) using only prone sessions
- If prone data is too sparse, sections show empty states rather than switching behavior

This is critical because:
1. Users can predict what they'll see
2. Empty states communicate data needs
3. No confusion about what different filter combinations mean

### Why Filters Never Change Page Structure

The page always shows the same five sections in the same order:

1. Totals (Performance Snapshot)
2. Strengths
3. Weaknesses
4. Trends
5. Recommendations

Filtering affects **content within sections**, never **which sections appear**.

This predictability enables:
- Muscle memory for navigation
- Consistent mental model
- Easier debugging (section X is always computed by function Y)

---

## 4. Insights Engine (Core Logic)

### File Location

```
components/insights/insights.engine.ts
```

### Why This Engine Is Authoritative

The Insights Engine is the **single source of truth** for all analytics decisions. This is enforced architecturally:

1. **No alternative computation paths** — UI components receive pre-computed results
2. **Immutable contracts** — Engine outputs follow strict type interfaces
3. **Test-driven boundaries** — Business rules are codified in `insights.engine.test.ts`
4. **AI guardrails reference engine values** — AI cannot contradict `decided_values`

### Why All Decisions Happen Here

Centralizing decisions enables:
- **Debugging** — "Why did this show as a weakness?" has one answer location
- **Testing** — Business rules are unit-testable
- **Evolution** — Changing thresholds happens in one place
- **Audit** — Compliance review examines one module

### Why It Is Deterministic and Test-Driven

The engine uses:
- **Explicit thresholds** — 5% for accuracy, 0.5cm for grouping
- **No randomness** — Same sessions always produce same insights
- **No model inference** — Pure arithmetic and statistical functions

Test coverage validates:
- Minimum session requirements
- Threshold boundary conditions
- Filter interaction correctness
- Edge cases (zero shots, missing stats, etc.)

---

### 4.1 Totals / Snapshot

**Function:** `computeTotals(sessions: SessionWithDetails[]): TotalsMetric[]`

#### What Is Calculated

| Metric | Description |
|--------|-------------|
| Sessions | Count of completed sessions |
| Shots Fired | Total shots from engagement sessions |
| Hit % | Median accuracy across engagement sessions |
| Accuracy | Overall hits/shots from engagement sessions |
| Median Group | Median dispersion from grouping sessions |

#### How It Is Calculated

**Session separation is critical:**

```typescript
const groupingSessions = completed.filter(isGroupingSession);
const engagementSessions = completed.filter(isEngagementSession);
```

Grouping and engagement metrics are computed **separately** because they measure fundamentally different things:
- **Engagement:** hits/shots percentage (higher is better)
- **Grouping:** dispersion in cm (lower is better)

**Median calculation:**

```typescript
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
```

#### Why It Is Calculated This Way

**Why median over average for Hit %:**

Medians resist outliers. One exceptionally good or bad session shouldn't distort the user's understanding of their typical performance.

Example:
- Sessions: [80%, 82%, 78%, 85%, 15%]
- Average: 68%
- Median: 80%

The 15% outlier (possibly equipment failure or extreme conditions) shouldn't define the snapshot.

**Why grouping and engagement are separated:**

These are **different skills** with **different measurement units** and **inverted improvement directions**:
- Accuracy: higher % = better
- Grouping: smaller cm = better

Mixing them would require arbitrary conversion factors and confuse users.

**Why alternatives were rejected:**

| Alternative | Why Rejected |
|-------------|--------------|
| Weighted average by shot count | Inflates importance of high-volume sessions |
| Rolling window | Adds complexity without clear benefit |
| Per-weapon breakdown in totals | Belongs in strengths/weaknesses, not snapshot |

#### Evidence IDs

Every metric links to contributing sessions:

```typescript
totals.push({
  id: 'accuracy',
  label: 'Accuracy',
  value: overallAccuracy,
  unit: '%',
  evidenceIds: engagementSessionIds, // <-- traceable
});
```

---

### 4.2 Strengths

**Function:** `computeStrengths(sessions: SessionWithDetails[], filters: InsightsFilters): StrengthCard[]`

#### What Qualifies as a Strength

A strength is detected when performance in a **category** exceeds the user's overall **baseline** by a **threshold**.

Categories analyzed:
- Position (prone, standing, kneeling, sitting)
- Distance bucket (close, medium, long, precision)
- Weapon (by name)

#### Baseline Logic

Baseline is computed from **all sessions** of the same type (engagement vs grouping):

```typescript
// Engagement baseline
engagementSessions.forEach((s) => {
  if (s.stats) {
    baselineShots += s.stats.shots_fired;
    baselineHits += s.stats.hits_total;
  }
});
const baselineAccuracy = baselineShots > 0 ? (baselineHits / baselineShots) * 100 : 0;

// Grouping baseline
const baselineDispersions: number[] = [];
groupingSessions.forEach((s) => {
  if (s.stats?.best_dispersion_cm != null) {
    baselineDispersions.push(s.stats.best_dispersion_cm);
  }
});
const baselineMedianDispersion = median(baselineDispersions);
```

#### Threshold Logic

From `changeRules.ts`:

```typescript
export const ACCURACY_CHANGE_THRESHOLD = 5;     // ±5% is meaningful
export const GROUPING_CHANGE_THRESHOLD = 0.5;   // ±0.5cm is meaningful
```

A strength requires:
```typescript
const accuracyDelta = stats.accuracy - baselineAccuracy;
if (accuracyDelta >= ACCURACY_CHANGE_THRESHOLD) {
  // This is a strength
}
```

#### Confidence Scoring

```typescript
export function getConfidence(shots: number, sessions: number): ConfidenceLevel {
  if (shots >= 100 && sessions >= 5) return 'high';
  if (shots >= 50 && sessions >= 3) return 'medium';
  return 'low';
}
```

Confidence communicates data reliability to users:
- **High:** Enough data to trust the insight
- **Medium:** Likely accurate, but more data would help
- **Low:** Preliminary observation, could change

#### Category Breakdowns

The engine analyzes each category separately:

```typescript
// By position (for accuracy)
const engagementByPosition = groupByCategory(engagementSessions, (s) =>
  s.drill_config?.position?.toLowerCase() || null
);

engagementByPosition.forEach((stats, position) => {
  if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return; // Minimum 20 shots
  // ... strength detection
});
```

#### Why Minimum Sessions/Shots Are Required

```typescript
const MIN_SESSIONS_FOR_INSIGHTS = 5;
const MIN_SHOTS_FOR_CATEGORY = 20;
```

Without minimums:
- 3 lucky shots at a new distance would be flagged as strength
- Statistical noise would dominate

Minimums ensure insights reflect **patterns**, not **variance**.

#### Why Sorted by Delta

```typescript
return strengths.sort((a, b) => Math.abs(b.metric.delta) - Math.abs(a.metric.delta));
```

The strongest deviations from baseline appear first because they're most actionable.

#### Why Strengths Are Contextual, Not Global

Strengths are relative to **the user's own baseline**, not external benchmarks.

**Why this matters:**
- A beginner's "strength" might be a professional's weakness
- Progress is measured against self, enabling continuous improvement
- No demotivation from arbitrary external comparisons

---

### 4.3 Weaknesses

**Function:** `computeWeaknesses(sessions: SessionWithDetails[], filters: InsightsFilters): WeaknessCard[]`

#### Difference Between Low Performance vs High Variance

Two distinct weakness types exist:

| Type | Detection | User Impact |
|------|-----------|-------------|
| Low Performance | Category accuracy below baseline by threshold | Skill gap in specific condition |
| High Variance | Coefficient of variation ≥ 30% | Inconsistent execution |

Both are weaknesses, but they require **different remediation**:
- Low performance → Deliberate practice in that category
- High variance → Consistency training, mental focus

#### Coefficient of Variation Logic

```typescript
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;
  return standardDeviation(values) / avg;
}

const VARIANCE_THRESHOLD = 0.3; // 30% CV = high variance
```

CV normalizes variance by mean, enabling comparison across different accuracy levels:
- 70% ± 10% has same CV as 35% ± 5%
- Both represent 14% relative variance

#### Why Inconsistency Is Treated as a Weakness

High variance indicates:
- Execution inconsistency (different grip, breathing, trigger pull)
- Environmental sensitivity (can't perform reliably under varied conditions)
- Mental state fluctuation

Even with acceptable average performance, high variance means **unpredictable real-world performance**.

#### How Variance Is Detected

```typescript
if (stats.sessions.length >= 3) {
  const sessionAccuracies = stats.sessions
    .filter((s) => s.stats && s.stats.shots_fired > 0)
    .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
  const variance = coefficientOfVariation(sessionAccuracies);

  if (variance >= VARIANCE_THRESHOLD && !alreadyFlaggedAsPositionWeakness) {
    // Flag as variance weakness
  }
}
```

#### Why Some Weaknesses Are Structural, Not Skill-Based

Example: A user with excellent prone performance but poor standing performance isn't necessarily "bad at standing" — they may lack equipment (bipod dependency) or have never trained that position.

The engine detects the **pattern**, not the **cause**. AI explains possible causes; users apply domain expertise.

---

### 4.4 Trends

**Function:** `computeTrends(sessions: SessionWithDetails[], filters: InsightsFilters): TrendData[]`

#### Why Trends Are Time-Based, Not Session-Based

Session count varies between users. Someone who trains daily has different session density than someone who trains weekly.

Time-based bucketing (weekly) normalizes for training frequency:
- 10 sessions/week user → weekly bucket reflects high-volume average
- 1 session/week user → weekly bucket reflects that single session

This enables **rate of change** comparison, not absolute volume comparison.

#### Weekly Bucketing

```typescript
completed.forEach((session) => {
  const date = new Date(session.started_at);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  const weekKey = weekStart.toISOString().split('T')[0];

  if (!weeklyData.has(weekKey)) {
    weeklyData.set(weekKey, []);
  }
  weeklyData.get(weekKey)!.push(session);
});
```

#### Median-Based Trend Detection

First-half vs second-half comparison:

```typescript
const midpoint = Math.floor(accuracyDataPoints.length / 2);
const firstHalf = accuracyDataPoints.slice(0, midpoint);
const secondHalf = accuracyDataPoints.slice(midpoint);

const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

const delta = secondAvg - firstAvg;
const isSignificant = Math.abs(delta) >= ACCURACY_CHANGE_THRESHOLD;
```

#### Thresholds for Significance

Same thresholds as strengths/weaknesses:
- Accuracy: ±5%
- Grouping: ±0.5cm

This consistency means users build intuition: "5% change is meaningful across the board."

#### Why Trends Require More Data Than Strengths

Trends require temporal spread, not just volume:

```typescript
if (completed.length < MIN_BASELINE_SESSIONS + RECENT_SESSION_COUNT) {
  return trends;
}

if (sortedWeeks.length < 3) {
  return trends;
}
```

10 sessions in one week doesn't show a trend — it shows a single week's performance.

#### Why Trends Are Neutral (Not Advice)

Trend direction is stated factually:
- "Accuracy +8% over 6 weeks" (improving)
- "Grouping +1.2cm over 4 weeks" (declining)

The engine does **not** say:
- "Great job!" (validation)
- "This needs attention" (directive)

Users contextualize: maybe the user intentionally switched to harder drills, causing apparent decline.

---

### 4.5 Recommendations

**Function:** `generateRecommendations(strengths, weaknesses, trends, sessions): Recommendation[]`

#### Why Recommendations Are Derived ONLY from Engine Results

Recommendations are **not AI-generated**. They are deterministic transformations:

```typescript
weaknesses.forEach((weakness, index) => {
  if (index >= 3) return; // Max 3 from weaknesses

  if (weakness.category === 'position') {
    recommendations.push({
      id: `rec-${weakness.id}`,
      type: 'drill',
      priority: weakness.variance ? 'high' : 'medium',
      title: 'Focus Drill',
      description: `${weakness.label} position training`,
      goal: weakness.variance ? 'reduce variance' : 'improve baseline',
      // ...
    });
  }
});
```

#### Why AI Is NOT Allowed to Generate Recommendations

AI recommendations would be:
1. **Unverifiable** — No trace to why it was suggested
2. **Inconsistent** — Different suggestions for same data on different days
3. **Potentially wrong** — Domain expertise required for training prescriptions
4. **Legally ambiguous** — Who's responsible for bad AI advice?

The engine generates recommendations users can **challenge and understand**.

#### Priority Logic

```typescript
const priorityOrder = { high: 0, medium: 1, low: 2 };
return recommendations.sort((a, b) => 
  priorityOrder[a.priority] - priorityOrder[b.priority]
);
```

Priority assignment:
- **High:** Variance weaknesses, significant declining trends
- **Medium:** Position/distance weaknesses without variance
- **Low:** Building on strengths (when no weaknesses exist)

#### Drill vs Structure Recommendations

| Type | When Generated | Example |
|------|----------------|---------|
| Drill | Position weakness detected | "Focus Drill: Standing position training" |
| Structure | High variance or declining trend | "Consistency Focus: Work on kneeling consistency" |

Drills are **practice prescriptions**. Structure recommendations address **training approach**.

#### Why Recommendations Are Capped and Ranked

```typescript
weaknesses.forEach((weakness, index) => {
  if (index >= 3) return; // Cap
});
```

Cap of 3 prevents:
- Overwhelming users with action items
- Analysis paralysis
- Distraction from most important issues

Ranking ensures users see highest-priority items first.

---

## 5. Evidence Model

### What evidenceIds Are

Every insight includes `evidenceIds: string[]` — an array of session IDs that contributed to the insight.

```typescript
interface StrengthCard {
  // ...
  evidenceIds: string[];  // Sessions backing this strength
}
```

### Why EVERY Insight Must Link to Evidence

Evidence enables:

1. **User verification** — "Show me the sessions that made you say this"
2. **Debugging** — Engineers can reproduce calculations
3. **Trust building** — Users learn the system isn't "making things up"
4. **Audit trail** — Compliance reviews can trace decisions

### How Evidence Enables Debugging, Trust, and Audits

**UI Implementation:**

The Evidence Sheet (`EvidenceSheet.tsx`) loads sessions by ID:

```typescript
const sessionPromises = context.sessionIds.slice(0, 10).map((id) =>
  getSessionById(id).catch(() => null)
);
const results = await Promise.all(sessionPromises);
```

Users tap any insight → see actual sessions → verify the math themselves.

### Why No Insight Exists Without Traceability

This is enforced architecturally:

```typescript
strengths.push({
  // ...
  evidenceIds: stats.sessions.map((s) => s.id),  // Required field
});
```

TypeScript enforces `evidenceIds` is always present. Empty arrays are valid (for calculated totals with zero sessions), but undefined is not.

---

## 6. AI Context Layer (Pinecone + LLM)

### File Locations

- Contract: `components/insights/ai-context.contract.ts`
- Hook: `components/insights/hooks/useAIContext.ts`
- Edge Function: `supabase/functions/generate-insights/index.ts`

---

### 6.1 Role of Pinecone

#### Why Pinecone Is Used

Pinecone stores vector embeddings of session descriptions, enabling:
- Finding similar past sessions
- Contextualizing current performance
- Pattern recognition across history

#### What Embeddings Represent

Sessions are converted to natural language descriptions:

```typescript
function sessionToText(s: SessionFeatures): string {
  const parts: string[] = [];
  parts.push(`${s.drill_goal || 'training'} session in ${s.position || 'unknown'} position`);
  
  if (s.accuracy_pct !== null) {
    const accDesc = s.accuracy_pct >= 90 ? 'excellent accuracy' :
      s.accuracy_pct >= 75 ? 'good accuracy' : /* ... */;
    parts.push(accDesc);
  }
  // ...
  return parts.join('. ');
}
```

These descriptions are embedded using `llama-text-embed-v2`.

#### Why Similarity Is Useful

When explaining an insight, similar sessions provide context:
- "You've had this pattern 8 times before in similar conditions"
- "Common factor in similar sessions: standing position"

#### What Pinecone Is NOT Allowed to Decide

Pinecone **never**:
- Determines if something is a strength or weakness
- Sets thresholds
- Overrides engine decisions
- Triggers recommendations

It provides **context for explanations**, not **input for decisions**.

#### Namespace Strategy Per User

```typescript
const namespace = `user_${features.user_id}`;
```

Each user's embeddings are isolated:
- No cross-user data leakage
- User deletion cleans one namespace
- Query performance scales independently

#### What Metadata Is Stored and Why

```typescript
const metadata = {
  text: text,
  user_id: features.user_id,
  drill_goal: features.drill_goal,
  position: features.position,
  distance_m: features.distance_m,
  accuracy_pct: features.accuracy_pct,
  dispersion_cm: features.dispersion_cm,
  // Weather and biometrics if available
};
```

Metadata enables filtered similarity queries:
- "Find similar prone sessions only"
- "Find sessions with similar weather"

---

### 6.2 AI Context Contract

#### The Contract (AIContextRequest / AIContextResponse)

The contract is defined in `ai-context.contract.ts` and enforced on both sides.

**Request (Engine → AI):**

```typescript
interface AIContextRequest {
  request_id: string;
  user_id: string;
  insight_type: 'strength' | 'weakness' | 'trend' | 'anomaly' | 'recommendation';
  metric_type: 'accuracy' | 'grouping' | 'consistency' | 'time' | 'stress';
  
  decided_values: {
    current_value: number;
    baseline_value: number;
    delta: number;
    is_significant: boolean;
    direction: 'up' | 'down' | 'stable';
    confidence: 'high' | 'medium' | 'low';
    data_points: number;
    unit: '%' | 'cm' | 's' | '';
  };
  
  context: {
    filters_applied: Record<string, string | undefined>;
    evidence_session_ids: string[];
    category_label?: string;
    engine_context?: string;
  };
  
  response_type: 'explanation' | 'similar_patterns' | 'widget_summary' | 'tip';
}
```

**Response (AI → Engine):**

```typescript
interface AIContextResponse {
  request_id: string;
  success: boolean;
  error?: string;
  
  explanation?: {
    text: string;
    possible_factors?: string[];
    considerations?: string[];
  };
  
  similar_patterns?: Array<{
    session_count: number;
    time_range?: string;
    common_factors?: string[];
    similarity_score?: number;
  }>;
  
  confidence_note?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
}
```

#### What Values Are Immutable

The entire `decided_values` object is **read-only**:
- AI cannot change `current_value`
- AI cannot change `is_significant`
- AI cannot change `direction`

These are **facts from the engine**, not suggestions.

#### What AI Is Allowed to Do

1. **Explain** why the decided values might exist
2. **Suggest possible factors** (phrased as possibilities)
3. **Mention considerations** (not directives)
4. **Find similar patterns** in historical data

#### What AI Is Forbidden from Doing

Codified as guardrails in the edge function:

```typescript
type GuardrailRule =
  | 'NO_DIRECTION_CONTRADICTION'   // Can't say "improving" when declining
  | 'NO_SIGNIFICANCE_OVERRIDE'     // Can't say "significant" when not
  | 'NO_METRIC_INVENTION'          // Can't reference metrics not in request
  | 'NO_DIRECTIVE_LANGUAGE'        // Can't use "should", "must"
  | 'MUST_REFERENCE_EVIDENCE'      // Must reference decided_values
  | 'NO_NUMERIC_CLAIMS'            // Can't claim different numbers
  | 'NO_RANKING_CLAIMS';           // Can't rank strengths/weaknesses
```

---

### 6.3 Guardrails

**Direction Contradiction Prevention:**

```typescript
if (decided_values.direction === 'down' || decided_values.delta < 0) {
  if (text.includes('improving') || text.includes('increased')) {
    violations.push({
      rule: 'NO_DIRECTION_CONTRADICTION',
      message: `AI said "improving" but direction is ${decided_values.direction}`,
      severity: 'error',
    });
  }
}
```

**Significance Override Prevention:**

```typescript
if (!decided_values.is_significant) {
  if (text.includes('significant') || text.includes('major')) {
    violations.push({
      rule: 'NO_SIGNIFICANCE_OVERRIDE',
      message: 'AI claimed significance but is_significant is false',
      severity: 'error',
    });
  }
}
```

**Directive Language Prevention:**

```typescript
const directiveWords = ['you should', 'you must', 'you need to', 'do this'];
for (const directive of directiveWords) {
  if (text.includes(directive)) {
    violations.push({
      rule: 'NO_DIRECTIVE_LANGUAGE',
      message: `AI used directive language: "${directive}"`,
      severity: 'warning',
    });
  }
}
```

**Ranking Prevention:**

```typescript
const rankingWords = ['best', 'worst', 'most important', 'top priority'];
for (const ranking of rankingWords) {
  if (text.includes(ranking)) {
    violations.push({
      rule: 'NO_RANKING_CLAIMS',
      message: `AI made ranking claim: "${ranking}"`,
      severity: 'warning',
    });
  }
}
```

---

### 6.4 Why AI Explains, Not Decides

**Why AI Never Computes Metrics:**
- Metrics require deterministic, verifiable math
- AI outputs are probabilistic and inconsistent
- Users can't debug AI computations

**Why AI Never Decides Strengths/Weaknesses/Trends:**
- Classification requires explicit thresholds
- Business rules belong in code, not prompts
- Reproducibility is impossible with AI decisions

**Why AI Output Is Optional and Async:**
- System must work without AI
- Slow AI response shouldn't block insights display
- Failed AI calls shouldn't affect core analytics

**Why the System Works Without AI:**

```typescript
// In AIExplanationBlock.tsx
if (!response && !loading && showTrigger) {
  return <WhyButton />; // Just shows "Why?" button
}
```

Without AI:
- Insights compute identically
- Evidence is still accessible
- Only "Why?" explanations are missing (graceful degradation)

---

## 7. Async UI Flow

### Why Insights Render Immediately

The `computeInsights()` function is synchronous and fast:

```typescript
// In InsightsDashboard.tsx
const insights: ComputedInsights = useMemo(() => {
  return computeInsights(sessions, filters);
}, [sessions, filters]);
```

No waiting for:
- API calls
- AI responses
- Database queries (sessions already loaded)

### Why AI Explanations Are Loaded Lazily

AI is invoked **only when user clicks "Why?"**:

```typescript
// In StrengthsSection.tsx
const handleRequestExplanation = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  requestExplanation(insightId, params);
};
```

This means:
- Page loads in <100ms
- AI cost only incurred when needed
- Users who don't want explanations aren't slowed

### What the User Sees While Loading

```typescript
// In AIExplanationBlock.tsx
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text>Explaining…</Text>
    </View>
  );
}
```

Non-blocking spinner appears inside the card; rest of page remains interactive.

### What Happens on Failure

```typescript
if (error || (response && !response.success)) {
  return (
    <View style={styles.errorContainer}>
      <Text>AI explanation not available.</Text>
    </View>
  );
}
```

Failures are:
- Communicated gracefully (no scary errors)
- Cached (prevents retry spam)
- Non-blocking (insight card still shows all data)

### Why This Improves Trust and Performance

**Trust:**
- Users see their insights aren't "from AI"
- Deterministic core is clearly separate from AI overlay
- System still works when AI fails

**Performance:**
- Insights appear instantly
- AI is lazy-loaded per-insight
- Failed AI doesn't block page render

---

## 8. Design Tradeoffs & Decisions

### Why Medians > Averages

| Situation | Average | Median |
|-----------|---------|--------|
| [80, 82, 78, 85] | 81.25% | 81% |
| [80, 82, 78, 15] | 63.75% | 79% |

Medians resist outliers. One bad session (equipment failure, testing extreme conditions) shouldn't define baseline performance.

### Why Thresholds Are Explicit

```typescript
export const ACCURACY_CHANGE_THRESHOLD = 5;
export const GROUPING_CHANGE_THRESHOLD = 0.5;
export const VARIANCE_THRESHOLD = 0.3;
```

Explicit thresholds enable:
- Testing ("is 4.9% change correctly classified as not significant?")
- Documentation ("5% is meaningful because...")
- User expectations ("I know small changes won't flag")

### Why Confidence Is Shown

Users see confidence badges:
- **High confidence** — 100+ shots, 5+ sessions
- **Medium confidence** — 50+ shots, 3+ sessions
- **Low data** — Below minimums

This prevents:
- Over-trusting sparse data
- Misunderstanding preliminary insights
- Frustration when insights change with more data

### Why No Black-Box AI Summaries

The system never shows:
- "AI says your performance is declining"
- "Based on AI analysis, you should..."
- Unmarked AI-generated text

All AI content is:
- Clearly labeled ("AI Explanation" badge)
- Optional (requires button click)
- Validated against guardrails

### Why the Page Avoids Gamification

No elements like:
- Points/scores
- Badges/achievements
- Leaderboards
- Streaks with arbitrary goals

**Why:**
- Shooting is serious (military/LE context)
- Gamification can encourage unsafe behavior
- External motivation undermines intrinsic improvement focus
- Professionals don't need games to train

---

## 9. What This Enables Long-Term

### Safe AI Evolution

The contract architecture enables:
- **A/B testing prompts** — Different explanations, same decisions
- **Model upgrades** — Claude → GPT → future models without core changes
- **Guardrail iteration** — Add new rules without engine changes

### A/B Testing Explanations

Because AI only explains (never decides), we can:
- Test different explanation styles
- Measure user satisfaction with explanations
- Iterate prompts without affecting analytics correctness

### Auditing & Validation

Every insight can be:
- Reproduced by re-running engine on same sessions
- Verified by examining evidence sessions
- Traced to specific threshold crossings

### Disabling AI Without Breaking Analytics

```typescript
if (!anthropicApiKey) {
  return createFallbackResponse(request.request_id, 'AI service not configured');
}
```

With AI disabled:
- All insights still compute
- All evidence still accessible
- Only explanations unavailable

This enables:
- Cost control (disable AI in low-tier plans)
- Outage resilience (AI down ≠ product down)
- Compliance (some contexts prohibit AI)

### Scaling to Teams Without Ownership Confusion

The data ownership model ensures:
- Individual insights are always individual
- Team views (future) aggregate without overwriting
- No cross-contamination of personal analytics

---

## Appendix: Key File Locations

| Purpose | Path |
|---------|------|
| Engine | `components/insights/insights.engine.ts` |
| Types | `components/insights/insights.types.ts` |
| Tests | `components/insights/__tests__/insights.engine.test.ts` |
| AI Contract | `components/insights/ai-context.contract.ts` |
| AI Hook | `components/insights/hooks/useAIContext.ts` |
| Edge Function | `supabase/functions/generate-insights/index.ts` |
| Dashboard | `components/insights/InsightsDashboard.tsx` |
| Change Rules | `components/insights/changeRules.ts` |
| Evidence Sheet | `components/insights/EvidenceSheet.tsx` |
| Sections | `components/insights/sections/*.tsx` |

---

## Appendix: Business Rules (Testable)

| Rule | Value | Test File Line |
|------|-------|----------------|
| Min sessions for insights | 5 | `insights.engine.test.ts:143` |
| Accuracy change threshold | 5% | `insights.engine.test.ts:144` |
| Grouping change threshold | 0.5cm | `insights.engine.test.ts:145` |
| Variance threshold (CV) | 30% | `insights.engine.test.ts:146` |
| Min shots per category | 20 | `insights.engine.test.ts:147` |

---

*Document generated from codebase analysis. Last updated: January 2026.*
