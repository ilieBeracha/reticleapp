/**
 * Supabase Edge Function: Generate Insights
 * 
 * REFACTORED to comply with AI Context Contract.
 * 
 * CORE PRINCIPLE:
 * "Deterministic engine decides. AI explains and contextualizes."
 * 
 * This function NEVER:
 * - Decides strengths, weaknesses, or trends
 * - Overrides thresholds or baselines
 * - Invents metrics or evidence
 * 
 * This function ONLY:
 * - Stores session embeddings in Pinecone
 * - Finds similar sessions for context
 * - Generates explanations for ALREADY-DECIDED insights
 * - Provides non-authoritative daily tips (clearly labeled)
 * 
 * Modes:
 * 1. session: Upserts session embedding to Pinecone (no decision making)
 * 2. explain_insight: Explains a decided insight (contract-compliant)
 * 3. daily_tip: Non-authoritative motivational tip
 * 4. chat: Answer questions with guardrails
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CONTRACT TYPES (mirrored from ai-context.contract.ts)
// ============================================================================

type InsightCategory = 'strength' | 'weakness' | 'trend' | 'anomaly' | 'recommendation';
type MetricType = 'accuracy' | 'grouping' | 'consistency' | 'time' | 'stress';
type MetricDirection = 'up' | 'down' | 'stable';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface AIContextRequest {
  request_id: string;
  user_id: string;
  insight_type: InsightCategory;
  metric_type: MetricType;
  decided_values: {
    current_value: number;
    baseline_value: number;
    delta: number;
    is_significant: boolean;
    direction: MetricDirection;
    confidence: ConfidenceLevel;
    data_points: number;
    unit: '%' | 'cm' | 's' | '';
  };
  context: {
    filters_applied: Record<string, string | undefined>;
    evidence_session_ids: string[];
    category_label?: string;
    engine_context?: string;
  };
  response_type: 'explanation' | 'similar_patterns' | 'widget_summary' | 'tip';
}

interface AIExplanation {
  text: string;
  possible_factors?: string[];
  considerations?: string[];
}

interface AISimilarPattern {
  session_count: number;
  time_range?: string;
  common_factors?: string[];
  similarity_score?: number;
}

interface AIContextResponse {
  request_id: string;
  success: boolean;
  error?: string;
  explanation?: AIExplanation;
  similar_patterns?: AISimilarPattern[];
  confidence_note?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

type GuardrailRule =
  | 'NO_DIRECTION_CONTRADICTION'
  | 'NO_SIGNIFICANCE_OVERRIDE'
  | 'NO_METRIC_INVENTION'
  | 'NO_DIRECTIVE_LANGUAGE'
  | 'MUST_REFERENCE_EVIDENCE'
  | 'NO_NUMERIC_CLAIMS'
  | 'NO_RANKING_CLAIMS';

interface AIViolation {
  rule: GuardrailRule;
  message: string;
  severity: 'error' | 'warning';
}

interface AIResponseValidation {
  is_valid: boolean;
  violations: AIViolation[];
}

// ============================================================================
// GUARDRAIL VALIDATION
// ============================================================================

function validateAIResponse(
  request: AIContextRequest,
  response: AIContextResponse
): AIResponseValidation {
  const violations: AIViolation[] = [];
  
  if (!response.success || !response.explanation) {
    return { is_valid: true, violations: [] };
  }
  
  const text = response.explanation.text.toLowerCase();
  const { decided_values, metric_type } = request;
  
  // Rule: NO_DIRECTION_CONTRADICTION
  if (decided_values.direction === 'down' || decided_values.delta < 0) {
    if (text.includes('improving') || text.includes('increased') || text.includes('better')) {
      // Exception: for grouping, "decreased" dispersion IS improvement
      if (metric_type !== 'grouping') {
        violations.push({
          rule: 'NO_DIRECTION_CONTRADICTION',
          message: `AI said "improving" but direction is ${decided_values.direction}`,
          severity: 'error',
        });
      }
    }
  }
  
  if (decided_values.direction === 'up' || decided_values.delta > 0) {
    if (text.includes('declining') || text.includes('decreased') || text.includes('worse')) {
      if (metric_type !== 'grouping') {
        violations.push({
          rule: 'NO_DIRECTION_CONTRADICTION',
          message: `AI said "declining" but direction is ${decided_values.direction}`,
          severity: 'error',
        });
      }
    }
  }
  
  // Rule: NO_SIGNIFICANCE_OVERRIDE
  if (!decided_values.is_significant) {
    if (text.includes('significant') || text.includes('major') || text.includes('substantial')) {
      violations.push({
        rule: 'NO_SIGNIFICANCE_OVERRIDE',
        message: 'AI claimed significance but is_significant is false',
        severity: 'error',
      });
    }
  }
  
  // Rule: NO_DIRECTIVE_LANGUAGE
  const directiveWords = ['you should', 'you must', 'you need to', 'do this', 'stop doing'];
  for (const directive of directiveWords) {
    if (text.includes(directive)) {
      violations.push({
        rule: 'NO_DIRECTIVE_LANGUAGE',
        message: `AI used directive language: "${directive}"`,
        severity: 'warning',
      });
    }
  }
  
  // Rule: NO_RANKING_CLAIMS
  const rankingWords = ['best', 'worst', 'most important', 'top priority', 'main weakness'];
  for (const ranking of rankingWords) {
    if (text.includes(ranking)) {
      violations.push({
        rule: 'NO_RANKING_CLAIMS',
        message: `AI made ranking claim: "${ranking}"`,
        severity: 'warning',
      });
    }
  }
  
  return {
    is_valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

function createFallbackResponse(request_id: string, reason: string): AIContextResponse {
  return {
    request_id,
    success: false,
    error: reason,
    explanation: {
      text: 'A change was detected based on your recent performance data.',
      possible_factors: [],
      considerations: [],
    },
    confidence_note: 'Explanation unavailable due to validation constraints.',
  };
}

// ============================================================================
// SESSION TYPES (for Pinecone)
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

// ============================================================================
// EXPLAIN INSIGHT (CONTRACT-COMPLIANT)
// ============================================================================

/**
 * Generates an AI explanation for an ALREADY-DECIDED insight.
 * 
 * This function:
 * - Receives decided values from the Insights Engine
 * - Builds a constrained prompt
 * - Validates AI output against guardrails
 * - Returns a compliant AIContextResponse
 */
