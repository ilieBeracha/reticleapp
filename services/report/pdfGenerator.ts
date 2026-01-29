/**
 * PDF Generator for Training Reports
 *
 * Generates HTML templates and exports PDFs using expo-print.
 */

import type {
  TrainingBiometricsSummary,
  TrainingWeatherSummary
} from '@/services/session/queries';
import type { SessionWithDetails } from '@/types/session';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingReportData {
  training: {
    id: string;
    title: string;
    status: string;
    scheduled_at: string;
    started_at: string | null;
    ended_at: string | null;
    team_name?: string;
    drills: Array<{
      id: string;
      name: string;
      drill_goal?: string;
      distance_m?: number;
      rounds_per_shooter?: number;
    }>;
  };
  sessions: SessionWithDetails[];
  weather: TrainingWeatherSummary;
  biometrics: TrainingBiometricsSummary;
  verdicts?: Map<string, { passed: boolean; actual_accuracy_pct?: number | null; actual_grouping_cm?: number | null }>;
}

export interface ParticipantPerformance {
  userId: string;
  userName: string;
  sessionsCompleted: number;
  totalShots: number;
  totalHits: number;
  accuracyPct: number;
  bestDispersionCm: number | null;
  avgHR?: number;
  steadinessScore?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function getWindImpactLabel(impact: string | null): string {
  if (!impact) return 'Unknown';
  const labels: Record<string, string> = {
    calm: 'Calm',
    light: 'Light',
    moderate: 'Moderate',
    strong: 'Strong',
  };
  return labels[impact] || impact;
}

function getConditionSeverityLabel(severity: string | null): string {
  if (!severity) return 'Unknown';
  const labels: Record<string, string> = {
    ideal: 'Ideal',
    good: 'Good',
    challenging: 'Challenging',
    difficult: 'Difficult',
    extreme: 'Extreme',
  };
  return labels[severity] || severity;
}

function getConditionSeverityColor(severity: string | null): string {
  const colors: Record<string, string> = {
    ideal: '#10B981',
    good: '#22C55E',
    challenging: '#F59E0B',
    difficult: '#F97316',
    extreme: '#EF4444',
  };
  return colors[severity || ''] || '#6B7280';
}

function aggregateParticipantPerformance(
  sessions: SessionWithDetails[],
  biometrics: TrainingBiometricsSummary
): ParticipantPerformance[] {
  const participantMap = new Map<string, ParticipantPerformance>();

  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const userId = session.user_id;
    const userName = session.user_full_name || 'Unknown';

    if (!participantMap.has(userId)) {
      participantMap.set(userId, {
        userId,
        userName,
        sessionsCompleted: 0,
        totalShots: 0,
        totalHits: 0,
        accuracyPct: 0,
        bestDispersionCm: null,
      });
    }

    const perf = participantMap.get(userId)!;
    perf.sessionsCompleted++;
    perf.totalShots += session.stats?.shots_fired || 0;
    perf.totalHits += session.stats?.hits_total || 0;

    if (session.stats?.best_dispersion_cm != null) {
      if (perf.bestDispersionCm === null || session.stats.best_dispersion_cm < perf.bestDispersionCm) {
        perf.bestDispersionCm = session.stats.best_dispersion_cm;
      }
    }
  }

  // Calculate accuracy and merge biometrics
  for (const [userId, perf] of participantMap) {
    perf.accuracyPct = perf.totalShots > 0 ? Math.round((perf.totalHits / perf.totalShots) * 100) : 0;

    // Find matching biometrics
    const bio = biometrics.participants.find((p) => p.userId === userId);
    if (bio) {
      perf.avgHR = bio.biometrics.avgHR;
      perf.steadinessScore = bio.biometrics.steadinessAvg;
    }
  }

  return Array.from(participantMap.values()).sort((a, b) => b.accuracyPct - a.accuracyPct);
}

// ============================================================================
// HTML TEMPLATE GENERATION
// ============================================================================

/**
 * Generate HTML content for training report PDF.
 */
