/**
 * Drill Detail Modal - POLISHED
 *
 * Shows essential drill info with clean, modern design.
 */
import { useColors } from '@/hooks/ui/useColors';
import type { Drill } from '@/types/workspace';
import { Camera, Clock, Crosshair, Hand, MapPin, RefreshCw, Trophy, X } from 'lucide-react-native';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// CONSTANTS
// ============================================================================
const COLORS = {
  grouping: '#10B981',
  achievement: '#3B82F6',
};

// ============================================================================
// TYPES
// ============================================================================
interface DrillDetailModalProps {
  visible: boolean;
  onClose: () => void;
  drill: Drill | null;
}

// ============================================================================
// STAT ITEM COMPONENT
// ============================================================================
function StatItem({
  icon: Icon,
  label,
  value,
  iconColor,
  colors,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function DrillDetailModal({ visible, onClose, drill }: DrillDetailModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!drill) return null;

  const isGrouping = drill.drill_goal === 'grouping';
  const accentColor = isGrouping ? COLORS.grouping : COLORS.achievement;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Drill Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: accentColor + '15' }]}>
              {isGrouping ? (
                <Crosshair size={36} color={accentColor} />
              ) : (
                <Trophy size={36} color={accentColor} />
              )}
            </View>
            <Text style={[styles.heroName, { color: colors.text }]}>{drill.name}</Text>
            <View style={[styles.heroBadge, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.heroBadgeText, { color: accentColor }]}>
                {isGrouping ? 'Grouping Drill' : 'Achievement Drill'}
              </Text>
            </View>
          </Animated.View>

          {/* Description */}
          {drill.description && (
            <Animated.View
              entering={FadeInDown.delay(100)}
              style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.descText, { color: colors.text }]}>{drill.description}</Text>
            </Animated.View>
          )}

          {/* Stats Grid */}
          <Animated.View
            entering={FadeInDown.delay(150)}
            style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.statsTitle, { color: colors.text }]}>Configuration</Text>
            <View style={styles.statsGrid}>
              <StatItem
                icon={MapPin}
                label="Distance"
                value={`${drill.distance_m}m`}
                iconColor={accentColor}
                colors={colors}
              />
              <StatItem
                icon={Crosshair}
                label="Shots"
                value={String(drill.rounds_per_shooter)}
                iconColor={accentColor}
                colors={colors}
              />
              {(drill.strings_count ?? 1) > 1 && (
                <StatItem
                  icon={RefreshCw}
                  label="Rounds"
                  value={`${drill.strings_count}x`}
                  iconColor={accentColor}
                  colors={colors}
                />
              )}
              {drill.time_limit_seconds && (
                <StatItem
                  icon={Clock}
                  label="Time Limit"
                  value={`${drill.time_limit_seconds}s`}
                  iconColor="#EF4444"
                  colors={colors}
                />
              )}
            </View>
          </Animated.View>

          {/* Input Method */}
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.methodLabel, { color: colors.textMuted }]}>INPUT METHOD</Text>
            <View style={styles.methodRow}>
              <View style={[styles.methodIcon, { backgroundColor: accentColor + '15' }]}>
                {drill.target_type === 'paper' ? (
                  <Camera size={20} color={accentColor} />
                ) : (
                  <Hand size={20} color={accentColor} />
                )}
              </View>
              <Text style={[styles.methodText, { color: colors.text }]}>
                {drill.target_type === 'paper' ? 'Scan Target' : 'Manual Entry'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Description Card
  descCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  descText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Stats Card
  statsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: '45%',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },

  // Method Card
  methodCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
