/**
 * Session Components
 *
 * Organized components for the active session screen
 */

// Active session components
export { EmptyTargets } from './EmptyTargets';
export { SessionHeader } from './SessionHeader';
export { StatCard } from './StatCard';
export { TargetCard } from './TargetCard';
export { TargetDetailModal } from './TargetDetailModal';

// Prompts
export { SaveDrillPrompt } from './SaveDrillPrompt';
export { useWatchControlPrompt, WatchControlPrompt } from './WatchControlPrompt';

// Capture mode selection
export { CaptureModePicker, CaptureModePickerInline } from './CaptureModePicker';
export type { CaptureMode, CaptureModeSelection } from './CaptureModePicker';

// Category drill picker - shows real drills that sessions MUST follow
export { CategoryDrillPicker } from './CategoryDrillPicker';

// Timeline hook for session detail
export { useSessionTimeline } from './useSessionTimeline';
