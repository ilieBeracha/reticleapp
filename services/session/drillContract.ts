import type { SessionDrillConfig, TargetType } from './types';

/**
 * Drill contract helpers.
 *
 * Centralizes how we interpret drill configuration into session requirements
 * (targets/rounds/shots). This prevents drift between UI and service-layer
 * enforcement as new drill types are integrated.
 */

export interface DrillRequirements {
  rounds: number; // strings_count normalized to >= 1
  requiredTargets: number; // entries required (1 per round)
  requiredShots: number; // total bullets required (tactical only)
  isPaper: boolean;
  targetType: TargetType;
  bulletsPerRound: number;
}

export function normalizeRounds(stringsCount: number | null | undefined) {
  return stringsCount && stringsCount > 0 ? stringsCount : 1;
}

export function getDrillRequirements(drill: SessionDrillConfig): DrillRequirements {
  const rounds = normalizeRounds(drill.strings_count);
  const isPaper = drill.target_type === 'paper';

  return {
    rounds,
    requiredTargets: rounds,
    requiredShots: isPaper ? 0 : drill.rounds_per_shooter * rounds,
    isPaper,
    targetType: drill.target_type,
    bulletsPerRound: drill.rounds_per_shooter,
  };
}


