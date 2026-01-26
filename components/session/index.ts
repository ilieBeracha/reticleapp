/**
 * Session Components
 *
 * Organized components for the active session screen
 */

export { TargetCard } from './TargetCard';
// Prompts

// Capture mode selection
export { CaptureModePicker, CaptureModePickerInline } from './CaptureModePicker';
export type { CaptureMode, CaptureModeSelection } from './CaptureModePicker';

// Category drill picker - shows real drills that sessions MUST follow
export { CategoryDrillPicker } from './CategoryDrillPicker';

// Timeline hook for session detail
export { useSessionTimeline } from './useSessionTimeline';
