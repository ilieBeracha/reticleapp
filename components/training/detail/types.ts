/**
 * Training Detail Types
 * Types specific to the training detail view and its components
 */

import type { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import type { UserWeapon } from '@/services/weaponService';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PhaseStatus = 'completed' | 'active' | 'upcoming' | 'locked';
export type TrainingPhase = 'setup' | 'execution' | 'debrief';

export interface PhaseConfig {
  setup: PhaseStatus;
  execution: PhaseStatus;
  debrief: PhaseStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Colors = ReturnType<typeof useColors>;

// ═══════════════════════════════════════════════════════════════════════════
// DRILL PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

export interface DrillProgressItem {
  drillId: string;
  completed: boolean;
  score?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════

export interface TimelineNodeProps {
  status: PhaseStatus;
  isLast: boolean;
  colors: Colors;
}

export interface PhaseSectionProps {
  phase: TrainingPhase;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  isLast?: boolean;
  colors: Colors;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}

export interface DrillChapterProps {
  drill: any;
  chapterNumber: number;
  totalChapters?: number;
  isCompleted: boolean;
  canStart: boolean;
  onStart: () => void;
  isStarting: boolean;
  colors: Colors;
}

export interface ExecutionPhaseContentProps {
  training: any;
  drillProgress: DrillProgressItem[];
  teamSessions?: SessionWithDetails[];
  sessionsByDrill?: Map<string, SessionWithDetails[]>;
  colors: Colors;
  canManageTraining: boolean;
  startingDrillId: string | null;
  onStartDrill: (drill: any) => void;
  onAddDrill: () => void;
}

export interface DebriefPhaseContentProps {
  training: any;
  drillProgress: DrillProgressItem[];
  colors: Colors;
  canManageTraining: boolean;
}

export interface TrainingHeroProps {
  training: any;
  colors: Colors;
  onAutoCloseExpired: () => void;
}

export interface ContextCardsProps {
  training: any;
  userWeapon: UserWeapon | null;
  teamSessions: SessionWithDetails[];
  colors: Colors;
  canManageTraining: boolean;
  onAssignWeapon: () => void;
}

export interface AutoCloseCountdownProps {
  autoCloseAt: string;
  colors: Colors;
  onExpired: () => void;
}

export interface TrainingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  training: any;
  onUpdate: (data: any) => void;
  colors: Colors;
}

export interface StartTrainingSheetProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
  colors: Colors;
}

export interface CommanderActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddDrill: () => void;
  onAssignWeapon: () => void;
  onFinishTraining: () => void;
  onSettings: () => void;
  onCancel: () => void;
  trainingStatus: string;
  colors: Colors;
}
