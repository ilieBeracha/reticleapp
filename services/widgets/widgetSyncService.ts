import type { WeeklyStats } from '@/types/home';
import type { HomeSession } from '@/types/home.viewmodel';
import type {
  ActiveDrillActivityProps,
  PerformanceSnapshotWidgetProps,
  TodayTrainingWidgetProps,
  TodayTrainingStatus,
} from '@/widgets/widgets.types';
import { Platform } from 'react-native';

type WidgetLike<TProps> = {
  updateSnapshot: (props: TProps) => void;
};

type LiveActivityInstance = {
  update: (props: ActiveDrillActivityProps) => Promise<void>;
  end: (dismissalPolicy?: 'default' | 'immediate', props?: ActiveDrillActivityProps, contentDate?: Date) => Promise<void>;
};

type LiveActivityFactory = {
  start: (props: ActiveDrillActivityProps, url?: string) => LiveActivityInstance;
};

let activeDrillInstance: LiveActivityInstance | null = null;

const isSupported = () => Platform.OS === 'ios';
const canUseWidgets = () => isSupported();

const toStatus = (session: HomeSession | null): TodayTrainingStatus => {
  if (!session) return 'idle';
  if (session.state === 'active') return 'active';
  if (session.state === 'completed') return 'completed';
  return 'planned';
};

const toDisplayTitle = (session: HomeSession | null) => {
  if (!session) return 'No training planned';
  return session.trainingTitle || session.drillName || 'Upcoming training';
};

const toDisplayLocation = (session: HomeSession | null) => {
  if (!session) return 'Set your next session';
  return session.teamName || 'Personal training';
};

const toDisplayTime = (session: HomeSession | null) => {
  const date = session?.scheduledAt || session?.startedAt;
  if (!date) return 'Plan next drill';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getCountdownMinutes = (session: HomeSession | null) => {
  const date = session?.scheduledAt;
  if (!date) return 0;
  return Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
};

const getLastScore = (recentSessions: HomeSession[]) => {
  const recentCompleted = recentSessions.find((session) => session.state === 'completed' || session.state === 'unreviewed');
  return recentCompleted?.stats?.accuracy ?? null;
};

const getUpdatedLabel = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

async function getTodayTrainingWidget(): Promise<WidgetLike<TodayTrainingWidgetProps> | null> {
  if (!canUseWidgets()) return null;
  const module = await import('@/widgets/TodayTrainingWidget');
  return module.default as WidgetLike<TodayTrainingWidgetProps>;
}

async function getPerformanceWidget(): Promise<WidgetLike<PerformanceSnapshotWidgetProps> | null> {
  if (!canUseWidgets()) return null;
  const module = await import('@/widgets/PerformanceSnapshotWidget');
  return module.default as WidgetLike<PerformanceSnapshotWidgetProps>;
}

async function getActiveDrillFactory(): Promise<LiveActivityFactory | null> {
  if (!canUseWidgets()) return null;
  const module = await import('@/widgets/ActiveDrillActivity');
  return module.default as LiveActivityFactory;
}

export async function syncHomeWidgets(params: {
  activeSession: HomeSession | null;
  nextSession: HomeSession | null;
  weeklyStats: WeeklyStats;
  streak: number;
  recentSessions: HomeSession[];
}): Promise<void> {
  if (!canUseWidgets()) return;

  const primarySession = params.activeSession ?? params.nextSession;
  const hasTodayData = Boolean(primarySession);
  const lastScore = getLastScore(params.recentSessions);
  const hasPerformanceData = lastScore !== null || params.weeklyStats.accuracy > 0 || params.streak > 0;

  const todayTrainingPayload: TodayTrainingWidgetProps = {
    title: toDisplayTitle(primarySession),
    startTime: toDisplayTime(primarySession),
    location: toDisplayLocation(primarySession),
    status: toStatus(primarySession),
    countdownMinutes: getCountdownMinutes(primarySession),
    hasData: hasTodayData,
  };

  const performancePayload: PerformanceSnapshotWidgetProps = {
    lastScore: Math.max(0, Math.round(lastScore ?? 0)),
    weeklyAccuracy: Math.max(0, Math.round(params.weeklyStats.accuracy)),
    streakDays: Math.max(0, params.streak),
    updatedAt: hasPerformanceData ? getUpdatedLabel() : '--',
    hasData: hasPerformanceData,
  };

  const [todayWidget, performanceWidget] = await Promise.all([getTodayTrainingWidget(), getPerformanceWidget()]);

  todayWidget?.updateSnapshot(todayTrainingPayload);
  performanceWidget?.updateSnapshot(performancePayload);
}

export async function startActiveDrillActivity(payload: ActiveDrillActivityProps): Promise<void> {
  if (!canUseWidgets() || activeDrillInstance) return;
  const activityFactory = await getActiveDrillFactory();
  if (!activityFactory) return;
  activeDrillInstance = activityFactory.start(payload, 'retic://active-session');
}

export async function updateActiveDrillActivity(payload: ActiveDrillActivityProps): Promise<void> {
  if (!canUseWidgets()) return;
  if (!activeDrillInstance) {
    await startActiveDrillActivity(payload);
    return;
  }
  await activeDrillInstance.update(payload);
}

export async function endActiveDrillActivity(payload?: ActiveDrillActivityProps): Promise<void> {
  if (!canUseWidgets() || !activeDrillInstance) return;
  await activeDrillInstance.end('immediate', payload, new Date());
  activeDrillInstance = null;
}
