/**
 * Timeline Analytics Helpers
 * 
 * Pure functions for calculating insights from watch timeline data.
 * Extracted from SessionTimelineChart for reuse across the app.
 */

import type { ShotDetail, TimelinePoint, TimelineSummary } from '@/services/session/timelineService';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceInsights {
  /** Overall trend: improving, declining, or stable */
  performanceTrend: 'improving' | 'declining' | 'stable';
  /** Average score (steadiness or HR stability based on availability) */
  avgPerformance: number;
  /** Best shot details */
  bestShot: { num: number; score: number } | null;
  /** Worst shot details */
  worstShot: { num: number; score: number } | null;
  /** 
   * Breath phase breakdown.
   * ⚠️ WARNING: Breath phase is estimated from HR trend, not real respiration!
   * Only reliable if breathing source is 'native'.
   */
  breathQuality: { pausePct: number; exhalePct: number; inhalePct: number };
  /** Split timing analysis (RELIABLE - based on real timestamps) */
  splitAnalysis: { 
    avg: number; 
    fastest: number; 
    slowest: number; 
    consistency: number;
  } | null;
  /** Rush pattern detection message */
  rushPattern: string | null;
  /** Fatigue indicator based on performance drop */
  fatigueIndicator: 'none' | 'mild' | 'significant';
  /** 
   * True if using HR stability instead of steadiness.
   * When true, "avgPerformance" = 100 - stress (higher = calmer).
   * ⚠️ Stress is derived from fake R-R intervals, so this is approximate.
   */
  usingStress: boolean;
  /** True if real accelerometer steadiness data is available */
  hasRealSteadiness: boolean;
  /** Individual shot scores for visualization */
  shotScores: number[];
  /** Flinch count (only reliable for auto-detected shots) */
  flinchCount: number;
  /** Label for what avgPerformance represents */
  performanceLabel: 'Steadiness' | 'HR Stability';
}

export interface HRInsights {
  avg: number;
  min: number;
  max: number;
  start?: number;
  end?: number;
  /** Change from start to end */
  hrChange: 'increased' | 'decreased' | 'stable' | null;
  hrChangePct: number;
  /** Variability range */
  range: number;
  rangeLabel: string;
}

export interface SteadinessInsights {
  avgScore: number;
  grade: string;
  trend: string | undefined;
  flinchCount: number;
  flinchRate: number;
  recoilConsistency: number;
  bestShot?: number;
  bestScore?: number;
  worstShot?: number;
  worstScore?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeMs(ms: number | undefined): string {
  if (!ms) return '--';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getBreathPhaseColor(phase: 'inhale' | 'exhale' | 'pause'): string {
  switch (phase) {
    case 'pause': return '#10B981'; // Green - optimal
    case 'exhale': return '#F59E0B'; // Amber
    case 'inhale': return '#EF4444'; // Red - not ideal
  }
}

export function getSteadinessGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: 'A+', color: '#10B981' };
  if (score >= 75) return { grade: 'A', color: '#22C55E' };
  if (score >= 65) return { grade: 'B', color: '#84CC16' };
  if (score >= 50) return { grade: 'C', color: '#F59E0B' };
  return { grade: 'D', color: '#EF4444' };
}

