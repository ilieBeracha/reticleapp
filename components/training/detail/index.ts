/**
 * Training Detail Components
 * Barrel export for all training detail components
 */

// Types
export type {
  Colors,
  PhaseConfig,
  PhaseStatus,
  TrainingPhase,
  DrillProgressItem,
  TimelineNodeProps,
  PhaseSectionProps,
  DrillChapterProps,
  ExecutionPhaseContentProps,
  DebriefPhaseContentProps,
  TrainingHeroProps,
  ContextCardsProps,
  AutoCloseCountdownProps,
  TrainingSettingsModalProps,
  StartTrainingSheetProps,
  CommanderActionsSheetProps,
} from './types';

// Helpers
export { 
  getPhaseStatus, 
  getPhaseNarrativeText, 
  calculateTrainingDuration,
  areAllDrillsCompleted,
} from './helpers';

// Animated Components
export { PulsingDot, LiveDot } from './AnimatedComponents';

// Timeline Components
export { TimelineNode } from './TimelineNode';
export { PhaseSection } from './PhaseSection';

// Drill Components
export { DrillChapter } from './DrillChapter';

// Phase Content Components
export { SetupPhaseContent } from './SetupPhaseContent';
export { ExecutionPhaseContent } from './ExecutionPhaseContent';
export { DebriefPhaseContent } from './DebriefPhaseContent';
export { SquadStatusContent } from './SquadStatusContent';

// Hero & Context Components
export { TrainingHero } from './TrainingHero';
export { ContextCards } from './ContextCards';

// Countdown Component
export { AutoCloseCountdown } from './AutoCloseCountdown';

// Modal Components
export { TrainingSettingsModal } from './TrainingSettingsModal';
export { StartTrainingSheet } from './StartTrainingSheet';
export { CommanderActionsSheet } from './CommanderActionsSheet';
export { AddDrillModal } from './AddDrillModal';
