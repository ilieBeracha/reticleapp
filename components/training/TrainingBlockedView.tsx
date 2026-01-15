/**
 * TrainingBlockedView - Shown when user cannot start training
 * 
 * Used when weapon policy requirements are not met:
 * - Assigned policy: No weapon assigned to user
 * - Catalog policy: No weapons in team catalog
 * - Personal policy: No personal weapons (rare)
 */

import {
  getWeaponPolicyConfig,
  type WeaponPolicy,
} from '@/constants/weaponPolicy';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { AlertTriangle, Lock, Package, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type BlockReason = 
  | 'no_assignment'      // Assigned policy, user has no weapon assigned
  | 'empty_catalog'      // Catalog policy, team has no weapons
  | 'no_personal_weapon' // Personal policy, user has no weapons
  | 'unknown';           // Fallback

export interface TrainingBlockedViewProps {
  /** The weapon policy causing the block */
  weaponPolicy: WeaponPolicy;
  /** Why training is blocked */
  reason: BlockReason;
  /** Commander's name (if available) - shown for "contact commander" messages */
  commanderName?: string;
  /** Team name for context */
  teamName?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getBlockedContent(
  reason: BlockReason,
  weaponPolicy: WeaponPolicy,
  commanderName?: string
): {
  icon: React.ReactNode;
  title: string;
  message: string;
  action: string;
  iconBgColor: string;
  iconColor: string;
} {
  switch (reason) {
    case 'no_assignment':
      return {
        icon: <Lock size={32} />,
        title: 'Weapon Required',
        message: 'Your commander must assign you a weapon before you can participate in training.',
        action: commanderName 
          ? `Contact ${commanderName} to get a weapon assigned`
          : 'Contact your commander to get a weapon assigned',
        iconBgColor: '#F59E0B15',
        iconColor: '#F59E0B',
      };
    
    case 'empty_catalog':
      return {
        icon: <Package size={32} />,
        title: 'No Weapons Available',
        message: 'The team weapon catalog is empty. Your commander needs to add weapons before training can begin.',
        action: commanderName
          ? `Contact ${commanderName} to add weapons to the catalog`
          : 'Contact your commander to add weapons',
        iconBgColor: '#3B82F615',
        iconColor: '#3B82F6',
      };
    
    case 'no_personal_weapon':
      return {
        icon: <User size={32} />,
        title: 'Add Your Weapon',
        message: 'This team allows personal weapons. Add your weapon to your loadout to start training.',
        action: 'Go to Loadout to add a weapon',
        iconBgColor: '#10B98115',
        iconColor: '#10B981',
      };
    
    default:
      return {
        icon: <AlertTriangle size={32} />,
        title: 'Cannot Start Training',
        message: 'There was an issue with weapon configuration. Please try again or contact your commander.',
        action: 'Try again later',
        iconBgColor: '#EF444415',
        iconColor: '#EF4444',
      };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrainingBlockedView({
  weaponPolicy,
  reason,
  commanderName,
  teamName,
  compact = false,
}: TrainingBlockedViewProps) {
  const colors = useColors();
  const policyConfig = getWeaponPolicyConfig(weaponPolicy);
  const content = getBlockedContent(reason, weaponPolicy, commanderName);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: content.iconBgColor, borderColor: content.iconColor }]}>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.text }]}>{content.title}</Text>
          <Text style={[styles.compactMessage, { color: colors.textMuted }]} numberOfLines={2}>
            {content.action}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Policy Badge */}
      <View style={[styles.policyBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name={policyConfig.icon as any} size={14} color={colors.textMuted} />
        <Text style={[styles.policyBadgeText, { color: colors.textMuted }]}>
          {policyConfig.label} Policy
        </Text>
      </View>

      {/* Main Content */}
      <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Icon */}
       

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.textMuted }]}>
          {content.message}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Action Hint */}
        <View style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: content.iconBgColor }]}>
            <Ionicons name="arrow-forward" size={14} color={content.iconColor} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {content.action}
          </Text>
        </View>
      </View>

      {/* Team Context */}
      {teamName && (
        <View style={[styles.teamContext, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.teamContextText, { color: colors.textMuted }]}>
            {teamName}
          </Text>
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  
  // Policy Badge
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  policyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Main Card
  mainCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    maxWidth: 340,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  
  // Team Context
  teamContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  teamContextText: {
    fontSize: 13,
  },
  
  // Compact Mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  compactIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactMessage: {
    fontSize: 13,
  },
});
