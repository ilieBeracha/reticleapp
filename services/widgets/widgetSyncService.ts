import type { WeeklyStats } from '@/types/home';
import type { HomeSession } from '@/types/home.viewmodel';
import type {
  ActiveDrillActivityProps,
  DashboardTrainingItem,
  PerformanceSnapshotWidgetProps,
  TodayTrainingStatus,
  TodayTrainingWidgetProps,
  TrainingDashboardWidgetProps,
} from '@/widgets/widgets.types';
import { Platform } from 'react-native';

// ────────────────────────────────────────────────────────────────────────────
// Debug instrumentation
// ────────────────────────────────────────────────────────────────────────────
// All widget sync operations are logged under the `[widget-sync]` prefix when
// running in dev. Set EXPO_PUBLIC_WIDGET_DEBUG_SEED=1 to push a rotating fake
// payload so you can confirm visibility independently of real data.
const WIDGET_DEBUG = __DEV__;
const DEBUG_SEED = __DEV__ && process.env.EXPO_PUBLIC_WIDGET_DEBUG_SEED === '1';
const wlog = (...args: unknown[]) => {
  if (WIDGET_DEBUG) console.log('[widget-sync]', ...args);
};
const wwarn = (...args: unknown[]) => {
  if (WIDGET_DEBUG) console.warn('[widget-sync]', ...args);
};

type WidgetLike<TProps> = {
  updateSnapshot: (props: TProps) => void;
};

type LiveActivityInstance = {
  update: (props: ActiveDrillActivityProps) => Promise<void>;
  end: (
    dismissalPolicy?: 'default' | 'immediate',
    props?: ActiveDrillActivityProps,
    contentDate?: Date
  ) => Promise<void>;
};

type LiveActivityFactory = {
  start: (props: ActiveDrillActivityProps, url?: string) => LiveActivityInstance;
};

let activeDrillInstance: LiveActivityInstance | null = null;

// Cached module references so we only resolve the dynamic imports once.
let todayWidgetCache: WidgetLike<TodayTrainingWidgetProps> | null | undefined;
let performanceWidgetCache: WidgetLike<PerformanceSnapshotWidgetProps> | null | undefined;
let dashboardWidgetCache: WidgetLike<TrainingDashboardWidgetProps> | null | undefined;
let activeDrillFactoryCache: LiveActivityFactory | null | undefined;

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
  const recentCompleted = recentSessions.find(
    (session) => session.state === 'completed' || session.state === 'unreviewed'
  );
  return recentCompleted?.stats?.accuracy ?? null;
};

const getUpdatedLabel = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function describeHandle(label: string, handle: unknown) {
  if (!WIDGET_DEBUG) return;
  if (handle == null) {
    wwarn(`${label}: resolved module default is null/undefined`);
    return;
  }
  const ctor = (handle as { constructor?: { name?: string } }).constructor?.name ?? typeof handle;
  const updateSnapshotType = typeof (handle as { updateSnapshot?: unknown }).updateSnapshot;
  wlog(`${label}: handle ctor=${ctor} updateSnapshot=${updateSnapshotType}`);
}

async function getTodayTrainingWidget(): Promise<WidgetLike<TodayTrainingWidgetProps> | null> {
  if (!canUseWidgets()) return null;
  if (todayWidgetCache !== undefined) return todayWidgetCache;
  try {
    const mod = await import('@/widgets/TodayTrainingWidget');
    const handle = (mod?.default ?? null) as WidgetLike<TodayTrainingWidgetProps> | null;
    describeHandle('today', handle);
    todayWidgetCache = handle;
    return handle;
  } catch (e) {
    wwarn('today: import failed', e);
    todayWidgetCache = null;
    return null;
  }
}

async function getPerformanceWidget(): Promise<WidgetLike<PerformanceSnapshotWidgetProps> | null> {
  if (!canUseWidgets()) return null;
  if (performanceWidgetCache !== undefined) return performanceWidgetCache;
  try {
    const mod = await import('@/widgets/PerformanceSnapshotWidget');
    const handle = (mod?.default ?? null) as WidgetLike<PerformanceSnapshotWidgetProps> | null;
    describeHandle('perf', handle);
    performanceWidgetCache = handle;
    return handle;
  } catch (e) {
    wwarn('perf: import failed', e);
    performanceWidgetCache = null;
    return null;
  }
}

