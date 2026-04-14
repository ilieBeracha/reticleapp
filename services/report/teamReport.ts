/**
 * Team Performance Report
 *
 * Fetches team session data, aggregates per-user stats across positions,
 * weapons, and spotter roles, then generates and shares a PDF report.
 */

import { SESSION_SELECT_WITH_FULL_DRILL, TARGET_STATS_SELECT } from '@/services/session/selectClauses';
import { mapSession } from '@/services/session/mappers';
import { getTeamMembers } from '@/services/teamService';
import { supabase } from '@/services/supabase';
import type { SessionWithDetails } from '@/types/session';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ============================================================================
// TYPES
// ============================================================================

type PositionKey = 'prone' | 'sitting' | 'standing' | 'kneeling' | 'other';

interface PositionGroupingStats {
  sessions: number;
  bestCm: number | null;
  avgCm: number | null;
  _totalCm: number;
  _countCm: number;
}

interface PositionAccuracyStats {
  sessions: number;
  shots: number;
  hits: number;
  pct: number;
}

interface TimeLimitBucket {
  sessions: number;
  shots: number;
  hits: number;
  pct: number;
}

interface WeaponBucket {
  sessions: number;
  shots: number;
  hits: number;
  pct: number;
}

interface SpotterStats {
  engagements: number;
  shotsObserved: number;
  hitsObserved: number;
  hitPct: number;
  firstShotHits: number;
  firstShotTotal: number;
  firstShotPct: number;
}

export interface UserReportData {
  userId: string;
  userName: string;
  role: string;
  totals: { sessions: number; shots: number; hits: number; accuracy: number };
  grouping: Record<PositionKey, PositionGroupingStats>;
  hitAccuracy: Record<PositionKey, PositionAccuracyStats>;
  timeLimit: {
    withTimeLimit: TimeLimitBucket;
    noTimeLimit: TimeLimitBucket;
  };
  byWeapon: Record<string, WeaponBucket>;
  spotter: SpotterStats;
}

export interface TeamReportData {
  team: { id: string; name: string };
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
  users: UserReportData[];
  summary: { members: number; sessions: number; shots: number; hits: number; accuracy: number };
}

// ============================================================================
// HELPERS
// ============================================================================

const POSITIONS: PositionKey[] = ['prone', 'sitting', 'standing', 'kneeling', 'other'];

function emptyGroupingStats(): PositionGroupingStats {
  return { sessions: 0, bestCm: null, avgCm: null, _totalCm: 0, _countCm: 0 };
}

function emptyAccuracyStats(): PositionAccuracyStats {
  return { sessions: 0, shots: 0, hits: 0, pct: 0 };
}

function emptyTimeLimitBucket(): TimeLimitBucket {
  return { sessions: 0, shots: 0, hits: 0, pct: 0 };
}

function emptySpotter(): SpotterStats {
  return { engagements: 0, shotsObserved: 0, hitsObserved: 0, hitPct: 0, firstShotHits: 0, firstShotTotal: 0, firstShotPct: 0 };
}

function emptyUserData(userId: string, userName: string, role: string): UserReportData {
  const grouping = Object.fromEntries(POSITIONS.map((p) => [p, emptyGroupingStats()])) as Record<PositionKey, PositionGroupingStats>;
  const hitAccuracy = Object.fromEntries(POSITIONS.map((p) => [p, emptyAccuracyStats()])) as Record<PositionKey, PositionAccuracyStats>;
  return {
    userId,
    userName,
    role,
    totals: { sessions: 0, shots: 0, hits: 0, accuracy: 0 },
    grouping,
    hitAccuracy,
    timeLimit: { withTimeLimit: emptyTimeLimitBucket(), noTimeLimit: emptyTimeLimitBucket() },
    byWeapon: {},
    spotter: emptySpotter(),
  };
}

function normalizePosition(raw: string | null | undefined): PositionKey {
  if (!raw) return 'other';
  const lower = raw.toLowerCase();
  if (lower === 'prone') return 'prone';
  if (lower === 'sitting' || lower === 'seated') return 'sitting';
  if (lower === 'standing') return 'standing';
  if (lower === 'kneeling') return 'kneeling';
  return 'other';
}

function finalizePct(bucket: { shots: number; hits: number; pct: number }): void {
  bucket.pct = bucket.shots > 0 ? Math.round((bucket.hits / bucket.shots) * 100) : 0;
}

function finalizeGroupingAvg(gs: PositionGroupingStats): void {
  gs.avgCm = gs._countCm > 0 ? Math.round((gs._totalCm / gs._countCm) * 10) / 10 : null;
}

