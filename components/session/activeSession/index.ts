/**
 * Active Session Module
 *
 * Session execution phase (steps 4-5 of the mental model):
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ACTIVE SESSION                                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  TYPES                                                                  │
 * │  ├── DrillProgress      → Completion tracking                          │
 * │  ├── NextTargetPlan     → Remaining shots/targets                      │
 * │  ├── SessionMode        → solo | training                              │
 * │  ├── WatchState         → Watch connection state                       │
 * │  └── SessionScore       → Computed score                               │
 * │                                                                         │
 * │  VIEWS                                                                  │
 * │  ├── SessionPrepView    → Pre-session setup                            │
 * │  └── SquadSessionView   → Squad engagement view                        │
 * │                                                                         │
 * │  HOOK                                                                   │
 * │  └── useActiveSession   → All stateful logic                           │
 * │                                                                         │
 * │  HELPERS                                                                │
 * │  ├── formatTime         → MM:SS formatting                             │
 * │  ├── calculateAccuracy  → Accuracy computation                         │
 * │  └── buildWatchPayload  → Watch communication                          │
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
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════

export { SessionPrepView, SquadSessionView, SquadParticipantsCard, GroupSessionView } from './views';