export function getGradeFromScore(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

// ============================================================================
// MAIN ANALYTICS FUNCTION
// ============================================================================

/**
 * Calculate comprehensive performance insights from shot details.
 * This is the main analytics function - use this for session analysis.
 */
export function calculatePerformanceInsights(shotDetails: ShotDetail[]): PerformanceInsights | null {
  if (shotDetails.length < 2) return null;

  const result: PerformanceInsights = {
    performanceTrend: 'stable',
    avgPerformance: 0,
    bestShot: null,
    worstShot: null,
    breathQuality: { pausePct: 0, exhalePct: 0, inhalePct: 0 },
    splitAnalysis: null,
    rushPattern: null,
    fatigueIndicator: 'none',
    usingStress: false,
    hasRealSteadiness: false,
    shotScores: [],
    flinchCount: 0,
    performanceLabel: 'Steadiness',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE SCORES
  // ─────────────────────────────────────────────────────────────────────────
  // Steadiness comes from accelerometer analysis (only for auto-detected shots).
  // If not available, we use "HR Stability" = 100 - stress.
  // 
  // NOTE: Stress is derived from FAKE R-R intervals (60000/HR), NOT real HRV!
  // It's still somewhat useful as higher HR variance = higher "stress".
  const steadinessSum = shotDetails.reduce((sum, s) => sum + s.steadiness, 0);
  const hasRealSteadiness = steadinessSum > 0;

  const performanceScores = hasRealSteadiness
    ? shotDetails.map(s => s.steadiness)
    : shotDetails.map(s => Math.max(0, 100 - s.stress)); // Invert stress to "HR Stability"

  result.usingStress = !hasRealSteadiness;
  result.hasRealSteadiness = hasRealSteadiness;
  result.performanceLabel = hasRealSteadiness ? 'Steadiness' : 'HR Stability';
  result.shotScores = performanceScores;
  result.avgPerformance = Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length);

  // ─────────────────────────────────────────────────────────────────────────
  // BEST / WORST SHOTS
  // ─────────────────────────────────────────────────────────────────────────
  const maxScore = Math.max(...performanceScores);
  const minScore = Math.min(...performanceScores);
  const bestIdx = performanceScores.indexOf(maxScore);
  const worstIdx = performanceScores.indexOf(minScore);
  result.bestShot = { num: shotDetails[bestIdx].shotNumber, score: maxScore };
  result.worstShot = { num: shotDetails[worstIdx].shotNumber, score: minScore };

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE TREND
  // Compare first half to second half
  // ─────────────────────────────────────────────────────────────────────────
  const half = Math.floor(performanceScores.length / 2);
  const firstHalfAvg = performanceScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalfAvg = performanceScores.slice(half).reduce((a, b) => a + b, 0) / (performanceScores.length - half);
  const trendDiff = secondHalfAvg - firstHalfAvg;
  if (trendDiff > 5) result.performanceTrend = 'improving';
  else if (trendDiff < -5) result.performanceTrend = 'declining';

  // ─────────────────────────────────────────────────────────────────────────
  // BREATH QUALITY
  // ─────────────────────────────────────────────────────────────────────────
  const pauseCount = shotDetails.filter(s => s.breathPhase === 'pause').length;
  const exhaleCount = shotDetails.filter(s => s.breathPhase === 'exhale').length;
  const inhaleCount = shotDetails.filter(s => s.breathPhase === 'inhale').length;
  result.breathQuality = {
    pausePct: Math.round((pauseCount / shotDetails.length) * 100),
    exhalePct: Math.round((exhaleCount / shotDetails.length) * 100),
    inhalePct: Math.round((inhaleCount / shotDetails.length) * 100),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FLINCH COUNT
  // ─────────────────────────────────────────────────────────────────────────
  result.flinchCount = shotDetails.filter(s => s.flinch).length;

  // ─────────────────────────────────────────────────────────────────────────
  // SPLIT TIMING ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  const timestamps = shotDetails.map(s => s.timestamp);
  if (timestamps.length >= 2) {
    const splits: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      splits.push(timestamps[i] - timestamps[i - 1]);
    }
    if (splits.length > 0) {
      const avgSplit = splits.reduce((a, b) => a + b, 0) / splits.length;
      const fastest = Math.min(...splits);
      const slowest = Math.max(...splits);
      const variance = splits.reduce((sum, s) => sum + Math.pow(s - avgSplit, 2), 0) / splits.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 100 - (stdDev / avgSplit) * 100);

      result.splitAnalysis = {
        avg: Math.round(avgSplit * 1000), // to ms
        fastest: Math.round(fastest * 1000),
        slowest: Math.round(slowest * 1000),
        consistency: Math.round(consistency),
      };

      // Rush pattern detection (3+ consecutive fast splits)
      let rushCount = 0;
      let rushStart = 0;
      for (let i = 0; i < splits.length; i++) {
        if (splits[i] < avgSplit * 0.7) {
          if (rushCount === 0) rushStart = i + 1;
          rushCount++;
        } else {
          if (rushCount >= 3) {
            result.rushPattern = `Rushed shots ${rushStart + 1}-${rushStart + rushCount + 1}`;
            break;
          }
          rushCount = 0;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FATIGUE INDICATOR
  // Compare last 3 shots to first 3
  // ─────────────────────────────────────────────────────────────────────────
  if (shotDetails.length >= 6) {
    const first3Avg = performanceScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const last3Avg = performanceScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const fatigueDrop = first3Avg - last3Avg;
    if (fatigueDrop > 15) result.fatigueIndicator = 'significant';
    else if (fatigueDrop > 8) result.fatigueIndicator = 'mild';
  }

  return result;
}

/**
 * Calculate HR insights from summary data.
 */
export function calculateHRInsights(
  hrData: { avg?: number; min?: number; max?: number },
  startHR?: number,
  endHR?: number
): HRInsights | null {
  if (!hrData.avg) return null;

  // HR change from start to end
  let hrChange: 'increased' | 'decreased' | 'stable' | null = null;
  let hrChangePct = 0;
  if (startHR && endHR && startHR > 0) {
    hrChangePct = Math.round(((endHR - startHR) / startHR) * 100);
    if (hrChangePct > 5) hrChange = 'increased';
    else if (hrChangePct < -5) hrChange = 'decreased';
    else hrChange = 'stable';
  }

  // HR range
  const range = (hrData.max ?? 0) - (hrData.min ?? 0);
  const rangeLabel = range > 20 ? 'High variability' : range > 10 ? 'Normal' : 'Very steady';

  return {
    avg: hrData.avg,
    min: hrData.min ?? 0,
    max: hrData.max ?? 0,
    start: startHR,
    end: endHR,
    hrChange,
    hrChangePct,
    range,
    rangeLabel,
  };
}

/**
 * Calculate optimal shot percentage.
 * 
 * IMPORTANT: Steadiness is only available for auto-detected shots.
 * Manual shots have steadiness = 0 (unknown), so we can't use it.
 * 
 * New criteria (more realistic):
 * - If steadiness data exists: pause phase + steadiness >= 70 + no flinch
 * - If no steadiness data: pause phase + low stress (calm) + no flinch
 */
export function calculateOptimalShotPct(shotDetails: ShotDetail[]): number {
  if (shotDetails.length === 0) return 0;
  
  // Check if we have real steadiness data
  const hasRealSteadiness = shotDetails.some(s => s.steadiness > 0);
  
  const optimal = shotDetails.filter(s => {
    // Flinch always disqualifies
    if (s.flinch) return false;
    
    // Breath phase should be pause (ideal for shooting)
    if (s.breathPhase !== 'pause') return false;
    
    if (hasRealSteadiness) {
      // Use steadiness if available
      return s.steadiness >= 70;
    } else {
      // Fall back to stress (lower = better, inverted from HRV)
      // Stress < 40 = fairly calm
      return s.stress < 40;
    }
  }).length;
  
  return Math.round((optimal / shotDetails.length) * 100);
}

/**
 * Get summary statistics from timeline points.
 */
export function calculateTimelineSummary(points: TimelinePoint[]): TimelineSummary | null {
  if (points.length === 0) return null;

  const hrs = points.map(p => p.heartRate).filter(hr => hr > 0);
  const stresses = points.map(p => p.stress);
  const breathRates = points.map(p => p.breathRate).filter(br => br > 0);

  return {
    durationSeconds: points[points.length - 1]?.timestamp ?? 0,
    hrMin: hrs.length > 0 ? Math.min(...hrs) : 0,
    hrMax: hrs.length > 0 ? Math.max(...hrs) : 0,
    hrAvg: hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : 0,
    stressAvg: stresses.length > 0 ? Math.round(stresses.reduce((a, b) => a + b, 0) / stresses.length) : 0,
    b: breathRates.length > 0 ? Math.round(breathRates.reduce((a, b) => a + b, 0) / breathRates.length) : 0,
    shotCount: points.filter(p => p.eventType === 'shot' || p.eventType === 'hit').length,
  };
}

