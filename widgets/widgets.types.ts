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
}
