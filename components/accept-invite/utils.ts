import type { Ionicons } from '@expo/vector-icons';
import type { TeamRole } from './types';

const ROLE_COLORS: Record<string, string> = {
  owner: '#5B6B8C',
  commander: '#7C3AED',
  team_commander: '#7C3AED',
  squad_commander: '#3B82F6',
  soldier: '#6B8FA3',
};

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  owner: 'shield-checkmark',
  commander: 'shield',
  team_commander: 'shield',
  squad_commander: 'shield-half',
  soldier: 'person',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  commander: 'Team Commander',
  team_commander: 'Team Commander',
  squad_commander: 'Squad Commander',
  soldier: 'Soldier',
};

export function getRoleColor(role: TeamRole | string | null | undefined): string {
  if (!role) return ROLE_COLORS.soldier;
  return ROLE_COLORS[String(role)] || ROLE_COLORS.soldier;
}

export function getRoleIcon(role: TeamRole | string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!role) return ROLE_ICONS.soldier;
  return ROLE_ICONS[String(role)] || ROLE_ICONS.soldier;
}

export function getRoleLabel(role: TeamRole | string | null | undefined): string {
  if (!role) return ROLE_LABELS.soldier;
  return ROLE_LABELS[String(role)] || String(role);
}
