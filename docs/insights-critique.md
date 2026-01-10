# Insights System - Current State & Critique

## Current Flow (Jan 2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                     INSIGHTS DASHBOARD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Stats Bar (Sessions | Accuracy | Shots)                  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ Monthly Trends  │  │ Training        │                      │
│  │ [AI Button]     │  │ Consistency     │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ Shot Goal       │  │ Streak          │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ By Weapon       │  │ By Position     │                      │
│  │ [AI Button]     │  │ [AI Button]     │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ By Distance     │  │ Session Types   │                      │
│  │ [AI Button]     │  │                 │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ All-Time Stats [AI Button]              │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                          │
                          │ User taps AI button
                          ▼

┌─────────────────────────────────────────────────────────────────┐
│                     AI INSIGHT SHEET                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 Distance                                                    │
│     AI Analysis                                                 │
│                                                                 │
│  ┃ "Your accuracy drops 18% beyond 25m..."                     │
│                                                                 │
│  • Observation 1                                                │
│  • Observation 2                                                │
│                                                                 │
│  → Recommendation: "Practice more at 25m+"                      │
│                                                                 │
│     Based on your training data                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ❌ PROBLEMS (User Feedback)

### 1. Static / Same Data Every Time
> "I think it's weird to always see same overall data"

The dashboard shows **aggregate lifetime stats** that barely change session-to-session:
- Total sessions: 47 → 48 (who cares?)
- Overall accuracy: 76% → 76% (no visible change)
- By weapon breakdown: same percentages

**User doesn't feel progress or change.**

### 2. No Actions, Just Display
> "User needs to see changeable data or take actions on it"

Current system is **read-only**:
- See stats ✓
- Take action on them ✗
- Set goals based on them ✗
- Dismiss/acknowledge insights ✗
- Mark as "working on it" ✗

**Insights are passive, not actionable.**

### 3. Disconnected Cards
> "Just displayed separately in cards (weird as is)"

Each card is an island:
- No connection between "By Weapon" and "By Distance"
- No story: "Your rifle is weak at long range" 
- AI insights also isolated per-widget

**No coherent narrative or prioritization.**

### 4. Not Actually Helping
> "Just not really helping me"

The AI says "practice more at 25m" but:
- I can't tap to create a 25m drill
- I can't set this as my focus area
- I can't track if I'm addressing it
- It says the same thing next week

**Insight → Action gap is huge.**

---

## 🤔 What Would Actually Help?

### Option A: Delta-Focused Insights
Show **what changed** since last session/week:
```
┌─────────────────────────────────────────┐
│ Since Last Week                         │
│                                         │
│ ↑ Accuracy improved 4% at medium range  │
│ ↓ Fewer prone sessions (-3)             │
│ → Rifle performance stable              │
│                                         │
│ [Show Details]                          │
└─────────────────────────────────────────┘
```

### Option B: Actionable Insights with Follow-through
```
┌─────────────────────────────────────────┐
│ 🎯 Focus Area: Long Range               │
│                                         │
│ "Your 25m+ accuracy is 58%"             │
│                                         │
│ Progress: ████░░░░░░ 2/5 sessions       │
│                                         │
│ [Start Session]  [Dismiss]  [Complete]  │
└─────────────────────────────────────────┘
```

### Option C: Insight Feed (Not Dashboard)
Instead of static cards, show a **feed of moments**:
```
┌─────────────────────────────────────────┐
│ Today                                   │
│ ✓ New personal best: 89% at 15m         │
│                                         │
│ This Week                               │
│ ! Your standing accuracy dropped 12%    │
│   [Create standing drill]               │
│                                         │
│ Milestone                               │
│ 🏆 500 shots fired this month           │
└─────────────────────────────────────────┘
```

### Option D: Remove Insights Dashboard Entirely
- Show insights **inline** in session detail after completing
- Show insights **on home** only when something notable happens
- Don't have a dedicated "insights" tab that's always the same

---

## Current Technical Stack

