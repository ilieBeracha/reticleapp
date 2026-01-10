/**
 * Performance Analysis Sheet
 * 
 * Unified analysis view for all performance metrics.
 * Shows what changed and why, with optional chat to ask questions.
 */

import {
  MIN_BASELINE_SESSIONS,
  RECENT_SESSION_COUNT,
  detectAccuracyChange,
  detectGroupingChange,
  getConfidence,
  type ConfidenceLevel,
} from '@/components/insights/changeRules';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

type AnalysisTab = 'accuracy' | 'grouping' | 'distance' | 'position';

interface MetricAnalysis {
  current: number;
  baseline: number;
  delta: number;
  direction: 'up' | 'down' | 'stable';
  isSignificant: boolean;
  recentShots: number;
  baselineShots: number;
  recentSessions: number;
  baselineSessions: number;
  confidence: ConfidenceLevel;
}

interface QuickInsight {
  question: string;
  answer: string | null;
  loading: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalysisSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('accuracy');
  
  // Quick insights state
  const [quickInsight, setQuickInsight] = useState<QuickInsight | null>(null);

  // Load sessions
  useEffect(() => {
    async function load() {
      try {
        const data = await getRecentSessionsWithStats({ days: 365, limit: 200 });
        setSessions(data);
      } catch (e) {
        console.error('Failed to load sessions:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute analysis for each metric
  const analysis = useMemo(() => {
    if (sessions.length < MIN_BASELINE_SESSIONS + RECENT_SESSION_COUNT) {
      return null;
    }

    const sorted = [...sessions].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    
    const recent = sorted.slice(0, RECENT_SESSION_COUNT);
    const baseline = sorted.slice(RECENT_SESSION_COUNT);

    // Helper to compute stats
    const computeStats = (list: SessionWithDetails[]) => {
      let shots = 0, hits = 0, dispersions: number[] = [];
      list.forEach(s => {
        if (s.stats) {
          shots += s.stats.shots_fired;
          hits += s.stats.hits_total;
          if (s.stats.best_dispersion_cm != null) {
            dispersions.push(s.stats.best_dispersion_cm);
          }
        }
      });
      return {
        sessions: list.length,
        shots,
        accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
        grouping: dispersions.length > 0 
          ? Math.round((dispersions.reduce((a, b) => a + b, 0) / dispersions.length) * 10) / 10 
          : null,
      };
    };

    const recentStats = computeStats(recent);
    const baselineStats = computeStats(baseline);

    // Accuracy analysis
    const accChange = detectAccuracyChange(recentStats.accuracy, baselineStats.accuracy);
    const accuracyAnalysis: MetricAnalysis = {
      current: recentStats.accuracy,
      baseline: baselineStats.accuracy,
      delta: accChange.delta,
      direction: accChange.direction,
      isSignificant: accChange.isSignificant,
      recentShots: recentStats.shots,
      baselineShots: baselineStats.shots,
      recentSessions: recentStats.sessions,
      baselineSessions: baselineStats.sessions,
      confidence: getConfidence(recentStats.shots, recentStats.sessions),
    };

    // Grouping analysis
    let groupingAnalysis: MetricAnalysis | null = null;
    if (recentStats.grouping != null && baselineStats.grouping != null) {
      const grpChange = detectGroupingChange(recentStats.grouping, baselineStats.grouping);
      groupingAnalysis = {
        current: recentStats.grouping,
        baseline: baselineStats.grouping,
        delta: grpChange.delta,
        direction: grpChange.direction,
        isSignificant: grpChange.isSignificant,
        recentShots: recentStats.shots,
        baselineShots: baselineStats.shots,
        recentSessions: recentStats.sessions,
        baselineSessions: baselineStats.sessions,
        confidence: getConfidence(recentStats.shots, recentStats.sessions),
      };
    }

    // Distance breakdown
    const computeDistanceStats = (list: SessionWithDetails[], filter: (d: number) => boolean) => {
      let shots = 0, hits = 0;
      list.forEach(s => {
        if (s.stats?.avg_distance_m && filter(s.stats.avg_distance_m)) {
          shots += s.stats.shots_fired;
          hits += s.stats.hits_total;
        }
      });
      return { shots, accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0 };
    };

    const distanceRanges = [
      { key: 'close', label: '≤15m', filter: (d: number) => d <= 15 },
      { key: 'medium', label: '15-25m', filter: (d: number) => d > 15 && d <= 25 },
      { key: 'long', label: '25m+', filter: (d: number) => d > 25 },
    ];

    const distanceAnalysis = distanceRanges.map(({ key, label, filter }) => {
      const recentDist = computeDistanceStats(recent, filter);
      const baselineDist = computeDistanceStats(baseline, filter);
      const change = detectAccuracyChange(recentDist.accuracy, baselineDist.accuracy);
      return {
        key,
        label,
        current: recentDist.accuracy,
        baseline: baselineDist.accuracy,
        delta: change.delta,
        direction: change.direction,
        isSignificant: change.isSignificant,
        shots: recentDist.shots,
      };
    }).filter(d => d.shots > 0);

    // Position breakdown - position is in drill_config.position
    const computePositionStats = (list: SessionWithDetails[], position: string) => {
      let shots = 0, hits = 0;
      list.forEach(s => {
        const pos = s.drill_config?.position;
        if (pos?.toLowerCase() === position.toLowerCase()) {
          if (s.stats) {
            shots += s.stats.shots_fired;
            hits += s.stats.hits_total;
          }
        }
      });
      return { shots, accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0 };
    };

    const positions = ['prone', 'standing', 'kneeling', 'sitting'];
    const positionAnalysis = positions.map(pos => {
      const recentPos = computePositionStats(recent, pos);
      const baselinePos = computePositionStats(baseline, pos);
      const change = detectAccuracyChange(recentPos.accuracy, baselinePos.accuracy);
      return {
        key: pos,
        label: pos.charAt(0).toUpperCase() + pos.slice(1),
        current: recentPos.accuracy,
        baseline: baselinePos.accuracy,
        delta: change.delta,
        direction: change.direction,
        isSignificant: change.isSignificant,
        shots: recentPos.shots,
      };
    }).filter(p => p.shots > 0);

    return {
      accuracy: accuracyAnalysis,
      grouping: groupingAnalysis,
      distance: distanceAnalysis,
      position: positionAnalysis,
      meta: {
        recentSessions: recent.length,
        baselineSessions: baseline.length,
        totalSessions: sessions.length,
      },
    };
  }, [sessions]);

  // Generate contextual quick questions based on data
  const quickQuestions = useMemo(() => {
    if (!analysis) return [];
    
    const questions: string[] = [];
    
    // Check for drops
    const drops = analysis.distance.filter(d => d.isSignificant && d.direction === 'down');
    if (drops.length > 0) {
      questions.push(`Why did my ${drops[0].label} accuracy drop?`);
    }
    
    // Check for improvements
    const improvements = analysis.distance.filter(d => d.isSignificant && d.direction === 'up');
    if (improvements.length > 0) {
      questions.push(`What improved my ${improvements[0].label} performance?`);
    }
    
    // Overall accuracy question
    if (analysis.accuracy.isSignificant) {
      questions.push(analysis.accuracy.direction === 'up' 
        ? 'What factors improved my accuracy?'
        : 'What might be affecting my accuracy?'
      );
    }
    
    // Strongest/weakest
    if (analysis.distance.length > 1) {
      const sorted = [...analysis.distance].sort((a, b) => b.current - a.current);
      questions.push(`Why am I best at ${sorted[0].label}?`);
    }
    
    // Generic questions if no specific ones
    if (questions.length === 0) {
      questions.push('How is my overall performance?');
      questions.push('What should I focus on?');
    }
    
    return questions.slice(0, 3); // Max 3 questions
  }, [analysis]);

  // Quick question handler
  const handleQuickQuestion = useCallback(async (question: string) => {
    if (!analysis || quickInsight?.loading) return;

    setQuickInsight({ question, answer: null, loading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          mode: 'chat',
          user_id: user.id,
          question,
          context: {
            accuracy: analysis.accuracy,
            grouping: analysis.grouping,
            distance: analysis.distance,
            position: analysis.position,
          },
        },
      });

      if (error) throw error;

      setQuickInsight({ 
        question, 
        answer: data?.answer || 'Unable to analyze this right now.', 
        loading: false 
      });
    } catch (e) {
      console.error('Quick insight error:', e);
      setQuickInsight({ 
        question, 
        answer: 'Something went wrong. Please try again.', 
        loading: false 
      });
    }
  }, [analysis, quickInsight?.loading]);

  // Render content based on active tab
  const renderTabContent = () => {
    if (!analysis) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: colors.textMuted }]}>
            Need at least {MIN_BASELINE_SESSIONS + RECENT_SESSION_COUNT} sessions for analysis
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'accuracy':
        return <MetricSection metric={analysis.accuracy} label="Accuracy" unit="%" colors={colors} />;
      case 'grouping':
        return analysis.grouping 
          ? <MetricSection metric={analysis.grouping} label="Grouping" unit="cm" colors={colors} invertedGood />
          : <NoDataForTab colors={colors} />;
      case 'distance':
        return <BreakdownSection items={analysis.distance} label="Distance" colors={colors} />;
      case 'position':
        return analysis.position.length > 0
          ? <BreakdownSection items={analysis.position} label="Position" colors={colors} />
          : <NoDataForTab colors={colors} />;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.background }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Performance Analysis</Text>
        <View style={styles.closeBtnPlaceholder} />
      </View>

