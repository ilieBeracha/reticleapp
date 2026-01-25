# Insights System - External Agent Brief

## Purpose of This Document

This document provides everything you need to understand, critique, and redesign the Insights UI. The current implementation has a solid **engine** but the **UI does not properly communicate what the user needs to see**.

---

## 1. WHAT THIS PRODUCT IS

This is a **shooting training analytics platform** for military/law enforcement and serious civilian shooters.

### Core User Questions the Insights Page Must Answer:

1. **"Am I getting better?"** — Progress over time
2. **"What can I trust?"** — Reliable strengths
3. **"Where do I struggle?"** — Weaknesses to address
4. **"What should I work on next?"** — Actionable recommendations
5. **"How does my accuracy relate to my precision?"** — The engagement↔grouping connection

### What Insights Is NOT:

- NOT a dashboard (dashboards show data, insights explain meaning)
- NOT a gamification system (no badges, streaks, or achievements)
- NOT AI-generated summaries (AI explains, never decides)

---

## 2. KEY DOMAIN CONCEPTS

### Session Types

| Type | What It Measures | Key Metrics |
|------|------------------|-------------|
| **Engagement** | Hit rate on targets | Accuracy (%), hits, shots fired |
| **Grouping** | Precision/consistency | Dispersion (cm), group size |
| **Mixed** | Both in one session | Both metrics |

### Critical Distinction: Accuracy vs Grouping

```
ACCURACY (Engagement):
- "Did you hit the target?"
- Higher % = better
- Measured in: percentage (%)

GROUPING (Precision):
- "How tight were your shots?"
- Lower cm = better (INVERTED)
- Measured in: centimeters (cm)
```

**The user needs to understand how these TWO AXES relate.**

A shooter can be:
- ✅ High accuracy + tight groups → **Optimal**
- ⚠️ High accuracy + loose groups → **Hitting but sloppy mechanics**
- ⚠️ Low accuracy + tight groups → **Precise but wrong placement (check zero)**
- ❌ Low accuracy + loose groups → **Fundamental issues**

### Training Contexts

Performance varies by context. Key context dimensions:
- **Position**: prone, standing, kneeling, sitting
- **Distance**: close (0-50m), medium (50-200m), long (200m+)
- **Weapon type**: handgun, rifle, shotgun
- **Stress flags**: timed drill, HR-gated, etc.

---

## 3. CURRENT DATA AVAILABLE

### From Sessions (what we have)

```typescript
interface SessionWithDetails {
  id: string;
  status: 'completed' | 'in_progress' | 'cancelled';
  drill_type: 'engagement' | 'grouping' | 'mixed';
  created_at: string;
  
  // Engagement metrics
  total_shots: number;
  total_hits: number;
  accuracy_pct: number;  // hits / shots * 100
  
  // Grouping metrics
  best_dispersion_cm: number | null;  // Best group that session
  
  // Context
  position: string | null;
  distance_m: number | null;
  weapon_id: string | null;
  weapon?: { name: string; type: string; };
  
  // Stress indicators
  is_timed: boolean;
  drill_config?: { hr_gate_enabled?: boolean; };
}
```

### Computed by Engine

The engine (`insights.engine.ts`) computes:

1. **Totals**: Session count, shot count, accuracy metrics, grouping metrics
2. **Baselines**: Global baseline, context-specific baselines
3. **Strengths**: Categories where user exceeds baseline significantly
4. **Weaknesses**: Categories where user underperforms or is inconsistent
5. **Trends**: Week-over-week direction
6. **Context Profiles**: Per-context engagement+grouping analysis
7. **Recommendations**: What to focus on next

---

## 4. CURRENT UI STRUCTURE (What Exists)

### Components

| Component | Shows | Problem |
|-----------|-------|---------|
| `TotalsSection` | Horizontal scroll of metric cards | Numbers without meaning |
| `StrengthsSection` | Cards for above-baseline categories | Good, but disconnected |
| `WeaknessesSection` | Cards for below-baseline categories | Good, but disconnected |
| `TrendsSection` | Week-over-week direction | Too abstract |
| `ContextProfilesSection` | Engagement↔Grouping per context | NEW, but needs better design |
| `RecommendationsSection` | What to do next | Needs priority UI |

### Current Flow

```
[Totals] → [Strengths] → [Weaknesses] → [Trends] → [Context Profiles] → [Recommendations]
```

### What's Wrong with Current UI

1. **Totals feel like a dashboard** — Just numbers, no meaning
2. **No clear "Am I improving?" answer** — Trend buried, not prominent
3. **Strengths/Weaknesses disconnected** — User doesn't see the "why"
4. **Context profiles are new but not integrated** — Feels like separate section
5. **No visual storytelling** — User has to mentally connect dots
6. **No "health score" or summary** — User doesn't get a quick read

---

