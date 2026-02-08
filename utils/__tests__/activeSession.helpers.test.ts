/**
 * Tests for activeSession.helpers.ts
 * Pure helper functions for active session screen
 */

// Mock modules with React Native dependencies
jest.mock('@/utils/detectionSensitivity', () => ({
  deriveDetectionConfig: jest.fn(() => ({
    sensitivity: 3.5,
    minThreshold: 1.75,
    maxThreshold: 10.5,
    cooldownMs: 300,
    profile: 'rifle',
    description: 'Default',
  })),
}));

import {
  formatTime,
  calculateElapsedSeconds,
  formatDistanceDisplay,
  getRangeCategoryDescription,
  getDefaultDistanceForCategory,
  getEffectiveDistance,
  calculateAccuracy,
  getAccuracyColor,
  calculateDrillProgress,
  calculateNextTargetPlan,
  isDrillLimitReached,
  getDefaultDistance,
  buildEndSessionMessage,
} from '../activeSession.helpers';
import { COLORS } from '@/constants/activeSession';

// ============================================================================
// formatTime
// ============================================================================

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats exact minutes', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(120)).toBe('2:00');
    expect(formatTime(600)).toBe('10:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(61)).toBe('1:01');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3661)).toBe('61:01');
  });

  it('pads single-digit seconds with leading zero', () => {
    expect(formatTime(1)).toBe('0:01');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(69)).toBe('1:09');
  });
});

// ============================================================================
// calculateElapsedSeconds
// ============================================================================

describe('calculateElapsedSeconds', () => {
  it('returns 0 for a just-started session', () => {
    const now = new Date().toISOString();
    const elapsed = calculateElapsedSeconds(now);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(2); // Should be ~0
  });

  it('returns correct elapsed time for past timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const elapsed = calculateElapsedSeconds(fiveMinutesAgo);
    expect(elapsed).toBeGreaterThanOrEqual(299);
    expect(elapsed).toBeLessThanOrEqual(301);
  });
});

// ============================================================================
// formatDistanceDisplay
// ============================================================================

describe('formatDistanceDisplay', () => {
  it('returns exact distance when provided', () => {
    expect(formatDistanceDisplay(100)).toBe('100m');
    expect(formatDistanceDisplay(25)).toBe('25m');
    expect(formatDistanceDisplay(500)).toBe('500m');
  });

  it('ignores distance category when exact distance is available', () => {
    expect(formatDistanceDisplay(100, 'short')).toBe('100m');
  });

  it('returns category label when no exact distance', () => {
    expect(formatDistanceDisplay(null, 'short')).toBe('Short Range');
    expect(formatDistanceDisplay(null, 'medium')).toBe('Medium Range');
    expect(formatDistanceDisplay(null, 'long')).toBe('Long Range');
  });

  it('returns category label when distance is 0', () => {
    expect(formatDistanceDisplay(0, 'medium')).toBe('Medium Range');
  });

  it('uses translation function when provided', () => {
    const t = (key: string) => {
      if (key === 'training.shortRange') return 'Close';
      return key; // Return key as-is for unknown translations
    };
    expect(formatDistanceDisplay(null, 'short', t)).toBe('Close');
  });

  it('falls back to label when translation returns key', () => {
    const t = (key: string) => key; // Returns key unchanged = not translated
    expect(formatDistanceDisplay(null, 'short', t)).toBe('Short Range');
  });

  it('returns default 25m when nothing provided', () => {
    expect(formatDistanceDisplay()).toBe('25m');
    expect(formatDistanceDisplay(null, null)).toBe('25m');
  });
});

// ============================================================================
// getRangeCategoryDescription
// ============================================================================

describe('getRangeCategoryDescription', () => {
  it('returns range description for short', () => {
    expect(getRangeCategoryDescription('short')).toBe('0-300m');
  });

  it('returns range description for medium', () => {
    expect(getRangeCategoryDescription('medium')).toBe('300-600m');
  });

  it('returns open-ended range for long', () => {
    expect(getRangeCategoryDescription('long')).toBe('600m+');
  });

  it('returns empty string for unknown category', () => {
    expect(getRangeCategoryDescription('unknown' as any)).toBe('');
  });
});

