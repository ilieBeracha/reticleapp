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

// Watch detection sensitivity
export { SensitivitySelector } from './SensitivitySelector';

// Category drill picker - shows real drills that sessions MUST follow
export { CategoryDrillPicker } from './CategoryDrillPicker';

// Form system (unified session creation/editing)
export * from './form';

// Timeline (biometric data visualization)
export { SessionTimelineChart, useSessionTimeline } from './timeline';