## 5. WHAT THE USER ACTUALLY NEEDS TO SEE

### Primary View: "How Am I Doing?"

The FIRST thing a user should see is a **summary answer**, not raw data.

**Example of what user wants:**

> "You're **improving**. Your accuracy is up 8% this month, and your grouping is tighter by 1.2cm. Your strongest context is **prone at 100m**. Focus on **standing position** — your accuracy drops 15% there."

This is ONE glance. Currently we make them scroll through 5 sections.

### Secondary View: Deep Dive

After the summary, user can explore:
- Specific contexts
- Historical trends
- Evidence (which sessions)

---

## 6. PROPOSED UI STRUCTURE

### Option A: Single Summary Card + Expandable Details

```
┌─────────────────────────────────────────┐
│  📊 Your Training Overview              │
│                                         │
│  ↗️ IMPROVING                           │
│  Accuracy: 78% (+8% this month)         │
│  Grouping: 4.2cm (-1.2cm better)        │
│                                         │
│  💪 Strongest: Prone @ 100m             │
│  ⚠️  Focus on: Standing position        │
│                                         │
│  [View Details]                         │
└─────────────────────────────────────────┘
```

### Option B: Progressive Disclosure Cards

```
┌─────────────────────────────────────────┐
│  Am I Improving?                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│  YES — trending up over 4 weeks         │
│  [See trend chart]                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  What Can I Trust?                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│  • Prone @ 100m — 92% accuracy          │
│  • Rifle grouping — 2.1cm avg           │
│  [See all strengths]                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Where Should I Focus?                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│  Standing drops 15% vs baseline         │
│  Your groups open up under time         │
│  [See recommendations]                  │
└─────────────────────────────────────────┘
```

### Option C: Context-First View

Show the 2x2 matrix prominently:

```
         GROUPING (Precision)
              Tight    Loose
            ┌────────┬────────┐
   High     │   ✅   │   ⚠️   │
ACCURACY    │ Optimal│ Sloppy │
            ├────────┼────────┤
   Low      │   ⚠️   │   ❌   │
            │ Check  │ Review │
            │ Zero   │ Basics │
            └────────┴────────┘

Your contexts:
• Prone 100m: ✅ Optimal
• Standing: ⚠️ Sloppy (hits but loose)
• Kneeling: ❌ Review needed
```

---

## 7. ENGINE CAPABILITIES (What's Already Computed)

### Totals Available

```typescript
{
  sessions: number,
  shots: number,
  overall_accuracy: number,      // weighted: total_hits / total_shots
  typical_accuracy: number,      // median of session accuracies
  best_group_median: number,     // median of best_dispersion_cm
}
```

### Context Profiles Available

```typescript
interface ContextProfile {
  key: {
    position: string | null;
    distanceBucket: 'close' | 'medium' | 'long' | null;
    weaponKind: string | null;
    drillType: 'engagement' | 'grouping' | 'mixed';
    isTimed: boolean;
  };
  
  engagement: {
    accuracy: number;
    delta: number;           // vs baseline
    baselineAccuracy: number;
    sessions: number;
    shots: number;
  } | null;
  
  grouping: {
    medianBestGroup: number;
    delta: number;           // vs baseline (inverted: positive = better)
    baselineMedianBestGroup: number;
    sessions: number;
  } | null;
  
  quadrant: 'strong_both' | 'hits_loose' | 'tight_misses' | 'struggling' | ...;
  confidence: 'high' | 'medium' | 'low';
  isPreliminary: boolean;
  label: string;             // Human-readable: "Prone @ Medium Distance"
}
```

### Baselines Available

```typescript
{
  global: {
    accuracy: number | null;
    grouping: number | null;
    confidence: 'high' | 'medium' | 'low';
  },
  context: Map<string, BaselineValues>  // per-context baselines
}
```

### Trends Available

```typescript
{
  direction: 'up' | 'down' | 'stable';
  metric: 'accuracy' | 'grouping';
  delta: number;
  weeks: number;
  confidence: 'high' | 'medium' | 'low';
}
```

---

## 8. AI INTEGRATION

### What AI Can Do

- Explain WHY an insight exists (after user clicks "Why?")
- Provide context-aware narrative
- Never compute or decide anything

### What AI Cannot Do

- Generate metrics
- Override engine decisions
- Provide summaries without evidence

### Current AI Contract

```typescript
interface AIContextRequest {
  insight_type: 'strength' | 'weakness' | 'trend' | 'recommendation';
  metric_type: 'accuracy' | 'grouping';
  decided_values: {
    current_value: number;
    baseline_value: number;
    is_significant: boolean;
    direction: 'up' | 'down' | 'stable';
    confidence: string;
    data_points: number;
    unit: '%' | 'cm' | 's' | '';
  };
  context: {
    evidence_session_ids: string[];
    category_label: string;
    engine_context: string;
  };
}
```

