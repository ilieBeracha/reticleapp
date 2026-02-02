/**
 * MissMarker — Interactive target surface for recording miss positions.
 *
 * Features:
 * - Clock-face layout with hour marks (1-12)
 * - Concentric rings for distance buckets
 * - Taps automatically snap to ring centers
 * - Mil-based encoding (ring + angle in thousandths)
 */

import { useColors } from '@/hooks/ui/useColors';
import type { MissPoint } from '@/types/session';
import {
  HOUR_COUNT as ANALYZER_HOUR_COUNT,
  INNER_RADIUS_RATIO,
  LABEL_OFFSET_RATIO,
  MIL_PER_CIRCLE,
  missPointToCanvas,
  tapToMissPoint
} from '@/utils/missAnalyzer';
import * as Haptics from 'expo-haptics';
import { Minus, RotateCcw, Save } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 32, 380);
const RING_COUNT = 3;
const DOT_RADIUS = 9;
const HOUR_COUNT = ANALYZER_HOUR_COUNT;
const CARDINAL_HOURS = new Set([12, 3, 6, 9]);

interface MissMarkerProps {
  /** Previously saved miss points (for display / edit) */
  initialPoints?: MissPoint[];
  /** Called when user wants to save the miss points */
  onSave: (points: MissPoint[]) => void;
  /** Called when user cancels / closes */
  onCancel: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Maximum number of miss points allowed (matches bullets_fired) */
  maxPoints?: number;
}

