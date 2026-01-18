# Insights Engine Improvement Plan

**Version:** 2.0  
**Status:** Implementation  
**Date:** January 2026

---

## Summary

This document outlines targeted improvements to the Insights Engine to increase reliability under real-world training conditions. All changes preserve the existing architecture (deterministic engine, AI explains only, evidence IDs, confidence scoring).

---

## 1. Baseline Strategy (CRITICAL)

### Problem
Current implementation computes baseline from filtered sessions, creating ambiguity when filters change drill difficulty.

### Solution
Introduce two explicit baseline types:

```typescript
interface BaselineStrategy {
  /** Global baseline: all completed sessions (optionally time-filtered) */
  global: BaselineValues;
  
  /** Context baseline: sessions matching the same context key */
  context: Map<string, BaselineValues>;
}

interface BaselineValues {
  accuracy: number | null;       // weighted hits/shots
  accuracySessions: number;      // session count
  accuracyShots: number;         // shot count
  grouping: number | null;       // median best_dispersion_cm (renamed)
  groupingSessions: number;
  confidence: ConfidenceLevel;
}
```

### Usage Rules
| Insight Type | Baseline Used | Fallback |
|--------------|---------------|----------|
| Totals | Global | N/A |
| Strengths | Context → Global | Downgrade confidence |
| Weaknesses | Context → Global | Downgrade confidence |
| Trends | Global (time-windowed) | N/A |
| Context Profiles | Context | Mark as preliminary |

---

## 2. Grouping Metric Semantics (CRITICAL)

### Problem
`best_dispersion_cm` is treated as typical grouping, but it represents only the best result.

### Solution
1. Rename all references from "median grouping" to "best group" when using `best_dispersion_cm`
2. Add explicit semantic labels:
   - `best_group_cm` - smallest dispersion recorded
   - `median_best_group_cm` - median of best dispersions across sessions

### Code Changes
- `computeTotals`: Change label from "Median Group" to "Best Group (Median)"
- `CategoryStats`: Rename `medianDispersion` to `medianBestGroup`
- Add documentation explaining this is "median of best groups", not "median grouping"

---

## 3. Totals Clarity (HIGH)

### Problem
Both "Hit %" (median) and "Accuracy" (weighted) are shown without clear distinction.

### Solution
Explicit naming:
| ID | Label | Calculation | Subtitle |
|----|-------|-------------|----------|
| `overall_accuracy` | Overall Accuracy | total hits / total shots | "weighted" |
| `typical_accuracy` | Typical Session | median(session accuracy) | "median" |

---

## 4. Context-Aware Thresholds (HIGH)

### Problem
Flat thresholds (5%, 0.5cm) don't scale across contexts.

### Solution
```typescript
/**
 * Calculate context-aware accuracy threshold
 * Uses max(absolute_floor, relative_percent * baseline)
 */
function getAccuracyThreshold(baselineAccuracy: number): number {
  const ABSOLUTE_FLOOR = 5;        // Minimum 5pp change
  const RELATIVE_FACTOR = 0.15;    // Or 15% of baseline
  return Math.max(ABSOLUTE_FLOOR, baselineAccuracy * RELATIVE_FACTOR);
}

/**
 * Calculate context-aware grouping threshold
 * Scales by distance bucket
 */
function getGroupingThreshold(distanceBucket: string): number {
  const thresholds: Record<string, number> = {
    close: 0.3,      // ≤25m: 0.3cm meaningful
    medium: 0.5,     // 25-100m: 0.5cm meaningful
    long: 1.0,       // 100-300m: 1.0cm meaningful
    precision: 1.5,  // 300m+: 1.5cm meaningful
  };
  return thresholds[distanceBucket] ?? 0.5;
}
```

---

## 5. Variance Detection Refinement (MEDIUM)

### Problem
CV calculated across mixed contexts (different distances, positions) produces false positives.

### Solution
1. Calculate variance ONLY within matching context keys
2. Add IQR (Interquartile Range) as robust alternative

```typescript
/**
 * Calculate IQR-based spread (robust to outliers)
 */
function iqrSpread(values: number[]): number {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return q3 - q1;
}
```

---

## 6. Context Profile Module (NEW)

### Purpose
Bridge grouping and engagement metrics without mixing units.

### Context Key Definition
```typescript
interface ContextKey {
  position: string | null;           // prone, standing, kneeling, sitting
  distanceBucket: string | null;     // close, medium, long, precision
  weaponCategory: string | null;     // rifle, pistol, shotgun
  drillType: 'grouping' | 'engagement' | null;
  isTimed: boolean;                  // stress indicator
}
```

### Context Profile
```typescript
interface ContextProfile {
  key: ContextKey;
  keyString: string;  // Serialized for lookup
  
  // Engagement metrics (if applicable)
  engagement: {
    accuracy: number;
    baselineAccuracy: number;
    delta: number;               // current - baseline
    normalizedDelta: number;     // delta / threshold (positive = strength)
    shots: number;
    sessions: number;
    evidenceIds: string[];
  } | null;
  
  // Grouping metrics (if applicable)
  grouping: {
    medianBestGroup: number;
    baselineMedianBestGroup: number;
    delta: number;               // baseline - current (inverted: positive = strength)
    normalizedDelta: number;     // delta / threshold
    sessions: number;
    evidenceIds: string[];
  } | null;
  
  // Classification (2x2 matrix)
  quadrant: ContextQuadrant;
  confidence: ConfidenceLevel;
  isPreliminary: boolean;        // True if context baseline sparse
}

type ContextQuadrant =
  | 'strong_both'        // Good engagement + good grouping
  | 'hits_loose'         // Good engagement + weak grouping
  | 'tight_misses'       // Weak engagement + good grouping
  | 'struggling'         // Weak engagement + weak grouping
  | 'engagement_only'    // Only engagement data
  | 'grouping_only'      // Only grouping data
  | 'insufficient_data'; // Not enough data
```

### Computation
```typescript
export function computeContextProfiles(
  sessions: SessionWithDetails[],
  globalBaseline: BaselineValues
): ContextProfile[];
```

---

## Implementation Order

1. **Phase 1: Types** - Add new types to `insights.types.ts`
2. **Phase 2: Baseline** - Implement `computeBaselines()` 
3. **Phase 3: Thresholds** - Replace flat thresholds
4. **Phase 4: Totals** - Split accuracy metrics
5. **Phase 5: Grouping Semantics** - Rename throughout
6. **Phase 6: Variance** - Implement context-scoped variance
7. **Phase 7: Context Profiles** - New module
8. **Phase 8: Tests** - Add/update tests

---

## Backward Compatibility

- All existing exports remain available
- Existing tests must continue passing
- New features are additive (opt-in)
- UI components unchanged (types extend, not break)
