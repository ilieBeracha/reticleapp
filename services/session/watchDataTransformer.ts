// ============================================================================
// WATCH DATA TRANSFORMER
// ============================================================================
//
// Transforms watch payloads to internal format and builds DB-ready data.
//
// Flow:
// 1. Watch sends SESSION_SUMMARY → transformSummaryPayload() → TransformedWatchData
// 2. Watch sends SESSION_DETAILS → mergeDetailsPayload() → TransformedWatchData (updated)
// 3. Save to DB → buildTargetData() → Record<string, unknown>
// ============================================================================

import type {
  AssembledTimelineData,
  ShotDetailExpanded,
  TimelinePoint,
  TimelinePointExpanded,
  TimelineShotDetail,
  TransformedWatchData,
  WatchDetailsPayload,
  WatchShotData,
  WatchSummaryPayload,
  WatchTimelineChunkPayload,
} from '@/types/session.watch';
import { decodeWeather } from './weatherDecoder';

/**
 * Transform watch SUMMARY payload to internal format.
 * Called when Phase 1 (SESSION_SUMMARY) is received.
 */
export function transformSummaryPayload(payload: WatchSummaryPayload): TransformedWatchData {
  // Handle both v2 nested format and legacy flat format
  const bio = payload.bio as any;
  const isV2Format = bio.hr !== undefined;
  
  const hrAvg = isV2Format ? bio.hr.avg : bio.hrAvg;
  const hrMin = isV2Format ? bio.hr.min : bio.hrMin;
  const hrMax = isV2Format ? bio.hr.max : bio.hrMax;
  const hrStart = isV2Format ? bio.hr.start : undefined;
  const hrEnd = isV2Format ? bio.hr.end : undefined;
  const brAvg = isV2Format ? bio.breath.avg : bio.brAvg;
  const stressAvg = isV2Format ? bio.stress?.avg : undefined;
  const stressMin = isV2Format ? bio.stress?.min : undefined;
  const stressMax = isV2Format ? bio.stress?.max : undefined;
  
  const hasBiometrics = hrAvg > 0;
  const hasSteadiness = payload.steady.avg > 0;

  // Handle both v2 (new) and legacy formats with fallbacks
  const p = payload as any;
  
  // Duration: prefer "dur" (ms), fallback to "time" (seconds -> convert to ms)
  const durationMs = p.dur ?? (p.time ? p.time * 1000 : 0);
  
  // Completed: prefer "done", fallback to "complete"
  const completed = p.done ?? p.complete ?? false;
  
  // Splits: prefer top-level "splits", fallback to nested "perf.splits"
  const splits = p.splits ?? p.perf?.splits ?? [];
  
  // Average split: prefer "perf.avg", fallback to "perf.avgSplit"
  const avgSplit = p.perf?.avg ?? p.perf?.avgSplit ?? 0;
  
  // Hits: optional field, default to 0
  const hits = p.hits ?? 0;

  // Calculate best/worst from splits if not provided
  const bestSplit = p.perf?.best ?? (splits.length > 0 ? Math.min(...splits) : 0);
  const worstSplit = p.perf?.worst ?? (splits.length > 0 ? Math.max(...splits) : 0);

  return {
    sessionId: payload.sid,
    shotsRecorded: payload.shots,
    hitsRecorded: hits,
    durationMs: durationMs,
    distance: payload.dist,
    completed: completed,

    // Splits
    splitTimes: splits,
    avgSplitMs: avgSplit,

    // Performance
    performance: {
      firstShotTime: payload.perf.first,
      bestSplit: bestSplit,
      worstSplit: worstSplit,
      avgSplit: avgSplit,
    },

    // Biometrics
    biometrics: {
      enabled: hasBiometrics,
      summary: {
        avgHR: hrAvg,
        minHR: hrMin,
        maxHR: hrMax,
        startHR: hrStart,
        endHR: hrEnd,
        avgBreathRate: brAvg,
        avgStress: stressAvg,
        minStress: stressMin,
        maxStress: stressMax,
      },
    },

    // Steadiness (with fallbacks for legacy watch versions)
    steadiness: {
      enabled: hasSteadiness,
      avgScore: payload.steady.avg ?? 0,
      trend: payload.steady.trend ?? 'unknown',
      flinchCount: payload.steady.flinch ?? 0,
    },

    // Detection metadata (v2 - now in summary, optional for backward compat)
    ...(payload.detection && {
      autoDetected: payload.detection.auto,
      detectionSensitivity: payload.detection.sens,
      manualOverrides: payload.detection.overrides,
    }),

    // Weather conditions - DISABLED (causing crashes)
    // weather: decodeWeather(payload.weather),
    weather: null,

    // Sync status
    isSummaryOnly: true,
    detailsMerged: false,
  };
}