// ============================================================================
// getDefaultDistanceForCategory
// ============================================================================

describe('getDefaultDistanceForCategory', () => {
  it('returns 25m for short range', () => {
    expect(getDefaultDistanceForCategory('short')).toBe(25);
  });

  it('returns 100m for medium range', () => {
    expect(getDefaultDistanceForCategory('medium')).toBe(100);
  });

  it('returns 300m for long range', () => {
    expect(getDefaultDistanceForCategory('long')).toBe(300);
  });
});

// ============================================================================
// getEffectiveDistance
// ============================================================================

describe('getEffectiveDistance', () => {
  it('returns exact distance when available', () => {
    expect(getEffectiveDistance(150)).toBe(150);
    expect(getEffectiveDistance(150, 'short')).toBe(150);
  });

  it('falls back to category default when no exact distance', () => {
    expect(getEffectiveDistance(null, 'short')).toBe(25);
    expect(getEffectiveDistance(null, 'medium')).toBe(100);
    expect(getEffectiveDistance(null, 'long')).toBe(300);
  });

  it('falls back to default distance when nothing provided', () => {
    expect(getEffectiveDistance(null, null)).toBe(25);
    expect(getEffectiveDistance(null, null, 50)).toBe(50);
  });

  it('ignores zero distance', () => {
    expect(getEffectiveDistance(0, 'medium')).toBe(100);
  });
});

// ============================================================================
// calculateAccuracy
// ============================================================================

