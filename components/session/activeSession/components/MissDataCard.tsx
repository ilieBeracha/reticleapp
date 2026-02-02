/**
 * MissDataCard
 *
 * Displays miss marker data with:
 * - Clock visualization showing where misses went
 * - Listed breakdown of miss directions
 */

import { useColors } from '@/hooks/ui/useColors';
import type { MissPoint } from '@/types/session';
import { milToClockHour } from '@/utils/missAnalyzer';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

interface MissDataCardProps {
  missPoints: MissPoint[];
  hits: number;
  totalShots: number;
}

export function MissDataCard({ missPoints, hits, totalShots }: MissDataCardProps) {
  const colors = useColors();
  const { t } = useTranslation();

  if (missPoints.length === 0) return null;

  const missBreakdown = getMissBreakdown(missPoints);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('missAnalyzer.missAnalysis', 'Miss Analysis')}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <Text style={[styles.countText, { color: '#EF4444' }]}>
            {missPoints.length} {missPoints.length === 1 ? 'miss' : 'misses'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Left: Clock visualization */}
        <View style={styles.clockSection}>
          <MissClock missPoints={missPoints} size={140} colors={colors} />
        </View>

        {/* Right: Data breakdown */}
        <View style={styles.dataSection}>
          {/* Miss breakdown by direction */}
          <View style={styles.breakdownSection}>
            {missBreakdown.map((item, i) => (
              <View key={i} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.directionDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.directionText, { color: colors.text }]}>{item.direction}</Text>
                </View>
                <Text style={[styles.directionCount, { color: colors.textMuted }]}>
                  {item.avgMil} {t('missAnalyzer.mil', 'אלפית')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// Clock visualization component
function MissClock({ missPoints, size, colors }: { missPoints: MissPoint[]; size: number; colors: any }) {
  const half = size / 2;
  const innerRadius = size * 0.1;
  const outerRadius = size * 0.4;
  const ringCount = 3;
  const ringWidth = (outerRadius - innerRadius) / ringCount;
  const labelRadius = size * 0.46;

  return (
    <Svg width={size} height={size}>
      {/* Concentric rings - each = 0.5 mil */}
      {Array.from({ length: ringCount }, (_, i) => {
        const r = innerRadius + ringWidth * (i + 1);
        const milValue = ((i + 1) * 0.5).toFixed(1);
        return (
          <React.Fragment key={`ring-${i}`}>
            <Circle
              cx={half}
              cy={half}
              r={r}
              stroke={colors.border}
              strokeWidth={1}
              strokeOpacity={0.5}
              fill="none"
            />
            {/* Mil label on right */}
            <SvgText
              x={half + r + 3}
              y={half + 3}
              fontSize={7}
              fontWeight="600"
              fill={colors.textMuted}
              textAnchor="start"
              opacity={0.6}
            >
              {milValue}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Hour lines */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const isCardinal = i % 3 === 0;
        const sx = half + innerRadius * Math.sin(angle);
        const sy = half - innerRadius * Math.cos(angle);
        const ex = half + outerRadius * Math.sin(angle);
        const ey = half - outerRadius * Math.cos(angle);
        return (
          <Line
            key={`line-${i}`}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={colors.border}
            strokeWidth={isCardinal ? 1.5 : 0.5}
            strokeOpacity={isCardinal ? 0.8 : 0.4}
          />
        );
      })}

      {/* Center hit zone */}
      <Circle cx={half} cy={half} r={innerRadius} fill="rgba(34,197,94,0.2)" stroke="#22C55E" strokeWidth={2} />

      {/* Hour labels */}
      {[12, 3, 6, 9].map((hour) => {
        const i = hour === 12 ? 0 : hour;
        const angle = (i * Math.PI * 2) / 12;
        const lx = half + labelRadius * Math.sin(angle);
        const ly = half - labelRadius * Math.cos(angle);
        return (
          <SvgText
            key={`label-${hour}`}
            x={lx}
            y={ly + 4}
            fontSize={12}
            fontWeight="700"
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {hour}
          </SvgText>
        );
      })}

      {/* Miss dots with numbers */}
      {missPoints.map((p, i) => {
        const ringCenterDistance = innerRadius + ringWidth * (p.ring + 0.5);
        const angleRad = (p.mil * 2 * Math.PI) / 6400;
        const px = half + ringCenterDistance * Math.sin(angleRad);
        const py = half - ringCenterDistance * Math.cos(angleRad);
        return (
          <React.Fragment key={i}>
            <Circle cx={px} cy={py} r={7} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
            <SvgText x={px} y={py + 3} fontSize={8} fontWeight="700" fill="#fff" textAnchor="middle">
              {i + 1}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Helper to group misses by direction
function getMissBreakdown(missPoints: MissPoint[]): Array<{ direction: string; count: number; clockHours: string[]; avgMil: string }> {
  const groups: Record<string, { count: number; hours: Set<number>; rings: number[] }> = {};

  for (const p of missPoints) {
    const hour = milToClockHour(p.mil);
    const direction = getDirectionName(hour);
    
    if (!groups[direction]) {
      groups[direction] = { count: 0, hours: new Set(), rings: [] };
    }
    groups[direction].count++;
    groups[direction].hours.add(hour);
    groups[direction].rings.push(p.ring);
  }

  return Object.entries(groups)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([direction, data]) => {
      // Calculate average ring and convert to mil (each ring = 0.5 mil)
      const avgRing = data.rings.reduce((sum, r) => sum + r, 0) / data.rings.length;
      const avgMilValue = ((avgRing + 1) * 0.5).toFixed(1);
      return {
        direction,
        count: data.count,
        clockHours: Array.from(data.hours).sort((a, b) => a - b).map(h => `${h}h`),
        avgMil: avgMilValue,
      };
    });
}

function getDirectionName(hour: number): string {
  if (hour === 12) return 'High';
  if (hour === 6) return 'Low';
  if (hour === 3) return 'Right';
  if (hour === 9) return 'Left';
  if (hour === 1 || hour === 2) return 'High-Right';
  if (hour === 10 || hour === 11) return 'High-Left';
  if (hour === 4 || hour === 5) return 'Low-Right';
  if (hour === 7 || hour === 8) return 'Low-Left';
  return 'Unknown';
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  clockSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  breakdownSection: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  directionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  directionCount: {
    fontSize: 11,
    fontWeight: '500',
  },
});
