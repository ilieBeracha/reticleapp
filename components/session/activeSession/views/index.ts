/**
 * Active Session Views
 *
 * View components for different session execution modes.
 *
 * Session Flow:
 * 1. SessionPrepView     → Pre-session setup (pending status)
 * 2. Then one of:
 *    - SoloSessionView   → Solo practice (full features)
 *    - TeamTrainingView  → Team training (focused, locked)
 *    - SquadSessionView  → Squad engagement (collaborative targets)
 *    - GroupSessionView  → Group engagement (simple shot/hit entry)
 *    - Watch views       → When watch is controlling session
 */

// Main session views
export { SessionPrepView } from '../SessionPrepView';
export { SoloSessionView } from '../SoloSessionView';
export { TeamTrainingView } from '../TeamTrainingView';
export { SquadSessionView } from '../SquadSessionView';
export { GroupSessionView } from '../GroupSessionView';

// Squad/Group helpers
export { SquadParticipantsCard } from '../SquadParticipantsCard';

// Watch views
export {
  WatchFailedView,
  WatchStartingView,
  WatchPreviewView,
  WatchWaitingView,
} from '../watch';