describe('calculateAccuracy', () => {
  it('returns 0 when no shots fired', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('returns 100 for perfect accuracy', () => {
    expect(calculateAccuracy(10, 10)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(calculateAccuracy(3, 1)).toBe(33); // 33.33%
    expect(calculateAccuracy(3, 2)).toBe(67); // 66.67%
  });

  it('handles various shot/hit combinations', () => {
    expect(calculateAccuracy(10, 7)).toBe(70);
    expect(calculateAccuracy(20, 5)).toBe(25);
  });
});

// ============================================================================
// getAccuracyColor
// ============================================================================

describe('getAccuracyColor', () => {
  it('returns accent for high accuracy', () => {
    expect(getAccuracyColor(80)).toBe(COLORS.accent);
  });

  it('returns warning for medium accuracy', () => {
    expect(getAccuracyColor(55)).toBe(COLORS.warning);
  });

  it('returns accent for low accuracy (default)', () => {
    expect(getAccuracyColor(30)).toBe(COLORS.accent);
  });

  it('uses custom goal threshold when provided', () => {
    // 80% goal: above goal
    expect(getAccuracyColor(85, 80)).toBe(COLORS.accent);
    // 80% goal: within 80% of goal (64+)
    expect(getAccuracyColor(70, 80)).toBe(COLORS.warning);
    // 80% goal: below 80% of goal (<64)
    expect(getAccuracyColor(50, 80)).toBe(COLORS.error);
  });
});

// ============================================================================
// calculateDrillProgress
// ============================================================================

describe('calculateDrillProgress', () => {
  it('returns null for null drill', () => {
    expect(calculateDrillProgress(null, 0, 0, 0, 0)).toBeNull();
  });

  it('calculates progress for tactical drill', () => {
    const drill = {
      strings_count: 2,
      target_count: 1,
      target_type: 'tactical',
      rounds_per_shooter: 5,
    };
    const progress = calculateDrillProgress(drill, 5, 1, 80, 30);
    expect(progress).not.toBeNull();
    expect(progress!.rounds).toBe(2);
    expect(progress!.targetsPerRound).toBe(1);
    expect(progress!.requiredTargets).toBe(2);
    expect(progress!.requiredRounds).toBe(10); // 5 * 2 targets
    expect(progress!.isPaper).toBe(false);
  });

  it('calculates progress for paper drill (target-based)', () => {
    const drill = {
      strings_count: 3,
      target_count: 1,
      target_type: 'paper',
      rounds_per_shooter: 10,
    };
    const progress = calculateDrillProgress(drill, 25, 2, 90, 60);
    expect(progress).not.toBeNull();
    expect(progress!.isPaper).toBe(true);
    expect(progress!.requiredTargets).toBe(3);
    expect(progress!.shotsProgress).toBe(0); // Paper doesn't track shots
    expect(progress!.isComplete).toBe(false); // 2 < 3 targets
  });

  it('marks drill as complete when requirements met', () => {
    const drill = {
      strings_count: 1,
      target_count: 1,
      target_type: 'tactical',
      rounds_per_shooter: 5,
    };
    const progress = calculateDrillProgress(drill, 5, 1, 80, 30);
    expect(progress!.isComplete).toBe(true);
  });

  it('tracks accuracy and time requirements', () => {
    const drill = {
      strings_count: 1,
      target_count: 1,
      target_type: 'tactical',
      rounds_per_shooter: 5,
      min_accuracy_percent: 80,
      time_limit_seconds: 60,
    };
    // Meets accuracy and time
    const progress1 = calculateDrillProgress(drill, 5, 1, 85, 50);
    expect(progress1!.meetsAccuracy).toBe(true);
    expect(progress1!.meetsTime).toBe(true);
    expect(progress1!.overTime).toBe(false);

    // Fails accuracy, over time
    const progress2 = calculateDrillProgress(drill, 5, 1, 60, 70);
    expect(progress2!.meetsAccuracy).toBe(false);
    expect(progress2!.meetsTime).toBe(false);
    expect(progress2!.overTime).toBe(true);
  });

  it('defaults strings to 1 and targets to 1 when null', () => {
    const drill = {
      target_type: 'tactical',
      rounds_per_shooter: 3,
    };
    const progress = calculateDrillProgress(drill, 3, 1, 100, 10);
    expect(progress!.rounds).toBe(1);
    expect(progress!.targetsPerRound).toBe(1);
    expect(progress!.requiredTargets).toBe(1);
  });
});

// ============================================================================
// calculateNextTargetPlan
// ============================================================================

describe('calculateNextTargetPlan', () => {
  it('returns null when no drill progress', () => {
    expect(calculateNextTargetPlan(null, null, 0, 0)).toBeNull();
  });

  it('calculates remaining shots for tactical drill', () => {
    const drillProgress = {
      rounds: 1,
      targetsPerRound: 1,
      bulletsPerRound: 5,
      requiredRounds: 5,
      requiredTargets: 1,
      shotsProgress: 60,
      targetsProgress: 0,
      isComplete: false,
      meetsAccuracy: true,
      meetsTime: true,
      overTime: false,
      isPaper: false,
    };
    const drill = { target_type: 'tactical', rounds_per_shooter: 5 };
    const plan = calculateNextTargetPlan(drillProgress, drill, 3, 0);
    expect(plan!.remainingShots).toBe(2);
    expect(plan!.remainingTargets).toBe(1);
  });

  it('returns 0 remaining for paper drills', () => {
    const drillProgress = {
      rounds: 3,
      targetsPerRound: 1,
      bulletsPerRound: null,
      requiredRounds: 0,
      requiredTargets: 3,
      shotsProgress: 0,
      targetsProgress: 33,
      isComplete: false,
      meetsAccuracy: true,
      meetsTime: true,
      overTime: false,
      isPaper: true,
    };
    const drill = { target_type: 'paper' };
    const plan = calculateNextTargetPlan(drillProgress, drill, 10, 1);
    expect(plan!.remainingShots).toBe(0);
    expect(plan!.remainingTargets).toBe(2);
    expect(plan!.nextBullets).toBe(0);
  });
});

// ============================================================================
// isDrillLimitReached
// ============================================================================

describe('isDrillLimitReached', () => {
  it('returns false when no drill or plan', () => {
    expect(isDrillLimitReached(null, null)).toBe(false);
    expect(isDrillLimitReached({}, null)).toBe(false);
  });

  it('returns true when tactical drill shots exhausted', () => {
    expect(isDrillLimitReached(
      { target_type: 'tactical' },
      { remainingShots: 0, remainingTargets: 1, nextBullets: 0 }
    )).toBe(true);
  });

  it('returns true when tactical drill targets exhausted', () => {
    expect(isDrillLimitReached(
      { target_type: 'tactical' },
      { remainingShots: 5, remainingTargets: 0, nextBullets: 0 }
    )).toBe(true);
  });

  it('returns false when tactical drill still has shots and targets', () => {
    expect(isDrillLimitReached(
      { target_type: 'tactical' },
      { remainingShots: 5, remainingTargets: 1, nextBullets: 5 }
    )).toBe(false);
  });

  it('returns true when paper drill targets exhausted', () => {
    expect(isDrillLimitReached(
      { target_type: 'paper' },
      { remainingShots: 0, remainingTargets: 0, nextBullets: 0 }
    )).toBe(true);
  });

  it('returns false when paper drill still has targets', () => {
    expect(isDrillLimitReached(
      { target_type: 'paper' },
      { remainingShots: 0, remainingTargets: 2, nextBullets: 0 }
    )).toBe(false);
  });
});

// ============================================================================
// getDefaultDistance
// ============================================================================

describe('getDefaultDistance', () => {
  it('returns 100 when no targets exist', () => {
    expect(getDefaultDistance([], null)).toBe(100);
  });

  it('returns last target distance when available', () => {
    const targets = [
      { distance_m: 50 },
      { distance_m: 200 },
    ];
    expect(getDefaultDistance(targets, null)).toBe(200);
  });

  it('falls back to 100 when last target has no distance', () => {
    const targets = [{ distance_m: null }];
    expect(getDefaultDistance(targets, null)).toBe(100);
  });
});

// ============================================================================
// buildEndSessionMessage
// ============================================================================

describe('buildEndSessionMessage', () => {
  it('returns simple message when no drill', () => {
    const result = buildEndSessionMessage(false, null, null, true, 10, 3, 80, 120);
    expect(result.title).toBe('End Session?');
    expect(result.message).toContain('3 targets');
    expect(result.message).toContain('2:00');
  });

  it('returns simple message when requirements met', () => {
    const drill = { rounds_per_shooter: 5 };
    const drillProgress = { requiredRounds: 5, requiredTargets: 1 };
    const result = buildEndSessionMessage(true, drill, drillProgress, true, 5, 1, 80, 60);
    expect(result.title).toBe('End Session?');
  });

  it('returns warning message when requirements not met', () => {
    const drill = {
      target_type: 'tactical',
      rounds_per_shooter: 10,
      min_accuracy_percent: 80,
      time_limit_seconds: 60,
    };
    const drillProgress = { requiredRounds: 10, requiredTargets: 1 };
    const result = buildEndSessionMessage(true, drill, drillProgress, false, 5, 0, 50, 45);
    expect(result.title).toBe('End Drill Early?');
    expect(result.message).toContain('5/10');
    expect(result.message).toContain('0/1');
    expect(result.message).toContain('50%');
  });

  it('shows only targets for paper drills', () => {
    const drill = { target_type: 'paper', rounds_per_shooter: 5 };
    const drillProgress = { requiredRounds: 0, requiredTargets: 3 };
    const result = buildEndSessionMessage(true, drill, drillProgress, false, 15, 1, 90, 30);
    expect(result.message).toContain('Targets: 1/3');
    expect(result.message).not.toContain('Shots:');
  });

  it('uses singular "target" for count of 1', () => {
    const result = buildEndSessionMessage(false, null, null, true, 5, 1, 80, 60);
    expect(result.message).toContain('1 target logged');
  });
});
