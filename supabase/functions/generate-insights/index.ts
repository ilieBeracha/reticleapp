/**
 * Supabase Edge Function: Generate Insights
 * 
 * Two modes:
 * 1. Session mode (default): Triggered after session ends
 *    - Upserts session embedding to Pinecone
 *    - Detects anomalies for immediate insights
 *    - Refreshes user baseline
 * 
 * 2. Widget mode: On-demand AI analysis for dashboard widgets
 *    - Queries Pinecone for relevant sessions
 *    - Generates contextual AI insight for specific widget
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// TYPES
// ============================================================================

interface SessionFeatures {
  id: string;
  session_id: string;
  user_id: string;
  team_id: string | null;
  created_at: string;
  shots: number;
  hits: number;
  accuracy_pct: number | null;
  grouping_cm: number | null;
  best_grouping_cm: number | null;
  dispersion_cm: number | null;
  offset_right_cm: number | null;
  offset_up_cm: number | null;
  stages_cleared: number;
  distance_m: number | null;
  position: string | null;
  weapon_category: string | null;
  weapon_name?: string | null;
  drill_goal: string | null;
  target_type: string | null;
  has_biometrics: boolean;
  stress_avg: number | null;
  stress_trend: string | null;
  flinch_count: number;
  optimal_shot_pct: number | null;
  has_weather: boolean;
  weather_temp_c: number | null;
  weather_humidity: number | null;
  weather_wind_speed_mps: number | null;
  weather_wind_impact: string | null;
  weather_condition: string | null;
  weather_condition_severity: string | null;
}

interface UserBaseline {
  n: number;
  avg_accuracy: number | null;
  std_accuracy: number | null;
  avg_grouping: number | null;
  std_grouping: number | null;
}

interface GeneratedInsight {
  title: string;
  summary: string;
  primary_factor: string | null;
  secondary_factor: string | null;
  score: number;
  tags: string[];
  insight_type: string;
  evidence: Record<string, unknown>;
}

interface WidgetInsightRequest {
  mode: 'widget_insight';
  widget_type: string;
  user_id: string;
  widget_data: Record<string, unknown>;
}

interface DailyTipRequest {
  mode: 'daily_tip';
  user_id: string;
  user_stats: {
    streak: number;
    accuracy: number;
    sessions_this_week: number;
    total_sessions: number;
  };
}

interface SessionInsightRequest {
  mode?: 'session';
  session_id: string;
}

type InsightRequest = WidgetInsightRequest | SessionInsightRequest | DailyTipRequest;

// ============================================================================
// SESSION TO TEXT (for Pinecone embedding)
// ============================================================================

function sessionToText(s: SessionFeatures): string {
  const parts: string[] = [];

  parts.push(`${s.drill_goal || 'training'} session in ${s.position || 'unknown'} position on ${s.target_type || 'target'}`);

  if (s.distance_m) {
    const distDesc = s.distance_m <= 50 ? 'close range' :
      s.distance_m <= 100 ? 'medium range' :
      s.distance_m <= 200 ? 'long range' : 'extreme range';
    parts.push(`at ${distDesc} (${s.distance_m}m)`);
  }

  if (s.weapon_name && s.weapon_category) {
    parts.push(`using ${s.weapon_name} (${s.weapon_category})`);
  } else if (s.weapon_name) {
    parts.push(`using ${s.weapon_name}`);
  } else if (s.weapon_category) {
    parts.push(`using ${s.weapon_category}`);
  }

  if (s.drill_goal === 'grouping' && s.dispersion_cm !== null) {
    const groupDesc = s.dispersion_cm < 3 ? 'extremely tight' :
      s.dispersion_cm < 5 ? 'tight' :
      s.dispersion_cm < 8 ? 'moderate' : 'wide';
    parts.push(`${groupDesc} grouping`);
  } else if (s.accuracy_pct !== null) {
    const accDesc = s.accuracy_pct >= 90 ? 'excellent accuracy' :
      s.accuracy_pct >= 75 ? 'good accuracy' :
      s.accuracy_pct >= 60 ? 'moderate accuracy' : 'low accuracy';
    parts.push(accDesc);
  }

  const shotDesc = s.shots <= 10 ? 'few shots' :
    s.shots <= 25 ? 'moderate shot count' : 'many shots';
  parts.push(shotDesc);

  if (s.has_biometrics && s.stress_avg !== null) {
    const stressDesc = s.stress_avg < 40 ? 'low stress' :
      s.stress_avg < 60 ? 'moderate stress' : 'high stress';
    parts.push(`with ${stressDesc}`);
  }

  if (s.has_weather) {
    const weatherParts: string[] = [];
    if (s.weather_wind_impact && s.weather_wind_impact !== 'negligible') {
      weatherParts.push(`${s.weather_wind_impact} wind`);
    }
    if (s.weather_condition_severity && s.weather_condition_severity !== 'ideal') {
      weatherParts.push(`${s.weather_condition_severity} conditions`);
    }
    if (weatherParts.length > 0) {
      parts.push(`in ${weatherParts.join(', ')}`);
    }
  }

  return parts.join('. ');
}

// ============================================================================
// PINECONE INTEGRATION
// ============================================================================

async function generateEmbedding(
  text: string,
  pineconeApiKey: string
): Promise<number[]> {
  const response = await fetch('https://api.pinecone.io/embed', {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
      'X-Pinecone-API-Version': '2025-01',
    },
    body: JSON.stringify({
      model: 'llama-text-embed-v2',
      inputs: [{ text: text }],
      parameters: { input_type: 'passage', truncate: 'END' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pinecone embed failed:', error);
    throw new Error(`Pinecone embed failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].values;
}

async function upsertToPinecone(
  features: SessionFeatures,
  text: string,
  pineconeApiKey: string,
  indexHost: string
): Promise<void> {
  const namespace = `user_${features.user_id}`;
  
  const embedding = await generateEmbedding(text, pineconeApiKey);
  
  const metadata: Record<string, string | number | boolean> = {
    text: text,
  };
  if (features.user_id) metadata.user_id = features.user_id;
  if (features.drill_goal) metadata.drill_goal = features.drill_goal;
  if (features.target_type) metadata.target_type = features.target_type;
  if (features.position) metadata.position = features.position;
  if (features.distance_m !== null) metadata.distance_m = features.distance_m;
  if (features.weapon_category) metadata.weapon_category = features.weapon_category;
  if (features.weapon_name) metadata.weapon_name = features.weapon_name;
  if (features.accuracy_pct !== null) metadata.accuracy_pct = features.accuracy_pct;
  if (features.dispersion_cm !== null) metadata.dispersion_cm = features.dispersion_cm;
  if (features.shots !== null) metadata.shots = features.shots;
  
  if (features.has_weather) {
    metadata.has_weather = true;
    if (features.weather_temp_c !== null) metadata.weather_temp_c = features.weather_temp_c;
    if (features.weather_humidity !== null) metadata.weather_humidity = features.weather_humidity;
    if (features.weather_wind_speed_mps !== null) metadata.weather_wind_speed_mps = features.weather_wind_speed_mps;
    if (features.weather_wind_impact) metadata.weather_wind_impact = features.weather_wind_impact;
    if (features.weather_condition) metadata.weather_condition = features.weather_condition;
  }
  
  if (features.has_biometrics) {
    metadata.has_biometrics = true;
    if (features.stress_avg !== null) metadata.stress_avg = features.stress_avg;
  }

  const response = await fetch(`https://${indexHost}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vectors: [{
        id: String(features.session_id),
        values: embedding,
        metadata: metadata,
      }],
      namespace: namespace,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pinecone upsert failed:', error);
    throw new Error(`Pinecone upsert failed: ${response.status}`);
  }
}

async function findSimilarSessions(
  features: SessionFeatures,
  text: string,
  pineconeApiKey: string,
  indexHost: string,
  topK: number = 20
): Promise<Array<{ id: string; score: number; fields: Record<string, unknown> }>> {
  const namespace = `user_${features.user_id}`;

  const queryEmbedding = await generateEmbedding(text, pineconeApiKey);

  const response = await fetch(`https://${indexHost}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace: namespace,
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
    }),
  });

  if (!response.ok) {
    console.error('Pinecone query failed:', await response.text());
    return [];
  }

  const data = await response.json();
  
  return (data.matches || [])
    .filter((match: { id: string }) => match.id !== features.session_id)
    .map((match: { id: string; score: number; metadata?: Record<string, unknown> }) => ({
      id: match.id,
      score: match.score,
      fields: match.metadata || {},
    }));
}

async function queryPineconeWithFilter(
  userId: string,
  pineconeApiKey: string,
  indexHost: string,
  filter: Record<string, unknown>,
  topK: number = 50
): Promise<Array<{ fields: Record<string, unknown> }>> {
  const namespace = `user_${userId}`;
  
  // Create a generic query embedding
  const queryText = 'shooting session performance analysis';
  const queryEmbedding = await generateEmbedding(queryText, pineconeApiKey);

  const response = await fetch(`https://${indexHost}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace: namespace,
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: filter,
    }),
  });

  if (!response.ok) {
    console.error('Pinecone query failed:', await response.text());
    return [];
  }

  const data = await response.json();
  return (data.matches || []).map((m: { metadata?: Record<string, unknown> }) => ({
    fields: m.metadata || {},
  }));
}

function computeSimilarityBaseline(
  similarSessions: Array<{ fields: Record<string, unknown>; score: number }>
): UserBaseline | null {
  if (similarSessions.length < 1) return null;

  const accuracies: number[] = [];
  const groupings: number[] = [];

  for (const session of similarSessions) {
    if (session.fields.accuracy_pct != null) {
      accuracies.push(session.fields.accuracy_pct as number);
    }
    if (session.fields.dispersion_cm != null) {
      groupings.push(session.fields.dispersion_cm as number);
    }
  }

  const calcMean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const calcStd = (arr: number[], mean: number | null) => {
    if (arr.length < 2 || mean === null) return null;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  };

  const avgAccuracy = calcMean(accuracies);
  const avgGrouping = calcMean(groupings);

  return {
    n: similarSessions.length,
    avg_accuracy: avgAccuracy,
    std_accuracy: calcStd(accuracies, avgAccuracy),
    avg_grouping: avgGrouping,
    std_grouping: calcStd(groupings, avgGrouping),
  };
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

function isGroupingGoal(goal: string | null): boolean {
  return goal === 'grouping' || goal === 'cold_bore';
}

function detectAnomaly(
  features: SessionFeatures,
  baseline: UserBaseline | null
): { isAnomaly: boolean; type?: string; insight?: GeneratedInsight } {
  if (!baseline || baseline.n < 3) {
    return { isAnomaly: false };
  }
  
  const isGrouping = isGroupingGoal(features.drill_goal);
  
  if (isGrouping && features.dispersion_cm !== null && baseline.avg_grouping) {
    const diff = features.dispersion_cm - baseline.avg_grouping;
    const pctDiff = (diff / baseline.avg_grouping) * 100;
    
    if (Math.abs(pctDiff) > 30) {
      const isPositive = pctDiff < 0; // Lower dispersion is better
      return {
        isAnomaly: true,
        type: isPositive ? 'tight_grouping' : 'wide_grouping',
        insight: {
          title: isPositive ? 'Exceptional grouping' : 'Grouping wider than usual',
          summary: isPositive 
            ? `Dispersion ${features.dispersion_cm.toFixed(1)}cm is ${Math.abs(diff).toFixed(1)}cm tighter than your average ${baseline.avg_grouping.toFixed(1)}cm.`
            : `Dispersion ${features.dispersion_cm.toFixed(1)}cm is ${diff.toFixed(1)}cm wider than your average ${baseline.avg_grouping.toFixed(1)}cm.`,
          primary_factor: isPositive ? 'consistency' : 'execution',
          secondary_factor: isPositive ? null : 'stance',
          score: isPositive ? 85 : 75,
          tags: ['anomaly', 'grouping', isPositive ? 'positive' : 'negative'],
          insight_type: isPositive ? 'anomaly_high' : 'anomaly_low',
          evidence: { session_dispersion: features.dispersion_cm, baseline_dispersion: baseline.avg_grouping, diff },
        },
      };
    }
  } else if (!isGrouping && features.accuracy_pct !== null && baseline.avg_accuracy) {
    const diff = features.accuracy_pct - baseline.avg_accuracy;
    
    if (Math.abs(diff) > 15) {
      const isPositive = diff > 0;
      return {
        isAnomaly: true,
        type: isPositive ? 'above_average' : 'below_average',
        insight: {
          title: isPositive ? 'Outstanding accuracy' : 'Accuracy below baseline',
          summary: isPositive
            ? `${features.accuracy_pct}% accuracy is ${Math.round(diff)}% above your average ${Math.round(baseline.avg_accuracy)}%.`
            : `${features.accuracy_pct}% accuracy is ${Math.abs(Math.round(diff))}% below your average ${Math.round(baseline.avg_accuracy)}%.`,
          primary_factor: isPositive ? 'consistency' : 'execution',
          secondary_factor: isPositive ? null : (features.flinch_count >= 2 ? 'trigger' : null),
          score: isPositive ? 85 : 75,
          tags: ['anomaly', 'accuracy', isPositive ? 'positive' : 'negative'],
          insight_type: isPositive ? 'anomaly_high' : 'anomaly_low',
          evidence: { session_accuracy: features.accuracy_pct, baseline_accuracy: baseline.avg_accuracy, diff },
        },
      };
    }
  }
  
  return { isAnomaly: false };
}

// ============================================================================
// WIDGET INSIGHT GENERATION
// ============================================================================

type WidgetType = 
  | 'distance_breakdown'
  | 'weapon_performance'
  | 'position_analysis'
  | 'monthly_trends'
  | 'shot_goal'
  | 'streak'
  | 'all_time';

async function generateWidgetInsight(
  widgetType: WidgetType,
  userId: string,
  widgetData: Record<string, unknown>,
  pineconeApiKey: string,
  pineconeIndexHost: string,
  anthropicApiKey: string
): Promise<{ title: string; summary: string; observations?: string[]; factors?: string }> {
  
  let context = '';
  let prompt = '';
  
  switch (widgetType) {
    case 'distance_breakdown': {
      // Query sessions at different distances
      const closeRange = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        distance_m: { $lte: 50 },
      });
      const mediumRange = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        $and: [{ distance_m: { $gt: 50 } }, { distance_m: { $lte: 100 } }],
      });
      const longRange = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        distance_m: { $gt: 100 },
      });
      
      const calcAvg = (sessions: Array<{ fields: Record<string, unknown> }>) => {
        const accs = sessions.filter(s => s.fields.accuracy_pct != null).map(s => s.fields.accuracy_pct as number);
        return accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
      };
      
      context = `
Distance Performance Data:
- Close range (≤50m): ${closeRange.length} sessions, avg ${calcAvg(closeRange) ?? 'N/A'}% accuracy
- Medium range (51-100m): ${mediumRange.length} sessions, avg ${calcAvg(mediumRange) ?? 'N/A'}% accuracy
- Long range (>100m): ${longRange.length} sessions, avg ${calcAvg(longRange) ?? 'N/A'}% accuracy

Current widget display: ${JSON.stringify(widgetData)}`;
      
      prompt = `Analyze this shooter's distance-based performance. ${context}

Provide 2-3 SHORT factual observations about patterns you see. No advice, no suggestions - just observations.
Format: Return JSON array of strings, each max 15 words.
Example: ["Close range accuracy is 15% higher than long range", "Medium range needs the most practice"]`;
      break;
    }
    
    case 'weapon_performance': {
      // Query sessions by weapon category
      const rifles = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        weapon_category: { $eq: 'rifle' },
      });
      const pistols = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        weapon_category: { $eq: 'pistol' },
      });
      const carbines = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        weapon_category: { $eq: 'carbine' },
      });
      const precisionRifles = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        weapon_category: { $eq: 'precision_rifle' },
      });
      
      const calcAvg = (sessions: Array<{ fields: Record<string, unknown> }>) => {
        const accs = sessions.filter(s => s.fields.accuracy_pct != null).map(s => s.fields.accuracy_pct as number);
        return accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
      };
      
      const calcGrouping = (sessions: Array<{ fields: Record<string, unknown> }>) => {
        const groups = sessions.filter(s => s.fields.dispersion_cm != null).map(s => s.fields.dispersion_cm as number);
        return groups.length > 0 ? Math.round((groups.reduce((a, b) => a + b, 0) / groups.length) * 10) / 10 : null;
      };
      
      context = `
Weapon Performance Data from Pinecone:
- Rifles: ${rifles.length} sessions, avg ${calcAvg(rifles) ?? 'N/A'}% accuracy, avg grouping ${calcGrouping(rifles) ?? 'N/A'}cm
- Pistols: ${pistols.length} sessions, avg ${calcAvg(pistols) ?? 'N/A'}% accuracy
- Carbines: ${carbines.length} sessions, avg ${calcAvg(carbines) ?? 'N/A'}% accuracy
- Precision Rifles: ${precisionRifles.length} sessions, avg ${calcAvg(precisionRifles) ?? 'N/A'}% accuracy, avg grouping ${calcGrouping(precisionRifles) ?? 'N/A'}cm

Widget data from client: ${JSON.stringify(widgetData)}`;
      
      prompt = `Analyze this shooter's weapon-specific performance patterns. ${context}

Provide 2-3 SHORT factual observations comparing performance across weapons. Note which weapon type they perform best with. No advice - just patterns and comparisons.
Format: Return JSON array of strings, each max 15 words.`;
      break;
    }
    
    case 'position_analysis': {
      const prone = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        position: { $eq: 'prone' },
      });
      const standing = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        position: { $eq: 'standing' },
      });
      const kneeling = await queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        position: { $eq: 'kneeling' },
      });
      
      const calcAvg = (sessions: Array<{ fields: Record<string, unknown> }>) => {
        const accs = sessions.filter(s => s.fields.accuracy_pct != null).map(s => s.fields.accuracy_pct as number);
        return accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
      };
      
      context = `
Position Performance Data:
- Prone: ${prone.length} sessions, avg ${calcAvg(prone) ?? 'N/A'}% accuracy
- Standing: ${standing.length} sessions, avg ${calcAvg(standing) ?? 'N/A'}% accuracy
- Kneeling: ${kneeling.length} sessions, avg ${calcAvg(kneeling) ?? 'N/A'}% accuracy

Widget display: ${JSON.stringify(widgetData)}`;
      
      prompt = `Analyze position-based shooting performance. ${context}

Provide 2-3 SHORT factual observations. No advice.
Format: Return JSON array of strings, each max 15 words.`;
      break;
    }
    
    case 'monthly_trends':
    case 'shot_goal':
    case 'streak':
    case 'all_time':
    default: {
      // Generic analysis based on widget data
      context = `Widget type: ${widgetType}\nWidget data: ${JSON.stringify(widgetData, null, 2)}`;
      
      prompt = `Analyze this shooting performance data. ${context}

Provide 2-3 SHORT factual observations about patterns or notable stats.
Format: Return JSON array of strings, each max 15 words.`;
      break;
    }
  }
  
  // Build structured prompt - explanatory only, not prescriptive
  const structuredPrompt = `You are a training analyst reviewing shooting performance data.

Your role is to EXPLAIN patterns, not to advise or recommend actions.

${context}

Respond with a JSON object containing:
- "summary": One clear sentence stating the most notable pattern or change (max 20 words)
- "observations": Array of 2-3 factual observations about the data (each max 15 words)
- "factors": One sentence explaining possible reasons for this pattern (max 25 words)

IMPORTANT:
- Be factual and analytical, not motivational
- Do NOT give advice or recommendations
- Do NOT use phrases like "consider", "try", "should", "could improve"
- The "factors" field explains WHY, not WHAT TO DO

Example response format:
{
  "summary": "Long range accuracy dropped 11% compared to previous sessions.",
  "observations": ["25m+ accuracy is now 58% vs 69% baseline", "Close and medium range remained stable"],
  "factors": "Possible contributing factors: fewer long-range sessions recently, or environmental conditions during those sessions."
}

Respond ONLY with valid JSON, no other text.`;

  // Call Claude
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [{ role: 'user', content: structuredPrompt }],
    }),
  });

  if (!response.ok) {
    console.error('Claude API error:', await response.text());
    return {
      title: getWidgetTitle(widgetType),
      summary: 'Could not generate insight at this time.',
    };
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  
  // Parse structured JSON response
  try {
    // Find JSON object in response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary?: string;
        observations?: string[];
        factors?: string;
      };
      
      return {
        title: getWidgetTitle(widgetType),
        summary: parsed.summary || 'Analysis complete.',
        observations: parsed.observations || [],
        factors: parsed.factors,
      };
    }
  } catch (e) {
    console.error('Failed to parse LLM JSON response:', e, content);
  }
  
  // Fallback: try to extract any useful text
  return {
    title: getWidgetTitle(widgetType),
    summary: content.slice(0, 150) || 'Analysis complete.',
  };
}

function getWidgetTitle(widgetType: WidgetType): string {
  const titles: Record<WidgetType, string> = {
    distance_breakdown: 'Distance Analysis',
    weapon_performance: 'Weapon Performance',
    position_analysis: 'Position Patterns',
    monthly_trends: 'Monthly Trends',
    shot_goal: 'Training Progress',
    streak: 'Consistency Analysis',
    all_time: 'Career Overview',
  };
  return titles[widgetType] || 'Performance Analysis';
}

// ============================================================================
// DAILY TIP GENERATION (Personalized via Pinecone)
// ============================================================================

interface DailyTipResult {
  title: string;
  content: string;
  category: 'technique' | 'fundamentals' | 'mental' | 'training';
  personalized: boolean;
  based_on?: string;
}

async function generateDailyTip(
  userId: string,
  userStats: { streak: number; accuracy: number; sessions_this_week: number; total_sessions: number },
  pineconeApiKey: string,
  pineconeIndexHost: string,
  anthropicApiKey: string
): Promise<DailyTipResult> {
  
  // Query recent sessions from Pinecone to understand user's patterns
  let sessionContext = '';
  let weakAreas: string[] = [];
  let strongAreas: string[] = [];
  
  try {
    // Get sessions with different characteristics
    const [
      lowAccuracySessions,
      highAccuracySessions,
      recentSessions,
      groupingSessions,
    ] = await Promise.all([
      queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        accuracy_pct: { $lt: 60 },
      }, 10),
      queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        accuracy_pct: { $gte: 80 },
      }, 10),
      queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {}, 20), // Recent sessions
      queryPineconeWithFilter(userId, pineconeApiKey, pineconeIndexHost, {
        drill_goal: { $eq: 'grouping' },
      }, 10),
    ]);

    // Analyze patterns
    if (lowAccuracySessions.length > 0) {
      const positions = lowAccuracySessions
        .map(s => s.fields.position as string)
        .filter(Boolean);
      const distances = lowAccuracySessions
        .map(s => s.fields.distance_m as number)
        .filter(Boolean);
      
      // Find common patterns in low accuracy sessions
      const positionCounts: Record<string, number> = {};
      positions.forEach(p => { positionCounts[p] = (positionCounts[p] || 0) + 1; });
      const weakPosition = Object.entries(positionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (weakPosition) weakAreas.push(`${weakPosition} position`);
      
      const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
      if (avgDistance > 100) weakAreas.push('long range shooting');
    }

    if (highAccuracySessions.length > 0) {
      const positions = highAccuracySessions
        .map(s => s.fields.position as string)
        .filter(Boolean);
      const positionCounts: Record<string, number> = {};
      positions.forEach(p => { positionCounts[p] = (positionCounts[p] || 0) + 1; });
      const strongPosition = Object.entries(positionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (strongPosition) strongAreas.push(`${strongPosition} position`);
    }

    // Check grouping performance
    if (groupingSessions.length > 0) {
      const dispersions = groupingSessions
        .map(s => s.fields.dispersion_cm as number)
        .filter(Boolean);
      const avgDispersion = dispersions.length > 0 ? dispersions.reduce((a, b) => a + b, 0) / dispersions.length : 0;
      if (avgDispersion > 8) weakAreas.push('shot consistency');
      else if (avgDispersion < 4) strongAreas.push('grouping precision');
    }

    // Build context from session data
    const sessionTexts = recentSessions
      .slice(0, 5)
      .map(s => s.fields.text as string)
      .filter(Boolean);
    
    sessionContext = `
User's recent training patterns (from ${recentSessions.length} sessions):
${sessionTexts.join('\n')}

Identified weak areas: ${weakAreas.length > 0 ? weakAreas.join(', ') : 'None identified'}
Identified strong areas: ${strongAreas.length > 0 ? strongAreas.join(', ') : 'Still gathering data'}
`;
  } catch (error) {
    console.error('Failed to query Pinecone for daily tip:', error);
    sessionContext = 'No session history available yet.';
  }

  // Build the prompt for Claude
  const prompt = `You are a shooting coach generating a personalized daily tip for a shooter.

User Statistics:
- Training streak: ${userStats.streak} days
- Average accuracy: ${userStats.accuracy}%
- Sessions this week: ${userStats.sessions_this_week}
- Total sessions: ${userStats.total_sessions}

${sessionContext}

Generate ONE specific, actionable shooting tip that is PERSONALIZED to this shooter's patterns and current stats.

Rules:
- If they have weak areas, address one of them
- If they have a streak going, acknowledge consistency
- If accuracy is low, focus on fundamentals
- If sessions_this_week is 0, encourage getting back to training
- Keep the tip practical and specific to their data
- Maximum 2 sentences for the tip content

Respond with ONLY valid JSON in this exact format:
{
  "title": "Short title (3-5 words)",
  "content": "The actual tip content (1-2 sentences max)",
  "category": "technique" | "fundamentals" | "mental" | "training",
  "based_on": "What user data this tip addresses"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error for daily tip:', await response.text());
      throw new Error('Claude API failed');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        title: string;
        content: string;
        category: 'technique' | 'fundamentals' | 'mental' | 'training';
        based_on?: string;
      };

      return {
        title: parsed.title || 'Training Tip',
        content: parsed.content || 'Focus on your fundamentals today.',
        category: parsed.category || 'training',
        personalized: true,
        based_on: parsed.based_on,
      };
    }
  } catch (error) {
    console.error('Failed to generate personalized tip:', error);
  }

  // Fallback to a generic tip based on stats
  return getFallbackTip(userStats);
}

function getFallbackTip(stats: { streak: number; accuracy: number; sessions_this_week: number }): DailyTipResult {
  if (stats.streak >= 5) {
    return {
      title: 'Mental Focus',
      content: 'Great streak! Visualize each shot before taking it. See the bullet hitting the target. Confidence breeds accuracy.',
      category: 'mental',
      personalized: false,
    };
  }
  if (stats.accuracy < 50 && stats.sessions_this_week > 0) {
    return {
      title: 'Trigger Press',
      content: 'Focus on pressing straight back. Let the shot surprise you. Anticipation causes most misses.',
      category: 'technique',
      personalized: false,
    };
  }
  if (stats.sessions_this_week === 0) {
    return {
      title: 'Deliberate Practice',
      content: 'Quality over quantity. 50 focused rounds beat 200 rushed ones. Every shot should have purpose.',
      category: 'training',
      personalized: false,
    };
  }
  return {
    title: 'Breathing Control',
    content: 'Take a deep breath, hold at the natural pause, then squeeze. Consistent breathing improves groupings.',
    category: 'technique',
    personalized: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await req.json() as InsightRequest;
    
    // Get API keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeIndexHost = Deno.env.get('PINECONE_INDEX_HOST');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    // ========================================================================
    // MODE: WIDGET INSIGHT (on-demand AI analysis)
    // ========================================================================
    if ('mode' in body && body.mode === 'widget_insight') {
      const { widget_type, user_id, widget_data } = body as WidgetInsightRequest;
      
      if (!widget_type || !user_id) {
        return new Response(JSON.stringify({ error: 'widget_type and user_id required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      if (!pineconeApiKey || !pineconeIndexHost || !anthropicApiKey) {
        return new Response(JSON.stringify({ error: 'AI services not configured' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`🤖 Widget insight request: ${widget_type} for user ${user_id}`);
      
      const insight = await generateWidgetInsight(
        widget_type as WidgetType,
        user_id,
        widget_data || {},
        pineconeApiKey,
        pineconeIndexHost,
        anthropicApiKey
      );
      
      return new Response(JSON.stringify({
        success: true,
        widget_type,
        insight,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: DAILY TIP (personalized tip based on Pinecone session history)
    // ========================================================================
    if ('mode' in body && body.mode === 'daily_tip') {
      const { user_id, user_stats } = body as DailyTipRequest;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`💡 Daily tip request for user ${user_id}`);
      
      // If AI services not configured, return fallback tip
      if (!pineconeApiKey || !pineconeIndexHost || !anthropicApiKey) {
        console.log('AI services not configured, using fallback tip');
        const fallbackTip = getFallbackTip(user_stats || { streak: 0, accuracy: 0, sessions_this_week: 0 });
        return new Response(JSON.stringify({
          success: true,
          tip: fallbackTip,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const tip = await generateDailyTip(
        user_id,
        user_stats || { streak: 0, accuracy: 0, sessions_this_week: 0, total_sessions: 0 },
        pineconeApiKey,
        pineconeIndexHost,
        anthropicApiKey
      );
      
      return new Response(JSON.stringify({
        success: true,
        tip,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: CHAT (answer questions about performance)
    // ========================================================================
    if ('mode' in body && body.mode === 'chat') {
      const { user_id, question, context } = body as {
        mode: 'chat';
        user_id: string;
        question: string;
        context: Record<string, unknown>;
      };
      
      if (!user_id || !question) {
        return new Response(JSON.stringify({ error: 'user_id and question required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      if (!anthropicApiKey) {
        return new Response(JSON.stringify({ error: 'AI service not configured' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`💬 Chat question from user ${user_id}: ${question}`);
      
      // Build context string from analysis data
      const contextStr = `
Performance Analysis Data:

Accuracy:
- Current: ${context.accuracy?.current ?? 'N/A'}%
- Baseline: ${context.accuracy?.baseline ?? 'N/A'}%
- Change: ${context.accuracy?.delta ?? 0}% (${context.accuracy?.direction ?? 'stable'})
- Recent shots: ${context.accuracy?.recentShots ?? 'N/A'}

Grouping:
- Current: ${context.grouping?.current ?? 'N/A'}cm
- Baseline: ${context.grouping?.baseline ?? 'N/A'}cm
- Change: ${context.grouping?.delta ?? 0}cm

Distance breakdown:
${(context.distance as Array<{label: string; current: number; delta: number}> || [])
  .map(d => `- ${d.label}: ${d.current}% (${d.delta > 0 ? '+' : ''}${d.delta}%)`)
  .join('\n') || 'No distance data'}

Position breakdown:
${(context.position as Array<{label: string; current: number; delta: number}> || [])
  .map(p => `- ${p.label}: ${p.current}% (${p.delta > 0 ? '+' : ''}${p.delta}%)`)
  .join('\n') || 'No position data'}
`;

      const chatPrompt = `You are a training analyst for a shooter. Answer their question based on the data provided.

${contextStr}

User's question: "${question}"

Rules:
- Be concise (2-3 sentences max)
- Be factual, reference the data
- Don't give training advice unless specifically asked
- If you don't have data to answer, say so

Answer:`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [{ role: 'user', content: chatPrompt }],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', await response.text());
        return new Response(JSON.stringify({ 
          answer: 'I couldn\'t process that question. Please try again.' 
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const answer = data.content?.[0]?.text || 'I couldn\'t generate an answer.';
      
      return new Response(JSON.stringify({ answer }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: SESSION INSIGHT (after session ends)
    // ========================================================================
    const { session_id } = body as SessionInsightRequest;

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Get session features
    const { data: features, error: featuresError } = await supabase
      .from('session_features')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (featuresError || !features) {
      console.error('Failed to get session features:', featuresError);
      return new Response(JSON.stringify({ error: 'Session features not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Enrich features with weapon_name and position
    const { data: sessionData } = await supabase
      .from('sessions')
      .select(`
        user_weapons:weapon_id(name),
        custom_drill_config,
        training_drills:drill_id(position),
        drill_templates:drill_template_id(position)
      `)
      .eq('id', session_id)
      .single();
    
    const weaponName = (sessionData?.user_weapons as { name: string } | null)?.name || null;
    (features as Record<string, unknown>).weapon_name = weaponName;
    
    if (!features.position) {
      const drillConfig = sessionData?.custom_drill_config as { position?: string } | null;
      const trainingDrill = sessionData?.training_drills as { position?: string } | null;
      const drillTemplate = sessionData?.drill_templates as { position?: string } | null;
      const position = drillConfig?.position || trainingDrill?.position || drillTemplate?.position || null;
      (features as Record<string, unknown>).position = position;
    }
    
    console.log(`📍 Session ${session_id} - weapon: ${weaponName}, position: ${features.position}`);

    // 3. Generate text for embedding
    const sessionText = sessionToText(features);

    // 4. Upsert to Pinecone (always)
    let baseline: UserBaseline | null = null;
    let pineconeStatus = 'not_configured';
    let similarSessions: Array<{ fields: Record<string, unknown>; score: number }> = [];
    
    if (pineconeApiKey && pineconeIndexHost) {
      try {
        await upsertToPinecone(features, sessionText, pineconeApiKey, pineconeIndexHost);
        pineconeStatus = 'upsert_success';
        console.log('✅ PINECONE: Upserted session embedding');

        // Search for similar sessions to compute baseline
        similarSessions = await findSimilarSessions(features, sessionText, pineconeApiKey, pineconeIndexHost);
        console.log(`🔍 PINECONE: Found ${similarSessions.length} similar sessions`);

        if (similarSessions.length >= 1) {
          baseline = computeSimilarityBaseline(similarSessions);
          pineconeStatus = 'baseline_computed';
        }
      } catch (pineconeError) {
        pineconeStatus = 'error';
        console.error('❌ PINECONE ERROR:', pineconeError);
      }
    }

    // 5. Check for anomalies (only generate insight if anomaly detected)
    const anomaly = detectAnomaly(features, baseline);
    let insights: GeneratedInsight[] = [];
    
    if (anomaly.isAnomaly && anomaly.insight) {
      console.log(`🚨 ANOMALY detected: ${anomaly.type}`);
      insights = [anomaly.insight];
      
      // Save anomaly insight to database
      const { error: insertError } = await supabase
        .from('session_insights')
        .insert({
          session_id,
          user_id: features.user_id,
          title: anomaly.insight.title,
          summary: anomaly.insight.summary,
          primary_factor: anomaly.insight.primary_factor,
          secondary_factor: anomaly.insight.secondary_factor,
          score: anomaly.insight.score,
          tags: anomaly.insight.tags,
          insight_type: anomaly.insight.insight_type,
          evidence: anomaly.insight.evidence,
        });

      if (insertError) {
        console.error('Failed to save insight:', insertError);
      }
    }

    // 6. Refresh user baseline
    const conditionKey = [
      features.drill_goal || 'unknown',
      features.position || 'unknown',
      features.distance_m ? (features.distance_m <= 50 ? '0-50' : features.distance_m <= 100 ? '51-100' : features.distance_m <= 200 ? '101-200' : '200+') : 'unknown',
      features.weapon_category || 'unknown',
    ].join('|');

    await supabase.rpc('refresh_user_baseline', {
      p_user_id: features.user_id,
      p_condition_key: conditionKey,
      p_limit: 30,
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        pinecone_status: pineconeStatus,
        similar_sessions_found: similarSessions.length,
        anomaly_detected: anomaly.isAnomaly,
        anomaly_type: anomaly.type || null,
        insights_generated: insights.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
