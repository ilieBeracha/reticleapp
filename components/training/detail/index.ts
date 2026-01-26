/**
 * Training Detail Components
 * Barrel export for training detail components
 * 
 * NOTE: Training is a READ-ONLY dashboard. All execution components have been removed.
 * Execution happens in the Engagement flow, not here.
 */

// Types - Only export types still in use
export type {
  AutoCloseCountdownProps,
  Colors,
  TrainingHeroProps,
  TrainingSettingsModalProps
} from './types';

// Hero & Display Components
export { TrainingHero } from './TrainingHero';

// Countdown Component
export { AutoCloseCountdown } from './AutoCloseCountdown';

// Animated Components
export { LiveDot, PulsingDot } from './AnimatedComponents';

// Settings Modal (administrative only, no execution)
export { TrainingSettingsModal } from './TrainingSettingsModal';
