/**
 * Context Quadrant Glyph (v2.0 - Refined Visual)
 *
 * A minimal, elegant 2×2 matrix glyph showing where a context falls in the
 * accuracy vs grouping quadrant. Communicates performance status
 * at a glance without requiring text labels.
 *
 * QUADRANT MAPPING:
 * ┌─────────┬─────────┐
 * │ strong  │  hits   │
 * │  both   │  loose  │   (top = good engagement/accuracy)
 * ├─────────┼─────────┤
 * │  tight  │         │
 * │ misses  │struggle │   (bottom = weak engagement/accuracy)
 * └─────────┴─────────┘
 *   (left = good grouping)  (right = weak grouping)
 */

import { useColors } from '@/hooks/ui/useColors';
import { StyleSheet, Text, View } from 'react-native';

import type { ConfidenceLevel, ContextQuadrant } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface ContextQuadrantGlyphProps {
  /** The quadrant classification */
  quadrant: ContextQuadrant;
  /** Confidence level affects visual strength */
  confidence: ConfidenceLevel;
  /** Whether this context is preliminary (sparse data) */
  isPreliminary?: boolean;
  /** Size of the glyph (default 28) */
  size?: number;
}

// ============================================================================
// QUADRANT POSITION MAPPING
// ============================================================================

const QUADRANT_POSITION: Record<ContextQuadrant, [number, number] | null> = {
  strong_both: [0, 0],
  hits_loose: [0, 1],
  tight_misses: [1, 0],
  struggling: [1, 1],
  engagement_only: null,
  grouping_only: null,
  insufficient_data: null,
};

const QUADRANT_COLOR: Record<ContextQuadrant, 'green' | 'yellow' | 'red' | 'muted'> = {
  strong_both: 'green',
  hits_loose: 'yellow',
  tight_misses: 'yellow',
  struggling: 'red',
  engagement_only: 'muted',
  grouping_only: 'muted',
  insufficient_data: 'muted',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContextQuadrantGlyph({
  quadrant,
  confidence,
  isPreliminary = false,
  size = 28,
}: ContextQuadrantGlyphProps) {
  const colors = useColors();
  const position = QUADRANT_POSITION[quadrant];
  const colorKey = QUADRANT_COLOR[quadrant];

  const activeColor = {
    green: colors.green,
    yellow: colors.yellow || '#F59E0B',
    red: colors.red,
    muted: colors.textMuted,
  }[colorKey];

  const opacityMap: Record<ConfidenceLevel, number> = {
    high: 1,
    medium: 0.7,
    low: 0.4,
  };
  const activeOpacity = opacityMap[confidence];

  const cellSize = (size - 3) / 2;
  const gap = 3;
  const borderRadius = size * 0.18;
  const cellRadius = 3;

  // Partial data indicator
  if (!position) {
    return (
      <View
        style={[
          styles.container,
          styles.partialContainer,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: `${colors.textMuted}08`,
            borderColor: `${colors.textMuted}20`,
          },
        ]}
      >
        {quadrant === 'engagement_only' && (
          <View style={styles.partialIconRow}>
            <View style={[styles.partialDot, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.partialDot, { backgroundColor: `${colors.textMuted}40` }]} />
          </View>
        )}
        {quadrant === 'grouping_only' && (
          <View style={styles.partialIconCol}>
            <View style={[styles.partialDot, { backgroundColor: colors.textMuted }]} />
            <View style={[styles.partialDot, { backgroundColor: `${colors.textMuted}40` }]} />
          </View>
        )}
        {quadrant === 'insufficient_data' && (
          <Text style={[styles.insufficientText, { color: colors.textMuted }]}>?</Text>
        )}
      </View>
    );
  }

  const [activeRow, activeCol] = position;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: `${colors.textMuted}06`,
        },
      ]}
    >
      {/* Grid */}
      <View style={[styles.grid, { gap }]}>
        {[0, 1].map((row) => (
          <View key={row} style={[styles.row, { gap }]}>
            {[0, 1].map((col) => {
              const isActive = row === activeRow && col === activeCol;

              return (
                <View
                  key={col}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRadius: cellRadius,
                      backgroundColor: isActive
                        ? activeColor
                        : `${colors.textMuted}10`,
                      opacity: isActive ? activeOpacity : 0.5,
                    },
                  ]}
                >
                  {/* Inner highlight for active cell */}
                  {isActive && confidence === 'high' && (
                    <View
                      style={[
                        styles.cellHighlight,
                        {
                          borderRadius: cellRadius - 1,
                          backgroundColor: `rgba(255,255,255,0.15)`,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Preliminary marker */}
      {isPreliminary && (
        <View style={[styles.preliminaryBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.preliminaryText, { color: colors.textMuted }]}>~</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  partialContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  grid: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    position: 'relative',
    overflow: 'hidden',
  },
  cellHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '40%',
  },
  partialIconRow: {
    flexDirection: 'row',
    gap: 3,
  },
  partialIconCol: {
    flexDirection: 'column',
    gap: 3,
  },
  partialDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  insufficientText: {
    fontSize: 12,
    fontWeight: '600',
  },
  preliminaryBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preliminaryText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -1,
  },
});

export default ContextQuadrantGlyph;
