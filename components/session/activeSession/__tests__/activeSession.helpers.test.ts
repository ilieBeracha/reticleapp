/**
 * Active Session Helpers Tests
 *
 * These tests define the expected behavior for session drill progress calculation.
 * If a test fails, the session logic is incorrect.
 *
 * Business Rules Tested:
 * 1. Grouping/Paper drills: completion based on TARGET COUNT only (not shots)
 * 2. Engagement/Tactical drills: completion based on SHOTS + TARGET COUNT
 * 3. Accuracy requirements: meetsAccuracy if no min or accuracy >= min
 * 4. Time requirements: meetsTime if no limit or elapsed <= limit
 * 5. End session message: different for paper vs tactical
 */

import {
  calculateAccuracy,
  calculateDrillProgress,
  calculateNextTargetPlan,
  buildEndSessionMessage,
  formatTime,
  getAccuracyColor,
  isDrillLimitReached,
} from '@/utils/activeSession.helpers';
import type { DrillProgress } from '@/types/activeSession';

// ============================================================================
// TIME FORMATTING TESTS
// ============================================================================

describe('formatTime', () => {
  it('should format seconds to MM:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3661)).toBe('61:01');
  });
});

// ============================================================================
// ACCURACY CALCULATION TESTS
// ============================================================================

describe('calculateAccuracy', () => {
  it('should calculate accuracy percentage correctly', () => {
    expect(calculateAccuracy(10, 8)).toBe(80);
    expect(calculateAccuracy(10, 10)).toBe(100);
    expect(calculateAccuracy(10, 0)).toBe(0);
    expect(calculateAccuracy(10, 5)).toBe(50);
  });

  it('should return 0 for zero shots', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateAccuracy(3, 1)).toBe(33); // 33.33...
    expect(calculateAccuracy(3, 2)).toBe(67); // 66.66...
  });
});

// ============================================================================
// DRILL PROGRESS CALCULATION - CORE LOGIC
// ============================================================================