---

## 9. DESIGN CONSTRAINTS

### Must Keep

1. **Deterministic engine** — All decisions made by code, not AI
2. **Evidence IDs** — Every insight links to source sessions
3. **Confidence scoring** — User knows data reliability
4. **Baseline comparisons** — Never show absolute numbers without context

### Must Avoid

1. **Black-box summaries** — No AI-generated text without engine backing
2. **Gamification** — No badges, streaks, fake achievements
3. **Data overload** — Don't show everything, show what matters
4. **Mode-based filtering** — Filters refine, not restructure

---

## 10. FILES TO UNDERSTAND

### Core Engine
- `insights.engine.ts` — All computation logic
- `insights.types.ts` — All type definitions

### Current UI Components
- `InsightsDashboard.tsx` — Main orchestrator
- `sections/TotalsSection.tsx` — Metric cards
- `sections/StrengthsSection.tsx` — Strength cards
- `sections/WeaknessesSection.tsx` — Weakness cards
- `sections/TrendsSection.tsx` — Trend display
- `sections/ContextProfilesSection.tsx` — NEW: engagement↔grouping
- `sections/RecommendationsSection.tsx` — Action items

### AI Integration
- `AIExplanationProvider.tsx` — Context for AI explanations
- `AIExplanationBlock.tsx` — "Why?" button and explanation display

### Evidence
- `EvidenceSheet.tsx` — Bottom sheet showing source sessions

---

## 11. SPECIFIC PROBLEMS TO SOLVE

### Problem 1: No Clear Answer

**Current**: User sees numbers and has to interpret them.
**Need**: User sees "You're improving" or "Focus needed" immediately.

### Problem 2: Disconnected Sections

**Current**: Totals, Strengths, Weaknesses are separate buckets.
**Need**: One narrative that connects them.

### Problem 3: Context Profiles Are Buried

**Current**: New section at the bottom.
**Need**: This is the CORE insight — should be prominent.

### Problem 4: No Visual Hierarchy

**Current**: All sections look the same.
**Need**: Most important insight should be visually dominant.

### Problem 5: Trend Not Prominent

**Current**: Trends section is one of many.
**Need**: "Am I improving?" should be first-glance visible.

---

## 12. SUCCESS CRITERIA

A successful redesign will:

1. **Answer "Am I improving?" in < 2 seconds** — Visible without scrolling
2. **Show the accuracy↔grouping connection clearly** — User understands the 2x2
3. **Prioritize actionable insights** — What to do next is obvious
4. **Maintain trust** — All numbers backed by evidence, confidence shown
5. **Be scannable** — User can get value in 10 seconds or deep dive in 2 minutes

---

## 13. QUESTIONS FOR YOU TO ANSWER

1. Should the summary be a single card or multiple progressive cards?
2. How prominently should the 2x2 quadrant matrix be shown?
3. Should trends be a chart or a statement?
4. How do we handle low-data states gracefully?
5. What's the right balance between "quick glance" and "deep dive"?

---

## 14. APPENDIX: SAMPLE DATA

### Sample Context Profile

```json
{
  "key": {
    "position": "prone",
    "distanceBucket": "medium",
    "weaponKind": "rifle",
    "drillType": "engagement",
    "isTimed": false
  },
  "keyString": "prone|medium|rifle|engagement|untimed",
  "label": "Prone @ Medium Distance (Rifle)",
  "engagement": {
    "accuracy": 87.5,
    "delta": 12.3,
    "baselineAccuracy": 75.2,
    "sessions": 8,
    "shots": 240,
    "evidenceIds": ["sess-1", "sess-2", "sess-5", "sess-7", "sess-9", "sess-11", "sess-14", "sess-18"]
  },
  "grouping": {
    "medianBestGroup": 3.2,
    "delta": 1.1,
    "baselineMedianBestGroup": 4.3,
    "sessions": 6,
    "evidenceIds": ["sess-3", "sess-4", "sess-6", "sess-8", "sess-12", "sess-15"]
  },
  "quadrant": "strong_both",
  "confidence": "high",
  "isPreliminary": false
}
```

### Sample Totals

```json
{
  "totals": [
    { "id": "sessions", "label": "Sessions", "value": 47 },
    { "id": "shots", "label": "Shots Fired", "value": 2840 },
    { "id": "overall_accuracy", "label": "Overall Accuracy", "value": 76.2, "unit": "%", "subtitle": "Weighted avg" },
    { "id": "typical_accuracy", "label": "Typical Session", "value": 78, "unit": "%", "subtitle": "Median" },
    { "id": "best_group_median", "label": "Best Group", "value": 4.1, "unit": "cm", "subtitle": "Median" }
  ]
}
```

---

*Document created: 2026-01-18*
*Last updated: 2026-01-18*
*Context: Handoff for UI redesign of Insights page*