async function explainInsight(
  request: AIContextRequest,
  pineconeApiKey: string | undefined,
  pineconeIndexHost: string | undefined,
  anthropicApiKey: string
): Promise<AIContextResponse> {
  const { decided_values, context, metric_type, insight_type } = request;
  
  // Build similarity context if Pinecone is available
  let similarityContext = '';
  let similarPatterns: AISimilarPattern[] = [];
  
  if (pineconeApiKey && pineconeIndexHost && context.evidence_session_ids.length > 0) {
    try {
      // Query for similar sessions
      const queryText = `${metric_type} ${insight_type} ${context.category_label || ''}`;
      const queryEmbedding = await generateEmbedding(queryText, pineconeApiKey);
      
      const response = await fetch(`https://${pineconeIndexHost}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': pineconeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: `user_${request.user_id}`,
          vector: queryEmbedding,
          topK: 10,
          includeMetadata: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const matches = data.matches || [];
        
        if (matches.length > 0) {
          const positions = matches.map((m: { metadata?: { position?: string } }) => m.metadata?.position).filter(Boolean);
          const distances = matches.map((m: { metadata?: { distance_m?: number } }) => m.metadata?.distance_m).filter(Boolean);
          
          const positionCounts: Record<string, number> = {};
          positions.forEach((p: string) => { positionCounts[p] = (positionCounts[p] || 0) + 1; });
          const commonPositions = Object.entries(positionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([pos]) => pos);
          
          similarPatterns.push({
            session_count: matches.length,
            common_factors: commonPositions.length > 0 ? [`Common position: ${commonPositions.join(', ')}`] : undefined,
            similarity_score: matches[0]?.score,
          });
          
          similarityContext = `\nSimilar sessions found: ${matches.length}`;
          if (commonPositions.length > 0) {
            similarityContext += `\nCommon positions in similar sessions: ${commonPositions.join(', ')}`;
          }
          if (distances.length > 0) {
            const avgDist = distances.reduce((a: number, b: number) => a + b, 0) / distances.length;
            similarityContext += `\nAverage distance in similar sessions: ${Math.round(avgDist)}m`;
          }
        }
      }
    } catch (e) {
      console.error('Pinecone similarity query failed:', e);
    }
  }
  
  // Build the constrained prompt
  const directionWord = metric_type === 'grouping'
    ? (decided_values.delta < 0 ? 'tighter (improved)' : 'wider (declined)')
    : (decided_values.direction === 'up' ? 'increased' : decided_values.direction === 'down' ? 'decreased' : 'stable');
  
  const prompt = `You are a shooting performance analyst. Your role is ONLY to explain patterns, NEVER to advise.

DECIDED VALUES (these are FINAL and AUTHORITATIVE - do NOT contradict):
- Metric: ${metric_type}
- Current value: ${decided_values.current_value}${decided_values.unit}
- Baseline value: ${decided_values.baseline_value}${decided_values.unit}
- Change: ${decided_values.delta > 0 ? '+' : ''}${decided_values.delta}${decided_values.unit} (${directionWord})
- Is significant: ${decided_values.is_significant ? 'YES' : 'NO'}
- Confidence: ${decided_values.confidence}
- Data points: ${decided_values.data_points} sessions
- Category: ${context.category_label || 'General'}

${context.engine_context ? `Additional context: ${context.engine_context}` : ''}
${similarityContext}

FILTERS APPLIED: ${Object.entries(context.filters_applied).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

Your task:
1. Explain what this ${decided_values.is_significant ? 'significant ' : ''}change means in practical terms
2. Suggest 2-3 POSSIBLE contributing factors (phrase as possibilities, not facts)
3. Mention what the shooter might consider (not "should" or "must")

RULES:
- Do NOT say "improving" if direction is declining
- Do NOT say "significant" if is_significant is NO
- Do NOT use "should", "must", "need to"
- Do NOT rank importance or say "best", "worst", "main"
- Reference the actual numbers provided

Respond ONLY with valid JSON:
{
  "text": "One clear explanation paragraph (max 50 words)",
  "possible_factors": ["Factor 1", "Factor 2"],
  "considerations": ["Something to consider"]
}`;

  try {
    console.log('📤 Calling Claude API...');
    
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
      const errorText = await response.text();
      console.error('❌ Claude API error:', response.status, errorText);
      return createFallbackResponse(request.request_id, 'AI service error');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    console.log('📥 Claude response received, length:', content.length);
    
    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Could not parse JSON from Claude response');
      return createFallbackResponse(request.request_id, 'Invalid AI response format');
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as AIExplanation;
    
    console.log('✅ Parsed explanation:', parsed.text?.slice(0, 50) + '...');
    
    // Build response
    const aiResponse: AIContextResponse = {
      request_id: request.request_id,
      success: true,
      explanation: {
        text: parsed.text || '',
        possible_factors: parsed.possible_factors || [],
        considerations: parsed.considerations || [],
      },
      similar_patterns: similarPatterns.length > 0 ? similarPatterns : undefined,
      confidence_note: `Based on ${decided_values.data_points} sessions${similarPatterns.length > 0 ? ` and ${similarPatterns[0].session_count} similar patterns` : ''}`,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
    
    // VALIDATE against guardrails
    const validation = validateAIResponse(request, aiResponse);
    
    if (!validation.is_valid) {
      console.warn('⚠️ AI response failed guardrails:', validation.violations);
      return createFallbackResponse(request.request_id, `Guardrail violation: ${validation.violations[0].message}`);
    }
    
    if (validation.violations.length > 0) {
      console.warn('⚠️ AI response has warnings:', validation.violations);
    }
    
    console.log('✅ Explanation ready, returning response');
    return aiResponse;
    
  } catch (error) {
    console.error('❌ explainInsight error:', error);
    return createFallbackResponse(request.request_id, 'Explanation generation failed');
  }
}

// ============================================================================
// DAILY TIP (NON-AUTHORITATIVE)
// ============================================================================

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

interface DailyTipResult {
  title: string;
  content: string;
  category: 'technique' | 'fundamentals' | 'mental' | 'training';
  personalized: boolean;
  /** Clearly labeled as non-authoritative */
  disclaimer: string;
}

async function generateDailyTip(
  userId: string,
  userStats: { streak: number; accuracy: number; sessions_this_week: number; total_sessions: number },
  pineconeApiKey: string | undefined,
  pineconeIndexHost: string | undefined,
  anthropicApiKey: string
): Promise<DailyTipResult> {
  
  // Build context from Pinecone (for personalization only, not decisions)
  let sessionContext = '';
  
  if (pineconeApiKey && pineconeIndexHost) {
    try {
      const queryText = 'recent shooting session performance';
      const queryEmbedding = await generateEmbedding(queryText, pineconeApiKey);
      
      const response = await fetch(`https://${pineconeIndexHost}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': pineconeApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: `user_${userId}`,
          vector: queryEmbedding,
          topK: 10,
          includeMetadata: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const matches = data.matches || [];
        
        if (matches.length > 0) {
          const texts = matches
            .slice(0, 3)
            .map((m: { metadata?: { text?: string } }) => m.metadata?.text)
            .filter(Boolean);
          sessionContext = `Recent session patterns: ${texts.join('; ')}`;
        }
      }
    } catch (e) {
      console.error('Pinecone query for tip failed:', e);
    }
  }

  const prompt = `Generate a SHORT daily training tip for a shooter.

User stats:
- Streak: ${userStats.streak} days
- Average accuracy: ${userStats.accuracy}%
- Sessions this week: ${userStats.sessions_this_week}
- Total sessions: ${userStats.total_sessions}

${sessionContext ? `Context: ${sessionContext}` : ''}

Generate ONE general training tip. This is motivational content, NOT analysis.

Rules:
- Keep it general and encouraging
- Max 2 sentences
- Focus on fundamentals

Respond with JSON:
{
  "title": "3-5 word title",
  "content": "1-2 sentence tip",
  "category": "technique" | "fundamentals" | "mental" | "training"
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
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error('Claude API failed');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        title: string;
        content: string;
        category: 'technique' | 'fundamentals' | 'mental' | 'training';
      };
      
      return {
        title: parsed.title || 'Training Tip',
        content: parsed.content || 'Focus on your fundamentals today.',
        category: parsed.category || 'training',
        personalized: sessionContext.length > 0,
        disclaimer: 'This is a general tip, not personalized analysis.',
      };
    }
  } catch (error) {
    console.error('generateDailyTip error:', error);
  }

  // Fallback
  return getFallbackTip(userStats);
}

function getFallbackTip(stats: { streak: number; accuracy: number; sessions_this_week: number }): DailyTipResult {
  const tips: DailyTipResult[] = [
    {
      title: 'Breathing Control',
      content: 'Take a deep breath, hold at the natural pause, then squeeze. Consistent breathing improves groupings.',
      category: 'technique',
      personalized: false,
      disclaimer: 'This is a general tip, not personalized analysis.',
    },
    {
      title: 'Trigger Press',
      content: 'Focus on pressing straight back. Let the shot surprise you.',
      category: 'technique',
      personalized: false,
      disclaimer: 'This is a general tip, not personalized analysis.',
    },
    {
      title: 'Mental Focus',
      content: 'Visualize each shot before taking it. See the bullet hitting the target.',
      category: 'mental',
      personalized: false,
      disclaimer: 'This is a general tip, not personalized analysis.',
    },
    {
      title: 'Deliberate Practice',
      content: 'Quality over quantity. 50 focused rounds beat 200 rushed ones.',
      category: 'training',
      personalized: false,
      disclaimer: 'This is a general tip, not personalized analysis.',
    },
  ];
  
  // Simple selection based on stats
  if (stats.streak >= 5) return tips[2]; // Mental focus for consistent users
  if (stats.accuracy < 50) return tips[1]; // Trigger press for low accuracy
  if (stats.sessions_this_week === 0) return tips[3]; // Deliberate practice
  return tips[0]; // Default breathing
}

// ============================================================================
// CHAT WITH GUARDRAILS
// ============================================================================

interface ChatRequest {
  mode: 'chat';
  user_id: string;
  question: string;
  /** DECIDED context from the Insights Engine - AI cannot contradict */
  decided_context: {
    accuracy?: { current: number; baseline: number; delta: number; direction: MetricDirection };
    grouping?: { current: number; baseline: number; delta: number };
    position_breakdown?: Array<{ label: string; current: number; delta: number }>;
    distance_breakdown?: Array<{ label: string; current: number; delta: number }>;
  };
}

async function handleChat(
  request: ChatRequest,
  anthropicApiKey: string
): Promise<{ answer: string; guardrail_warnings?: string[] }> {
  const { question, decided_context } = request;
  
  // Build context string from DECIDED values
  const contextStr = `
DECIDED PERFORMANCE DATA (these are authoritative - do not contradict):

${decided_context.accuracy ? `Accuracy:
- Current: ${decided_context.accuracy.current}%
- Baseline: ${decided_context.accuracy.baseline}%
- Change: ${decided_context.accuracy.delta > 0 ? '+' : ''}${decided_context.accuracy.delta}%
- Direction: ${decided_context.accuracy.direction}` : 'Accuracy: No data'}

${decided_context.grouping ? `Grouping:
- Current: ${decided_context.grouping.current}cm
- Baseline: ${decided_context.grouping.baseline}cm
- Change: ${decided_context.grouping.delta > 0 ? '+' : ''}${decided_context.grouping.delta}cm` : 'Grouping: No data'}

${decided_context.position_breakdown?.length ? `Position breakdown:
${decided_context.position_breakdown.map(p => `- ${p.label}: ${p.current}% (${p.delta > 0 ? '+' : ''}${p.delta}%)`).join('\n')}` : ''}

${decided_context.distance_breakdown?.length ? `Distance breakdown:
${decided_context.distance_breakdown.map(d => `- ${d.label}: ${d.current}% (${d.delta > 0 ? '+' : ''}${d.delta}%)`).join('\n')}` : ''}
`;

  const prompt = `You are answering a question about shooting performance data.

${contextStr}

User's question: "${question}"

RULES:
- Be concise (2-3 sentences max)
- Reference the data above
- Do NOT contradict the decided values
- If accuracy is declining, do not say it's improving
- If you don't have data, say so
- Do NOT give training advice unless asked

Answer:`;

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return { answer: 'I couldn\'t process that question. Please try again.' };
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text || 'I couldn\'t generate an answer.';
    
    // Simple guardrail check on answer
    const warnings: string[] = [];
    const answerLower = answer.toLowerCase();
    
    if (decided_context.accuracy?.direction === 'down') {
      if (answerLower.includes('improving') || answerLower.includes('increased')) {
        warnings.push('Answer may contradict accuracy direction');
      }
    }
    
    return { answer, guardrail_warnings: warnings.length > 0 ? warnings : undefined };
    
  } catch (error) {
    console.error('Chat error:', error);
    return { answer: 'I couldn\'t process that question.' };
  }
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

interface SessionRequest {
  mode?: 'session';
  session_id: string;
}

interface ExplainInsightRequest {
  mode: 'explain_insight';
  request: AIContextRequest;
}

type InsightRequest = 
  | SessionRequest 
  | ExplainInsightRequest 
  | DailyTipRequest 
  | ChatRequest;

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
    // MODE: EXPLAIN INSIGHT (contract-compliant AI explanation)
    // ========================================================================
    if ('mode' in body && body.mode === 'explain_insight') {
      const { request: aiRequest } = body as ExplainInsightRequest;
      
      if (!aiRequest || !aiRequest.decided_values) {
        return new Response(JSON.stringify({ 
          error: 'AIContextRequest with decided_values required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      if (!anthropicApiKey) {
        return new Response(JSON.stringify(
          createFallbackResponse(aiRequest.request_id, 'AI service not configured')
        ), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`🤖 Explain insight: ${aiRequest.insight_type} - ${aiRequest.metric_type}`);
      
      const response = await explainInsight(
        aiRequest,
        pineconeApiKey,
        pineconeIndexHost,
        anthropicApiKey
      );
      
      console.log(`📤 Returning response, success: ${response.success}`);
      
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: DAILY TIP (non-authoritative)
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
      
      if (!anthropicApiKey) {
        const fallbackTip = getFallbackTip(user_stats || { streak: 0, accuracy: 0, sessions_this_week: 0 });
        return new Response(JSON.stringify({ success: true, tip: fallbackTip }), {
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
      
      return new Response(JSON.stringify({ success: true, tip }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: CHAT (with guardrails)
    // ========================================================================
    if ('mode' in body && body.mode === 'chat') {
      const chatRequest = body as ChatRequest;
      
      if (!chatRequest.user_id || !chatRequest.question) {
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
      
      console.log(`💬 Chat: ${chatRequest.question.slice(0, 50)}...`);
      
      const result = await handleChat(chatRequest, anthropicApiKey);
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // MODE: SESSION (Pinecone upsert only - NO decision making)
    // ========================================================================
    const { session_id } = body as SessionRequest;

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

    // 4. Upsert to Pinecone (this is pure storage, no decisions)
    let pineconeStatus = 'not_configured';
    let similarSessionsCount = 0;
    
    if (pineconeApiKey && pineconeIndexHost) {
      try {
        await upsertToPinecone(features, sessionText, pineconeApiKey, pineconeIndexHost);
        pineconeStatus = 'upsert_success';
        console.log('✅ PINECONE: Upserted session embedding');

        // Find similar sessions (for context only, returned to client)
        const similarSessions = await findSimilarSessions(features, sessionText, pineconeApiKey, pineconeIndexHost);
        similarSessionsCount = similarSessions.length;
        console.log(`🔍 PINECONE: Found ${similarSessionsCount} similar sessions`);
        
      } catch (pineconeError) {
        pineconeStatus = 'error';
        console.error('❌ PINECONE ERROR:', pineconeError);
      }
    }

    // 5. Refresh user baseline (this is a database operation, not AI decision)
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

    // NOTE: Anomaly detection has been REMOVED from this function.
    // The Insights Engine (insights.engine.ts) is now the sole authority
    // for detecting anomalies, strengths, weaknesses, and trends.
    // 
    // If the client wants AI explanation of an anomaly:
    // 1. Engine detects anomaly and computes decided_values
    // 2. Client calls mode: 'explain_insight' with AIContextRequest
    // 3. This function generates explanation with guardrails

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        pinecone_status: pineconeStatus,
        similar_sessions_found: similarSessionsCount,
        // Removed: anomaly_detected, anomaly_type, insights_generated
        // These are now computed by the Insights Engine
        note: 'Session indexed. Use mode: explain_insight with decided values for AI explanation.',
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