describe('calculateDrillProgress', () => {
  describe('Paper/Grouping Drills (completion by TARGET COUNT)', () => {
    const paperDrill = {
      target_type: 'paper',
      strings_count: 3,
      target_count: 1,
      rounds_per_shooter: 10, // This is MAX cap for paper, not requirement
      min_accuracy_percent: null,
      time_limit_seconds: null,
    };

    it('should measure completion by targets logged, NOT by shots', () => {
      // 0 shots but 3 targets logged = COMPLETE
      const progress = calculateDrillProgress(paperDrill, 0, 3, 0, 60);
      
      expect(progress?.isComplete).toBe(true);
      expect(progress?.isPaper).toBe(true);
      expect(progress?.requiredTargets).toBe(3);
      expect(progress?.requiredRounds).toBe(0); // Paper ignores rounds requirement
    });

    it('should NOT be complete until target count is met', () => {
      // 30 shots but only 2 targets logged = NOT complete
      const progress = calculateDrillProgress(paperDrill, 30, 2, 100, 60);
      
      expect(progress?.isComplete).toBe(false);
      expect(progress?.targetsProgress).toBe(67); // 2/3 = 66.67%
    });

    it('should ignore shots for completion check', () => {
      // Paper drill: shots don't matter for completion
      const progress = calculateDrillProgress(paperDrill, 1000, 3, 100, 60);
      expect(progress?.isComplete).toBe(true);
    });

    it('should set shotsProgress to 0 for paper drills', () => {
      const progress = calculateDrillProgress(paperDrill, 30, 1, 100, 60);
      expect(progress?.shotsProgress).toBe(0);
    });
  });

  describe('Tactical/Engagement Drills (completion by SHOTS + TARGETS)', () => {
    const tacticalDrill = {
      target_type: 'tactical',
      strings_count: 2, // 2 rounds
      target_count: 1, // 1 target per round
      rounds_per_shooter: 10, // 10 bullets per entry
      min_accuracy_percent: null,
      time_limit_seconds: null,
    };

    it('should require BOTH shots AND targets for completion', () => {
      // Need: 2 targets × 10 shots = 20 shots total, 2 targets
      
      // 20 shots but only 1 target = NOT complete
      const progress1 = calculateDrillProgress(tacticalDrill, 20, 1, 80, 60);
      expect(progress1?.isComplete).toBe(false);
      
      // 10 shots but 2 targets = NOT complete (not enough shots)
      const progress2 = calculateDrillProgress(tacticalDrill, 10, 2, 80, 60);
      expect(progress2?.isComplete).toBe(false);
      
      // 20 shots AND 2 targets = COMPLETE
      const progress3 = calculateDrillProgress(tacticalDrill, 20, 2, 80, 60);
      expect(progress3?.isComplete).toBe(true);
    });

    it('should calculate required rounds correctly', () => {
      // 2 strings × 1 target × 10 rounds_per_shooter = 20 total
      const progress = calculateDrillProgress(tacticalDrill, 0, 0, 0, 0);
      expect(progress?.requiredRounds).toBe(20);
      expect(progress?.requiredTargets).toBe(2);
    });

    it('should track shots progress for tactical drills', () => {
      const progress = calculateDrillProgress(tacticalDrill, 10, 1, 50, 60);
      expect(progress?.shotsProgress).toBe(50); // 10/20 = 50%
    });
  });

  describe('Accuracy Requirements', () => {
    const drillWithAccuracy = {
      target_type: 'tactical',
      strings_count: 1,
      target_count: 1,
      rounds_per_shooter: 10,
      min_accuracy_percent: 70,
      time_limit_seconds: null,
    };

    it('should pass accuracy check when above minimum', () => {
      const progress = calculateDrillProgress(drillWithAccuracy, 10, 1, 80, 60);
      expect(progress?.meetsAccuracy).toBe(true);
    });

    it('should pass accuracy check when exactly at minimum', () => {
      const progress = calculateDrillProgress(drillWithAccuracy, 10, 1, 70, 60);
      expect(progress?.meetsAccuracy).toBe(true);
    });

    it('should FAIL accuracy check when below minimum', () => {
      const progress = calculateDrillProgress(drillWithAccuracy, 10, 1, 50, 60);
      expect(progress?.meetsAccuracy).toBe(false);
    });

    it('should always pass when no accuracy requirement', () => {
      const drillNoAccuracy = { ...drillWithAccuracy, min_accuracy_percent: null };
      const progress = calculateDrillProgress(drillNoAccuracy, 10, 1, 10, 60);
      expect(progress?.meetsAccuracy).toBe(true);
    });
  });

  describe('Time Requirements', () => {
    const drillWithTime = {
      target_type: 'tactical',
      strings_count: 1,
      target_count: 1,
      rounds_per_shooter: 10,
      min_accuracy_percent: null,
      time_limit_seconds: 60,
    };

    it('should pass time check when under limit', () => {
      const progress = calculateDrillProgress(drillWithTime, 10, 1, 80, 30);
      expect(progress?.meetsTime).toBe(true);
      expect(progress?.overTime).toBe(false);
    });

    it('should pass time check when exactly at limit', () => {
      const progress = calculateDrillProgress(drillWithTime, 10, 1, 80, 60);
      expect(progress?.meetsTime).toBe(true);
      expect(progress?.overTime).toBe(false);
    });

    it('should FAIL time check when over limit', () => {
      const progress = calculateDrillProgress(drillWithTime, 10, 1, 80, 90);
      expect(progress?.meetsTime).toBe(false);
      expect(progress?.overTime).toBe(true);
    });

    it('should always pass when no time limit', () => {
      const drillNoTime = { ...drillWithTime, time_limit_seconds: null };
      const progress = calculateDrillProgress(drillNoTime, 10, 1, 80, 9999);
      expect(progress?.meetsTime).toBe(true);
      expect(progress?.overTime).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return null for no drill', () => {
      const progress = calculateDrillProgress(null, 10, 1, 80, 60);
      expect(progress).toBeNull();
    });

    it('should handle drill with no strings_count (default to 1)', () => {
      const drill = {
        target_type: 'tactical',
        strings_count: null,
        target_count: 1,
        rounds_per_shooter: 10,
      };
      const progress = calculateDrillProgress(drill, 10, 1, 80, 60);
      expect(progress?.rounds).toBe(1);
      expect(progress?.requiredTargets).toBe(1);
    });

    it('should handle drill with no target_count (default to 1)', () => {
      const drill = {
        target_type: 'tactical',
        strings_count: 2,
        target_count: null,
        rounds_per_shooter: 10,
      };
      const progress = calculateDrillProgress(drill, 20, 2, 80, 60);
      expect(progress?.targetsPerRound).toBe(1);
      expect(progress?.requiredTargets).toBe(2);
    });

    it('should cap progress at 100%', () => {
      const drill = {
        target_type: 'tactical',
        strings_count: 1,
        target_count: 1,
        rounds_per_shooter: 10,
      };
      // 20 shots for 10 required = 200% -> capped at 100%
      const progress = calculateDrillProgress(drill, 20, 2, 80, 60);
      expect(progress?.shotsProgress).toBe(100);
      expect(progress?.targetsProgress).toBe(100);
    });
  });
});