export function MissMarker({
  initialPoints = [],
  onSave,
  onCancel,
  isSaving = false,
  maxPoints,
}: MissMarkerProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const [points, setPoints] = useState<MissPoint[]>(initialPoints);

  const canAddMore = maxPoints == null || points.length < maxPoints;

  const handleTap = useCallback(
    (tapX: number, tapY: number) => {
      if (!canAddMore) return;
      try {
        const missPoint = tapToMissPoint(tapX, tapY, CANVAS_SIZE, RING_COUNT);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPoints((prev) => [...prev, missPoint]);
      } catch {
        // Silently ignore invalid taps
      }
    },
    [canAddMore]
  );

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPoints([]);
  }, []);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(points);
  }, [points, onSave]);

  // Gesture handler for tap
  const tapGesture = Gesture.Tap().onEnd((event) => {
    runOnJS(handleTap)(event.x, event.y);
  });

  const half = CANVAS_SIZE / 2;
  const innerRadius = half * INNER_RADIUS_RATIO; // Center target zone radius
  const outerRadius = half * (1 - LABEL_OFFSET_RATIO - 0.02); // Leave space for labels
  const ringWidth = (outerRadius - innerRadius) / RING_COUNT;

  // Generate hour positions (12 at top, clockwise)
  const hourPositions = Array.from({ length: HOUR_COUNT }, (_, i) => {
    const hour = i === 0 ? 12 : i;
    const mil = (i * MIL_PER_CIRCLE) / HOUR_COUNT;
    const angleRad = (mil * 2 * Math.PI) / MIL_PER_CIRCLE;
    
    // Position for label (outside the rings, near edge)
    const labelRadius = half - 12;
    const lx = half + labelRadius * Math.sin(angleRad);
    const ly = half - labelRadius * Math.cos(angleRad);
    
    // Position for line end (at outer ring)
    const ex = half + outerRadius * Math.sin(angleRad);
    const ey = half - outerRadius * Math.cos(angleRad);
    
    // Position for line start (at inner radius)
    const sx = half + innerRadius * Math.sin(angleRad);
    const sy = half - innerRadius * Math.cos(angleRad);
    
    return { hour, lx, ly, sx, sy, ex, ey };
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('missAnalyzer.title', 'Mark Misses')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('missAnalyzer.clockSubtitle', 'Tap the clock position where each miss went')}
        </Text>
      </View>

      {/* Target Canvas */}
      <GestureDetector gesture={tapGesture}>
        <View style={[styles.canvas, styles.canvasShadow, { width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: colors.card }]}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
            {/* Background circle - subtle dark base */}
            <Circle
              cx={half}
              cy={half}
              r={half - 2}
              fill={colors.secondary}
              fillOpacity={0.15}
            />

            {/* Miss zone fills - gradient red tint (worse = darker red) */}
            {Array.from({ length: RING_COUNT }, (_, i) => {
              const outerR = innerRadius + ringWidth * (i + 1);
              const redOpacity = 0.04 + (i * 0.025);
              return (
                <Circle
                  key={`zone-${i}`}
                  cx={half}
                  cy={half}
                  r={outerR}
                  fill={`rgba(239, 68, 68, ${redOpacity})`}
                />
              );
            })}
            {/* Clear the inner zones by drawing circles on top (creates ring effect) */}
            <Circle
              cx={half}
              cy={half}
              r={innerRadius}
              fill={colors.card}
            />

            {/* Concentric rings (miss zones) - each ring = 0.5 mil */}
            {Array.from({ length: RING_COUNT }, (_, i) => {
              const r = innerRadius + ringWidth * (i + 1);
              const milValue = ((i + 1) * 0.5).toFixed(1);
              const isOuterRing = i === RING_COUNT - 1;
              return (
                <React.Fragment key={`ring-${i}`}>
                  <Circle
                    cx={half}
                    cy={half}
                    r={r}
                    stroke="rgba(239, 68, 68, 0.25)"
                    strokeWidth={isOuterRing ? 1.5 : 1}
                    fill="none"
                  />
                  {/* Mil label on right side of each ring */}
                  <SvgText
                    x={half + r + 5}
                    y={half + 4}
                    fontSize={10}
                    fontWeight="700"
                    fill={colors.textMuted}
                    textAnchor="start"
                    opacity={0.7}
                  >
                    {milValue}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Hour lines (from center to edge) - subtle red tint in miss zone */}
            {hourPositions.map(({ hour, sx, sy, ex, ey }) => (
              <Line
                key={`line-${hour}`}
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke="rgba(239, 68, 68, 0.35)"
                strokeWidth={CARDINAL_HOURS.has(hour) ? 1.5 : 0.75}
                strokeOpacity={CARDINAL_HOURS.has(hour) ? 0.8 : 0.5}
              />
            ))}

            {/* Center target zone (green = hits go here) */}
            {/* Outer glow for emphasis */}
            <Circle
              cx={half}
              cy={half}
              r={innerRadius + 4}
              fill="rgba(34, 197, 94, 0.08)"
            />
            {/* Main hit zone */}
            <Circle
              cx={half}
              cy={half}
              r={innerRadius}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="#22C55E"
              strokeWidth={3}
            />
            {/* Inner highlight */}
            <Circle
              cx={half}
              cy={half}
              r={innerRadius * 0.6}
              fill="rgba(34, 197, 94, 0.1)"
            />
            {/* Crosshair - horizontal */}
            <Line
              x1={half - innerRadius * 0.4}
              y1={half}
              x2={half + innerRadius * 0.4}
              y2={half}
              stroke="#22C55E"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />
            {/* Crosshair - vertical */}
            <Line
              x1={half}
              y1={half - innerRadius * 0.4}
              x2={half}
              y2={half + innerRadius * 0.4}
              stroke="#22C55E"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />
            {/* Center dot */}
            <Circle
              cx={half}
              cy={half}
              r={3}
              fill="#22C55E"
            />

            {/* Hour labels around the edge */}
            {hourPositions.map(({ hour, lx, ly }) => (
              <SvgText
                key={`label-${hour}`}
                x={lx}
                y={ly + 6}
                fontSize={16}
                fontWeight={CARDINAL_HOURS.has(hour) ? '800' : '600'}
                fill={hour === 12 ? colors.text : colors.textMuted}
                textAnchor="middle"
              >
                {hour}
              </SvgText>
            ))}

            {/* Miss points (red dots snapped to ring centers) */}
            {points.map((p, i) => {
              const { px, py } = missPointToCanvas(p, CANVAS_SIZE, RING_COUNT);
              return (
                <React.Fragment key={`miss-${i}`}>
                  {/* Outer glow effect */}
                  <Circle
                    cx={px}
                    cy={py}
                    r={DOT_RADIUS + 6}
                    fill="rgba(239, 68, 68, 0.15)"
                  />
                  {/* Inner glow effect */}
                  <Circle
                    cx={px}
                    cy={py}
                    r={DOT_RADIUS + 3}
                    fill="rgba(239, 68, 68, 0.3)"
                  />
                  {/* Main dot */}
                  <Circle
                    cx={px}
                    cy={py}
                    r={DOT_RADIUS}
                    fill="#EF4444"
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                  {/* Number label inside dot */}
                  <SvgText
                    x={px}
                    y={py + 4}
                    fontSize={10}
                    fontWeight="800"
                    fill="#fff"
                    textAnchor="middle"
                  >
                    {i + 1}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </GestureDetector>

      {/* Simple mil note */}
      <Text style={[styles.milNote, { color: colors.textMuted }]}>
        {t('missAnalyzer.milSimple', 'טבעת = 0.5 אלפית')}
      </Text>

      {/* Point count */}
      <Text style={[styles.pointCount, { color: colors.textMuted }]}>
        {points.length > 0
          ? maxPoints != null
            ? t('missAnalyzer.pointsOfMax', {
                count: points.length,
                max: maxPoints,
                defaultValue: `${points.length} / ${maxPoints} misses marked`,
              })
            : t('missAnalyzer.pointsMarked', {
                count: points.length,
                defaultValue: `${points.length} miss${points.length === 1 ? '' : 'es'} marked`,
              })
          : t('missAnalyzer.tapClock', 'Tap on the clock to mark where shots went')}
      </Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={handleUndo}
          disabled={points.length === 0}
        >
          <Minus size={18} color={points.length > 0 ? colors.text : colors.textMuted} />
          <Text style={[styles.actionBtnText, { color: points.length > 0 ? colors.text : colors.textMuted }]}>
            {t('common.undo', 'Undo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={handleClear}
          disabled={points.length === 0}
        >
          <RotateCcw size={18} color={points.length > 0 ? colors.text : colors.textMuted} />
          <Text style={[styles.actionBtnText, { color: points.length > 0 ? colors.text : colors.textMuted }]}>
            {t('common.clear', 'Clear')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.green, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={18} color="#fff" />
          <Text style={styles.saveBtnText}>
            {isSaving
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cancel */}
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
          {t('common.cancel', 'Cancel')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  canvas: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  canvasShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  milNote: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pointCount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
  },
});
