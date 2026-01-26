/**
 * Training Detail Components
 * Barrel export for all training detail components
 */

// Types
export type {
  AutoCloseCountdownProps,
  Colors,
  CommanderActionsSheetProps,
  ContextCardsProps,
  DebriefPhaseContentProps,
  DrillChapterProps,
  DrillProgressItem,
  ExecutionPhaseContentProps,
  PhaseConfig,
  PhaseSectionProps,
  PhaseStatus,
  ReadinessItem,
  StartTrainingSheetProps,
  TimelineNodeProps,
  TrainingHeroProps,
  TrainingPhase,
  TrainingReadinessCardProps,
  TrainingSettingsModalProps
} from './types';

// Helpers
export { areAllDrillsCompleted, calculateTrainingDuration, getPhaseNarrativeText, getPhaseStatus } from './helpers';

// Animated Components
export { LiveDot, PulsingDot } from './AnimatedComponents';

// Timeline Components
export { PhaseSection } from './PhaseSection';
export { TimelineNode } from './TimelineNode';

// Drill Components
export { DrillChapter } from './DrillChapter';

// Phase Content Components
export { DebriefPhaseContent } from './DebriefPhaseContent';
export { ExecutionPhaseContent } from './ExecutionPhaseContent';
export { SetupPhaseContent } from './SetupPhaseContent';
export { SquadStatusContent } from './SquadStatusContent';

// Hero & Context Components
export { ContextCards } from './ContextCards';
export { TrainingHero } from './TrainingHero';

// Countdown Component
export { AutoCloseCountdown } from './AutoCloseCountdown';

// Modal Components
export { AddDrillModal } from './AddDrillModal';
export { CommanderActionsSheet } from './CommanderActionsSheet';
export { StartTrainingSheet } from './StartTrainingSheet';
export { TrainingSettingsModal } from './TrainingSettingsModal';

// Readiness Card
export { TrainingReadinessCard } from './TrainingReadinessCard';

// Custom Session
export { CustomSessionCard } from './CustomSessionCard';
export type { CustomSessionConfig } from './CustomSessionCard';

// Tab-based Training Components
export { AddSessionButton } from './AddSessionButton';
export type { AddSessionButtonProps } from './AddSessionButton';
export { SessionTabs } from './SessionTabs';
export type { SessionTabsProps } from './SessionTabs';
export { TrainingSessionCard } from './TrainingSessionCard';
export type { TrainingSessionCardProps } from './TrainingSessionCard';