// ============================================================================
// NEXT TARGET PLAN TESTS
// ============================================================================

describe('calculateNextTargetPlan', () => {
  describe('Paper Drills', () => {
    it('should return 0 nextBullets for paper drills (shots detected from scan)', () => {
      const drillProgress: DrillProgress = {
        rounds: 3,
        targetsPerRound: 1,
        bulletsPerRound: 10,
        requiredRounds: 0, // Paper ignores this
        requiredTargets: 3,
        shotsProgress: 0,
        targetsProgress: 33,
        isComplete: false,
        meetsAccuracy: true,
        meetsTime: true,
        overTime: false,
        isPaper: true,
      };
      const drill = { target_type: 'paper', rounds_per_shooter: 10 };
      
      const plan = calculateNextTargetPlan(drillProgress, drill, 0, 1);
      
      expect(plan?.nextBullets).toBe(0);
      expect(plan?.remainingTargets).toBe(2);
    });
  });

  describe('Tactical Drills', () => {
    it('should calculate remaining shots and suggest next bullets', () => {
      const drillProgress: DrillProgress = {
        rounds: 2,
        targetsPerRound: 1,
        bulletsPerRound: 10,
        requiredRounds: 20,
        requiredTargets: 2,
        shotsProgress: 50,
        targetsProgress: 50,
        isComplete: false,
        meetsAccuracy: true,
        meetsTime: true,
        overTime: false,
        isPaper: false,
      };
      const drill = { target_type: 'tactical', rounds_per_shooter: 10 };
      
      const plan = calculateNextTargetPlan(drillProgress, drill, 10, 1);
      
      expect(plan?.remainingShots).toBe(10);
      expect(plan?.remainingTargets).toBe(1);
      expect(plan?.nextBullets).toBe(10); // Last target gets all remaining
    });

    it('should limit nextBullets to bulletsPerRound when multiple targets remain', () => {
      const drillProgress: DrillProgress = {
        rounds: 3,
        targetsPerRound: 1,
        bulletsPerRound: 10,
        requiredRounds: 30,
        requiredTargets: 3,
        shotsProgress: 0,
        targetsProgress: 0,
        isComplete: false,
        meetsAccuracy: true,
        meetsTime: true,
        overTime: false,
        isPaper: false,
      };
      const drill = { target_type: 'tactical', rounds_per_shooter: 10 };
      
      const plan = calculateNextTargetPlan(drillProgress, drill, 0, 0);
      
      expect(plan?.remainingShots).toBe(30);
      expect(plan?.remainingTargets).toBe(3);
      expect(plan?.nextBullets).toBe(10); // Capped at bulletsPerRound
    });

    it('should return 0 nextBullets when no shots remaining', () => {
      const drillProgress: DrillProgress = {
        rounds: 1,
        targetsPerRound: 1,
        bulletsPerRound: 10,
        requiredRounds: 10,
        requiredTargets: 1,
        shotsProgress: 100,
        targetsProgress: 100,
        isComplete: true,
        meetsAccuracy: true,
        meetsTime: true,
        overTime: false,
        isPaper: false,
      };
      const drill = { target_type: 'tactical', rounds_per_shooter: 10 };
      
      const plan = calculateNextTargetPlan(drillProgress, drill, 10, 1);
      
      expect(plan?.remainingShots).toBe(0);
      expect(plan?.nextBullets).toBe(0);
    });
  });
});

