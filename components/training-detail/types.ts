import type { SessionWithDetails } from '@/services/sessionService';
import type { DrillProgress } from '@/services/trainingService';
import type { TrainingDrill, TrainingStatus, TrainingWithDetails } from '@/types/workspace';

export type { DrillProgress, SessionWithDetails, TrainingDrill, TrainingStatus, TrainingWithDetails };

export interface StatusConfig {
  color: string;
  bg: string;
  icon: 'calendar' | 'play-circle' | 'checkmark-circle' | 'close-circle';
  label: string;
}

export interface ThemeColors {
  background: string;
  text: string;
  textMuted: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  [key: string]: string;
}
