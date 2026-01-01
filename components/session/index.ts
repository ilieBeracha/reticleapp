/**
 * Session Components
 * 
 * Organized components for the active session screen
 */

// Active session components
export { StatCard } from './StatCard';
export { TargetCard } from './TargetCard';
export { TargetDetailModal } from './TargetDetailModal';
export { SessionHeader } from './SessionHeader';
export { EmptyTargets } from './EmptyTargets';

// Prompts
export { WatchControlPrompt, useWatchControlPrompt } from './WatchControlPrompt';
export { SaveDrillPrompt } from './SaveDrillPrompt';

// Category drill picker - shows real drills that sessions MUST follow
export { CategoryDrillPicker } from './CategoryDrillPicker';

// Form system (unified session creation/editing)
export * from './form';