/**
 * Merge watch DETAILS payload into existing transformed data.
 * Called when Phase 2 (SESSION_DETAILS) is received.
 */
export function mergeDetailsPayload(
  existing: TransformedWatchData,
  details: WatchDetailsPayload
): TransformedWatchData {
  return {
    ...existing,

    // Add per-shot data
    shotBiometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),

    // Add detection metadata
    autoDetected: details.meta.auto,
    detectionSensitivity: details.meta.sens,
    manualOverrides: details.meta.overrides,

    // Update sync status
    isSummaryOnly: false,
    detailsMerged: true,
  };
}

/**
 * Build partial details for merging when only details payload is available.
 * Used when summary was already saved to DB before details arrived.
 */
export function buildDetailsPartial(
  details: WatchDetailsPayload
): Partial<TransformedWatchData> {
  return {
    shotBiometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),
    autoDetected: details.meta.auto,
    detectionSensitivity: details.meta.sens,
    manualOverrides: details.meta.overrides,
    detailsMerged: true,
  };
}

/**
 * Build target_data for database storage.
 * Converts TransformedWatchData to the format stored in session_targets.target_data.
 */
export function buildTargetData(data: TransformedWatchData): Record<string, unknown> {
  const result: Record<string, unknown> = {
    source: 'garmin_watch',

    // Core data
    shots_recorded: data.shotsRecorded,
    hits_recorded: data.hitsRecorded,
    duration_ms: data.durationMs,
    distance: data.distance,
    completed: data.completed,

    // Splits
    splits: data.splitTimes,
    avg_split_ms: data.avgSplitMs,
    fastest_split_ms: data.splitTimes.length > 0 ? Math.min(...data.splitTimes) : null,
    slowest_split_ms: data.splitTimes.length > 0 ? Math.max(...data.splitTimes) : null,

    // Performance
    performance: {
      first_shot_time: data.performance.firstShotTime,
      best_split: data.performance.bestSplit,
      worst_split: data.performance.worstSplit,
      avg_split: data.performance.avgSplit,
    },
  };

  // Biometrics (only if enabled)
  if (data.biometrics.enabled) {
    result.heart_rate = {
      avg: data.biometrics.summary.avgHR,
      min: data.biometrics.summary.minHR,
      max: data.biometrics.summary.maxHR,
    };
    result.avg_breath_rate = data.biometrics.summary.avgBreathRate;
  }

  // Steadiness (only if enabled)
  if (data.steadiness.enabled) {
    result.steadiness = {
      avg_score: data.steadiness.avgScore,
      trend: data.steadiness.trend,
      flinch_count: data.steadiness.flinchCount,
    };
  }

  // Per-shot data (if available from details)
  if (data.shotBiometrics && data.shotBiometrics.length > 0) {
    result.shot_biometrics = data.shotBiometrics;
  }

  // Detection metadata (if available from details)
  if (data.autoDetected !== undefined) {
    result.auto_detected = data.autoDetected;
  }
  if (data.detectionSensitivity !== undefined) {
    result.detection_sensitivity = data.detectionSensitivity;
  }
  if (data.manualOverrides !== undefined) {
    result.manual_overrides = data.manualOverrides;
  }

  // Weather conditions (critical for shooting analytics)
  if (data.weather) {
    result.weather = {
      temperature_c: data.weather.temperatureC,
      temperature_f: data.weather.temperatureF,
      humidity: data.weather.humidity,
      wind_speed_mps: data.weather.windSpeedMps,
      wind_speed_mph: data.weather.windSpeedMph,
      wind_speed_kph: data.weather.windSpeedKph,
      wind_direction: data.weather.windDirection,
      wind_bearing: data.weather.windBearing,
      pressure_hpa: data.weather.pressureHpa,
      condition: data.weather.condition,
      // Computed analytics fields
      wind_impact: data.weather.windImpact,
      condition_severity: data.weather.conditionSeverity,
    };
  }

  // Sync status markers
  result.is_summary_only = data.isSummaryOnly;
  result.details_merged = data.detailsMerged;
  if (data.detailsMerged) {
    result.details_merged_at = new Date().toISOString();
  }

  return result;
}

