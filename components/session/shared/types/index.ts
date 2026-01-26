/**
 * Session Shared Types
 *
 * Core type definitions for the session system.
 * These types are used across creation, active session, and history.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SESSION MENTAL MODEL                                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  1. DRILL GOAL - What you're measuring                                  │
 * │     ├── grouping    → Shot dispersion/consistency → ALWAYS solo        │
 * │     └── engagement  → Hit accuracy/speed         → Can be solo/squad   │
 * │                                                                         │
 * │  2. SESSION CONTEXT - Who owns it                                       │
 * │     ├── solo (personal)  → team_id: null, training_id: null            │
 * │     └── training (team)  → team_id: uuid, training_id: uuid            │
 * │                                                                         │
 * │  3. ENGAGEMENT MODE - How it executes (engagement drills only)          │
 * │     ├── solo  → One shooter, individual results                        │
 * │     └── squad → Multiple participants, async execution                 │
 * │                                                                         │
 * │  4. EXECUTION POLICY - How strict is drill config                       │
 * │     ├── locked → Must execute exactly as defined (qualification)        │
 * │     ├── guided → Defaults provided, adjustments allowed (training)      │
 * │     └── free   → Full freedom (open practice)                           │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// Drill Goal - WHAT you're measuring
export { isEngagement, isGrouping } from './drillGoal.types';
export type { DrillGoal } from './drillGoal.types';

// Session Context - WHO owns it
export { deriveSessionContext, isSoloSession, isTrainingSession } from './sessionContext.types';
export type { SessionContext } from './sessionContext.types';

// Engagement Mode - HOW it executes
export { enforceEngagementMode, isSquadAllowed, shouldShowEngagementModeToggle } from './engagementMode.types';
export type { EngagementMode } from './engagementMode.types';

// Execution Policy - HOW STRICT
export { canEditConfig, deriveExecutionPolicy, getDefaultExecutionPolicy } from './executionPolicy.types';
export type { ExecutionPolicy } from './executionPolicy.types';