// ============================================================================
// DRILL LIMIT REACHED TESTS
// ============================================================================

describe('isDrillLimitReached', () => {
  it('should return true for paper drill when no targets remaining', () => {
    const drill = { target_type: 'paper' };
    const plan = { remainingShots: 10, remainingTargets: 0, nextBullets: 0 };
    
    expect(isDrillLimitReached(drill, plan)).toBe(true);
  });

  it('should return false for paper drill when targets remaining', () => {
    const drill = { target_type: 'paper' };
    const plan = { remainingShots: 0, remainingTargets: 1, nextBullets: 0 };
    
    expect(isDrillLimitReached(drill, plan)).toBe(false);
  });

  it('should return true for tactical drill when no shots remaining', () => {
    const drill = { target_type: 'tactical' };
    const plan = { remainingShots: 0, remainingTargets: 1, nextBullets: 0 };
    
    expect(isDrillLimitReached(drill, plan)).toBe(true);
  });

  it('should return true for tactical drill when no targets remaining', () => {
    const drill = { target_type: 'tactical' };
    const plan = { remainingShots: 10, remainingTargets: 0, nextBullets: 0 };
    
    expect(isDrillLimitReached(drill, plan)).toBe(true);
  });

  it('should return false for tactical drill when both remaining', () => {
    const drill = { target_type: 'tactical' };
    const plan = { remainingShots: 10, remainingTargets: 1, nextBullets: 10 };
    
    expect(isDrillLimitReached(drill, plan)).toBe(false);
  });
});

// ============================================================================
// END SESSION MESSAGE TESTS
// ============================================================================

describe('buildEndSessionMessage', () => {
  describe('When requirements are met', () => {
    it('should show simple end message', () => {
      const { title, message } = buildEndSessionMessage(
        true, // hasDrill
        { target_type: 'tactical', rounds_per_shooter: 10 },
        { requiredRounds: 10, requiredTargets: 1 },
        true, // meetsRequirements
        10, // totalShots
        1, // targetsCount
        80, // accuracy
        60 // elapsedTime
      );
      
      expect(title).toBe('End Session?');
      expect(message).toContain('1 target logged');
      expect(message).not.toContain('requirements');
    });
  });

  describe('When requirements NOT met', () => {
    it('should show warning message for tactical drill with shots/targets progress', () => {
      const { title, message } = buildEndSessionMessage(
        true,
        { target_type: 'tactical', rounds_per_shooter: 10 },
        { requiredRounds: 10, requiredTargets: 1 },
        false, // meetsRequirements = false
        5, // totalShots (less than required)
        0, // targetsCount (less than required)
        50,
        30
      );
      
      expect(title).toBe('End Drill Early?');
      expect(message).toContain('requirements that are not met');
      expect(message).toContain('Shots: 5/10');
      expect(message).toContain('Targets: 0/1');
      expect(message).toContain('will NOT count as a drill completion');
    });

    it('should show ONLY targets progress for paper drills (no shots)', () => {
      const { title, message } = buildEndSessionMessage(
        true,
        { target_type: 'paper', rounds_per_shooter: 10 },
        { requiredRounds: 0, requiredTargets: 3 },
        false,
        30, // shots don't matter
        1, // targetsCount
        100,
        60
      );
      
      expect(title).toBe('End Drill Early?');
      expect(message).toContain('Targets: 1/3');
      expect(message).not.toContain('Shots:'); // Paper drills don't show shots
    });

    it('should show accuracy requirement when set and not met', () => {
      const { title, message } = buildEndSessionMessage(
        true,
        { target_type: 'tactical', rounds_per_shooter: 10, min_accuracy_percent: 70 },
        { requiredRounds: 10, requiredTargets: 1 },
        false,
        10,
        1,
        50, // Below 70% minimum
        60
      );
      
      expect(message).toContain('Accuracy: 50% (min 70%)');
    });

    it('should show time requirement when set and not met', () => {
      const { title, message } = buildEndSessionMessage(
        true,
        { target_type: 'tactical', rounds_per_shooter: 10, time_limit_seconds: 30 },
        { requiredRounds: 10, requiredTargets: 1 },
        false,
        10,
        1,
        80,
        45 // Over 30s limit
      );
      
      expect(message).toContain('Time:');
      expect(message).toContain('limit');
    });
  });

  describe('No drill (free session)', () => {
    it('should show simple end message', () => {
      const { title, message } = buildEndSessionMessage(
        false, // hasDrill = false
        null,
        null,
        true,
        20,
        2,
        80,
        120
      );
      
      expect(title).toBe('End Session?');
      expect(message).toContain('2 targets logged');
    });
  });
});

