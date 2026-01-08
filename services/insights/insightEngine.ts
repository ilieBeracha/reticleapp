// ============================================================================
// INSIGHT ENGINE
// ============================================================================
// Rule-based insight generator. Produces explainable, user-relative insights.
// Start with rules - add ML later when patterns are validated.

import type {
  GeneratedInsight,
  InsightFactor,
  InsightGenerationInput,
  SessionFeatures,
  UserBaseline,
} from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate z-score for baseline comparison.
 * Returns null if baseline is insufficient.
 */
function zScore(value: number, mean: number, std: number): number | null {
  if (!isFinite(std) || std <= 0) return null;
  return (value - mean) / std;
}

/**
 * Format percentage for display.
 */
function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
}

/**
 * Format centimeters for display.
 */
function formatCm(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}cm`;
}

// ============================================================================
// INSIGHT RULES
// ============================================================================

/**
 * Rule: Accuracy deviation from personal baseline.
 * Only applies to ACHIEVEMENT sessions (not grouping).
 */
function checkAccuracyBaseline(
  features: SessionFeatures,
  baseline: UserBaseline | null
): GeneratedInsight | null {
  // Only for achievement/engagement sessions
  if (features.drill_goal === 'grouping' || features.drill_goal === 'zeroing') {
    return null;
  }

  // Need baseline with sufficient data (minimum 3 sessions)
  if (!baseline || baseline.n < 3 || baseline.avg_accuracy === null || baseline.std_accuracy === null) {
    return null;
  }

  // Need accuracy data
  if (features.accuracy_pct === null) return null;

  const z = zScore(features.accuracy_pct, baseline.avg_accuracy, baseline.std_accuracy);
  if (z === null) return null;

  // Significant negative deviation (worse than usual)
  if (z <= -1.0) {
    let primary: InsightFactor = 'execution';
    let secondary: InsightFactor | null = null;

    if (features.has_biometrics && features.stress_avg !== null && features.stress_avg >= 60) {
      primary = 'stress';
      secondary = 'fatigue';
    }

    if (features.flinch_count >= 2) {
      if (primary === 'execution') primary = 'trigger';
      else secondary = 'trigger';
    }

    const drop = Math.round(baseline.avg_accuracy - features.accuracy_pct);

    return {
      title: 'Accuracy below baseline',
      summary: `Hit rate ${formatPct(features.accuracy_pct)} is ${drop}% below your usual ${formatPct(baseline.avg_accuracy)} for this drill.`,
      primary_factor: primary,
      secondary_factor: secondary,
      score: Math.min(100, 50 + Math.abs(z) * 15),
      tags: ['baseline', 'accuracy', 'drop'],
      insight_type: 'baseline_deviation',
      evidence: {
        z_score: Math.round(z * 100) / 100,
        session_accuracy: features.accuracy_pct,
        baseline_accuracy: baseline.avg_accuracy,
        baseline_n: baseline.n,
      },
    };
  }

  // Significant positive deviation (better than usual)
  if (z >= 1.5) {
    const improvement = Math.round(features.accuracy_pct - baseline.avg_accuracy);

    return {
      title: 'Accuracy above baseline',
      summary: `Hit rate ${formatPct(features.accuracy_pct)} is ${improvement}% above your usual ${formatPct(baseline.avg_accuracy)}. Great shooting!`,
      primary_factor: 'consistency',
      secondary_factor: null,
      score: Math.min(100, 40 + z * 10),
      tags: ['baseline', 'accuracy', 'improvement'],
      insight_type: 'achievement',
      evidence: {
        z_score: Math.round(z * 100) / 100,
        session_accuracy: features.accuracy_pct,
        baseline_accuracy: baseline.avg_accuracy,
        baseline_n: baseline.n,
      },
    };
  }

  return null;
}

/**
 * Rule: Grouping deviation from personal baseline.
 * Only applies to GROUPING sessions (not achievement).
 */
function checkGroupingBaseline(
  features: SessionFeatures,
  baseline: UserBaseline | null
): GeneratedInsight | null {
  // Only for grouping sessions
  if (features.drill_goal !== 'grouping') {
    return null;
  }

  // Need dispersion data
  if (features.dispersion_cm === null) return null;

  // Need baseline with sufficient grouping data (minimum 3 sessions)
  if (!baseline || baseline.n < 3 || baseline.avg_grouping === null || baseline.std_grouping === null) {
    return null;
  }

  const z = zScore(features.dispersion_cm, baseline.avg_grouping, baseline.std_grouping);
  if (z === null) return null;

  // Significant negative deviation (wider than usual - worse)
  if (z >= 1.0) {
    let primary: InsightFactor = 'consistency';
    let secondary: InsightFactor | null = 'stance';

    if (features.has_biometrics && features.stress_avg !== null && features.stress_avg >= 60) {
      primary = 'stress';
      secondary = 'fatigue';
    }

    const wider = (features.dispersion_cm - baseline.avg_grouping).toFixed(1);

    return {
      title: 'Grouping wider than usual',
      summary: `Dispersion ${formatCm(features.dispersion_cm)} is ${wider}cm wider than your baseline ${formatCm(baseline.avg_grouping)}.`,
      primary_factor: primary,
      secondary_factor: secondary,
      score: Math.min(100, 50 + z * 15),
      tags: ['baseline', 'grouping', 'regression'],
      insight_type: 'baseline_deviation',
      evidence: {
        z_score: Math.round(z * 100) / 100,
        session_grouping: features.dispersion_cm,
        baseline_grouping: baseline.avg_grouping,
        baseline_n: baseline.n,
      },
    };
  }

  // Significant positive deviation (tighter than usual - better)
  if (z <= -1.5) {
    const tighter = (baseline.avg_grouping - features.dispersion_cm).toFixed(1);

    return {
      title: 'Tighter grouping than usual',
      summary: `Dispersion ${formatCm(features.dispersion_cm)} is ${tighter}cm tighter than your baseline ${formatCm(baseline.avg_grouping)}. Excellent consistency!`,
      primary_factor: 'consistency',
      secondary_factor: null,
      score: Math.min(100, 40 + Math.abs(z) * 10),
      tags: ['baseline', 'grouping', 'improvement'],
      insight_type: 'achievement',
      evidence: {
        z_score: Math.round(z * 100) / 100,
        session_grouping: features.dispersion_cm,
        baseline_grouping: baseline.avg_grouping,
        baseline_n: baseline.n,
      },
    };
  }

  return null;
}

/**
 * Rule: Offset pattern detection.
 * Triggers when consistent horizontal or vertical offset is detected.
 */
function checkOffsetPattern(features: SessionFeatures): GeneratedInsight | null {
  // Only for paper targets with offset data
  if (features.target_type !== 'paper') return null;
  if (features.offset_right_cm === null && features.offset_up_cm === null) return null;

  const rightOffset = features.offset_right_cm ?? 0;
  const upOffset = features.offset_up_cm ?? 0;

  // Threshold for significant offset (in cm)
  const threshold = 2.0;

  const hasHorizontalBias = Math.abs(rightOffset) >= threshold;
  const hasVerticalBias = Math.abs(upOffset) >= threshold;

  if (!hasHorizontalBias && !hasVerticalBias) return null;

  // Determine direction(s)
  const directions: string[] = [];
  if (rightOffset >= threshold) directions.push('right');
  if (rightOffset <= -threshold) directions.push('left');
  if (upOffset >= threshold) directions.push('high');
  if (upOffset <= -threshold) directions.push('low');

  const directionText = directions.join(' & ');

  // Attribution
  let suggestion = '';
  if (hasHorizontalBias && !hasVerticalBias) {
    suggestion = 'Check trigger pull or natural point of aim.';
  } else if (hasVerticalBias && !hasHorizontalBias) {
    suggestion = 'Check zero or breathing hold.';
  } else {
    suggestion = 'Consider zero adjustment.';
  }

  return {
    title: `Consistent ${directionText} offset`,
    summary: `Shots consistently hitting ${directionText} (${formatCm(Math.abs(rightOffset))} H, ${formatCm(Math.abs(upOffset))} V). ${suggestion}`,
    primary_factor: 'zero',
    secondary_factor: hasHorizontalBias ? 'trigger' : null,
    score: 45 + Math.min(Math.abs(rightOffset), Math.abs(upOffset)) * 5,
    tags: ['offset', 'pattern', 'paper'],
    insight_type: 'offset_pattern',
    evidence: {
      offset_right_cm: rightOffset,
      offset_up_cm: upOffset,
      directions,
    },
  };
}

/**
 * Rule: Stress/fatigue correlation.
 * Triggers when high stress correlates with performance issues.
 */
function checkFatigueCorrelation(
  features: SessionFeatures,
  baseline: UserBaseline | null
): GeneratedInsight | null {
  // Need biometrics
  if (!features.has_biometrics) return null;
  if (features.stress_avg === null) return null;

  // High stress threshold
  const highStressThreshold = 60;
  const hasHighStress = features.stress_avg >= highStressThreshold;

  if (!hasHighStress) return null;

  // Check if accuracy is also below baseline
  const accuracyBelowNorm =
    baseline &&
    baseline.avg_accuracy !== null &&
    features.accuracy_pct !== null &&
    features.accuracy_pct < baseline.avg_accuracy;

  // Check optimal shot percentage
  const lowOptimalShots = features.optimal_shot_pct !== null && features.optimal_shot_pct < 30;

  if (!accuracyBelowNorm && !lowOptimalShots) {
    // High stress but good performance - different insight
    return {
      title: 'Performed well under stress',
      summary: `Despite elevated stress (${Math.round(features.stress_avg)}), you maintained performance. Good mental control.`,
      primary_factor: 'consistency',
      secondary_factor: null,
      score: 35,
      tags: ['stress', 'mental', 'positive'],
      insight_type: 'achievement',
      evidence: {
        stress_avg: features.stress_avg,
        accuracy_pct: features.accuracy_pct,
        optimal_shot_pct: features.optimal_shot_pct,
      },
    };
  }

  return {
    title: 'Stress impacted performance',
    summary: `Elevated stress (avg ${Math.round(features.stress_avg)}) likely affected accuracy. Only ${formatPct(features.optimal_shot_pct)} of shots were in optimal conditions.`,
    primary_factor: 'stress',
    secondary_factor: 'fatigue',
    score: 55 + (features.stress_avg - highStressThreshold),
    tags: ['stress', 'fatigue', 'biometric'],
    insight_type: 'fatigue_correlation',
    evidence: {
      stress_avg: features.stress_avg,
      optimal_shot_pct: features.optimal_shot_pct,
      accuracy_pct: features.accuracy_pct,
      baseline_accuracy: baseline?.avg_accuracy,
    },
  };
}

/**
 * Rule: Weather impact detection.
 * Triggers when challenging weather conditions may have affected performance.
 */
function checkWeatherImpact(
  features: SessionFeatures,
  baseline: UserBaseline | null
): GeneratedInsight | null {
  // Need weather data
  if (!features.has_weather) return null;

  const insights: { factor: InsightFactor; severity: number; text: string }[] = [];

  // Check wind impact
  if (features.weather_wind_impact === 'significant' || features.weather_wind_impact === 'severe') {
    const windSpeed = features.weather_wind_speed_mps ?? 0;
    insights.push({
      factor: 'wind',
      severity: features.weather_wind_impact === 'severe' ? 30 : 20,
      text: `${features.weather_wind_impact} wind (${windSpeed.toFixed(1)} m/s)`,
    });
  }

  // Check extreme temperature
  if (features.weather_temp_c !== null) {
    if (features.weather_temp_c <= 5) {
      insights.push({
        factor: 'temperature',
        severity: 15,
        text: `cold conditions (${Math.round(features.weather_temp_c)}°C)`,
      });
    } else if (features.weather_temp_c >= 35) {
      insights.push({
        factor: 'temperature',
        severity: 15,
        text: `heat (${Math.round(features.weather_temp_c)}°C)`,
      });
    }
  }

  // Check challenging conditions
  if (features.weather_condition_severity === 'poor' || features.weather_condition_severity === 'severe') {
    insights.push({
      factor: 'weather',
      severity: features.weather_condition_severity === 'severe' ? 25 : 15,
      text: `${features.weather_condition?.toLowerCase() ?? 'challenging'} conditions`,
    });
  }

  // Check high humidity
  if (features.weather_humidity !== null && features.weather_humidity >= 85) {
    insights.push({
      factor: 'humidity',
      severity: 10,
      text: `high humidity (${features.weather_humidity}%)`,
    });
  }

  if (insights.length === 0) return null;

  // Check if accuracy/grouping is below baseline (weather might be a factor)
  const isPerformanceDown =
    baseline &&
    ((features.accuracy_pct !== null &&
      baseline.avg_accuracy !== null &&
      features.accuracy_pct < baseline.avg_accuracy - 5) ||
      (features.dispersion_cm !== null &&
        baseline.avg_grouping !== null &&
        features.dispersion_cm > baseline.avg_grouping + 1));

  // Sort by severity
  insights.sort((a, b) => b.severity - a.severity);
  const primary = insights[0];
  const secondary = insights.length > 1 ? insights[1] : null;

  const conditionsList = insights.map((i) => i.text).join(', ');
  const totalSeverity = insights.reduce((sum, i) => sum + i.severity, 0);

  if (isPerformanceDown) {
    return {
      title: 'Weather may have impacted results',
      summary: `Conditions: ${conditionsList}. Performance below your baseline - weather likely a factor.`,
      primary_factor: primary.factor,
      secondary_factor: secondary?.factor ?? null,
      score: Math.min(70, 40 + totalSeverity),
      tags: ['weather', 'conditions', 'environment'],
      insight_type: 'baseline_deviation',
      evidence: {
        weather_condition: features.weather_condition,
        weather_wind_impact: features.weather_wind_impact,
        weather_temp_c: features.weather_temp_c,
        weather_humidity: features.weather_humidity,
        accuracy_pct: features.accuracy_pct,
        baseline_accuracy: baseline?.avg_accuracy,
      },
    };
  }

  // Good performance despite challenging weather
  return {
    title: 'Performed well in challenging conditions',
    summary: `Despite ${conditionsList}, you maintained good performance. Solid environmental adaptation.`,
    primary_factor: 'conditions',
    secondary_factor: primary.factor,
    score: Math.min(50, 30 + totalSeverity / 2),
    tags: ['weather', 'conditions', 'positive'],
    insight_type: 'achievement',
    evidence: {
      weather_condition: features.weather_condition,
      weather_wind_impact: features.weather_wind_impact,
      weather_temp_c: features.weather_temp_c,
      weather_humidity: features.weather_humidity,
    },
  };
}

/**
 * Rule: Flinch pattern detection.
 * Triggers when multiple flinches are detected.
 */
function checkFlinchPattern(features: SessionFeatures): GeneratedInsight | null {
  if (!features.has_biometrics) return null;
  if (features.flinch_count < 2) return null;

  const flinchPct = features.shots > 0 ? Math.round((features.flinch_count / features.shots) * 100) : 0;

  // More than 20% flinch rate is concerning
  if (flinchPct < 20 && features.flinch_count < 3) return null;

  return {
    title: 'Flinch detected',
    summary: `${features.flinch_count} flinches detected (${flinchPct}% of shots). Focus on trigger control and follow-through.`,
    primary_factor: 'trigger',
    secondary_factor: 'execution',
    score: 50 + flinchPct,
    tags: ['flinch', 'trigger', 'biometric'],
    insight_type: 'biometric_pattern',
    evidence: {
      flinch_count: features.flinch_count,
      flinch_pct: flinchPct,
      total_shots: features.shots,
    },
  };
}

/**
 * Rule: Grouping quality feedback (absolute thresholds).
 * Shows feedback when no baseline exists yet.
 */
function checkGroupingAbsolute(features: SessionFeatures): GeneratedInsight | null {
  // Only for grouping sessions with dispersion data
  if (features.drill_goal !== 'grouping') return null;
  if (features.dispersion_cm === null) return null;

  // Excellent grouping (< 3cm)
  if (features.dispersion_cm < 3) {
    return {
      title: 'Excellent grouping',
      summary: `Dispersion of ${formatCm(features.dispersion_cm)} - very tight group!`,
      primary_factor: 'consistency',
      secondary_factor: null,
      score: 45,
      tags: ['grouping', 'dispersion', 'positive'],
      insight_type: 'achievement',
      evidence: {
        dispersion_cm: features.dispersion_cm,
      },
    };
  }

  // Wide grouping (> 8cm) - needs work
  if (features.dispersion_cm >= 8) {
    return {
      title: 'Wide grouping',
      summary: `Dispersion of ${formatCm(features.dispersion_cm)} detected. Focus on consistent position and trigger control.`,
      primary_factor: 'consistency',
      secondary_factor: null,
      score: 35,
      tags: ['grouping', 'dispersion'],
      insight_type: 'grouping_regression',
      evidence: {
        dispersion_cm: features.dispersion_cm,
      },
    };
  }

  return null;
}

/**
 * Rule: Building baseline (shown when user doesn't have enough data yet).
 */
function checkBuildingBaseline(
  features: SessionFeatures,
  baseline: UserBaseline | null
): GeneratedInsight | null {
  const isGrouping = features.drill_goal === 'grouping';
  const metricName = isGrouping ? 'grouping' : 'accuracy';

  // Check if we have the required data for this session type
  const hasRelevantData = isGrouping
    ? baseline?.avg_grouping !== null
    : baseline?.avg_accuracy !== null;

  // Only show if baseline is insufficient
  if (!baseline || baseline.n < 3 || !hasRelevantData) {
    const sessionsHave = baseline?.n ?? 0;

    return {
      title: 'Building your baseline',
      summary: `${sessionsHave}/3 ${isGrouping ? 'grouping' : 'engagement'} sessions tracked. Keep training to unlock personalized ${metricName} insights.`,
      primary_factor: null,
      secondary_factor: null,
      score: 25,
      tags: ['baseline', 'onboarding', metricName],
      insight_type: 'summary',
      evidence: {
        sessions_have: sessionsHave,
        drill_goal: features.drill_goal,
        metric_type: metricName,
      },
    };
  }

  return null;
}

/**
 * Rule: Session summary (always generated if enough data).
 * Tailored to drill type - shows relevant metrics.
 */
function generateSessionSummary(features: SessionFeatures): GeneratedInsight | null {
  if (features.shots < 5) return null;

  const isGrouping = features.drill_goal === 'grouping';
  let summary = `${features.shots} shots fired`;

  if (isGrouping) {
    // Grouping sessions - show dispersion, not accuracy
    if (features.dispersion_cm !== null) {
      summary += ` with ${formatCm(features.dispersion_cm)} average dispersion`;
    }
    if (features.best_grouping_cm !== null && features.best_grouping_cm !== features.dispersion_cm) {
      summary += `, best group ${formatCm(features.best_grouping_cm)}`;
    }
  } else {
    // Achievement/engagement sessions - show accuracy
    if (features.accuracy_pct !== null && features.hits > 0) {
      summary += ` with ${formatPct(features.accuracy_pct)} hit rate (${features.hits}/${features.shots})`;
    }
    if (features.stages_cleared > 0) {
      summary += `, ${features.stages_cleared} stage${features.stages_cleared > 1 ? 's' : ''} cleared`;
    }
  }

  summary += '.';

  return {
    title: 'Session complete',
    summary,
    primary_factor: null,
    secondary_factor: null,
    score: 10, // Low priority - always shows last
    tags: ['summary', isGrouping ? 'grouping' : 'accuracy'],
    insight_type: 'summary',
    evidence: {
      drill_goal: features.drill_goal,
      shots: features.shots,
      hits: features.hits,
      accuracy_pct: features.accuracy_pct,
      dispersion_cm: features.dispersion_cm,
      best_grouping_cm: features.best_grouping_cm,
    },
  };
}

// ============================================================================
// MAIN INSIGHT GENERATOR
// ============================================================================

/**
 * Generate insights for a session.
 * Returns array of insights sorted by score (highest first).
 */
export function generateInsights(input: InsightGenerationInput): GeneratedInsight[] {
  const { features, baseline } = input;
  const insights: GeneratedInsight[] = [];

  // ============================================================================
  // ACCURACY-SPECIFIC RULES (for achievement/engagement sessions)
  // ============================================================================
  const accuracyBaselineInsight = checkAccuracyBaseline(features, baseline);
  if (accuracyBaselineInsight) insights.push(accuracyBaselineInsight);

  // ============================================================================
  // GROUPING-SPECIFIC RULES (for grouping sessions)
  // ============================================================================
  const groupingBaselineInsight = checkGroupingBaseline(features, baseline);
  if (groupingBaselineInsight) insights.push(groupingBaselineInsight);

  const groupingAbsoluteInsight = checkGroupingAbsolute(features);
  if (groupingAbsoluteInsight) insights.push(groupingAbsoluteInsight);

  // ============================================================================
  // UNIVERSAL RULES (apply to all session types)
  // ============================================================================
  const offsetInsight = checkOffsetPattern(features);
  if (offsetInsight) insights.push(offsetInsight);

  const fatigueInsight = checkFatigueCorrelation(features, baseline);
  if (fatigueInsight) insights.push(fatigueInsight);

  const flinchInsight = checkFlinchPattern(features);
  if (flinchInsight) insights.push(flinchInsight);

  const weatherInsight = checkWeatherImpact(features, baseline);
  if (weatherInsight) insights.push(weatherInsight);

  // Building baseline insight (shows progress toward personalized insights)
  const buildingBaselineInsight = checkBuildingBaseline(features, baseline);
  if (buildingBaselineInsight) insights.push(buildingBaselineInsight);

  // Always add summary (low priority)
  const summaryInsight = generateSessionSummary(features);
  if (summaryInsight) insights.push(summaryInsight);

  // Sort by score descending
  insights.sort((a, b) => b.score - a.score);

  // Limit to top 5 insights
  return insights.slice(0, 5);
}

/**
 * Get the top insight for quick display.
 */
export function getTopInsight(input: InsightGenerationInput): GeneratedInsight | null {
  const insights = generateInsights(input);
  return insights.length > 0 ? insights[0] : null;
}