      {/* Scope info */}
      {analysis && (
        <Text style={[styles.scopeText, { color: colors.textMuted }]}>
          Comparing last {analysis.meta.recentSessions} sessions vs previous {analysis.meta.baselineSessions}
        </Text>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['accuracy', 'grouping', 'distance', 'position'] as AnalysisTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? '#fff' : colors.textMuted }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Quick Insights Section */}
      {analysis && quickQuestions.length > 0 && (
        <View style={styles.quickInsightsSection}>
          <Text style={[styles.quickInsightsTitle, { color: colors.textMuted }]}>
            QUICK INSIGHTS
          </Text>
          
          {/* Quick question buttons */}
          <View style={styles.quickQuestions}>
            {quickQuestions.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.quickQuestionBtn,
                  { 
                    backgroundColor: quickInsight?.question === q ? colors.primary : colors.background,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleQuickQuestion(q)}
                disabled={quickInsight?.loading}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.quickQuestionText,
                  { color: quickInsight?.question === q ? '#fff' : colors.text }
                ]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Answer card */}
          {quickInsight && (
            <View style={[styles.answerCard, { backgroundColor: colors.background }]}>
              {quickInsight.loading ? (
                <View style={styles.answerLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.answerLoadingText, { color: colors.textMuted }]}>
                    Analyzing...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.answerQuestion, { color: colors.textMuted }]}>
                    {quickInsight.question}
                  </Text>
                  <Text style={[styles.answerText, { color: colors.text }]}>
                    {quickInsight.answer}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MetricSection({ 
  metric, 
  label, 
  unit, 
  colors,
  invertedGood = false,
}: { 
  metric: MetricAnalysis; 
  label: string; 
  unit: string; 
  colors: ReturnType<typeof useColors>;
  invertedGood?: boolean;
}) {
  const deltaColor = metric.direction === 'stable' 
    ? colors.textMuted 
    : (invertedGood ? metric.direction === 'down' : metric.direction === 'up') 
      ? colors.green 
      : colors.red;

  return (
    <View style={styles.metricSection}>
      {/* Main stat */}
      <View style={styles.metricMain}>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          {metric.current}{unit}
        </Text>
        {metric.isSignificant ? (
          <View style={[styles.deltaBadge, { backgroundColor: `${deltaColor}15` }]}>
            <Ionicons
              name={metric.direction === 'up' ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={deltaColor}
            />
            <Text style={[styles.deltaText, { color: deltaColor }]}>
              {Math.abs(metric.delta)}{unit}
            </Text>
          </View>
        ) : (
          <Text style={[styles.stableText, { color: colors.textMuted }]}>stable</Text>
        )}
      </View>

      {/* Context */}
      <Text style={[styles.metricContext, { color: colors.textMuted }]}>
        Baseline: {metric.baseline}{unit} • {metric.recentShots} shots • Confidence: {metric.confidence}
      </Text>

      {/* What's happening */}
      <View style={[styles.explanationCard, { backgroundColor: colors.background }]}>
        <Text style={[styles.explanationLabel, { color: colors.textMuted }]}>What's happening</Text>
        <Text style={[styles.explanationText, { color: colors.text }]}>
          {metric.isSignificant
            ? `Your ${label.toLowerCase()} ${metric.direction === 'up' ? 'improved' : 'decreased'} by ${Math.abs(metric.delta)}${unit} compared to your previous ${metric.baselineSessions} sessions.`
            : `Your ${label.toLowerCase()} has remained stable. No significant change detected in recent sessions.`
          }
        </Text>
      </View>
    </View>
  );
}

function BreakdownSection({
  items,
  label,
  colors,
}: {
  items: Array<{
    key: string;
    label: string;
    current: number;
    baseline: number;
    delta: number;
    direction: 'up' | 'down' | 'stable';
    isSignificant: boolean;
    shots: number;
  }>;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  const significantChanges = items.filter(i => i.isSignificant);

  return (
    <View style={styles.breakdownSection}>
      {/* Rows */}
      {items.map((item) => {
        const deltaColor = item.direction === 'stable'
          ? colors.textMuted
          : item.direction === 'up' ? colors.green : colors.red;

        return (
          <View key={item.key} style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.breakdownLabel, { color: colors.text }]}>{item.label}</Text>
            <View style={styles.breakdownValues}>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{item.current}%</Text>
              {item.isSignificant ? (
                <View style={[styles.deltaBadgeSmall, { backgroundColor: `${deltaColor}15` }]}>
                  <Ionicons
                    name={item.direction === 'up' ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={deltaColor}
                  />
                  <Text style={[styles.deltaTextSmall, { color: deltaColor }]}>
                    {Math.abs(item.delta)}%
                  </Text>
                </View>
              ) : (
                <Text style={[styles.stableTextSmall, { color: colors.textMuted }]}>stable</Text>
              )}
            </View>
          </View>
        );
      })}

      {/* Summary */}
      <View style={[styles.explanationCard, { backgroundColor: colors.background, marginTop: 16 }]}>
        <Text style={[styles.explanationLabel, { color: colors.textMuted }]}>What's happening</Text>
        <Text style={[styles.explanationText, { color: colors.text }]}>
          {significantChanges.length > 0
            ? significantChanges.map(c => 
                `${c.label}: ${c.direction === 'up' ? '+' : ''}${c.delta}%`
              ).join(', ')
            : `Your ${label.toLowerCase()} performance is stable across all categories.`
          }
        </Text>
      </View>
    </View>
  );
}

function NoDataForTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.noDataContainer}>
      <Text style={[styles.noDataText, { color: colors.textMuted }]}>
        Not enough data for this metric
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPlaceholder: {
    width: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scopeText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Content
  content: {
    minHeight: 200,
  },
  
  // Metric section
  metricSection: {
    gap: 12,
  },
  metricMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stableText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricContext: {
    fontSize: 13,
  },
  
  // Explanation
  explanationCard: {
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 21,
  },
  
  // Breakdown
  breakdownSection: {},
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  breakdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'right',
  },
  deltaBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
    minWidth: 50,
    justifyContent: 'center',
  },
  deltaTextSmall: {
    fontSize: 11,
    fontWeight: '700',
  },
  stableTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'center',
  },
  
  // No data
  noDataContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
  },
  
  // Quick Insights
  quickInsightsSection: {
    marginTop: 24,
  },
  quickInsightsTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickQuestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  answerCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  answerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  answerLoadingText: {
    fontSize: 14,
  },
  answerQuestion: {
    fontSize: 12,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
