import { isInfiniteShots } from '@/utils/drillShots';
import type { SessionDrillConfig } from './types';

export type DrillInputRoute =
  | {
      kind: 'scan_paper';
      pathname: '/(protected)/scanTarget';
      params: {
        sessionId: string;
        distance: string;
        maxShots?: string;
        drillGoal?: 'grouping' | 'achievement';
        locked?: '1';  // When set, distance/shots are locked to drill values
      };
    }
  | {
      kind: 'manual_paper_achievement';
      pathname: '/(protected)/addTarget';
      params: {
        sessionId: string;
        defaultTargetType: 'achievement';
        defaultDistance: string;
        defaultInputMethod: 'manual';
        startInManual?: '1';
        maxShots?: string;
        locked?: '1';  // When set, distance/shots are locked to drill values
      };
    }
  | {
      kind: 'manual_tactical';
      pathname: '/(protected)/tacticalTarget';
      params: {
        sessionId: string;
        distance: string;
        bullets?: string;
        locked?: '1';  // When set, distance/bullets are locked to drill values
      };
    };

/**
 * Determine which input routes should be offered for a given drill.
 * This is the "A" layer: drills manipulate the session input UX (locking/defaulting).
 */
export function getDrillInputRoutes(args: {
  sessionId: string;
  defaultDistance: number;
  drill: SessionDrillConfig | null | undefined;
  // Tactical: computed next bullets for the next entry.
  nextBullets?: number | null;
  // Whether another target can be logged for the drill.
  allowMoreTargets?: boolean;
}): { primary: DrillInputRoute; secondary?: DrillInputRoute } | null {
  const { sessionId, defaultDistance, drill, nextBullets, allowMoreTargets = true } = args;

  if (!allowMoreTargets) {
    return null;
  }

  // Free practice (no drill): expose both paper scan + tactical manual
  if (!drill) {
    return {
      primary: {
        kind: 'scan_paper',
        pathname: '/(protected)/scanTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
          // In free practice, keep defaults flexible (not locked)
          drillGoal: 'grouping',
        },
      },
      secondary: {
        kind: 'manual_tactical',
        pathname: '/(protected)/tacticalTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
        },
      },
    };
  }

  // =========================================================================
  // DRILL-DRIVEN INPUT ROUTING
  // =========================================================================
  // Commander can explicitly choose input_method during training creation.
  // If set, respect it. Otherwise, fall back to target_type-based inference.
  
  const maxShots = !isInfiniteShots(drill.rounds_per_shooter) ? String(drill.rounds_per_shooter) : undefined;
  
  // Determine effective input method:
  // 1. Explicit input_method from commander takes priority
  // 2. Grouping drills always use scan (regardless of input_method)
  // 3. Otherwise, infer from target_type
  let effectiveInputMethod: 'scan' | 'manual' = 'manual';
  
  if (drill.drill_goal === 'grouping') {
    // Grouping drills are always scan (paper targets with camera)
    effectiveInputMethod = 'scan';
  } else if (drill.input_method) {
    // Respect commander's explicit choice
    effectiveInputMethod = drill.input_method;
  } else {
    // Legacy inference: paper → scan, tactical → manual
    effectiveInputMethod = drill.target_type === 'paper' ? 'scan' : 'manual';
  }

  // Grouping: scan only (no manual option)
  if (drill.drill_goal === 'grouping') {
    return {
      primary: {
        kind: 'scan_paper',
        pathname: '/(protected)/scanTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
          ...(maxShots ? { maxShots } : {}),
          drillGoal: 'grouping',
          locked: '1',  // Lock to drill values
        },
      },
    };
  }

  // Achievement drills - respect commander's input_method choice
  // When commander explicitly chose input_method, only show that option (no secondary)
  // When input_method was inferred (null), we can offer both options
  const hasExplicitInputMethod = !!drill.input_method;

  if (effectiveInputMethod === 'scan') {
    // Scan mode: camera input only (no manual fallback if explicitly chosen)
    return {
      primary: {
        kind: 'scan_paper',
        pathname: '/(protected)/scanTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
          ...(maxShots ? { maxShots } : {}),
          drillGoal: 'achievement',
          locked: '1',
        },
      },
      // Only offer manual as secondary if commander didn't explicitly choose scan
      ...(!hasExplicitInputMethod && drill.target_type === 'paper' ? {
        secondary: {
          kind: 'manual_paper_achievement' as const,
          pathname: '/(protected)/addTarget' as const,
          params: {
            sessionId,
            defaultTargetType: 'achievement' as const,
            defaultDistance: String(defaultDistance),
            defaultInputMethod: 'manual' as const,
            startInManual: '1' as const,
            ...(maxShots ? { maxShots } : {}),
            locked: '1' as const,
          },
        },
      } : {}),
    };
  }

  // Manual mode: direct hit/miss entry
  if (drill.target_type === 'tactical') {
    // Tactical manual: go directly to tactical input
    const shotsAreFlexible = isInfiniteShots(drill.rounds_per_shooter);
    return {
      primary: {
        kind: 'manual_tactical',
        pathname: '/(protected)/tacticalTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
          ...(shotsAreFlexible ? {} : nextBullets ? { bullets: String(nextBullets) } : {}),
          locked: '1',
        },
      },
    };
  }

  // Paper manual: achievement entry form
  return {
    primary: {
      kind: 'manual_paper_achievement',
      pathname: '/(protected)/addTarget',
      params: {
        sessionId,
        defaultTargetType: 'achievement',
        defaultDistance: String(defaultDistance),
        defaultInputMethod: 'manual',
        startInManual: '1',
        ...(maxShots ? { maxShots } : {}),
        locked: '1',
      },
    },
  };
}