/**
 * Build details merge payload for updating existing target_data.
 * Used when merging Phase 2 details into already-saved Phase 1 data.
 */
export function buildDetailsMergePayload(
  details: WatchDetailsPayload
): Record<string, unknown> {
  return {
    // Per-shot biometrics
    shot_biometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),

    // Detection metadata
    auto_detected: details.meta.auto,
    detection_sensitivity: details.meta.sens,
    manual_overrides: details.meta.overrides,

    // Update sync status
    is_summary_only: false,
    details_merged: true,
    details_merged_at: new Date().toISOString(),
  };
}

// ============================================================================
// LEGACY FORMAT CONVERSION
// ============================================================================

/**
 * Convert legacy watch payload (SESSION_RESULT) to new format.
 * Maintains backwards compatibility with older watch app versions.
 */
export function convertLegacyPayload(legacy: {
  sessionId?: string;
  shotsFired?: number;
  elapsedTime?: number; // seconds
  distance?: number;
  completed?: boolean;
  splitTimes?: number[];
  avgSplit?: number;
  hr?: { avg?: number; min?: number; max?: number };
  steadiness?: { avg?: number; trend?: string };
}): WatchSummaryPayload {
  const durationMs = (legacy.elapsedTime ?? 0) * 1000;
  const splits = legacy.splitTimes ?? [];

  // Calculate perf from splits
  const first = splits.length > 0 ? splits[0] : 0;
  const best = splits.length > 0 ? Math.min(...splits) : 0;
  const worst = splits.length > 0 ? Math.max(...splits) : 0;
  const avg = splits.length > 0
    ? Math.round(splits.reduce((a, b) => a + b, 0) / splits.length)
    : 0;

  return {
    sid: legacy.sessionId ?? '',
    ts: Math.floor(Date.now() / 1000),
    shots: legacy.shotsFired ?? 0,
    hits: legacy.shotsFired ?? 0, // Legacy doesn't track hits separately
    dur: durationMs,
    dist: legacy.distance ?? 0,
    done: legacy.completed ?? true,
    splits,
    perf: { first, best, worst, avg },
    bio: {
      hrAvg: legacy.hr?.avg ?? 0,
      hrMin: legacy.hr?.min ?? 0,
      hrMax: legacy.hr?.max ?? 0,
      brAvg: 0,
    },
    steady: {
      avg: legacy.steadiness?.avg ?? 0,
      trend: (legacy.steadiness?.trend as 'improving' | 'declining' | 'stable') ?? 'unknown',
      flinch: 0,
    },
  };
}

// ============================================================================
// TIMELINE DATA TRANSFORMERS (Phase 3)
// ============================================================================

/**
 * Timeline chunk assembler - collects chunks and assembles when complete.
 * Use this class to handle incoming TIMELINE_CHUNK messages.
 */
export class TimelineChunkAssembler {
  private chunks: Map<string, Map<number, WatchTimelineChunkPayload>> = new Map();
  private expectedTotals: Map<string, number> = new Map();

  /**
   * Add a received chunk. Returns assembled data if all chunks received.
   */
  addChunk(chunk: WatchTimelineChunkPayload): AssembledTimelineData | null {
    const { sid, chunk: chunkIndex, total, pts, shots } = chunk;

    // Initialize session storage if needed
    if (!this.chunks.has(sid)) {
      this.chunks.set(sid, new Map());
      this.expectedTotals.set(sid, total);
    }

    // Store this chunk
    const sessionChunks = this.chunks.get(sid)!;
    sessionChunks.set(chunkIndex, chunk);

    console.log(`[TimelineAssembler] Chunk ${chunkIndex + 1}/${total} for ${sid.slice(0, 8)}... (${pts.length} points)`);

    // Check if all chunks received
    if (sessionChunks.size === total) {
      return this.assemble(sid);
    }

    return null;
  }

