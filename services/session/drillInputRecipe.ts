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

  // Drill-driven - all routes get locked: '1' to skip setup and enforce drill values
  if (drill.target_type === 'paper') {
    const maxShots = !isInfiniteShots(drill.rounds_per_shooter) ? String(drill.rounds_per_shooter) : undefined;

    // Grouping: scan only
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

    // Achievement: scan + manual (paper)
    return {
      primary: {
        kind: 'scan_paper',
        pathname: '/(protected)/scanTarget',
        params: {
          sessionId,
          distance: String(defaultDistance),
          ...(maxShots ? { maxShots } : {}),
          drillGoal: 'achievement',
          locked: '1',  // Lock to drill values
        },
      },
      secondary: {
        kind: 'manual_paper_achievement',
        pathname: '/(protected)/addTarget',
        params: {
          sessionId,
          defaultTargetType: 'achievement',
          defaultDistance: String(defaultDistance),
          defaultInputMethod: 'manual',
          startInManual: '1',
          ...(maxShots ? { maxShots } : {}),
          locked: '1',  // Lock to drill values
        },
      },
    };
  }

  // Tactical drills: manual only - skip setup, go directly to results entry
  const shotsAreFlexible = isInfiniteShots(drill.rounds_per_shooter);
  return {
    primary: {
      kind: 'manual_tactical',
      pathname: '/(protected)/tacticalTarget',
      params: {
        sessionId,
        distance: String(defaultDistance),
        // Pass the bullets for this entry (from drill config)
        ...(shotsAreFlexible ? {} : nextBullets ? { bullets: String(nextBullets) } : {}),
        locked: '1',  // Lock to drill values - skips setup, goes straight to results
      },
    },
  };
}