async function getDashboardWidget(): Promise<WidgetLike<TrainingDashboardWidgetProps> | null> {
  if (!canUseWidgets()) return null;
  if (dashboardWidgetCache !== undefined) return dashboardWidgetCache;
  try {
    const mod = await import('@/widgets/TrainingDashboardWidget');
    const handle = (mod?.default ?? null) as WidgetLike<TrainingDashboardWidgetProps> | null;
    describeHandle('dashboard', handle);
    dashboardWidgetCache = handle;
    return handle;
  } catch (e) {
    wwarn('dashboard: import failed', e);
    dashboardWidgetCache = null;
    return null;
  }
}

async function getActiveDrillFactory(): Promise<LiveActivityFactory | null> {
  if (!canUseWidgets()) return null;
  if (activeDrillFactoryCache !== undefined) return activeDrillFactoryCache;
  try {
    const mod = await import('@/widgets/ActiveDrillActivity');
    const handle = (mod?.default ?? null) as LiveActivityFactory | null;
    describeHandle('active-drill', handle);
    activeDrillFactoryCache = handle;
    return handle;
  } catch (e) {
    wwarn('active-drill: import failed', e);
    activeDrillFactoryCache = null;
    return null;
  }
}

// Safety-net reload. Calls `.reload()` on each already-resolved Widget handle.
// This is the public `Widget.reload()` API, which internally maps to
// `WidgetCenter.shared.reloadTimelines(ofKind: name)` on the native side.
// `updateSnapshot` already triggers the same native reload path, so this is
// only useful to call independently (e.g. debugForceWidgetReload) when you
// want to force-refresh without pushing new data.
function forceReloadCachedWidgets() {
  if (!canUseWidgets()) return;
  const handles: Array<{ reload?: () => void; label: string }> = [
    {
      reload: (todayWidgetCache as unknown as { reload?: () => void } | null)?.reload?.bind(
        todayWidgetCache
      ),
      label: 'today',
    },
    {
      reload: (
        performanceWidgetCache as unknown as { reload?: () => void } | null
      )?.reload?.bind(performanceWidgetCache),
      label: 'perf',
    },
    {
      reload: (
        dashboardWidgetCache as unknown as { reload?: () => void } | null
      )?.reload?.bind(dashboardWidgetCache),
      label: 'dashboard',
    },
  ];
  for (const { reload, label } of handles) {
    try {
      if (typeof reload === 'function') {
        reload();
        wlog(`${label}: reload() called`);
      }
    } catch (e) {
      wwarn(`${label}: reload() threw`, e);
    }
  }
}

function safeUpdateSnapshot<T>(label: string, widget: WidgetLike<T> | null, payload: T) {
  if (!widget) {
    wwarn(`${label}: widget handle unavailable, skipping updateSnapshot`);
    return false;
  }
  const fn = (widget as { updateSnapshot?: unknown }).updateSnapshot;
  if (typeof fn !== 'function') {
    wwarn(`${label}: updateSnapshot is not a function (typeof=${typeof fn})`);
    return false;
  }
  try {
    widget.updateSnapshot(payload);
    wlog(`${label}: updateSnapshot ok`);
    return true;
  } catch (e) {
    wwarn(`${label}: updateSnapshot threw`, e);
    return false;
  }
}