### Data Flow
```
Session Complete
      │
      ▼
Supabase Edge Function: generate-insights
      │
      ├── Upsert to Pinecone (session embedding)
      ├── Find similar sessions (baseline)
      ├── Detect anomalies (notable events)
      │
      ▼
On-demand: User taps AI button on widget
      │
      ▼
Edge Function: widget_insight mode
      │
      ├── Query Pinecone for context
      ├── Call Claude LLM
      ├── Return: summary, observations, recommendation
      │
      ▼
Display in AI Insight Sheet (cached 10 min)
```

### What Pinecone Is Used For
- Store session embeddings (features → text → vector)
- Find "similar sessions" for baseline comparison
- Provide context to LLM for insight generation

### What's NOT Being Used
- Pinecone for recommendation (e.g., "users like you improved by...")
- Real-time anomaly alerts
- Goal tracking integration
- Session-specific insights (only widget-level)

---

## Decision Needed

1. **Keep current system** but make it change-focused (show deltas)?
2. **Make insights actionable** (link to drills, goals, dismissable)?
3. **Move to feed model** (event-driven, not dashboard)?
4. **Remove dedicated insights page** (inline only)?

The current implementation feels like a demo feature, not a product feature.

---

## ✅ DIRECTION CHOSEN (Jan 2026)

### Core Principle

> **"Insights should explain meaningful change, not motivate behavior."**

This is a **training log + analyst**, not a coach shouting achievements.

---

### What We're NOT Building

- ❌ Gamification (streaks as motivation)
- ❌ Feeds that feel social
- ❌ Focus systems that feel like tasks
- ❌ Progress bars everywhere
- ❌ "You should do X now" energy
- ❌ Achievement moments
- ❌ Proactive AI commentary

---

### What We ARE Building

**A stable analytical system that highlights meaningful change and gives restrained, optional guidance.**

Think **financial analytics**, not fitness apps.

---

## The Correct Model

### 1. Insights Are Comparative (Not Static)

Each insight answers ONE question:
> "Compared to the last relevant period, what changed meaningfully?"

**Current (Wrong):**
```
BY DISTANCE
0-10m: 87%
10-25m: 74%
25m+: 58%
```

**Correct:**
```
Distance Analysis
─────────────────────────────
Compared to last 5 sessions:

• ≤15m: stable (±1%)
• 15–25m: +4% accuracy
• 25m+: −11% accuracy ⚠

Last updated: 2 sessions ago
[Explain change]
```

---

### 2. AI Moves Behind "Explain" — Not "Generate"

AI should **never push insights proactively**.

- System computes deltas **deterministically**
- AI only answers: *"Why might this be happening?"*

**UI Change:**
- Replace `[AI Button]` with `[Explain change]`
- Only show when there IS a meaningful change
- AI explains, doesn't prescribe

---

### 3. Every Insight Must Be Scoped

Every insight states:
- Time window
- Data volume  
- Confidence level

```
Standing Accuracy
─────────────────────────────
Change detected over last 7 sessions (142 shots)

Accuracy decreased by 9%

Confidence: medium
Reason: increased variance between sessions

[Explain]
```

This removes the "demo" feeling.

---

### 4. Actions Are Analytical, Not Directives

No "Start drill", no "Focus mode" buttons.

Instead, **soft affordances**:
```
Possible follow-ups:
• View sessions contributing to this change
• Compare with prone position
• Create filtered view (25m+, standing)
```

Actions are **analytical tools**, not directives.

---

### 5. Session Annotations (Not Session Insights)

After a session, show neutral context:
```
Session Summary
─────────────────────────────
This session contributed to:
• Long-range accuracy trend
• Standing position variance

No notable changes detected.
```

Neutral. Stable. Professional.

---

## Pinecone Role (Refined)

Keep Pinecone for **selecting comparison baseline**, not for generating text.

Use it to say:
> "Compared against your 20 most similar sessions (same weapon + distance range)"

That's a **methodology disclosure**, not an insight.

---

## Implementation Priority

1. **Refactor widgets to be comparative** (show delta, not absolute)
2. **Add scope metadata** (time window, shot count, confidence)
3. **Move AI to "Explain" mode** (only when change exists)
4. **Remove proactive AI buttons** from stable metrics
5. **Simplify dashboard** (fewer cards, more meaning)

---

*Last updated: Jan 2026*
*Status: Direction confirmed, implementation pending*
