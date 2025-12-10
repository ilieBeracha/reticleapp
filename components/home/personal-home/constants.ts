import { Calendar, Crosshair, ScanLine, Target, TrendingUp } from 'lucide-react-native';
import type { ActiveDialMode, DialModeConfig, IdleDialMode } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE DIAL MODES - Used when there's an active session
// No timer - sessions are collections of targets, not continuous work
// ═══════════════════════════════════════════════════════════════════════════

export const ACTIVE_DIAL_MODES: Record<ActiveDialMode, DialModeConfig> = {
  targets: {
    key: 'targets',
    label: 'TARGETS',
    unit: 'THIS SESSION',
    icon: Target,
    color: '#3B82F6',
    getProgress: (v, _) => Math.min(v / 20, 1),
  },
  shots: {
    key: 'shots',
    label: 'SHOTS',
    unit: 'THIS SESSION',
    icon: Crosshair,
    color: '#EF4444',
    getProgress: (v, _) => Math.min(v / 100, 1),
  },
  accuracy: {
    key: 'accuracy',
    label: 'ACCURACY',
    unit: 'THIS SESSION',
    icon: TrendingUp,
    color: '#10B981',
    getProgress: (v, _) => v / 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// IDLE DIAL MODES - Used when no active session
// ═══════════════════════════════════════════════════════════════════════════

export const IDLE_DIAL_MODES: Record<IdleDialMode, DialModeConfig> = {
  sessions: {
    key: 'sessions',
    label: 'LAST WEEK',
    unit: 'SESSIONS',
    icon: Calendar,
    color: '#3B82F6',
    getProgress: (v, _) => Math.min(v / 7, 1),
  },
  shots: {
    key: 'shots',
    label: 'LAST WEEK',
    unit: 'SHOTS',
    icon: Crosshair,
    color: '#EF4444',
    getProgress: (v, _) => Math.min(v / 200, 1),
  },
  paper: {
    key: 'paper',
    label: 'LAST WEEK',
    unit: 'SCANS',
    icon: ScanLine,
    color: '#8B5CF6',
    getProgress: (v, _) => Math.min(v / 30, 1),
  },
  tactical: {
    key: 'tactical',
    label: 'LAST WEEK',
    unit: 'TACTICAL',
    icon: Target,
    color: '#F59E0B',
    getProgress: (v, _) => Math.min(v / 30, 1),
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MODE ORDER - For carousel navigation
// ═══════════════════════════════════════════════════════════════════════════

export const ACTIVE_MODES_ORDER: ActiveDialMode[] = ['targets', 'shots', 'accuracy'];
export const IDLE_MODES_ORDER: IdleDialMode[] = ['sessions', 'shots', 'paper', 'tactical'];
