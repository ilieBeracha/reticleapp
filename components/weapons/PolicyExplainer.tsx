/**
 * PolicyExplainer - Explains weapon policy and required actions
 * 
 * Used in multiple places to help users understand:
 * - What the current policy means
 * - What they need to do (member vs commander)
 * - Current status (e.g., "2 of 5 members have weapons")
 */

import {
  getWeaponPolicyConfig,
  isAssignedPolicy,
  isCatalogPolicy,
  isPersonalPolicy,
  type WeaponPolicy,
} from '@/constants/weaponPolicy';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Lock, Package, User, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'member' | 'commander' | 'owner';

export interface PolicyExplainerProps {
  /** The weapon policy to explain */
  policy: WeaponPolicy;
  /** User's role in the team */
  userRole: UserRole;
  /** Whether user has a weapon (assigned or selected) */
  hasWeapon?: boolean;
  /** For commanders: number of members with weapons assigned */
  assignedCount?: number;
  /** For commanders: total number of members */
  totalMembers?: number;
  /** Number of weapons in team catalog */
  catalogCount?: number;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Show action button */
  showAction?: boolean;
  /** Action button callback */
  onAction?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

interface PolicyContent {
  icon: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  memberTitle: string;
  memberDescription: string;
  commanderTitle: string;
  commanderDescription: string;
  memberAction?: string;
  commanderAction?: string;
}

function getPolicyContent(policy: WeaponPolicy): PolicyContent {
  if (isAssignedPolicy(policy)) {
    return {
      icon: <Lock size={20} />,
      iconColor: '#F59E0B',
      iconBgColor: '#F59E0B15',
      memberTitle: 'Weapon Assigned by Commander',
      memberDescription: 'Your commander assigns you a specific weapon. You cannot train until you have an assigned weapon.',
      commanderTitle: 'You Assign Weapons to Members',
      commanderDescription: 'Members cannot train until you assign them a weapon. Each member needs exactly one weapon.',
      memberAction: 'View Your Assigned Weapon',
      commanderAction: 'Manage Assignments',
    };
  }
  
  if (isCatalogPolicy(policy)) {
    return {
      icon: <Package size={20} />,
      iconColor: '#3B82F6',
      iconBgColor: '#3B82F615',
      memberTitle: 'Choose from Team Catalog',
      memberDescription: 'Select any weapon from the team catalog for each training session. You can set a default weapon.',
      commanderTitle: 'Manage Team Weapon Catalog',
      commanderDescription: 'Add weapons to the team catalog. Members choose from available weapons each session.',
      memberAction: 'Browse Catalog',
      commanderAction: 'Manage Catalog',
    };
  }
  
  // Personal policy
  return {
    icon: <User size={20} />,
    iconColor: '#10B981',
    iconBgColor: '#10B98115',
    memberTitle: 'Bring Your Own Weapon',
    memberDescription: 'Use your personal weapons for training. You can also share your weapons with the team catalog.',
    commanderTitle: 'Members Use Personal Weapons',
    commanderDescription: 'Members bring their own weapons. They can optionally share weapons to a team catalog.',
    memberAction: 'Go to My Loadout',
    commanderAction: 'View Shared Weapons',
  };
}

function getStatusContent(
  policy: WeaponPolicy,
  userRole: UserRole,
  hasWeapon?: boolean,
  assignedCount?: number,
  totalMembers?: number,
  catalogCount?: number
): { icon: React.ReactNode; text: string; color: string } | null {
  const isCommander = userRole === 'commander' || userRole === 'owner';
  
  if (isAssignedPolicy(policy)) {
    if (isCommander && assignedCount !== undefined && totalMembers !== undefined) {
      const allAssigned = assignedCount >= totalMembers;
      return {
        icon: allAssigned ? <CheckCircle size={14} /> : <AlertCircle size={14} />,
        text: `${assignedCount} of ${totalMembers} members have weapons`,
        color: allAssigned ? '#10B981' : '#F59E0B',
      };
    }
    if (!isCommander) {
      return {
        icon: hasWeapon ? <CheckCircle size={14} /> : <AlertCircle size={14} />,
        text: hasWeapon ? 'You have a weapon assigned' : 'No weapon assigned',
        color: hasWeapon ? '#10B981' : '#F59E0B',
      };
    }
  }
  
  if (isCatalogPolicy(policy) && catalogCount !== undefined) {
    return {
      icon: catalogCount > 0 ? <CheckCircle size={14} /> : <AlertCircle size={14} />,
      text: catalogCount > 0 ? `${catalogCount} weapon${catalogCount !== 1 ? 's' : ''} in catalog` : 'No weapons in catalog',
      color: catalogCount > 0 ? '#10B981' : '#F59E0B',
    };
  }
  
  if (isPersonalPolicy(policy) && !isCommander) {
    return {
      icon: hasWeapon ? <CheckCircle size={14} /> : <Info size={14} />,
      text: hasWeapon ? 'Ready to train' : 'Add a weapon to your loadout',
      color: hasWeapon ? '#10B981' : '#3B82F6',
    };
  }
  
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PolicyExplainer({
  policy,
  userRole,
  hasWeapon,
  assignedCount,
  totalMembers,
  catalogCount,
  compact = false,
  showAction = false,
  onAction,
}: PolicyExplainerProps) {
  const colors = useColors();
  const policyConfig = getWeaponPolicyConfig(policy);
  const content = getPolicyContent(policy);
  const status = getStatusContent(policy, userRole, hasWeapon, assignedCount, totalMembers, catalogCount);
  
  const isCommander = userRole === 'commander' || userRole === 'owner';
  const title = isCommander ? content.commanderTitle : content.memberTitle;
  const description = isCommander ? content.commanderDescription : content.memberDescription;
  const actionText = isCommander ? content.commanderAction : content.memberAction;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: content.iconBgColor, borderColor: content.iconColor }]}>
        <View style={[styles.compactIconWrapper, { backgroundColor: content.iconBgColor }]}>
          {React.cloneElement(content.icon as React.ReactElement, { 
            size: 18, 
            color: content.iconColor 
          })}
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.text }]}>{policyConfig.label}</Text>
          <Text style={[styles.compactHint, { color: colors.textMuted }]} numberOfLines={1}>
            {policyConfig.hint}
          </Text>
        </View>
        <Ionicons name={policyConfig.icon as any} size={18} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: content.iconBgColor }]}>
          {React.cloneElement(content.icon as React.ReactElement, { 
            size: 20, 
            color: content.iconColor 
          })}
        </View>
        <View style={styles.headerText}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.policyLabel, { color: content.iconColor }]}>
              {policyConfig.label}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.roleBadgeText, { color: colors.textMuted }]}>
                {isCommander ? 'Commander' : 'Member'}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      
      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]}>
        {description}
      </Text>
      
      {/* Status */}
      {status && (
        <View style={[styles.statusRow, { backgroundColor: `${status.color}10` }]}>
          {React.cloneElement(status.icon as React.ReactElement, { color: status.color })}
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>
      )}
      
      {/* Action */}
      {showAction && actionText && onAction && (
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: content.iconBgColor }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: content.iconColor }]}>
            {actionText}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={content.iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  // Description
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Action
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Compact Mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  compactIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactHint: {
    fontSize: 12,
  },
});
