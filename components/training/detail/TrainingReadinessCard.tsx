/**
 * TrainingReadinessCard Component
 *
 * Shows training setup progress as a checklist with clear next steps.
 * Replaces scattered warnings with a single source of truth.
 *
 * Example:
 * ┌─────────────────────────────────────┐
 * │ Training Setup                      │
 * │ ────────────────────────────────────│
 * │ ✓ Drill selected                    │
 * │ ⚠ Weapon required                   │
 * │ ✓ Members added                     │
 * │                                     │
 * │ [ Complete setup ]                  │
 * └─────────────────────────────────────┘
 */

import { AlertCircle, Check, ChevronRight, Shield, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Colors } from './types';

export interface ReadinessItem {
  id: string;
  label: string;
  isComplete: boolean;
  icon: 'drill' | 'weapon' | 'members';
  /** Action to take when this item is tapped */
  onPress?: () => void;
}

export interface TrainingReadinessCardProps {
  items: ReadinessItem[];
  colors: Colors;
  /** Called when "Complete setup" is pressed - navigates to first incomplete item */
  onCompleteSetup: () => void;
  /** Whether this is a team training (affects display) */
  isTeamTraining?: boolean;
}

const ICONS = {
  drill: Target,
  weapon: Shield,
  members: Users,
};

function ReadinessRow({ item, colors, isLast }: { item: ReadinessItem; colors: Colors; isLast: boolean }) {
  const Icon = ICONS[item.icon];
  const isComplete = item.isComplete;

  const content = (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {/* Status indicator */}
      <View
        style={[
          styles.statusIcon,
          {
            backgroundColor: isComplete ? colors.green + '15' : colors.orange + '15',
          },
        ]}
      >
        {isComplete ? (
          <Check size={14} color={colors.green} strokeWidth={3} />
        ) : (
          <AlertCircle size={14} color={colors.orange} />
        )}
      </View>

      {/* Label */}
      <View style={styles.rowContent}>
        <Icon
          size={14}
          color={isComplete ? colors.textMuted : colors.text}
          style={{ opacity: isComplete ? 0.5 : 0.8 }}
        />
        <Text
          style={[
            styles.rowLabel,
            {
              color: isComplete ? colors.textMuted : colors.text,
              textDecorationLine: isComplete ? 'line-through' : 'none',
              opacity: isComplete ? 0.7 : 1,
            },
          ]}
        >
          {item.label}
        </Text>
      </View>

      {/* Action indicator for incomplete items */}
      {!isComplete && item.onPress && <ChevronRight size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />}
    </View>
  );

  if (!isComplete && item.onPress) {
    return (
      <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function TrainingReadinessCard({ items, colors, onCompleteSetup }: TrainingReadinessCardProps) {
  const incompleteCount = items.filter((i) => !i.isComplete).length;
  const isReady = incompleteCount === 0;
  const totalCount = items.length;
  const completeCount = totalCount - incompleteCount;

  // Don't show if everything is ready
  if (isReady) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.orange + '30',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Training Setup</Text>
          <View style={[styles.progressPill, { backgroundColor: colors.orange + '15' }]}>
            <Text style={[styles.progressText, { color: colors.orange }]}>
              {completeCount}/{totalCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Checklist */}
      <View style={[styles.checklist, { borderColor: colors.border }]}>
        {items.map((item, index) => (
          <ReadinessRow key={item.id} item={item} colors={colors} isLast={index === items.length - 1} />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.orange }]}
        onPress={onCompleteSetup}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>Complete setup</Text>
        <ChevronRight size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  progressPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checklist: {
    marginHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
