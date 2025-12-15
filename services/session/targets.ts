import { supabase } from '@/lib/supabase';
import type {
    CreatePaperResultParams,
    CreateTacticalResultParams,
    CreateTargetParams,
    PaperTargetResult,
    SessionTarget,
    SessionTargetWithResults,
    TacticalTargetResult,
} from './types';

/**
 * Get all targets for a session
 */
export async function getSessionTargets(sessionId: string): Promise<SessionTarget[]> {
  const { data, error } = await supabase
    .from('session_targets')
    .select(
      `
      id,
      session_id,
      target_type,
      distance_m,
      lane_number,
      planned_shots,
      sequence_in_session,
      notes,
      target_data
    `
    )
    .eq('session_id', sessionId)
    .order('sequence_in_session', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Add a target to a session
 */
export async function addSessionTarget(params: CreateTargetParams): Promise<SessionTarget> {
  // Get current target count for sequence
  const { count } = await supabase
    .from('session_targets')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', params.session_id);

  const sequence = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('session_targets')
    .insert({
      session_id: params.session_id,
      target_type: params.target_type,
      distance_m: params.distance_m ?? null,
      lane_number: params.lane_number ?? null,
      planned_shots: params.planned_shots ?? null,
      sequence_in_session: sequence,
      notes: params.notes ?? null,
      target_data: params.target_data ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a target from a session
 */
export async function deleteSessionTarget(targetId: string): Promise<boolean> {
  const { error } = await supabase.from('session_targets').delete().eq('id', targetId);

  if (error) throw error;
  return true;
}

// ============================================================================
// PAPER TARGET RESULTS
// ============================================================================

/**
 * Save paper target results (upsert)
 */
export async function savePaperTargetResult(params: CreatePaperResultParams): Promise<PaperTargetResult> {
  console.log('[SessionService] savePaperTargetResult called with:', {
    session_target_id: params.session_target_id,
    paper_type: params.paper_type,
    bullets_fired: params.bullets_fired,
    hits_total: params.hits_total,
  });

  // Check if result already exists for this target
  const { data: existing, error: existingError } = await supabase
    .from('paper_target_results')
    .select('id')
    .eq('session_target_id', params.session_target_id)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[SessionService] Error checking existing result:', existingError);
  }

  if (existing) {
    console.log('[SessionService] Updating existing paper result:', existing.id);
    // Update existing result
    const { data, error } = await supabase
      .from('paper_target_results')
      .update({
        paper_type: params.paper_type,
        bullets_fired: params.bullets_fired,
        hits_total: params.hits_total ?? null,
        hits_inside_scoring: params.hits_inside_scoring ?? null,
        dispersion_cm: params.dispersion_cm ?? null,
        offset_right_cm: params.offset_right_cm ?? null,
        offset_up_cm: params.offset_up_cm ?? null,
        scanned_image_url: params.scanned_image_url ?? null,
        notes: params.notes ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[SessionService] Error updating paper result:', error);
      throw error;
    }
    console.log('[SessionService] Paper result updated:', data.id);
    return data;
  }

  console.log('[SessionService] Inserting new paper result');
  // Insert new result
  const { data, error } = await supabase
    .from('paper_target_results')
    .insert({
      session_target_id: params.session_target_id,
      paper_type: params.paper_type,
      bullets_fired: params.bullets_fired,
      hits_total: params.hits_total ?? null,
      hits_inside_scoring: params.hits_inside_scoring ?? null,
      dispersion_cm: params.dispersion_cm ?? null,
      offset_right_cm: params.offset_right_cm ?? null,
      offset_up_cm: params.offset_up_cm ?? null,
      scanned_image_url: params.scanned_image_url ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[SessionService] Error inserting paper result:', error);
    throw error;
  }
  console.log('[SessionService] Paper result inserted:', data.id);
  return data;
}

/**
 * Get paper target result by target ID
 */
export async function getPaperTargetResult(sessionTargetId: string): Promise<PaperTargetResult | null> {
  const { data, error } = await supabase
    .from('paper_target_results')
    .select(
      `
      id,
      session_target_id,
      paper_type,
      bullets_fired,
      hits_total,
      hits_inside_scoring,
      dispersion_cm,
      offset_right_cm,
      offset_up_cm,
      scanned_image_url,
      notes
    `
    )
    .eq('session_target_id', sessionTargetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// ============================================================================
// TACTICAL TARGET RESULTS
// ============================================================================

/**
 * Save tactical target results (upsert)
 */
export async function saveTacticalTargetResult(params: CreateTacticalResultParams): Promise<TacticalTargetResult> {
  // Check if result already exists for this target
  const { data: existing } = await supabase
    .from('tactical_target_results')
    .select('id')
    .eq('session_target_id', params.session_target_id)
    .single();

  if (existing) {
    // Update existing result
    const { data, error } = await supabase
      .from('tactical_target_results')
      .update({
        bullets_fired: params.bullets_fired,
        hits: params.hits,
        is_stage_cleared: params.is_stage_cleared ?? false,
        time_seconds: params.time_seconds ?? null,
        notes: params.notes ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Insert new result
  const { data, error } = await supabase
    .from('tactical_target_results')
    .insert({
      session_target_id: params.session_target_id,
      bullets_fired: params.bullets_fired,
      hits: params.hits,
      is_stage_cleared: params.is_stage_cleared ?? false,
      time_seconds: params.time_seconds ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get tactical target result by target ID
 */
export async function getTacticalTargetResult(sessionTargetId: string): Promise<TacticalTargetResult | null> {
  const { data, error } = await supabase
    .from('tactical_target_results')
    .select(
      `
      id,
      session_target_id,
      bullets_fired,
      hits,
      is_stage_cleared,
      time_seconds,
      notes
    `
    )
    .eq('session_target_id', sessionTargetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// ============================================================================
// TARGETS WITH RESULTS
// ============================================================================

/**
 * Get all targets for a session with their results
 */
export async function getSessionTargetsWithResults(sessionId: string): Promise<SessionTargetWithResults[]> {
  const { data: targets, error } = await supabase
    .from('session_targets')
    .select(
      `
      id,
      session_id,
      target_type,
      distance_m,
      lane_number,
      planned_shots,
      sequence_in_session,
      notes,
      target_data,
      paper_target_results(
        id,
        session_target_id,
        paper_type,
        bullets_fired,
        hits_total,
        hits_inside_scoring,
        dispersion_cm,
        offset_right_cm,
        offset_up_cm,
        scanned_image_url,
        notes
      ),
      tactical_target_results(
        id,
        session_target_id,
        bullets_fired,
        hits,
        is_stage_cleared,
        time_seconds,
        notes
      )
    `
    )
    .eq('session_id', sessionId)
    .order('sequence_in_session', { ascending: true });

  if (error) throw error;

  return (targets ?? []).map((t: any) => {
    // Handle both array and object results (depends on Supabase relation type)
    // One-to-one relations return object, one-to-many return array
    const paperResult = Array.isArray(t.paper_target_results) ? t.paper_target_results[0] : t.paper_target_results;
    const tacticalResult = Array.isArray(t.tactical_target_results)
      ? t.tactical_target_results[0]
      : t.tactical_target_results;

    return {
      id: t.id,
      session_id: t.session_id,
      target_type: t.target_type,
      sequence_in_session: t.sequence_in_session,
      distance_m: t.distance_m,
      lane_number: t.lane_number,
      planned_shots: t.planned_shots,
      notes: t.notes,
      target_data: t.target_data,
      paper_result: paperResult ?? null,
      tactical_result: tacticalResult ?? null,
    };
  });
}

/**
 * Get a single target with its results
 */
export async function getTargetWithResults(targetId: string): Promise<SessionTargetWithResults | null> {
  const { data: target, error } = await supabase
    .from('session_targets')
    .select(
      `
      id,
      session_id,
      target_type,
      distance_m,
      lane_number,
      planned_shots,
      sequence_in_session,
      notes,
      target_data,
      paper_target_results(
        id,
        session_target_id,
        paper_type,
        bullets_fired,
        hits_total,
        hits_inside_scoring,
        dispersion_cm,
        offset_right_cm,
        offset_up_cm,
        scanned_image_url,
        notes
      ),
      tactical_target_results(
        id,
        session_target_id,
        bullets_fired,
        hits,
        is_stage_cleared,
        time_seconds,
        notes
      )
    `
    )
    .eq('id', targetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Handle both array and object results
  const paperResult = Array.isArray(target.paper_target_results) ? target.paper_target_results[0] : target.paper_target_results;
  const tacticalResult = Array.isArray(target.tactical_target_results)
    ? target.tactical_target_results[0]
    : target.tactical_target_results;

  return {
    id: target.id,
    session_id: target.session_id,
    target_type: target.target_type,
    sequence_in_session: target.sequence_in_session,
    distance_m: target.distance_m,
    lane_number: target.lane_number,
    planned_shots: target.planned_shots,
    notes: target.notes,
    target_data: target.target_data,
    paper_result: paperResult ?? null,
    tactical_result: tacticalResult ?? null,
  };
}

/**
 * Update a session target
 */
export async function updateSessionTarget(
  targetId: string,
  updates: Partial<Pick<SessionTarget, 'distance_m' | 'lane_number' | 'planned_shots' | 'notes' | 'target_data'>>
): Promise<SessionTarget> {
  const { data, error } = await supabase.from('session_targets').update(updates).eq('id', targetId).select().single();

  if (error) throw error;
  return data;
}