// ============================================================================
// BUSINESS RULE VALIDATION
// ============================================================================

describe('Business Rule Validation', () => {
  it('RULE: Paper drills complete by TARGET COUNT, not shots', () => {
    const paperDrill = { target_type: 'paper', strings_count: 1, target_count: 3, rounds_per_shooter: 10 };
    
    // 0 shots, 3 targets = complete
    const complete = calculateDrillProgress(paperDrill, 0, 3, 0, 60);
    expect(complete?.isComplete).toBe(true);
    
    // 100 shots, 2 targets = NOT complete
    const notComplete = calculateDrillProgress(paperDrill, 100, 2, 100, 60);
    expect(notComplete?.isComplete).toBe(false);
  });

  it('RULE: Tactical drills require BOTH shots AND targets', () => {
    const tacticalDrill = { target_type: 'tactical', strings_count: 1, target_count: 1, rounds_per_shooter: 10 };
    
    // 10 shots, 1 target = complete
    const complete = calculateDrillProgress(tacticalDrill, 10, 1, 80, 60);
    expect(complete?.isComplete).toBe(true);
    
    // 10 shots, 0 targets = NOT complete
    const noTargets = calculateDrillProgress(tacticalDrill, 10, 0, 80, 60);
    expect(noTargets?.isComplete).toBe(false);
    
    // 5 shots, 1 target = NOT complete
    const notEnoughShots = calculateDrillProgress(tacticalDrill, 5, 1, 80, 60);
    expect(notEnoughShots?.isComplete).toBe(false);
  });

  it('RULE: Accuracy check uses hits/shots ratio against min_accuracy_percent', () => {
    const drill = { target_type: 'tactical', strings_count: 1, target_count: 1, rounds_per_shooter: 10, min_accuracy_percent: 70 };
    
    // 80% accuracy >= 70% = passes
    const passes = calculateDrillProgress(drill, 10, 1, 80, 60);
    expect(passes?.meetsAccuracy).toBe(true);
    
    // 60% accuracy < 70% = fails
    const fails = calculateDrillProgress(drill, 10, 1, 60, 60);
    expect(fails?.meetsAccuracy).toBe(false);
  });

  it('RULE: Time check compares elapsed time against time_limit_seconds', () => {
    const drill = { target_type: 'tactical', strings_count: 1, target_count: 1, rounds_per_shooter: 10, time_limit_seconds: 60 };
    
    // 30s <= 60s = passes
    const passes = calculateDrillProgress(drill, 10, 1, 80, 30);
    expect(passes?.meetsTime).toBe(true);
    
    // 90s > 60s = fails
    const fails = calculateDrillProgress(drill, 10, 1, 80, 90);
    expect(fails?.meetsTime).toBe(false);
  });

  it('RULE: End session shows shots for tactical, only targets for paper', () => {
    // Tactical shows shots
    const tacticalMsg = buildEndSessionMessage(
      true,
      { target_type: 'tactical', rounds_per_shooter: 10 },
      { requiredRounds: 10, requiredTargets: 1 },
      false, 5, 0, 50, 30
    );
    expect(tacticalMsg.message).toContain('Shots:');
    
    // Paper does NOT show shots
    const paperMsg = buildEndSessionMessage(
      true,
      { target_type: 'paper', rounds_per_shooter: 10 },
      { requiredRounds: 0, requiredTargets: 3 },
      false, 30, 1, 100, 30
    );
    expect(paperMsg.message).not.toContain('Shots:');
    expect(paperMsg.message).toContain('Targets:');
  });
});