// ============================================================================
// FETCH
// ============================================================================

export async function fetchTeamReportData(params: {
  teamId: string;
  teamName: string;
  startDate: Date;
  endDate: Date;
}): Promise<TeamReportData> {
  const { teamId, teamName, startDate, endDate } = params;

  // 1. Fetch completed sessions in date range
  const { data: sessionsRaw, error: sessionsError } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_FULL_DRILL)
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())
    .order('started_at', { ascending: true });

  if (sessionsError) throw new Error(sessionsError.message);

  const sessions: SessionWithDetails[] = (sessionsRaw ?? []).map(mapSession);

  // 2. Batch fetch session_targets stats
  const sessionIds = sessions.map((s) => s.id);
  let statsMap = new Map<string, { shots: number; hits: number; bestDispersionCm: number | null; firstShotHit: boolean | null }[]>();

  if (sessionIds.length > 0) {
    const { data: targetsRaw, error: targetsError } = await supabase
      .from('session_targets')
      .select(TARGET_STATS_SELECT)
      .in('session_id', sessionIds);

    if (targetsError) {
      console.error('[teamReport] Failed to fetch session_targets:', targetsError);
    } else {
      for (const row of targetsRaw ?? []) {
        const sid = row.session_id as string;
        if (!statsMap.has(sid)) statsMap.set(sid, []);
        const arr = statsMap.get(sid)!;

        if (row.paper_target_results) {
          const p = row.paper_target_results as any;
          arr.push({
            shots: p.bullets_fired ?? 0,
            hits: p.hits_total ?? 0,
            bestDispersionCm: p.dispersion_cm ?? null,
            firstShotHit: null,
          });
        }
        if (row.tactical_target_results) {
          const t = row.tactical_target_results as any;
          arr.push({
            shots: t.bullets_fired ?? 0,
            hits: t.hits ?? 0,
            bestDispersionCm: null,
            firstShotHit: t.first_shot_hit ?? null,
          });
        }
      }
    }
  }

  // 3. Fetch team members (to include zero-activity users)
  const members = await getTeamMembers(teamId);
  const memberMap = new Map(members.map((m) => [m.user_id, m]));

  // 4. Build per-user data map, seeded with all known members
  const userMap = new Map<string, UserReportData>();
  for (const m of members) {
    const name = (m.profile as any)?.full_name ?? 'Unknown';
    const role = (m.role as any)?.role ?? 'soldier';
    userMap.set(m.user_id, emptyUserData(m.user_id, name, role));
  }

  // 5. Aggregate sessions into per-user buckets
  for (const session of sessions) {
    const uid = session.user_id;

    // Seed map for users not in team_members (e.g. removed members who still have sessions)
    if (!userMap.has(uid)) {
      const name = session.user_full_name ?? 'Unknown';
      const member = memberMap.get(uid);
      const role = (member?.role as any)?.role ?? 'soldier';
      userMap.set(uid, emptyUserData(uid, name, role));
    }

    const ud = userMap.get(uid)!;
    const dc = session.drill_config;
    const isGrouping = dc?.drill_goal === 'grouping';
    const position = normalizePosition(dc?.position ?? session.soldier_position);
    const hasTimeLimit = (dc?.time_limit_seconds ?? null) !== null;
    const weaponName = session.weapon_name ?? 'Unknown';

    // Session-level stats from session_targets
    const targets = statsMap.get(session.id) ?? [];
    let sessionShots = 0;
    let sessionHits = 0;
    let sessionBestCm: number | null = null;
    let sessionFirstShotHit: boolean | null = null;

    for (const t of targets) {
      sessionShots += t.shots;
      sessionHits += t.hits;
      if (t.bestDispersionCm !== null) {
        if (sessionBestCm === null || t.bestDispersionCm < sessionBestCm) {
          sessionBestCm = t.bestDispersionCm;
        }
      }
      if (t.firstShotHit !== null) sessionFirstShotHit = t.firstShotHit;
    }

    // Fall back to engagement_participants stats for squad/group sessions
    const engagement = session.engagement;
    if (engagement) {
      const myParticipation = engagement.engagement_participants?.find(
        (p: any) => p.user_id === uid
      );
      if (myParticipation) {
        const pRole = myParticipation.role;
        if (pRole === 'spotter') {
          // Spotter stats
          ud.spotter.engagements++;
          ud.spotter.shotsObserved += myParticipation.shots_fired ?? 0;
          ud.spotter.hitsObserved += myParticipation.hits ?? 0;
          if (sessionFirstShotHit !== null) {
            ud.spotter.firstShotTotal++;
            if (sessionFirstShotHit) ud.spotter.firstShotHits++;
          }
          // Spotter doesn't count as a shooter session
          continue;
        }
        // Shooter in engagement — use participant counts if available
        if ((myParticipation.shots_fired ?? 0) > 0 || (myParticipation.hits ?? 0) > 0) {
          sessionShots = myParticipation.shots_fired ?? sessionShots;
          sessionHits = myParticipation.hits ?? sessionHits;
        }
      }
    }

    // Totals
    ud.totals.sessions++;
    ud.totals.shots += sessionShots;
    ud.totals.hits += sessionHits;

    // Grouping
    if (isGrouping) {
      const gs = ud.grouping[position];
      gs.sessions++;
      if (sessionBestCm !== null) {
        if (gs.bestCm === null || sessionBestCm < gs.bestCm) gs.bestCm = sessionBestCm;
        gs._totalCm += sessionBestCm;
        gs._countCm++;
      }
    } else {
      // Hit accuracy by position
      const as_ = ud.hitAccuracy[position];
      as_.sessions++;
      as_.shots += sessionShots;
      as_.hits += sessionHits;
    }

    // Time-limit bucket
    const bucket = hasTimeLimit ? ud.timeLimit.withTimeLimit : ud.timeLimit.noTimeLimit;
    bucket.sessions++;
    bucket.shots += sessionShots;
    bucket.hits += sessionHits;

    // Weapon bucket
    if (!ud.byWeapon[weaponName]) ud.byWeapon[weaponName] = { sessions: 0, shots: 0, hits: 0, pct: 0 };
    ud.byWeapon[weaponName].sessions++;
    ud.byWeapon[weaponName].shots += sessionShots;
    ud.byWeapon[weaponName].hits += sessionHits;
  }

  // 6. Finalize computed fields
  for (const ud of userMap.values()) {
    ud.totals.accuracy = ud.totals.shots > 0 ? Math.round((ud.totals.hits / ud.totals.shots) * 100) : 0;
    for (const pos of POSITIONS) {
      finalizeGroupingAvg(ud.grouping[pos]);
      finalizePct(ud.hitAccuracy[pos]);
    }
    finalizePct(ud.timeLimit.withTimeLimit);
    finalizePct(ud.timeLimit.noTimeLimit);
    for (const wb of Object.values(ud.byWeapon)) finalizePct(wb);
    const sp = ud.spotter;
    sp.hitPct = sp.shotsObserved > 0 ? Math.round((sp.hitsObserved / sp.shotsObserved) * 100) : 0;
    sp.firstShotPct = sp.firstShotTotal > 0 ? Math.round((sp.firstShotHits / sp.firstShotTotal) * 100) : 0;
  }

  const users = Array.from(userMap.values()).sort((a, b) => b.totals.sessions - a.totals.sessions);

  // 7. Summary
  const totalSessions = sessions.length;
  const totalShots = users.reduce((s, u) => s + u.totals.shots, 0);
  const totalHits = users.reduce((s, u) => s + u.totals.hits, 0);

  return {
    team: { id: teamId, name: teamName },
    dateRange: { start: startDate, end: endDate },
    generatedAt: new Date(),
    users,
    summary: {
      members: members.length,
      sessions: totalSessions,
      shots: totalShots,
      hits: totalHits,
      accuracy: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0,
    },
  };
}

