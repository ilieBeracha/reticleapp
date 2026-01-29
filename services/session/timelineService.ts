// ============================================================================
// SESSION TIMELINE SERVICE
// ============================================================================
//
// Handles storage and retrieval of time-series biometric data from Garmin watch.
// This data is received via Phase 3 (TIMELINE_CHUNK) of the sync protocol.
//
// Data flow:
// 1. garminService receives TIMELINE_CHUNK messages
// 2. TimelineChunkAssembler collects and assembles chunks
// 3. garminService emits 'timeline_complete' event
// 4. This service saves the assembled data to DB
// ============================================================================

import { supabase } from '@/services/supabase';
import type { GarminTimelineData } from '@/services/garminService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Timeline point as stored in database.
 */
export interface TimelinePoint {
  timestamp: number;
  heartRate: number;
  breathRate: number;
  stress: number;
  eventType: 'sample' | 'shot' | 'hit';
}

/**
 * Shot detail as stored in database.
 */
export interface ShotDetail {
  shotNumber: number;
  timestamp: number;
  heartRate: number;
  breathRate: number;
  breathPhase: 'inhale' | 'exhale' | 'pause';
  stress: number;
  steadiness: number;
  flinch: boolean;
}

/**
 * Timeline summary stats.
 */
export interface TimelineSummary {
  totalPoints: number;
  totalShots: number;
  durationSeconds: number;
  hrMin: number;
  hrMax: number;
  hrAvg: number;
  stressMin: number;
  stressMax: number;
  stressAvg: number;
}

/**
 * Full session timeline record.
 */
