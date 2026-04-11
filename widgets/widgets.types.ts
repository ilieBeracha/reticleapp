export type TodayTrainingStatus = 'idle' | 'planned' | 'active' | 'completed';

export interface TodayTrainingWidgetProps {
  title: string;
  startTime: string;
  location: string;
  status: TodayTrainingStatus;
  countdownMinutes: number;
  hasData: boolean;
}

export interface PerformanceSnapshotWidgetProps {
  lastScore: number;
  weeklyAccuracy: number;
  streakDays: number;
  updatedAt: string;
  hasData: boolean;
}

export interface ActiveDrillActivityProps {
  drillName: string;
  stage: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  score: number;
  hasData: boolean;
}

/** One upcoming training item, flattened for the widget. */
export interface DashboardTrainingItem {
  id: string;
  title: string;
  /** Pre-formatted date string, e.g. "Mon, Apr 14 · 18:00". */
  when: string;
  /** Short location/team label, e.g. "Alpha Squad". */
  location: string;
  /** Status tag: 'live', 'next', 'scheduled', 'completed'. */
  state: 'live' | 'next' | 'scheduled' | 'completed';
}

export interface TrainingDashboardWidgetProps {
  /** Up to 3 upcoming trainings. */
  trainings: DashboardTrainingItem[];
  /** Number of sessions completed this week. */
  weeklySessions: number;
  /** Weekly accuracy percentage (0-100). */
  weeklyAccuracy: number;
  /** Current streak in days. */
  streakDays: number;
  /** HH:MM label, e.g. "20:46". */
  updatedAt: string;
  hasData: boolean;
}
