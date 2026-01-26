/**
 * Session Creation Module
 *
 * Step-based session creation flow:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  CREATION FLOW                                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  Step 1: INTENT - "What am I going to do?"                              │
 * │     └── PurposeSelector (grouping vs engagement)                        │
 * │                                                                         │
 * │  Step 2: CONTEXT - "Under what conditions?"                             │
 * │     └── SessionContextStep (weapon, distance, shots, position)          │
 * │                                                                         │
 * │  Engagement Mode (engagement drills only):                              │
 * │     ├── EngagementModeToggle (solo vs squad)                           │
 * │     └── InviteParticipantsPanel (squad member selection)               │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export * from './sessionCreation.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export * from './sessionCreation.constants';

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export { useSessionCreation } from './useSessionCreation';
export type { TrainingContext, UseSessionCreationOptions, UseSessionCreationReturn } from './useSessionCreation';

// ═══════════════════════════════════════════════════════════════════════════
// INTENT - Step 1
// ═══════════════════════════════════════════════════════════════════════════

export { PurposeSelector } from './intent';

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT - Step 2
// ═══════════════════════════════════════════════════════════════════════════

export { SessionContextStep } from './SessionContextStep';

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT (engagement drills only)
// ═══════════════════════════════════════════════════════════════════════════

export { EngagementModeToggle, InviteParticipantsPanel } from './engagement';