export function generateTrainingReportHTML(data: TrainingReportData): string {
  const { training, sessions, weather, biometrics } = data;

  // Aggregate participant performance
  const participants = aggregateParticipantPerformance(sessions, biometrics);
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalShots = participants.reduce((sum, p) => sum + p.totalShots, 0);
  const totalHits = participants.reduce((sum, p) => sum + p.totalHits, 0);
  const teamAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  // Calculate duration
  let duration = '-';
  if (training.started_at && training.ended_at) {
    const start = new Date(training.started_at);
    const end = new Date(training.ended_at);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) {
      duration = `${mins} min`;
    } else {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      duration = remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Report - ${training.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      line-height: 1.5;
      background: #FFFFFF;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #E5E7EB;
    }
    .logo {
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #6B7280;
    }
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #F9FAFB;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .summary-label {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .info-card {
      background: #F9FAFB;
      border-radius: 8px;
      padding: 16px;
    }
    .info-card h4 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-size: 13px;
      color: #6B7280;
    }
    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-green { background: #D1FAE5; color: #065F46; }
    .badge-yellow { background: #FEF3C7; color: #92400E; }
    .badge-red { background: #FEE2E2; color: #991B1B; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th {
      text-align: left;
      padding: 10px 12px;
      background: #F3F4F6;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #E5E7EB;
    }
    td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 1px solid #E5E7EB;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .rank {
      font-weight: 700;
      color: #6B7280;
    }
    .accuracy-high { color: #059669; font-weight: 600; }
    .accuracy-mid { color: #D97706; font-weight: 600; }
    .accuracy-low { color: #DC2626; font-weight: 600; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 11px;
      color: #9CA3AF;
    }
    .no-data {
      text-align: center;
      color: #9CA3AF;
      font-style: italic;
      padding: 16px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo">RETICLEIQ TRAINING REPORT</div>
    <h1 class="title">${training.title}</h1>
    <div class="subtitle">
      ${format(new Date(training.scheduled_at), 'EEEE, MMMM d, yyyy')}
      ${training.team_name ? ` • ${training.team_name}` : ''}
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${participants.length}</div>
        <div class="summary-label">Participants</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${training.drills.length}</div>
        <div class="summary-label">Drills</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${completedSessions.length}</div>
        <div class="summary-label">Sessions</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${teamAccuracy}%</div>
        <div class="summary-label">Team Accuracy</div>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${totalShots}</div>
        <div class="summary-label">Total Shots</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${totalHits}</div>
        <div class="summary-label">Total Hits</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${duration}</div>
        <div class="summary-label">Duration</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${biometrics.sessionsWithBiometrics > 0 ? biometrics.teamAvgHR || '-' : '-'}</div>
        <div class="summary-label">Avg HR (bpm)</div>
      </div>
    </div>
  </div>

  <!-- Weather & Biometrics -->
  ${
    weather.sessionsWithWeather > 0 || biometrics.sessionsWithBiometrics > 0
      ? `
  <div class="section">
    <h3 class="section-title">Conditions & Biometrics</h3>
    <div class="info-grid">
      ${
        weather.sessionsWithWeather > 0
          ? `
      <div class="info-card">
        <h4>Weather Conditions</h4>
        <div class="info-row">
          <span class="info-label">Temperature</span>
          <span class="info-value">${weather.avgTemperatureC !== null ? `${weather.avgTemperatureC}°C` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Humidity</span>
          <span class="info-value">${weather.avgHumidity !== null ? `${weather.avgHumidity}%` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Wind</span>
          <span class="info-value">${weather.avgWindSpeedMps !== null ? `${weather.avgWindSpeedMps} m/s ${weather.dominantWindDirection || ''}` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Wind Impact</span>
          <span class="info-value">
            <span class="badge ${weather.maxWindImpact === 'calm' || weather.maxWindImpact === 'light' ? 'badge-green' : weather.maxWindImpact === 'moderate' ? 'badge-yellow' : 'badge-red'}">
              ${getWindImpactLabel(weather.maxWindImpact)}
            </span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Conditions</span>
          <span class="info-value">${weather.dominantCondition || '-'}</span>
        </div>
      </div>
      `
          : ''
      }
      ${
        biometrics.sessionsWithBiometrics > 0
          ? `
      <div class="info-card">
        <h4>Team Biometrics</h4>
        <div class="info-row">
          <span class="info-label">Average Heart Rate</span>
          <span class="info-value">${biometrics.teamAvgHR !== null ? `${biometrics.teamAvgHR} bpm` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">HR Range</span>
          <span class="info-value">${biometrics.teamHRRange ? `${biometrics.teamHRRange.min} - ${biometrics.teamHRRange.max} bpm` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Avg Breath Rate</span>
          <span class="info-value">${biometrics.teamAvgBreathRate !== null ? `${biometrics.teamAvgBreathRate}/min` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Avg Steadiness</span>
          <span class="info-value">${biometrics.teamAvgSteadiness !== null ? `${biometrics.teamAvgSteadiness}/100` : '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Flinches</span>
          <span class="info-value">${biometrics.totalFlinches}</span>
        </div>
      </div>
      `
          : `
      <div class="info-card">
        <h4>Team Biometrics</h4>
        <p class="no-data">No Garmin watch data available</p>
      </div>
      `
      }
    </div>
  </div>
  `
      : ''
  }

  <!-- Participant Performance -->
  <div class="section">
    <h3 class="section-title">Participant Performance</h3>
    ${
      participants.length > 0
        ? `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Participant</th>
          <th>Sessions</th>
          <th>Shots</th>
          <th>Hits</th>
          <th>Accuracy</th>
          <th>Best Group</th>
          ${biometrics.sessionsWithBiometrics > 0 ? '<th>Avg HR</th><th>Steadiness</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${participants
          .map(
            (p, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td>${p.userName}</td>
          <td>${p.sessionsCompleted}</td>
          <td>${p.totalShots}</td>
          <td>${p.totalHits}</td>
          <td class="${p.accuracyPct >= 80 ? 'accuracy-high' : p.accuracyPct >= 60 ? 'accuracy-mid' : 'accuracy-low'}">${p.accuracyPct}%</td>
          <td>${p.bestDispersionCm !== null ? `${p.bestDispersionCm.toFixed(1)} cm` : '-'}</td>
          ${
            biometrics.sessionsWithBiometrics > 0
              ? `
          <td>${p.avgHR || '-'}</td>
          <td>${p.steadinessScore !== undefined ? `${p.steadinessScore}/100` : '-'}</td>
          `
              : ''
          }
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : `
    <p class="no-data">No participant data available</p>
    `
    }
  </div>

  <!-- Drills Summary -->
  <div class="section">
    <h3 class="section-title">Training Drills</h3>
    ${
      training.drills.length > 0
        ? `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Drill Name</th>
          <th>Goal</th>
          <th>Distance</th>
          <th>Rounds</th>
        </tr>
      </thead>
      <tbody>
        ${training.drills
          .map(
            (d, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td>${d.name}</td>
          <td><span class="badge ${d.drill_goal === 'grouping' ? 'badge-green' : 'badge-yellow'}">${d.drill_goal || '-'}</span></td>
          <td>${d.distance_m ? `${d.distance_m}m` : '-'}</td>
          <td>${d.rounds_per_shooter || '-'}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : `
    <p class="no-data">No drills configured</p>
    `
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated by ReticleIQ • ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
  </div>
</body>
</html>
`;
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export training report as PDF file.
 * Returns the file URI for sharing.
 */
export async function exportTrainingReportPDF(data: TrainingReportData): Promise<string> {
  const html = generateTrainingReportHTML(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * Export and share training report as PDF.
 */
export async function shareTrainingReportPDF(data: TrainingReportData): Promise<void> {
  const uri = await exportTrainingReportPDF(data);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Training Report - ${data.training.title}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
