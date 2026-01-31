/**
 * MissMarker — Interactive target surface for recording miss positions.
 *
 * Renders a concentric-ring target with a visible center. User taps on the
 * target to mark where a shot missed. Each tap adds a normalized MissPoint.
 * Supports undo (remove last) and clear all.
 *
 * Used inside training detail when a session/target has no hit data.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { MissPoint } from '@/types/session';
import { missPointToCanvas, tapToMissPoint } from '@/utils/missAnalyzer';
import * as Haptics from 'expo-haptics';
import { Minus, RotateCcw, Save } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 64, 300); // Compact size, max 300px
const RING_COUNT = 3; // Number of concentric rings
const DOT_RADIUS = 6;
const CENTER_DOT_RADIUS = 4;

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
        const missPoint = tapToMissPoint(tapX, tapY, CANVAS_SIZE);
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
  const ringSpacing = half / (RING_COUNT + 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('missAnalyzer.title', 'Mark Misses')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('missAnalyzer.subtitle2', 'Center = target. Tap to show where misses went.')}
        </Text>
      </View>

      {/* Target Canvas */}
      <GestureDetector gesture={tapGesture}>
        <View style={[styles.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
            {/* Concentric rings */}
            {Array.from({ length: RING_COUNT }, (_, i) => {
              const r = ringSpacing * (i + 1);
              return (
                <Circle
                  key={`ring-${i}`}
                  cx={half}
                  cy={half}
                  r={r}
                  stroke={colors.border}
                  strokeWidth={1}
                  fill="none"
                />
              );
            })}

            {/* Outer ring (target boundary) */}
            <Circle
              cx={half}
              cy={half}
              r={half - 2}


              fill="none"
            />

            {/* Crosshair lines */}
            <Line
              x1={half}
              y1={4}
              x2={half}
              y2={CANVAS_SIZE - 4}
              stroke={colors.border}
              strokeWidth={0.5}
            />
            <Line
              x1={4}
              y1={half}
              x2={CANVAS_SIZE - 4}
              y2={half}
              stroke={colors.border}
              strokeWidth={0.5}
            />

            {/* Center target indicator - shows where actual target was */}
            <Circle
              cx={half}
              cy={half}
              r={24}
              fill="rgba(34, 197, 94, 0.15)"
              stroke="#22C55E"
              strokeWidth={2}
            />
            <SvgText
              x={half}
              y={half + 4}
              fontSize={9}
              fontWeight="700"
              fill="#22C55E"
              textAnchor="middle"
            >
              TARGET
            </SvgText>

            {/* Miss points */}
            {points.map((p, i) => {
              const { px, py } = missPointToCanvas(p, CANVAS_SIZE);
              return (
                <React.Fragment key={`miss-${i}`}>
                  {/* Outer ring for visibility */}
                  <Circle
                    cx={px}
                    cy={py}
                    r={DOT_RADIUS + 2}
                    fill="rgba(239, 68, 68, 0.2)"
                  />
                  {/* Inner dot */}
                  <Circle
                    cx={px}
                    cy={py}
                    r={DOT_RADIUS}
                    fill="#EF4444"
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                  {/* Number label */}
                  {/* SVG text is tricky in react-native-svg, use numbered dots approach */}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </GestureDetector>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            {t('missAnalyzer.legendTarget', 'Target (hits)')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            {t('missAnalyzer.legendMiss', 'Misses')}
          </Text>
        </View>
      </View>

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
          : t('missAnalyzer.tapToMark', 'Tap outside target to mark a miss')}
      </Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={handleUndo}
          disabled={points.length === 0}
        >
          <Minus size={16} color={points.length > 0 ? colors.text : colors.textMuted} />
          <Text style={[styles.actionBtnText, { color: points.length > 0 ? colors.text : colors.textMuted }]}>
            {t('common.undo', 'Undo')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={handleClear}
          disabled={points.length === 0}
        >
          <RotateCcw size={16} color={points.length > 0 ? colors.text : colors.textMuted} />
          <Text style={[styles.actionBtnText, { color: points.length > 0 ? colors.text : colors.textMuted }]}>
            {t('common.clear', 'Clear')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.green, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={16} color="#fff" />
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
    gap: 12,
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  canvas: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
  pointCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 12,
  },
});