const toDashboardRowLabel = (session: HomeSession): string => {
  const date = session.scheduledAt || session.startedAt;
  if (!date) return 'No date';
  const dayPart = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dayPart} · ${timePart}`;
};

const toDashboardRowState = (
  session: HomeSession,
  activeSessionId?: string | null
): DashboardTrainingItem['state'] => {
  if (session.state === 'completed' || session.state === 'unreviewed') return 'completed';
  if (session.state === 'active') return 'live';
  if (activeSessionId && session.id === activeSessionId) return 'next';
  return 'scheduled';
};

const buildDashboardItems = (params: {
  activeSession: HomeSession | null;
  nextSession: HomeSession | null;
  upcomingSessions: HomeSession[];
}): DashboardTrainingItem[] => {
  const collected: DashboardTrainingItem[] = [];
  const pushed = new Set<string>();

  const push = (session: HomeSession | null) => {
    if (!session || pushed.has(session.id)) return;
    pushed.add(session.id);
    collected.push({
      id: session.id,
      title: session.trainingTitle || session.drillName || 'Upcoming training',
      when: toDashboardRowLabel(session),
      location: session.teamName || 'Personal training',
      state: toDashboardRowState(session, params.activeSession?.id ?? null),
    });
  };

  // The widget's "UPCOMING" section must only contain upcoming items
  // (live/active, next scheduled, and remaining planned trainings). Completed
  // sessions are intentionally excluded here — the weekly KPI strip already
  // reflects completed activity.
  push(params.activeSession);
  push(params.nextSession);
  for (const s of params.upcomingSessions) {
    if (collected.length >= 3) break;
    push(s);
  }
  return collected.slice(0, 3);
};

function buildRealPayloads(params: {
  activeSession: HomeSession | null;
  nextSession: HomeSession | null;
  weeklyStats: WeeklyStats;
  streak: number;
  recentSessions: HomeSession[];
  upcomingSessions: HomeSession[];
}): {
  today: TodayTrainingWidgetProps;
  performance: PerformanceSnapshotWidgetProps;
  dashboard: TrainingDashboardWidgetProps;
} {
  const primarySession = params.activeSession ?? params.nextSession;
  const hasTodayData = Boolean(primarySession);
  const lastScore = getLastScore(params.recentSessions);
  const hasPerformanceData =
    lastScore !== null || params.weeklyStats.accuracy > 0 || params.streak > 0;

  const today: TodayTrainingWidgetProps = {
    title: toDisplayTitle(primarySession),
    startTime: toDisplayTime(primarySession),
    location: toDisplayLocation(primarySession),
    status: toStatus(primarySession),
    countdownMinutes: getCountdownMinutes(primarySession),
    hasData: hasTodayData,
  };

  const performance: PerformanceSnapshotWidgetProps = {
    lastScore: Math.max(0, Math.round(lastScore ?? 0)),
    weeklyAccuracy: Math.max(0, Math.round(params.weeklyStats.accuracy)),
    streakDays: Math.max(0, params.streak),
    updatedAt: hasPerformanceData ? getUpdatedLabel() : '--',
    hasData: hasPerformanceData,
  };

  const items = buildDashboardItems({
    activeSession: params.activeSession,
    nextSession: params.nextSession,
    upcomingSessions: params.upcomingSessions,
  });
  const dashboard: TrainingDashboardWidgetProps = {
    trainings: items,
    weeklySessions: Math.max(0, Math.round(params.weeklyStats.sessions ?? 0)),
    weeklyAccuracy: Math.max(0, Math.round(params.weeklyStats.accuracy)),
    streakDays: Math.max(0, params.streak),
    updatedAt: getUpdatedLabel(),
    hasData: items.length > 0 || hasPerformanceData,
  };

  return { today, performance, dashboard };
}

function buildDebugSeedPayloads(): {
  today: TodayTrainingWidgetProps;
  performance: PerformanceSnapshotWidgetProps;
  dashboard: TrainingDashboardWidgetProps;
} {
  const tick = Math.floor(Date.now() / 1000) % 1000;
  const today: TodayTrainingWidgetProps = {
    title: `DEBUG ${tick}`,
    startTime: getUpdatedLabel(),
    location: 'Debug lane',
    status: 'planned',
    countdownMinutes: tick % 60,
    hasData: true,
  };
  const performance: PerformanceSnapshotWidgetProps = {
    lastScore: tick % 100,
    weeklyAccuracy: (tick * 3) % 100,
    streakDays: tick % 30,
    updatedAt: getUpdatedLabel(),
    hasData: true,
  };
  const dashboard: TrainingDashboardWidgetProps = {
    trainings: [
      {
        id: `seed-live-${tick}`,
        title: `Live drill ${tick}`,
        when: 'Today · now',
        location: 'Debug lane',
        state: 'live',
      },
      {
        id: `seed-next-${tick}`,
        title: 'Precision reps',
        when: 'Today · 18:00',
        location: 'Alpha Squad',
        state: 'next',
      },
      {
        id: `seed-scheduled-${tick}`,
        title: 'Night drill',
        when: 'Tomorrow · 21:00',
        location: 'Night range',
        state: 'scheduled',
      },
    ],
    weeklySessions: 5,
    weeklyAccuracy: (tick * 3) % 100,
    streakDays: tick % 30,
    updatedAt: getUpdatedLabel(),
    hasData: true,
  };
  return { today, performance, dashboard };
}

export async function syncHomeWidgets(params: {
  activeSession: HomeSession | null;
  nextSession: HomeSession | null;
  weeklyStats: WeeklyStats;
  streak: number;
  /** Completed/unreviewed sessions — used for lastScore on the perf widget. */
  recentSessions: HomeSession[];
  /** Planned/ongoing trainings — populates the dashboard UPCOMING list. */
  upcomingSessions: HomeSession[];
}): Promise<void> {
  if (!canUseWidgets()) {
    wlog('syncHomeWidgets: not iOS, skipping');
    return;
  }

  const {
    today: todayTrainingPayload,
    performance: performancePayload,
    dashboard: dashboardPayload,
  } = DEBUG_SEED ? buildDebugSeedPayloads() : buildRealPayloads(params);

  if (DEBUG_SEED) {
    wlog('syncHomeWidgets: DEBUG SEED MODE ACTIVE');
  }
  wlog('syncHomeWidgets payload.today', todayTrainingPayload);
  wlog('syncHomeWidgets payload.perf ', performancePayload);
  wlog('syncHomeWidgets payload.dashboard items=', dashboardPayload.trainings.length);

  let anySucceeded = false;
  try {
    const [todayWidget, performanceWidget, dashboardWidget] = await Promise.all([
      getTodayTrainingWidget(),
      getPerformanceWidget(),
      getDashboardWidget(),
    ]);

    const todayOk = safeUpdateSnapshot('today', todayWidget, todayTrainingPayload);
    const perfOk = safeUpdateSnapshot('perf', performanceWidget, performancePayload);
    const dashOk = safeUpdateSnapshot('dashboard', dashboardWidget, dashboardPayload);
    anySucceeded = todayOk || perfOk || dashOk;
  } catch (e) {
    wwarn('syncHomeWidgets: unexpected throw', e);
  }

  // NOTE: `updateSnapshot` already calls `WidgetCenter.reloadTimelines(ofKind:)`
  // on the native side via WidgetObject.updateTimeline -> self.reload(). So we
  // intentionally do NOT call forceReloadCachedWidgets() here — it would be
  // redundant and waste a reload budget slot. If you ever need to force a
  // refresh without updating data, call debugForceWidgetReload() from devtools.
  void anySucceeded;
}

// Call sites may still be passing pre-hasData payloads. Default hasData to
// true when unspecified, since a Live Activity only exists while a drill is
// running — the placeholder branch is reserved for races where metadata isn't
// yet available. Call sites can explicitly set `hasData: false` to render the
// holding state.
type PartialDrillPayload = Omit<ActiveDrillActivityProps, 'hasData'> & {
  hasData?: boolean;
};

function normalizeDrillPayload(payload: PartialDrillPayload): ActiveDrillActivityProps {
  return {
    drillName: payload.drillName,
    stage: payload.stage,
    elapsedSeconds: payload.elapsedSeconds,
    remainingSeconds: payload.remainingSeconds,
    score: payload.score,
    hasData: payload.hasData ?? true,
  };
}

export async function startActiveDrillActivity(
  payload: PartialDrillPayload
): Promise<void> {
  if (!canUseWidgets() || activeDrillInstance) return;
  try {
    const activityFactory = await getActiveDrillFactory();
    if (!activityFactory) {
      wwarn('active-drill: factory unavailable');
      return;
    }
    if (typeof activityFactory.start !== 'function') {
      wwarn('active-drill: factory.start is not a function');
      return;
    }
    // NOTE: Deep link must point at a real Expo Router route. Groups like
    // `(protected)` are stripped from URLs, so `app/(protected)/activeSession.tsx`
    // is reachable at `retic:///activeSession`. We omit the sessionId here
    // because the Live Activity payload does not currently carry one; the
    // target route will fall back to the "resume/active" banner on the home
    // tab if no sessionId is provided.
    activeDrillInstance = activityFactory.start(
      normalizeDrillPayload(payload),
      'retic:///activeSession'
    );
    wlog('active-drill: started');
  } catch (e) {
    wwarn('active-drill: start threw', e);
    activeDrillInstance = null;
  }
}

export async function updateActiveDrillActivity(
  payload: PartialDrillPayload
): Promise<void> {
  if (!canUseWidgets()) return;
  if (!activeDrillInstance) {
    await startActiveDrillActivity(payload);
    return;
  }
  try {
    await activeDrillInstance.update(normalizeDrillPayload(payload));
    wlog('active-drill: update ok');
  } catch (e) {
    wwarn('active-drill: update threw', e);
  }
}

export async function endActiveDrillActivity(
  payload?: PartialDrillPayload
): Promise<void> {
  if (!canUseWidgets() || !activeDrillInstance) return;
  try {
    await activeDrillInstance.end(
      'immediate',
      payload ? normalizeDrillPayload(payload) : undefined,
      new Date()
    );
    wlog('active-drill: ended');
  } catch (e) {
    wwarn('active-drill: end threw', e);
  } finally {
    activeDrillInstance = null;
  }
}

// Exposed for debug tooling / dev-only manual reloads.
export async function debugForceWidgetReload(): Promise<void> {
  // Ensure handles are resolved first so reload targets them.
  await Promise.all([
    getTodayTrainingWidget(),
    getPerformanceWidget(),
    getDashboardWidget(),
  ]);
  forceReloadCachedWidgets();
}
