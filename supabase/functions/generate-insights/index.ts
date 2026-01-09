/**
 * Supabase Edge Function: Generate Insights
 * 
 * Triggered when session_features row is inserted.
 * 1. Generates text embedding from session features
 * 2. Upserts embedding to Pinecone
 * 3. Finds similar sessions for dynamic baseline
 * 4. Generates insights using rule-based engine
 * 5. Saves insights to session_insights table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
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
  weapon_name?: string | null; // Enriched from session
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

// ============================================================================
// SESSION TO TEXT (for Pinecone embedding)
// ============================================================================

function sessionToText(s: SessionFeatures): string {
  const parts: string[] = [];

  // Core context
  parts.push(`${s.drill_goal || 'training'} session in ${s.position || 'unknown'} position on ${s.target_type || 'target'}`);

  // Distance
  if (s.distance_m) {
    const distDesc = s.distance_m <= 50 ? 'close range' :
      s.distance_m <= 100 ? 'medium range' :
      s.distance_m <= 200 ? 'long range' : 'extreme range';
    parts.push(`at ${distDesc} (${s.distance_m}m)`);
  }

  // Weapon - include BOTH name AND category for comparison
  if (s.weapon_name && s.weapon_category) {
    parts.push(`using ${s.weapon_name} (${s.weapon_category})`);
  } else if (s.weapon_name) {
    parts.push(`using ${s.weapon_name}`);
  } else if (s.weapon_category) {
    parts.push(`using ${s.weapon_category}`);
  }

  // Performance
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

  // Shot count
  const shotDesc = s.shots <= 10 ? 'few shots' :
    s.shots <= 25 ? 'moderate shot count' : 'many shots';
  parts.push(shotDesc);

  // Biometrics
  if (s.has_biometrics && s.stress_avg !== null) {
    const stressDesc = s.stress_avg < 40 ? 'low stress' :
      s.stress_avg < 60 ? 'moderate stress' : 'high stress';
    parts.push(`with ${stressDesc}`);
  }

  // Weather
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

// Generate embedding using Pinecone's inference API
async function generateEmbedding(
  text: string,
  pineconeApiKey: string
): Promise<number[]> {
  // Use the same model as the index: llama-text-embed-v2 (1024 dimensions)
  const response = await fetch('https://api.pinecone.io/embed', {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
      'X-Pinecone-API-Version': '2025-01',
    },
    body: JSON.stringify({
      model: 'llama-text-embed-v2',
      inputs: [{ text: text }],  // Array of objects with 'text' field
      parameters: { input_type: 'passage', truncate: 'END' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pinecone embed failed:', error);
    throw new Error(`Pinecone embed failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Embedding generated, dims:', data.data?.[0]?.values?.length);
  return data.data[0].values;
}

async function upsertToPinecone(
  features: SessionFeatures,
  text: string,
  pineconeApiKey: string,
  indexHost: string
): Promise<void> {
  const namespace = `user_${features.user_id}`;
  
  // 1. Generate embedding
  console.log('Generating embedding for session:', features.session_id);
  const embedding = await generateEmbedding(text, pineconeApiKey);
  console.log('Embedding generated, dimension:', embedding.length);
  
  // 2. Build metadata (only non-null values)
  const metadata: Record<string, string | number | boolean> = {
    text: text,
  };
  // Core session data
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
  
  // Weather data
  if (features.has_weather) {
    metadata.has_weather = true;
    if (features.weather_temp_c !== null) metadata.weather_temp_c = features.weather_temp_c;
    if (features.weather_humidity !== null) metadata.weather_humidity = features.weather_humidity;
    if (features.weather_wind_speed_mps !== null) metadata.weather_wind_speed_mps = features.weather_wind_speed_mps;
    if (features.weather_wind_impact) metadata.weather_wind_impact = features.weather_wind_impact;
    if (features.weather_condition) metadata.weather_condition = features.weather_condition;
    if (features.weather_condition_severity) metadata.weather_condition_severity = features.weather_condition_severity;
  }
  
  // Biometrics data
  if (features.has_biometrics) {
    metadata.has_biometrics = true;
    if (features.stress_avg !== null) metadata.stress_avg = features.stress_avg;
    if (features.steadiness_score !== null) metadata.steadiness_score = features.steadiness_score;
  }

  // 3. Upsert vector using standard vectors API
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
  
  console.log('Pinecone upsert success');
}

async function findSimilarSessions(
  features: SessionFeatures,
  text: string,
  pineconeApiKey: string,
  indexHost: string,
  topK: number = 20 // Increased to get more context
): Promise<Array<{ id: string; score: number; fields: Record<string, unknown> }>> {
  const namespace = `user_${features.user_id}`;

  // 1. Generate embedding for query
  console.log('Generating query embedding...');
  const queryEmbedding = await generateEmbedding(text, pineconeApiKey);
  
  // 2. NO FILTER - let semantic similarity decide what's relevant
  // The embedding already encodes drill_goal, weapon, position, weather etc.
  // Pinecone will naturally return similar sessions based on full context

  // 3. Query using standard vectors API
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
      // No filter - trust the embeddings
    }),
  });

  if (!response.ok) {
    console.error('Pinecone query failed:', await response.text());
    return [];
  }

  const data = await response.json();
  console.log('Found', data.matches?.length || 0, 'similar sessions');
  
  // Debug: log first match metadata
  if (data.matches?.[0]) {
    console.log('Sample match metadata:', JSON.stringify(data.matches[0].metadata));
  }
  
  return (data.matches || [])
    .filter((match: { id: string }) => match.id !== features.session_id)
    .map((match: { id: string; score: number; metadata?: Record<string, unknown> }) => ({
      id: match.id,
      score: match.score,
      fields: match.metadata || {},
    }));
}

function computeSimilarityBaseline(
  similarSessions: Array<{ fields: Record<string, unknown>; score: number }>
): UserBaseline | null {
  if (similarSessions.length < 1) return null;

  const accuracies: number[] = [];
  const groupings: number[] = [];

  for (const session of similarSessions) {
    // Debug: log what fields we're seeing
    console.log('Similar session fields:', Object.keys(session.fields), 'accuracy_pct:', session.fields.accuracy_pct);
    
    if (session.fields.accuracy_pct != null) {
      accuracies.push(session.fields.accuracy_pct as number);
    }
    if (session.fields.dispersion_cm != null) {
      groupings.push(session.fields.dispersion_cm as number);
    }
  }
  
  console.log('Extracted accuracies:', accuracies, 'groupings:', groupings);

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
// LLM TRIGGER LOGIC (Cost Optimization)
// ============================================================================

interface LLMDecision {
  generate: boolean;
  reason: string;
}

async function shouldGenerateLLMInsights(
  features: SessionFeatures,
  baseline: UserBaseline | null,
  similarCount: number,
  supabase: ReturnType<typeof createClient>
): Promise<LLMDecision> {
  const userId = features.user_id;
  
  // 1. Not enough data yet - skip LLM (lowered to 2 for faster activation)
  if (similarCount < 2) {
    return { generate: false, reason: 'insufficient_history' };
  }

  // 2. Check for notable performance (>15% from average)
  if (baseline && features.accuracy_pct !== null && baseline.avg_accuracy) {
    const diff = features.accuracy_pct - baseline.avg_accuracy;
    const absDiff = Math.abs(diff);
    
    // Notable high or low performance
    if (absDiff > 15) {
      return { generate: true, reason: diff > 0 ? 'above_average' : 'below_average' };
    }
  }

  // 3. First time with this weapon (interesting to analyze)
  if (features.weapon_category && features.weapon_category !== 'other') {
    const { data: existingWeapon } = await supabase
      .from('session_features')
      .select('id')
      .eq('user_id', userId)
      .eq('weapon_category', features.weapon_category)
      .neq('session_id', features.session_id)
      .limit(1);
    
    if (!existingWeapon || existingWeapon.length === 0) {
      return { generate: true, reason: 'new_weapon' };
    }
  }

  // 4. Check last LLM insight - run every 5 sessions OR every 3 days
  const { data: recentLLM } = await supabase
    .from('session_insights')
    .select('created_at')
    .eq('user_id', userId)
    .eq('insight_type', 'llm_insight')
    .order('created_at', { ascending: false })
    .limit(1);
  
  // Count sessions since last LLM insight
  const { count: sessionsSinceLLM } = await supabase
    .from('session_features')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('created_at', recentLLM?.[0]?.created_at || '1970-01-01');

  // Every 5th session gets LLM analysis
  if (!recentLLM || recentLLM.length === 0 || (sessionsSinceLLM && sessionsSinceLLM >= 5)) {
    return { generate: true, reason: 'periodic_analysis' };
  }

  // Or if 3+ days since last LLM insight
  const lastLLMDate = new Date(recentLLM[0].created_at);
  const daysSinceLastLLM = (Date.now() - lastLLMDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastLLM >= 3) {
    return { generate: true, reason: 'time_based' };
  }

  // Default: skip LLM for routine sessions
  return { generate: false, reason: 'routine_session' };
}

// ============================================================================
// LLM-POWERED INSIGHTS (Claude API)
// ============================================================================

interface SimilarSessionSummary {
  accuracy_pct: number | null;
  distance_m: number | null;
  weapon_category: string | null;
  position: string | null;
  shots: number | null;
  drill_goal: string | null;
  weather_wind_impact: string | null;
  weather_condition: string | null;
  stress_avg: number | null;
}

async function generateLLMInsights(
  features: SessionFeatures,
  similarSessions: Array<{ fields: Record<string, unknown>; score: number }>,
  anthropicApiKey: string
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];
  
  // Prepare similar sessions data
  const similarData: SimilarSessionSummary[] = similarSessions.slice(0, 15).map(s => ({
    accuracy_pct: s.fields.accuracy_pct as number | null,
    distance_m: s.fields.distance_m as number | null,
    weapon_category: s.fields.weapon_category as string | null,
    position: s.fields.position as string | null,
    shots: s.fields.shots as number | null,
    drill_goal: s.fields.drill_goal as string | null,
    weather_wind_impact: s.fields.weather_wind_impact as string | null,
    weather_condition: s.fields.weather_condition as string | null,
    stress_avg: s.fields.stress_avg as number | null,
  }));

  // Calculate quick stats for context
  const accuracies = similarData.filter(s => s.accuracy_pct !== null).map(s => s.accuracy_pct!);
  const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : null;
  const bestAccuracy = accuracies.length > 0 ? Math.max(...accuracies) : null;
  const worstAccuracy = accuracies.length > 0 ? Math.min(...accuracies) : null;

  // Group by weapon
  const byWeapon: Record<string, number[]> = {};
  similarData.forEach(s => {
    if (s.weapon_category && s.accuracy_pct !== null) {
      if (!byWeapon[s.weapon_category]) byWeapon[s.weapon_category] = [];
      byWeapon[s.weapon_category].push(s.accuracy_pct);
    }
  });
  const weaponAvgs = Object.entries(byWeapon).map(([w, accs]) => ({
    weapon: w,
    avg: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length),
    count: accs.length,
  }));

  // Group by position
  const byPosition: Record<string, number[]> = {};
  similarData.forEach(s => {
    if (s.position && s.position !== 'unknown' && s.accuracy_pct !== null) {
      if (!byPosition[s.position]) byPosition[s.position] = [];
      byPosition[s.position].push(s.accuracy_pct);
    }
  });
  const positionAvgs = Object.entries(byPosition).map(([p, accs]) => ({
    position: p,
    avg: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length),
    count: accs.length,
  }));

  // Calculate how "interesting" this session is
  const diffFromAvg = avgAccuracy ? Math.abs(features.accuracy_pct! - avgAccuracy) : 0;
  const isNotable = diffFromAvg > 10 || (bestAccuracy && features.accuracy_pct === bestAccuracy);
  
  // Group by weather condition
  const byWeather: Record<string, number[]> = {};
  similarData.forEach(s => {
    if (s.weather_wind_impact && s.accuracy_pct !== null) {
      if (!byWeather[s.weather_wind_impact]) byWeather[s.weather_wind_impact] = [];
      byWeather[s.weather_wind_impact].push(s.accuracy_pct);
    }
  });
  const weatherAvgs = Object.entries(byWeather).map(([w, accs]) => ({
    condition: w,
    avg: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length),
    count: accs.length,
  }));

  // Build the prompt
  const prompt = `Analyze this shooting session. Output factual observations only - no advice, no suggestions, no self-references.

CURRENT SESSION:
- Accuracy: ${features.accuracy_pct}%
- Weapon: ${features.weapon_name || features.weapon_category || 'unknown'}
- Distance: ${features.distance_m || 'unknown'}m
- Shots: ${features.shots}
${features.position ? `- Position: ${features.position}` : ''}
${features.has_weather ? `- Weather: ${features.weather_wind_impact || 'calm'} wind, ${features.weather_condition || 'clear'}` : ''}
${features.has_biometrics && features.stress_avg ? `- Stress level: ${features.stress_avg}` : ''}

HISTORY (${similarSessions.length} similar sessions):
- Average: ${avgAccuracy ? Math.round(avgAccuracy) : 'N/A'}%
- Best: ${bestAccuracy}%
- Worst: ${worstAccuracy}%
${weaponAvgs.length > 1 ? `- By weapon: ${weaponAvgs.map(w => `${w.weapon} ${w.avg}%`).join(', ')}` : ''}
${weatherAvgs.length > 1 ? `- By weather: ${weatherAvgs.map(w => `${w.condition} wind: ${w.avg}%`).join(', ')}` : ''}

RULES:
- ONLY state observations - what happened, patterns noticed, comparisons
- NEVER give advice, suggestions, recommendations, or "should/need to" statements  
- NEVER reference yourself ("the analyst observed", "I noticed") - just state the fact directly
- Just state facts: "20% below average", "best session this month", "carbine 30% lower than rifle"
- If nothing interesting, return empty array []
- MAXIMUM 1 insight - only return 2 if they are COMPLETELY DIFFERENT topics
- NO DUPLICATES - don't say the same thing twice in different words
- Short title (3-5 words), summary (1 factual sentence, max 15 words)

${isNotable ? 'This session has notable data.' : 'Routine session - only comment if there is a genuine pattern.'}

Respond ONLY with JSON:
[]
OR
[{"title": "...", "summary": "...", "type": "pattern|achievement|observation"}]`;

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
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return insights;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    
    if (content) {
      console.log('Claude raw response:', content);
      
      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const llmInsights = JSON.parse(jsonMatch[0]);
        
        // Dedupe: only take first insight, or second if titles are completely different
        const seenTopics = new Set<string>();
        
        for (const insight of llmInsights.slice(0, 2)) {
          // Extract key topic words (skip common words)
          const topicWords = insight.title.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter((w: string) => !['in', 'the', 'a', 'an', 'with', 'for', 'and', 'or'].includes(w))
            .slice(0, 3)
            .join(' ');
          
          // Skip if we already have a similar topic
          if (seenTopics.has(topicWords)) {
            console.log('Skipping duplicate insight:', insight.title);
            continue;
          }
          seenTopics.add(topicWords);
          
          insights.push({
            title: insight.title,
            summary: insight.summary,
            primary_factor: insight.type === 'achievement' ? 'consistency' : 'pattern',
            secondary_factor: null,
            score: insight.type === 'achievement' ? 80 : 60,
            tags: ['ai_generated', insight.type],
            insight_type: 'llm_insight',
            evidence: { source: 'claude', similar_sessions: similarSessions.length },
          });
        }
      }
    }
  } catch (error) {
    console.error('LLM insight generation failed:', error);
  }

  return insights;
}

// ============================================================================
// CONTEXTUAL INSIGHTS (Smart cross-dimensional analysis)
// ============================================================================

interface SegmentStats {
  n: number;
  avg_accuracy: number | null;
  avg_grouping: number | null;
}

async function getSegmentStats(
  features: SessionFeatures,
  pineconeApiKey: string,
  indexHost: string,
  filter: Record<string, unknown>
): Promise<SegmentStats | null> {
  const namespace = `user_${features.user_id}`;
  
  // Generate embedding for query
  const sessionText = sessionToText(features);
  const queryEmbedding = await generateEmbedding(sessionText, pineconeApiKey);
  
  const response = await fetch(`https://${indexHost}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace: namespace,
      vector: queryEmbedding,
      topK: 50,
      includeMetadata: true,
      filter: filter,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const matches = (data.matches || []).filter((m: { id: string }) => m.id !== features.session_id);
  
  if (matches.length < 2) return null;
  
  const accuracies: number[] = [];
  const groupings: number[] = [];
  
  for (const match of matches) {
    if (match.metadata?.accuracy_pct != null) {
      accuracies.push(match.metadata.accuracy_pct as number);
    }
    if (match.metadata?.dispersion_cm != null) {
      groupings.push(match.metadata.dispersion_cm as number);
    }
  }
  
  return {
    n: matches.length,
    avg_accuracy: accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : null,
    avg_grouping: groupings.length > 0 ? groupings.reduce((a, b) => a + b, 0) / groupings.length : null,
  };
}

async function generateContextualInsights(
  features: SessionFeatures,
  pineconeApiKey: string,
  indexHost: string
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];
  const currentAccuracy = features.accuracy_pct;
  
  if (currentAccuracy === null) return insights;
  
  try {
    // 1. WEAPON COMPARISON
    // Get stats for THIS weapon vs ALL weapons
    const thisWeaponStats = await getSegmentStats(features, pineconeApiKey, indexHost, {
      weapon_category: { $eq: features.weapon_category },
    });
    const allWeaponsStats = await getSegmentStats(features, pineconeApiKey, indexHost, {});
    
    if (thisWeaponStats && allWeaponsStats && thisWeaponStats.avg_accuracy && allWeaponsStats.avg_accuracy) {
      const weaponDiff = Math.round(thisWeaponStats.avg_accuracy - allWeaponsStats.avg_accuracy);
      if (Math.abs(weaponDiff) >= 5) {
        const weaponName = features.weapon_category || 'this weapon';
        if (weaponDiff > 0) {
          insights.push({
            title: `You're ${weaponDiff}% better with ${weaponName}`,
            summary: `Your average accuracy with ${weaponName} is ${Math.round(thisWeaponStats.avg_accuracy)}% vs ${Math.round(allWeaponsStats.avg_accuracy)}% overall. This weapon suits you.`,
            primary_factor: 'weapon_fit',
            secondary_factor: null,
            score: 70 + Math.min(20, weaponDiff),
            tags: ['weapon', 'comparison', 'strength'],
            insight_type: 'contextual_comparison',
            evidence: { weapon: weaponName, weapon_avg: thisWeaponStats.avg_accuracy, overall_avg: allWeaponsStats.avg_accuracy, diff: weaponDiff },
          });
        } else {
          insights.push({
            title: `${weaponName} is challenging for you`,
            summary: `Your average accuracy with ${weaponName} is ${Math.round(thisWeaponStats.avg_accuracy)}% vs ${Math.round(allWeaponsStats.avg_accuracy)}% overall. Consider more practice with this weapon.`,
            primary_factor: 'weapon_fit',
            secondary_factor: 'training',
            score: 60 + Math.min(20, Math.abs(weaponDiff)),
            tags: ['weapon', 'comparison', 'improvement_area'],
            insight_type: 'contextual_comparison',
            evidence: { weapon: weaponName, weapon_avg: thisWeaponStats.avg_accuracy, overall_avg: allWeaponsStats.avg_accuracy, diff: weaponDiff },
          });
        }
      }
    }

    // 2. POSITION COMPARISON  
    if (features.position && features.position !== 'unknown') {
      const thisPositionStats = await getSegmentStats(features, pineconeApiKey, indexHost, {
        position: { $eq: features.position },
      });
      const allPositionStats = await getSegmentStats(features, pineconeApiKey, indexHost, {});
      
      if (thisPositionStats && allPositionStats && thisPositionStats.avg_accuracy && allPositionStats.avg_accuracy) {
        const posDiff = Math.round(thisPositionStats.avg_accuracy - allPositionStats.avg_accuracy);
        if (Math.abs(posDiff) >= 5) {
          const posName = features.position;
          if (posDiff < 0) {
            insights.push({
              title: `${posName} position drops your accuracy`,
              summary: `When ${posName}, your average is ${Math.round(thisPositionStats.avg_accuracy)}% vs ${Math.round(allPositionStats.avg_accuracy)}% in other positions. ${Math.abs(posDiff)}% room for improvement.`,
              primary_factor: 'position',
              secondary_factor: 'stability',
              score: 65 + Math.min(20, Math.abs(posDiff)),
              tags: ['position', 'comparison', 'training_focus'],
              insight_type: 'contextual_comparison',
              evidence: { position: posName, position_avg: thisPositionStats.avg_accuracy, overall_avg: allPositionStats.avg_accuracy, diff: posDiff },
            });
          } else {
            insights.push({
              title: `${posName} is your strongest position`,
              summary: `When ${posName}, you average ${Math.round(thisPositionStats.avg_accuracy)}% vs ${Math.round(allPositionStats.avg_accuracy)}% overall. ${posDiff}% better!`,
              primary_factor: 'position',
              secondary_factor: null,
              score: 70 + Math.min(20, posDiff),
              tags: ['position', 'comparison', 'strength'],
              insight_type: 'contextual_comparison',
              evidence: { position: posName, position_avg: thisPositionStats.avg_accuracy, overall_avg: allPositionStats.avg_accuracy, diff: posDiff },
            });
          }
        }
      }
    }

    // 3. DISTANCE COMPARISON
    if (features.distance_m) {
      const distanceRange = features.distance_m <= 50 ? 'close' : features.distance_m <= 100 ? 'medium' : 'long';
      const distanceFilter = features.distance_m <= 50 
        ? { distance_m: { $lte: 50 } }
        : features.distance_m <= 100 
          ? { $and: [{ distance_m: { $gt: 50 } }, { distance_m: { $lte: 100 } }] }
          : { distance_m: { $gt: 100 } };
      
      const thisDistanceStats = await getSegmentStats(features, pineconeApiKey, indexHost, distanceFilter);
      const allDistanceStats = await getSegmentStats(features, pineconeApiKey, indexHost, {});
      
      if (thisDistanceStats && allDistanceStats && thisDistanceStats.avg_accuracy && allDistanceStats.avg_accuracy) {
        const distDiff = Math.round(thisDistanceStats.avg_accuracy - allDistanceStats.avg_accuracy);
        if (Math.abs(distDiff) >= 8) {
          insights.push({
            title: `${distanceRange} range ${distDiff > 0 ? 'is your sweet spot' : 'needs work'}`,
            summary: `At ${distanceRange} range (${features.distance_m}m), you average ${Math.round(thisDistanceStats.avg_accuracy)}% vs ${Math.round(allDistanceStats.avg_accuracy)}% overall.`,
            primary_factor: 'distance',
            secondary_factor: distDiff < 0 ? 'hold_over' : null,
            score: 65 + Math.min(20, Math.abs(distDiff)),
            tags: ['distance', 'comparison', distDiff > 0 ? 'strength' : 'improvement_area'],
            insight_type: 'contextual_comparison',
            evidence: { distance_m: features.distance_m, range: distanceRange, distance_avg: thisDistanceStats.avg_accuracy, overall_avg: allDistanceStats.avg_accuracy, diff: distDiff },
          });
        }
      }
    }

    // 4. WEATHER IMPACT (if weather data available)
    if (features.has_weather && features.weather_wind_impact) {
      // Compare sessions with similar weather conditions
      // This would need weather data stored in Pinecone metadata
      // For now, we'll skip this but the structure is here
    }

    // 5. SHOT COUNT IMPACT
    const shotCategory = features.shots <= 10 ? 'few' : features.shots <= 25 ? 'moderate' : 'many';
    const fewShotsStats = await getSegmentStats(features, pineconeApiKey, indexHost, {
      shots: { $lte: 10 },
    });
    const manyShotsStats = await getSegmentStats(features, pineconeApiKey, indexHost, {
      shots: { $gt: 25 },
    });
    
    if (fewShotsStats && manyShotsStats && fewShotsStats.avg_accuracy && manyShotsStats.avg_accuracy) {
      const fatigueDiff = Math.round(fewShotsStats.avg_accuracy - manyShotsStats.avg_accuracy);
      if (fatigueDiff >= 10) {
        insights.push({
          title: 'Fatigue affects your accuracy',
          summary: `With few shots you average ${Math.round(fewShotsStats.avg_accuracy)}%, but with many shots it drops to ${Math.round(manyShotsStats.avg_accuracy)}%. ${fatigueDiff}% fatigue impact detected.`,
          primary_factor: 'fatigue',
          secondary_factor: 'endurance',
          score: 75,
          tags: ['fatigue', 'endurance', 'pattern'],
          insight_type: 'pattern_detection',
          evidence: { few_shots_avg: fewShotsStats.avg_accuracy, many_shots_avg: manyShotsStats.avg_accuracy, fatigue_drop: fatigueDiff },
        });
      }
    }

  } catch (error) {
    console.error('Contextual insights error:', error);
  }
  
  return insights;
}

// ============================================================================
// INSIGHT GENERATION (Rule-based engine)
// ============================================================================

function zScore(value: number, mean: number, std: number): number | null {
  if (!isFinite(std) || std <= 0) return null;
  return (value - mean) / std;
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function formatCm(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}cm`;
}

function isGroupingGoal(goal: string | null): boolean {
  return goal === 'grouping' || goal === 'cold_bore';
}

function generateInsights(features: SessionFeatures, baseline: UserBaseline | null): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // Accuracy baseline check (for non-grouping sessions)
  if (!isGroupingGoal(features.drill_goal) && features.drill_goal !== 'zeroing') {
    if (baseline && baseline.n >= 3 && baseline.avg_accuracy !== null && baseline.std_accuracy !== null && features.accuracy_pct !== null) {
      const z = zScore(features.accuracy_pct, baseline.avg_accuracy, baseline.std_accuracy);
      if (z !== null && z <= -1.0) {
        const drop = Math.round(baseline.avg_accuracy - features.accuracy_pct);
        insights.push({
          title: 'Accuracy below baseline',
          summary: `Hit rate ${formatPct(features.accuracy_pct)} is ${drop}% below your usual ${formatPct(baseline.avg_accuracy)} for similar sessions.`,
          primary_factor: features.has_biometrics && features.stress_avg !== null && features.stress_avg >= 60 ? 'stress' : 'execution',
          secondary_factor: features.flinch_count >= 2 ? 'trigger' : null,
          score: Math.min(100, 50 + Math.abs(z) * 15),
          tags: ['baseline', 'accuracy', 'drop'],
          insight_type: 'baseline_deviation',
          evidence: { z_score: Math.round(z * 100) / 100, session_accuracy: features.accuracy_pct, baseline_accuracy: baseline.avg_accuracy },
        });
      } else if (z !== null && z >= 1.5) {
        const improvement = Math.round(features.accuracy_pct - baseline.avg_accuracy);
        insights.push({
          title: 'Accuracy above baseline',
          summary: `Hit rate ${formatPct(features.accuracy_pct)} is ${improvement}% above your usual ${formatPct(baseline.avg_accuracy)}. Great shooting!`,
          primary_factor: 'consistency',
          secondary_factor: null,
          score: Math.min(100, 40 + z * 10),
          tags: ['baseline', 'accuracy', 'improvement'],
          insight_type: 'achievement',
          evidence: { z_score: Math.round(z * 100) / 100, session_accuracy: features.accuracy_pct, baseline_accuracy: baseline.avg_accuracy },
        });
      }
    }
  }

  // Grouping baseline check
  if (features.drill_goal === 'grouping' && features.dispersion_cm !== null) {
    if (baseline && baseline.n >= 3 && baseline.avg_grouping !== null && baseline.std_grouping !== null) {
      const z = zScore(features.dispersion_cm, baseline.avg_grouping, baseline.std_grouping);
      if (z !== null && z >= 1.0) {
        const wider = (features.dispersion_cm - baseline.avg_grouping).toFixed(1);
        insights.push({
          title: 'Grouping wider than usual',
          summary: `Dispersion ${formatCm(features.dispersion_cm)} is ${wider}cm wider than your baseline ${formatCm(baseline.avg_grouping)}.`,
          primary_factor: features.has_biometrics && features.stress_avg !== null && features.stress_avg >= 60 ? 'stress' : 'consistency',
          secondary_factor: 'stance',
          score: Math.min(100, 50 + z * 15),
          tags: ['baseline', 'grouping', 'regression'],
          insight_type: 'baseline_deviation',
          evidence: { z_score: Math.round(z * 100) / 100, session_grouping: features.dispersion_cm, baseline_grouping: baseline.avg_grouping },
        });
      } else if (z !== null && z <= -1.5) {
        const tighter = (baseline.avg_grouping - features.dispersion_cm).toFixed(1);
        insights.push({
          title: 'Tighter grouping than usual',
          summary: `Dispersion ${formatCm(features.dispersion_cm)} is ${tighter}cm tighter than your baseline ${formatCm(baseline.avg_grouping)}. Excellent!`,
          primary_factor: 'consistency',
          secondary_factor: null,
          score: Math.min(100, 40 + Math.abs(z) * 10),
          tags: ['baseline', 'grouping', 'improvement'],
          insight_type: 'achievement',
          evidence: { z_score: Math.round(z * 100) / 100, session_grouping: features.dispersion_cm, baseline_grouping: baseline.avg_grouping },
        });
      }
    }

    // Absolute grouping thresholds
    if (features.dispersion_cm < 3) {
      insights.push({
        title: 'Excellent grouping',
        summary: `Dispersion of ${formatCm(features.dispersion_cm)} - very tight group!`,
        primary_factor: 'consistency',
        secondary_factor: null,
        score: 45,
        tags: ['grouping', 'dispersion', 'positive'],
        insight_type: 'achievement',
        evidence: { dispersion_cm: features.dispersion_cm },
      });
    } else if (features.dispersion_cm >= 8) {
      insights.push({
        title: 'Wide grouping',
        summary: `Dispersion of ${formatCm(features.dispersion_cm)}. Focus on consistent position and trigger control.`,
        primary_factor: 'consistency',
        secondary_factor: null,
        score: 35,
        tags: ['grouping', 'dispersion'],
        insight_type: 'grouping_regression',
        evidence: { dispersion_cm: features.dispersion_cm },
      });
    }
  }

  // Offset pattern detection
  if (features.target_type === 'paper') {
    const rightOffset = features.offset_right_cm ?? 0;
    const upOffset = features.offset_up_cm ?? 0;
    const threshold = 2.0;

    const directions: string[] = [];
    if (rightOffset >= threshold) directions.push('right');
    if (rightOffset <= -threshold) directions.push('left');
    if (upOffset >= threshold) directions.push('high');
    if (upOffset <= -threshold) directions.push('low');

    if (directions.length > 0) {
      const directionText = directions.join(' & ');
      insights.push({
        title: `Consistent ${directionText} offset`,
        summary: `Shots consistently hitting ${directionText}. Check zero or technique.`,
        primary_factor: 'zero',
        secondary_factor: Math.abs(rightOffset) >= threshold ? 'trigger' : null,
        score: 45 + Math.min(Math.abs(rightOffset), Math.abs(upOffset)) * 5,
        tags: ['offset', 'pattern', 'paper'],
        insight_type: 'offset_pattern',
        evidence: { offset_right_cm: rightOffset, offset_up_cm: upOffset, directions },
      });
    }
  }

  // Stress/fatigue correlation
  if (features.has_biometrics && features.stress_avg !== null && features.stress_avg >= 60) {
    const performanceDown = baseline && baseline.avg_accuracy !== null && features.accuracy_pct !== null && features.accuracy_pct < baseline.avg_accuracy;
    if (performanceDown || (features.optimal_shot_pct !== null && features.optimal_shot_pct < 30)) {
      insights.push({
        title: 'Stress impacted performance',
        summary: `Elevated stress (avg ${Math.round(features.stress_avg)}) likely affected accuracy.`,
        primary_factor: 'stress',
        secondary_factor: 'fatigue',
        score: 55 + (features.stress_avg - 60),
        tags: ['stress', 'fatigue', 'biometric'],
        insight_type: 'fatigue_correlation',
        evidence: { stress_avg: features.stress_avg, optimal_shot_pct: features.optimal_shot_pct },
      });
    } else {
      insights.push({
        title: 'Performed well under stress',
        summary: `Despite elevated stress (${Math.round(features.stress_avg)}), you maintained performance. Good mental control.`,
        primary_factor: 'consistency',
        secondary_factor: null,
        score: 35,
        tags: ['stress', 'mental', 'positive'],
        insight_type: 'achievement',
        evidence: { stress_avg: features.stress_avg },
      });
    }
  }

  // Flinch detection
  if (features.has_biometrics && features.flinch_count >= 2) {
    const flinchPct = features.shots > 0 ? Math.round((features.flinch_count / features.shots) * 100) : 0;
    if (flinchPct >= 20 || features.flinch_count >= 3) {
      insights.push({
        title: 'Flinch detected',
        summary: `${features.flinch_count} flinches detected (${flinchPct}% of shots). Focus on trigger control.`,
        primary_factor: 'trigger',
        secondary_factor: 'execution',
        score: 50 + flinchPct,
        tags: ['flinch', 'trigger', 'biometric'],
        insight_type: 'biometric_pattern',
        evidence: { flinch_count: features.flinch_count, flinch_pct: flinchPct },
      });
    }
  }

  // Building baseline message
  if (!baseline || baseline.n < 3) {
    const metricName = isGroupingGoal(features.drill_goal) ? 'grouping' : 'accuracy';
    insights.push({
      title: 'Building your baseline',
      summary: `${baseline?.n ?? 0}/3 similar sessions tracked. Keep training to unlock personalized ${metricName} insights.`,
      primary_factor: null,
      secondary_factor: null,
      score: 25,
      tags: ['baseline', 'onboarding', metricName],
      insight_type: 'summary',
      evidence: { sessions_have: baseline?.n ?? 0, drill_goal: features.drill_goal },
    });
  }

  // Session summary
  if (features.shots >= 5) {
    let summary = `${features.shots} shots fired`;
    if (isGroupingGoal(features.drill_goal) && features.dispersion_cm !== null) {
      summary += ` with ${formatCm(features.dispersion_cm)} average dispersion`;
    } else if (features.accuracy_pct !== null) {
      summary += ` with ${formatPct(features.accuracy_pct)} hit rate (${features.hits}/${features.shots})`;
    }
    insights.push({
      title: 'Session complete',
      summary: summary + '.',
      primary_factor: null,
      secondary_factor: null,
      score: 10,
      tags: ['summary'],
      insight_type: 'summary',
      evidence: { shots: features.shots, hits: features.hits, accuracy_pct: features.accuracy_pct },
    });
  }

  // Sort by score and limit to top 5
  return insights.sort((a, b) => b.score - a.score).slice(0, 5);
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
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Pinecone config
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeIndexHost = Deno.env.get('PINECONE_INDEX_HOST'); // e.g., reticle-sessions-xxx.svc.aped-xxx.pinecone.io

    // 1. Check if insights already exist (prevent duplicate generation)
    const { data: existingInsights } = await supabase
      .from('session_insights')
      .select('id')
      .eq('session_id', session_id)
      .limit(1);
    
    if (existingInsights && existingInsights.length > 0) {
      console.log('⏭️ Insights already exist for session, skipping generation');
      return new Response(JSON.stringify({ 
        success: true, 
        session_id,
        skipped: true,
        reason: 'insights_already_exist'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Get session features
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

    // 2b. Enrich features with weapon_name and position from session/drill_config
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
    
    // Add weapon_name to features
    const weaponName = (sessionData?.user_weapons as { name: string } | null)?.name || null;
    (features as Record<string, unknown>).weapon_name = weaponName;
    
    // Add position if missing from session_features
    if (!features.position) {
      const drillConfig = sessionData?.custom_drill_config as { position?: string } | null;
      const trainingDrill = sessionData?.training_drills as { position?: string } | null;
      const drillTemplate = sessionData?.drill_templates as { position?: string } | null;
      const position = drillConfig?.position || trainingDrill?.position || drillTemplate?.position || null;
      (features as Record<string, unknown>).position = position;
    }
    
    console.log('Enriched features - weapon:', weaponName, 'position:', features.position);

    // Baseline will come from Pinecone ONLY
    let baseline: UserBaseline | null = null;
    let baselineSource = 'none';

    // Generate text for embedding
    const sessionText = sessionToText(features);
    console.log('Session text:', sessionText);

    // Get Anthropic API key for LLM insights
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    // Pinecone operations (if configured)
    let pineconeStatus = 'not_configured';
    let similarSessionCount = 0;
    let similarSessions: Array<{ fields: Record<string, unknown>; score: number }> = [];
    
    if (pineconeApiKey && pineconeIndexHost) {
      try {
        // Upsert embedding
        await upsertToPinecone(features, sessionText, pineconeApiKey, pineconeIndexHost);
        pineconeStatus = 'upsert_success';
        console.log('✅ PINECONE: Upserted session embedding successfully');

        // Search for similar sessions - Pinecone is the ONLY baseline source
        console.log('🔍 PINECONE: Searching for similar sessions...');
        similarSessions = await findSimilarSessions(features, sessionText, pineconeApiKey, pineconeIndexHost);
        similarSessionCount = similarSessions.length;
        console.log(`🔍 PINECONE: Found ${similarSessionCount} similar sessions`);

        if (similarSessions.length >= 1) {
          const simBaseline = computeSimilarityBaseline(similarSessions);
          console.log('📊 PINECONE baseline computed:', JSON.stringify(simBaseline));
          
          if (simBaseline) {
            baseline = simBaseline;
            baselineSource = 'pinecone';
            pineconeStatus = 'baseline_from_pinecone';
            console.log('✅ PINECONE: Baseline ready:', {
              n: simBaseline.n,
              avg_accuracy: simBaseline.avg_accuracy,
              avg_grouping: simBaseline.avg_grouping,
            });
          }
        } else {
          console.log('⚠️ PINECONE: No similar sessions found yet (first session?)');
          pineconeStatus = 'no_similar_sessions';
        }
      } catch (pineconeError) {
        pineconeStatus = 'error';
        console.error('❌ PINECONE ERROR (non-fatal):', pineconeError);
        // Continue without Pinecone - use exact baseline only
      }
    } else {
      console.log('⚠️ Pinecone not configured, using exact baseline only');
    }
    
    console.log(`📋 BASELINE SOURCE: ${baselineSource} | PINECONE STATUS: ${pineconeStatus}`);

    // 5. Determine if LLM insights should be generated (cost optimization)
    let llmInsights: GeneratedInsight[] = [];
    const shouldUseLLM = await shouldGenerateLLMInsights(
      features, 
      baseline, 
      similarSessions.length,
      supabase
    );
    
    if (anthropicApiKey && shouldUseLLM.generate) {
      console.log(`🤖 Generating LLM insights (reason: ${shouldUseLLM.reason})`);
      llmInsights = await generateLLMInsights(features, similarSessions, anthropicApiKey);
      console.log(`Generated ${llmInsights.length} LLM insights`);
    } else {
      console.log(`⏭️ Skipping LLM (reason: ${shouldUseLLM.reason})`);
    }
    
    // 6. Generate basic insights (baseline comparison) - as fallback/supplement
    const basicInsights = generateInsights(features, baseline);
    console.log(`Generated ${basicInsights.length} basic insights`);
    
    // Combine insights - LLM decides what's worth showing
    // If LLM returned insights, use only those (LLM already filtered for quality)
    // If LLM returned empty (routine session), use 1 basic insight as fallback
    let insights: GeneratedInsight[];
    if (llmInsights.length > 0) {
      insights = llmInsights; // Trust LLM's judgment
    } else if (shouldUseLLM.generate && anthropicApiKey) {
      // LLM ran but returned nothing = routine session, skip insights
      insights = [];
      console.log('LLM found nothing notable - no insights for this session');
    } else {
      // LLM didn't run (no API key or routine session) - use 1 basic insight
      insights = basicInsights.slice(0, 1);
    }
    console.log(`Total insights: ${insights.length}`);

    // 7. Save insights to database
    if (insights.length > 0) {
      const insightRows = insights.map((insight) => ({
        session_id,
        user_id: features.user_id,
        title: insight.title,
        summary: insight.summary,
        primary_factor: insight.primary_factor,
        secondary_factor: insight.secondary_factor,
        score: insight.score,
        tags: insight.tags,
        insight_type: insight.insight_type,
        evidence: insight.evidence,
      }));

      const { error: insertError } = await supabase
        .from('session_insights')
        .upsert(insightRows, { onConflict: 'session_id,user_id,title' });

      if (insertError) {
        console.error('Failed to save insights:', insertError);
      }
    }

    // 8. Refresh user baseline
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
        baseline_source: baselineSource,
        pinecone_status: pineconeStatus,
        similar_sessions_found: similarSessionCount,
        llm_used: shouldUseLLM.generate,
        llm_reason: shouldUseLLM.reason,
        insights_generated: insights.length,
        insights: insights.map((i) => ({ title: i.title, type: i.insight_type, score: i.score })),
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
