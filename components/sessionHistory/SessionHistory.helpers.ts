import type { SessionWithDetails } from '@/services/session/types';
import type { DateRangePreset, SessionFilters, SortConfig } from './SessionHistory.types';
import { DATE_RANGE_OPTIONS } from './SessionHistory.constants';

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): { start: Date | null; end: Date | null } {
  if (preset === 'all') {
    return { start: null, end: null };
  }
  
  if (preset === 'custom') {
    return { start: null, end: null }; // Custom handled separately
  }
  
  const option = DATE_RANGE_OPTIONS.find(o => o.value === preset);
  if (!option || option.days === null) {
    return { start: null, end: null };
  }
  
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - option.days);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

/**
 * Format relative date for display
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Format date for session card
 */
export function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

// ============================================================================
// DURATION HELPERS
// ============================================================================

/**
 * Calculate session duration in minutes
 */
export function getSessionDurationMinutes(session: SessionWithDetails): number | null {
  if (!session.ended_at) return null;
  
  const start = new Date(session.started_at).getTime();
  const end = new Date(session.ended_at).getTime();
  const durationMs = end - start;
  
  return Math.round(durationMs / (1000 * 60));
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

// ============================================================================
// STATS HELPERS
// ============================================================================

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(session: SessionWithDetails): number | null {
  if (!session.stats) return null;
  const { shots_fired, hits_total } = session.stats;
  if (shots_fired === 0) return null;
  return Math.round((hits_total / shots_fired) * 100);
}

/**
 * Get session summary string
 */
export function getSessionSummary(session: SessionWithDetails): string {
  const parts: string[] = [];
  
  if (session.stats?.shots_fired) {
    parts.push(`${session.stats.shots_fired} shots`);
  }
  
  if (session.drill_config?.distance_m) {
    parts.push(`${session.drill_config.distance_m}m`);
  }
  
  const duration = getSessionDurationMinutes(session);
  if (duration) {
    parts.push(formatDuration(duration));
  }
  
  return parts.join(' • ') || 'No data';
}

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Apply filters to sessions array
 */
export function applyFilters(
  sessions: SessionWithDetails[],
  filters: SessionFilters
): SessionWithDetails[] {
  return sessions.filter(session => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(session.status as any)) {
      return false;
    }
    
    // Session mode filter
    if (filters.sessionMode.length > 0 && !filters.sessionMode.includes(session.session_mode)) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange !== 'all') {
      const { start, end } = filters.dateRange === 'custom' 
        ? (filters.customDateRange || { start: null, end: null })
        : getDateRangeFromPreset(filters.dateRange);
      
      const sessionDate = new Date(session.started_at);
      
      if (start && sessionDate < start) return false;
      if (end && sessionDate > end) return false;
    }
    
    // Drill goal filter
    if (filters.drillGoal.length > 0) {
      const goal = session.drill_config?.drill_goal;
      if (!goal || !filters.drillGoal.includes(goal)) {
        return false;
      }
    }
    
    // Weapon filter
    if (filters.weaponIds.length > 0) {
      if (!session.weapon_id || !filters.weaponIds.includes(session.weapon_id)) {
        return false;
      }
    }
    
    // Distance range filter
    if (filters.distanceRange.min !== null || filters.distanceRange.max !== null) {
      const distance = session.drill_config?.distance_m;
      if (distance === undefined || distance === null) return false;
      if (filters.distanceRange.min !== null && distance < filters.distanceRange.min) return false;
      if (filters.distanceRange.max !== null && distance > filters.distanceRange.max) return false;
    }
    
    // Accuracy filter
    if (filters.minAccuracy !== null) {
      const accuracy = calculateAccuracy(session);
      if (accuracy === null || accuracy < filters.minAccuracy) return false;
    }
    
    // Shots filter
    if (filters.minShots !== null) {
      const shots = session.stats?.shots_fired || 0;
      if (shots < filters.minShots) return false;
    }
    
    // Watch controlled filter
    if (filters.watchControlled !== null) {
      if (session.watch_controlled !== filters.watchControlled) return false;
    }
    
    // Team filter
    if (filters.hasTeam !== null) {
      const hasTeam = session.team_id !== null;
      if (hasTeam !== filters.hasTeam) return false;
    }
    
    return true;
  });
}

/**
 * Apply search query to sessions
 */
export function applySearch(
  sessions: SessionWithDetails[],
  query: string
): SessionWithDetails[] {
  if (!query.trim()) return sessions;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return sessions.filter(session => {
    // Search in drill name
    if (session.drill_name?.toLowerCase().includes(lowerQuery)) return true;
    if (session.drill_config?.name?.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in weapon name
    if (session.weapon_name?.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in team name
    if (session.team_name?.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in training title
    if (session.training_title?.toLowerCase().includes(lowerQuery)) return true;
    
    return false;
  });
}

/**
 * Apply sorting to sessions
 */
export function applySorting(
  sessions: SessionWithDetails[],
  sort: SortConfig
): SessionWithDetails[] {
  const sorted = [...sessions];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sort.field) {
      case 'date':
        comparison = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        break;
        
      case 'shots':
        comparison = (a.stats?.shots_fired || 0) - (b.stats?.shots_fired || 0);
        break;
        
      case 'accuracy':
        comparison = (calculateAccuracy(a) || 0) - (calculateAccuracy(b) || 0);
        break;
        
      case 'distance':
        comparison = (a.drill_config?.distance_m || 0) - (b.drill_config?.distance_m || 0);
        break;
        
      case 'duration':
        comparison = (getSessionDurationMinutes(a) || 0) - (getSessionDurationMinutes(b) || 0);
        break;
    }
    
    return sort.direction === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

// ============================================================================
// COUNT HELPERS
// ============================================================================

/**
 * Count active filters
 */
export function countActiveFilters(filters: SessionFilters): number {
  let count = 0;
  
  if (filters.dateRange !== 'all') count++;
  if (filters.status.length > 0 && !(filters.status.length === 1 && filters.status[0] === 'completed')) count++;
  if (filters.sessionMode.length > 0) count++;
  if (filters.drillGoal.length > 0) count++;
  if (filters.weaponIds.length > 0) count++;
  if (filters.distanceRange.min !== null || filters.distanceRange.max !== null) count++;
  if (filters.minAccuracy !== null) count++;
  if (filters.minShots !== null) count++;
  if (filters.watchControlled !== null) count++;
  if (filters.hasTeam !== null) count++;
  
  return count;
}

