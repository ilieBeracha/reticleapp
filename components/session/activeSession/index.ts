/**
 * Active Session Module
 *
 * Session execution phase - where the actual shooting happens.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ACTIVE SESSION                                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  VIEWS (what gets rendered)                                             │
 * │  ├── SessionPrepView    → Pending status, waiting to start              │
 * │  ├── SoloSessionView    → Solo practice, full features                  │
 * │  ├── TeamTrainingView   → Team training, focused/locked                 │
 * │  ├── SquadSessionView   → Squad engagement, collaborative               │
 * │  ├── GroupSessionView   → Group engagement, simple entry                │
 * │  └── Watch views        → When watch controls the session               │
 * │                                                                         │
 * │  COMPONENTS (reusable pieces)                                           │
 * │  ├── HeroTarget         → Large preview of latest target                │
 * │  ├── CompactStats       → Horizontal stats bar                          │
 * │  └── DrillBanner        → Drill requirements and progress               │
 * │                                                                         │
 * │  HOOK                                                                   │
 * │  └── useActiveSession   → All stateful logic for session screen         │
 * │                                                                         │
 * │  HELPERS                                                                │
 * │  ├── formatTime         → MM:SS formatting                              │
 * │  ├── calculateAccuracy  → Accuracy computation                          │
 * │  └── buildWatchPayload  → Watch communication                           │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export * from './activeSession.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export * from './activeSession.constants';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS (pure functions)
// ═══════════════════════════════════════════════════════════════════════════

export * from './activeSession.helpers';

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

export { styles } from './activeSession.styles';

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export { useActiveSession } from './useActiveSession';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS (reusable UI pieces)
// ═══════════════════════════════════════════════════════════════════════════

export { CompactStats, DrillBanner, HeroTarget } from './components';

// ═══════════════════════════════════════════════════════════════════════════
// VIEWS (full screen components)
// ═══════════════════════════════════════════════════════════════════════════

export {
    GroupSessionView,
    // Main views
    SessionPrepView,
    SoloSessionView, SquadParticipantsCard, SquadSessionView, TeamTrainingView,
    // Watch views
    WatchFailedView, WatchPreviewView, WatchStartingView, WatchWaitingView
} from './views';