export interface SessionTimeline {
  id: string;
  sessionId: string;
  points: TimelinePoint[];
  shotDetails: ShotDetail[];
  summary: TimelineSummary;
  totalChunks: number;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timeline with shot markers for visualization.
 */
export interface TimelineWithMarkers {
  points: TimelinePoint[];
  shotMarkers: Array<{
    timestamp: number;
    shotNumber: number;
    heartRate: number;
    steadiness: number;
    flinch: boolean;
  }>;
  summary: TimelineSummary;
}

// ============================================================================
// SAVE TIMELINE
// ============================================================================

/**
 * Save timeline data from Garmin watch to database.
 * Called after 'timeline_complete' event from garminService.
 */
export async function saveSessionTimeline(
  data: GarminTimelineData
): Promise<SessionTimeline> {
  console.log('[TimelineService] Saving timeline for session:', data.sessionId);
  console.log('[TimelineService] Points:', data.points.length);
  console.log('[TimelineService] Shot details:', data.shotDetails.length);

  const { data: timeline, error } = await supabase
    .from('session_timelines')
    .upsert({
      session_id: data.sessionId,
      points: data.points,
      shot_details: data.shotDetails,
      summary: data.summary,
      total_chunks: 1, // Already assembled
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'session_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[TimelineService] Error saving timeline:', error);
    throw error;
  }

  console.log('[TimelineService] ✅ Timeline saved:', timeline.id);

  return mapTimeline(timeline);
}

// ============================================================================
// RETRIEVE TIMELINE
// ============================================================================

/**
 * Get timeline for a session.
 */
export async function getSessionTimeline(
  sessionId: string
): Promise<SessionTimeline | null> {
  const { data, error } = await supabase
    .from('session_timelines')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return mapTimeline(data);
}

/**
 * Get timeline with shot markers for visualization.
 * Returns points with separate shot marker array for overlay.
 */
export async function getTimelineWithMarkers(
  sessionId: string
): Promise<TimelineWithMarkers | null> {
  const timeline = await getSessionTimeline(sessionId);
  if (!timeline) return null;

  // Extract shot markers from shot details
  const shotMarkers = timeline.shotDetails.map(shot => ({
    timestamp: shot.timestamp,
    shotNumber: shot.shotNumber,
    heartRate: shot.heartRate,
    steadiness: shot.steadiness,
    flinch: shot.flinch,
  }));

  return {
    points: timeline.points,
    shotMarkers,
    summary: timeline.summary,
  };
}

/**
 * Check if a session has timeline data.
 */
export async function hasSessionTimeline(sessionId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('session_timelines')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) {
    console.error('[TimelineService] Error checking timeline:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// ============================================================================
// TIMELINE ANALYSIS
// ============================================================================

/**
 * Get heart rate at specific shot.
 */
export function getHeartRateAtShot(
  timeline: SessionTimeline,
  shotNumber: number
): number | null {
  const shot = timeline.shotDetails.find(s => s.shotNumber === shotNumber);
  return shot?.heartRate ?? null;
}

/**
 * Get optimal shots (shots during breath pause with low stress).
 */
export function getOptimalShots(timeline: SessionTimeline): ShotDetail[] {
  return timeline.shotDetails.filter(shot => 
    shot.breathPhase === 'pause' && 
    shot.stress < 50 &&
    shot.steadiness >= 70 &&
    !shot.flinch
  );
}

/**
 * Get shots with flinch.
 */
export function getFlinchShots(timeline: SessionTimeline): ShotDetail[] {
  return timeline.shotDetails.filter(shot => shot.flinch);
}

/**
 * Calculate heart rate recovery between shots.
 * Returns array of HR drops between consecutive shots.
 */
export function calculateHRRecovery(timeline: SessionTimeline): Array<{
  fromShot: number;
  toShot: number;
  hrDrop: number;
  timeSeconds: number;
}> {
  const shots = timeline.shotDetails.sort((a, b) => a.shotNumber - b.shotNumber);
  const recovery: Array<{
    fromShot: number;
    toShot: number;
    hrDrop: number;
    timeSeconds: number;
  }> = [];

  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1];
    const curr = shots[i];
    
    recovery.push({
      fromShot: prev.shotNumber,
      toShot: curr.shotNumber,
      hrDrop: prev.heartRate - curr.heartRate,
      timeSeconds: curr.timestamp - prev.timestamp,
    });
  }

  return recovery;
}

/**
 * Get stress trend during session.
 */
export function getStressTrend(timeline: SessionTimeline): 'increasing' | 'decreasing' | 'stable' {
  const points = timeline.points;
  if (points.length < 4) return 'stable';

  // Compare first quarter vs last quarter
  const quarterSize = Math.floor(points.length / 4);
  const firstQuarter = points.slice(0, quarterSize);
  const lastQuarter = points.slice(-quarterSize);

  const avgFirst = firstQuarter.reduce((sum, p) => sum + p.stress, 0) / firstQuarter.length;
  const avgLast = lastQuarter.reduce((sum, p) => sum + p.stress, 0) / lastQuarter.length;

  const diff = avgLast - avgFirst;
  if (diff > 10) return 'increasing';
  if (diff < -10) return 'decreasing';
  return 'stable';
}

// ============================================================================
// DATA FOR VISUALIZATION
// ============================================================================

/**
 * Get data formatted for chart visualization.
 * Returns points sampled at appropriate intervals for display.
 */
export function getChartData(
  timeline: SessionTimeline,
  maxPoints: number = 100
): {
  timestamps: number[];
  heartRates: number[];
  stressLevels: number[];
  shotTimestamps: number[];
} {
  const points = timeline.points;
  
  // Sample if too many points
  let sampledPoints = points;
  if (points.length > maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    sampledPoints = points.filter((_, i) => i % step === 0);
  }

  return {
    timestamps: sampledPoints.map(p => p.timestamp),
    heartRates: sampledPoints.map(p => p.heartRate),
    stressLevels: sampledPoints.map(p => p.stress),
    shotTimestamps: timeline.shotDetails.map(s => s.timestamp),
  };
}

// ============================================================================
// DELETE TIMELINE
// ============================================================================

/**
 * Delete timeline for a session.
 */
export async function deleteSessionTimeline(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('session_timelines')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    console.error('[TimelineService] Error deleting timeline:', error);
    throw error;
  }

  return true;
}

// ============================================================================
// MAPPER
// ============================================================================

function mapTimeline(row: any): SessionTimeline {
  return {
    id: row.id,
    sessionId: row.session_id,
    points: row.points as TimelinePoint[],
    shotDetails: row.shot_details as ShotDetail[],
    summary: row.summary as TimelineSummary,
    totalChunks: row.total_chunks,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