// ============================================================================
// HTML TEMPLATE
// ============================================================================

const ACCENT = '#5B6B8C';

function pct(value: number): string {
  return `${value}%`;
}

function cm(value: number | null): string {
  return value !== null ? `${value.toFixed(1)} cm` : '—';
}

function renderGroupingTable(grouping: Record<PositionKey, PositionGroupingStats>): string {
  const rows = POSITIONS.filter((p) => grouping[p].sessions > 0);
  if (rows.length === 0) return '<p class="no-data">No grouping data</p>';
  return `
    <table>
      <thead><tr><th>Position</th><th>Sessions</th><th>Best Group</th><th>Avg Group</th></tr></thead>
      <tbody>
        ${rows.map((p) => {
          const g = grouping[p];
          return `<tr>
            <td style="text-transform:capitalize">${p}</td>
            <td>${g.sessions}</td>
            <td>${cm(g.bestCm)}</td>
            <td>${cm(g.avgCm)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderAccuracyTable(hitAccuracy: Record<PositionKey, PositionAccuracyStats>): string {
  const rows = POSITIONS.filter((p) => hitAccuracy[p].sessions > 0);
  if (rows.length === 0) return '<p class="no-data">No hit accuracy data</p>';
  return `
    <table>
      <thead><tr><th>Position</th><th>Sessions</th><th>Shots</th><th>Hits</th><th>Accuracy</th></tr></thead>
      <tbody>
        ${rows.map((p) => {
          const a = hitAccuracy[p];
          const cls = a.pct >= 80 ? 'accuracy-high' : a.pct >= 60 ? 'accuracy-mid' : 'accuracy-low';
          return `<tr>
            <td style="text-transform:capitalize">${p}</td>
            <td>${a.sessions}</td>
            <td>${a.shots}</td>
            <td>${a.hits}</td>
            <td class="${cls}">${pct(a.pct)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderWeaponsTable(byWeapon: Record<string, WeaponBucket>): string {
  const entries = Object.entries(byWeapon);
  if (entries.length === 0) return '<p class="no-data">No weapon data</p>';
  return `
    <table>
      <thead><tr><th>Weapon</th><th>Sessions</th><th>Shots</th><th>Hits</th><th>Accuracy</th></tr></thead>
      <tbody>
        ${entries.map(([name, wb]) => {
          const cls = wb.pct >= 80 ? 'accuracy-high' : wb.pct >= 60 ? 'accuracy-mid' : 'accuracy-low';
          return `<tr>
            <td>${name}</td>
            <td>${wb.sessions}</td>
            <td>${wb.shots}</td>
            <td>${wb.hits}</td>
            <td class="${cls}">${pct(wb.pct)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderSpotterCards(sp: SpotterStats): string {
  if (sp.engagements === 0) return '<p class="no-data">No spotter activity</p>';
  return `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${sp.engagements}</div>
        <div class="metric-label">Engagements</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${sp.shotsObserved}</div>
        <div class="metric-label">Shots Observed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value accent">${pct(sp.hitPct)}</div>
        <div class="metric-label">Hit Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value accent">${sp.firstShotTotal > 0 ? pct(sp.firstShotPct) : '—'}</div>
        <div class="metric-label">1st Shot Hit %</div>
      </div>
    </div>`;
}

function renderTimeLimitSection(tl: UserReportData['timeLimit']): string {
  const hasAny = tl.withTimeLimit.sessions > 0 || tl.noTimeLimit.sessions > 0;
  if (!hasAny) return '<p class="no-data">No data</p>';
  const rows = [
    { label: 'With Time Limit', b: tl.withTimeLimit },
    { label: 'No Time Limit', b: tl.noTimeLimit },
  ].filter((r) => r.b.sessions > 0);
  return `
    <table>
      <thead><tr><th>Condition</th><th>Sessions</th><th>Shots</th><th>Hits</th><th>Accuracy</th></tr></thead>
      <tbody>
        ${rows.map(({ label, b }) => {
          const cls = b.pct >= 80 ? 'accuracy-high' : b.pct >= 60 ? 'accuracy-mid' : 'accuracy-low';
          return `<tr>
            <td>${label}</td>
            <td>${b.sessions}</td>
            <td>${b.shots}</td>
            <td>${b.hits}</td>
            <td class="${cls}">${pct(b.pct)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderUserSection(ud: UserReportData, isFirst: boolean): string {
  const accCls = ud.totals.accuracy >= 80 ? 'accuracy-high' : ud.totals.accuracy >= 60 ? 'accuracy-mid' : 'accuracy-low';
  return `
  <div class="user-section" style="${isFirst ? '' : 'page-break-before: always;'}">
    <div class="user-header">
      <div>
        <h2 class="user-name">${ud.userName}</h2>
        <span class="role-badge">${ud.role}</span>
      </div>
      <div class="user-totals">
        <div class="total-chip"><span class="total-val">${ud.totals.sessions}</span><span class="total-lbl">Sessions</span></div>
        <div class="total-chip"><span class="total-val">${ud.totals.shots}</span><span class="total-lbl">Shots</span></div>
        <div class="total-chip"><span class="total-val ${accCls}">${pct(ud.totals.accuracy)}</span><span class="total-lbl">Accuracy</span></div>
      </div>
    </div>

    <div class="subsection">
      <h3 class="subsection-title">Grouping Performance</h3>
      ${renderGroupingTable(ud.grouping)}
    </div>

    <div class="subsection">
      <h3 class="subsection-title">Hit Accuracy by Position</h3>
      ${renderAccuracyTable(ud.hitAccuracy)}
    </div>

    <div class="subsection">
      <h3 class="subsection-title">Pressure (Time Limit)</h3>
      ${renderTimeLimitSection(ud.timeLimit)}
    </div>

    <div class="subsection">
      <h3 class="subsection-title">Weapons</h3>
      ${renderWeaponsTable(ud.byWeapon)}
    </div>

    <div class="subsection">
      <h3 class="subsection-title">Spotter Performance</h3>
      ${renderSpotterCards(ud.spotter)}
    </div>
  </div>`;
}

export function generateTeamReportHTML(data: TeamReportData): string {
  const { team, dateRange, generatedAt, users, summary } = data;
  const dateRangeStr = `${format(dateRange.start, 'MMM d, yyyy')} – ${format(dateRange.end, 'MMM d, yyyy')}`;
  const accCls = summary.accuracy >= 80 ? 'accuracy-high' : summary.accuracy >= 60 ? 'accuracy-mid' : 'accuracy-low';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Report – ${team.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1F2937;
      line-height: 1.5;
      background: #fff;
      padding: 40px;
    }
    .cover { text-align: center; padding-bottom: 32px; border-bottom: 2px solid #E5E7EB; margin-bottom: 32px; }
    .cover-logo { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #9CA3AF; margin-bottom: 16px; }
    .cover-title { font-size: 30px; font-weight: 800; color: #111827; margin-bottom: 6px; }
    .cover-sub { font-size: 14px; color: #6B7280; margin-bottom: 20px; }
    .cover-generated { font-size: 11px; color: #9CA3AF; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 40px; }
    .summary-card { background: #F9FAFB; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-value { font-size: 26px; font-weight: 800; color: #111827; }
    .summary-label { font-size: 11px; color: #6B7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .user-section { padding: 28px 0; }
    .user-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid ${ACCENT}33; }
    .user-name { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .role-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; background: ${ACCENT}18; color: ${ACCENT}; text-transform: capitalize; }
    .user-totals { display: flex; gap: 12px; }
    .total-chip { background: #F3F4F6; border-radius: 8px; padding: 8px 14px; text-align: center; }
    .total-val { display: block; font-size: 18px; font-weight: 700; color: #111827; }
    .total-lbl { display: block; font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .subsection { margin-bottom: 20px; }
    .subsection-title { font-size: 13px; font-weight: 700; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px 10px; background: #F3F4F6; font-size: 11px; font-weight: 700; color: #374151; border-bottom: 2px solid #E5E7EB; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #F3F4F6; }
    tr:last-child td { border-bottom: none; }
    .accuracy-high { color: #059669; font-weight: 700; }
    .accuracy-mid { color: #D97706; font-weight: 700; }
    .accuracy-low { color: #DC2626; font-weight: 700; }
    .accent { color: ${ACCENT}; font-weight: 700; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .metric-card { background: #F9FAFB; border-radius: 8px; padding: 12px; text-align: center; }
    .metric-value { font-size: 22px; font-weight: 800; color: #111827; }
    .metric-label { font-size: 10px; color: #6B7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .no-data { color: #9CA3AF; font-style: italic; font-size: 13px; padding: 10px 0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 11px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-logo">RETICLEIQ · TEAM PERFORMANCE REPORT</div>
    <h1 class="cover-title">${team.name}</h1>
    <div class="cover-sub">${dateRangeStr}</div>
    <div class="cover-generated">Generated ${format(generatedAt, "MMMM d, yyyy 'at' h:mm a")}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${summary.members}</div>
      <div class="summary-label">Members</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.sessions}</div>
      <div class="summary-label">Sessions</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.shots}</div>
      <div class="summary-label">Total Shots</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.hits}</div>
      <div class="summary-label">Total Hits</div>
    </div>
    <div class="summary-card">
      <div class="summary-value ${accCls}">${pct(summary.accuracy)}</div>
      <div class="summary-label">Team Accuracy</div>
    </div>
  </div>

  ${users.map((ud, i) => renderUserSection(ud, i === 0)).join('\n')}

  <div class="footer">
    Generated by ReticleIQ · ${format(generatedAt, 'MMMM d, yyyy')}
  </div>
</body>
</html>`;
}

// ============================================================================
// PDF EXPORT + SHARE
// ============================================================================

export async function shareTeamReportPDF(data: TeamReportData): Promise<void> {
  const html = generateTeamReportHTML(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Team Report – ${data.team.name}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