  /**
   * Assemble all chunks for a session into final timeline data.
   * Note: Shots are now spread across chunks (not just last chunk).
   */
  private assemble(sessionId: string): AssembledTimelineData {
    const sessionChunks = this.chunks.get(sessionId)!;
    const total = this.expectedTotals.get(sessionId)!;

    // Merge points and shots from ALL chunks in order
    const allPoints: TimelinePoint[] = [];
    const allShots: TimelineShotDetail[] = [];

    for (let i = 0; i < total; i++) {
      const chunk = sessionChunks.get(i);
      if (chunk) {
        // Add points from this chunk
        if (chunk.pts) {
          allPoints.push(...chunk.pts);
        }
        // Add shots from this chunk (shots are now spread across chunks)
        if (chunk.shots && chunk.shots.length > 0) {
          allShots.push(...chunk.shots);
        }
      }
    }

    // Clean up storage
    this.chunks.delete(sessionId);
    this.expectedTotals.delete(sessionId);

    console.log(`[TimelineAssembler] ✅ Assembled ${allPoints.length} points, ${allShots.length} shots for ${sessionId.slice(0, 8)}...`);

    return {
      sessionId,
      points: allPoints,
      shotDetails: allShots,
      totalChunks: total,
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if we have pending chunks for a session.
   */
  hasPendingChunks(sessionId: string): boolean {
    return this.chunks.has(sessionId);
  }

  /**
   * Get pending chunk info for a session.
   */
  getPendingInfo(sessionId: string): { received: number; expected: number } | null {
    if (!this.chunks.has(sessionId)) return null;
    return {
      received: this.chunks.get(sessionId)!.size,
      expected: this.expectedTotals.get(sessionId) ?? 0,
    };
  }

  /**
   * Clear pending chunks for a session (e.g., on timeout).
   */
  clearSession(sessionId: string): void {
    this.chunks.delete(sessionId);
    this.expectedTotals.delete(sessionId);
  }
}

/**
 * Convert timeline point array to expanded object format.
 */
export function expandTimelinePoint(point: TimelinePoint): TimelinePointExpanded {
  const [timestamp, heartRate, breathRate, stress, eventType] = point;
  return {
    timestamp,
    heartRate,
    breathRate,
    stress,
    eventType: eventType === 0 ? 'sample' : eventType === 1 ? 'shot' : 'hit',
  };
}

/**
 * Convert shot detail to expanded object format.
 */
export function expandShotDetail(shot: TimelineShotDetail): ShotDetailExpanded {
  return {
    shotNumber: shot.n,
    timestamp: shot.t,
    heartRate: shot.hr,
    breathRate: shot.br,
    // Watch sends: 0=inhale, 1=exhale, 2=pause, 3=unknown
    breathPhase: shot.bp === 0 ? 'inhale' : shot.bp === 1 ? 'exhale' : shot.bp === 2 ? 'pause' : 'exhale',
    stress: shot.st,
    steadiness: shot.sd,
    flinch: shot.fl === 1,
  };
}

/**
 * Build database-ready timeline data from assembled chunks.
 */
export function buildTimelineData(assembled: AssembledTimelineData): {
  session_id: string;
  points: TimelinePointExpanded[];
  shot_details: ShotDetailExpanded[];
  total_chunks: number;
  received_at: string;
  summary: {
    total_points: number;
    total_shots: number;
    duration_seconds: number;
    hr_min: number;
    hr_max: number;
    hr_avg: number;
    stress_min: number;
    stress_max: number;
    stress_avg: number;
  };
} {
  const points = assembled.points.map(expandTimelinePoint);
  const shotDetails = assembled.shotDetails.map(expandShotDetail);

  // Calculate summary stats
  const hrValues = points.filter(p => p.heartRate > 0).map(p => p.heartRate);
  const stressValues = points.filter(p => p.stress > 0).map(p => p.stress);
  const lastPoint = points[points.length - 1];

  return {
    session_id: assembled.sessionId,
    points,
    shot_details: shotDetails,
    total_chunks: assembled.totalChunks,
    received_at: assembled.receivedAt,
    summary: {
      total_points: points.length,
      total_shots: shotDetails.length,
      duration_seconds: lastPoint?.timestamp ?? 0,
      hr_min: hrValues.length > 0 ? Math.min(...hrValues) : 0,
      hr_max: hrValues.length > 0 ? Math.max(...hrValues) : 0,
      hr_avg: hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0,
      stress_min: stressValues.length > 0 ? Math.min(...stressValues) : 0,
      stress_max: stressValues.length > 0 ? Math.max(...stressValues) : 0,
      stress_avg: stressValues.length > 0 ? Math.round(stressValues.reduce((a, b) => a + b, 0) / stressValues.length) : 0,
    },
  };
}

