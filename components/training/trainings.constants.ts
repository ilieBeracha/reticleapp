/**
 * Constants for Trainings Screen (Team Tab)
 */

import { Crown, Shield, Target } from 'lucide-react-native';
import type { RoleConfig, StatusConfig } from './trainings.types';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================
export function getRoleConfig(t: (key: string) => string): Record<string, RoleConfig> {
  return {
    owner: { color: '#A78BFA', label: t('teams.roles.owner'), icon: Crown },
    commander: { color: '#F87171', label: t('teams.roles.commander'), icon: Crown },
    team_commander: { color: '#F87171', label: t('teams.roles.commander'), icon: Crown },
    squad_commander: { color: '#FBBF24', label: t('teams.roles.squadCommander'), icon: Shield },
    soldier: { color: '#34D399', label: t('teams.roles.soldier'), icon: Target },
  };
}

// Keep static version for backwards compatibility (will be deprecated)
export const ROLE_CONFIG: Record<string, RoleConfig> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: Crown },
  commander: { color: '#F87171', label: 'Commander', icon: Crown },
  team_commander: { color: '#F87171', label: 'Commander', icon: Crown },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#34D399', label: 'Soldier', icon: Target },
};

// ============================================================================
// TRAINING STATUS CONFIGURATION
// Keys must match database status values: planned, ongoing, finished, cancelled
// ============================================================================
export function getStatusConfig(t: (key: string) => string): Record<string, StatusConfig> {
  return {
    planned: { color: '#3B82F6', label: t('training.planned'), bg: '#3B82F620' },
    ongoing: { color: '#F59E0B', label: t('training.live'), bg: '#F59E0B20' },
    finished: { color: '#10B981', label: t('training.completed'), bg: '#10B98120' },
    cancelled: { color: '#EF4444', label: t('training.cancelled'), bg: '#EF444420' },
    // Legacy aliases (for backwards compatibility with UI code)
    scheduled: { color: '#3B82F6', label: t('training.planned'), bg: '#3B82F620' },
    completed: { color: '#10B981', label: t('training.completed'), bg: '#10B98120' },
  };
}

// Keep static version for backwards compatibility (will be deprecated)
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  planned: { color: '#3B82F6', label: 'Scheduled', bg: '#3B82F620' },
  ongoing: { color: '#F59E0B', label: 'Live', bg: '#F59E0B20' },
  finished: { color: '#10B981', label: 'Completed', bg: '#10B98120' },
  cancelled: { color: '#EF4444', label: 'Cancelled', bg: '#EF444420' },
  // Legacy aliases (for backwards compatibility with UI code)
  scheduled: { color: '#3B82F6', label: 'Scheduled', bg: '#3B82F620' },
  completed: { color: '#10B981', label: 'Completed', bg: '#10B98120' },
};

// ============================================================================
// COLORS
// ============================================================================
export const COLORS = {
  live: '#F59E0B',
  scheduled: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
  training: '#10B981',
  online: '#3B82F6',
  idle: '#F59E0B',
} as const;

// ============================================================================
// WEEKLY GOAL
// ============================================================================
export const DEFAULT_WEEKLY_GOAL = 5000;

// ============================================================================
// ANIMATION
// ============================================================================
export const PULSE_ANIMATION = {
  minOpacity: 0.4,
  maxOpacity: 1,
  duration: 800,
} as const;
