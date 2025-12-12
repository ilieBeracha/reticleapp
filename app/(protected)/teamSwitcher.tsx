import { useColors } from "@/hooks/ui/useColors";
import { useTeamStore } from "@/store/teamStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router, useSegments } from "expo-router";
import React, { useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * TEAM SWITCHER - Native Form Sheet
 * 
 * Lists teams and allows switching between them.
 * Dismisses sheet first, then navigates to prevent white screen issues.
 */
export default function TeamSwitcherSheet() {
  const colors = useColors();
  const { teams, activeTeamId, setActiveTeam } = useTeamStore();
  const segments = useSegments() as unknown as string[];
  
  // Determine if we're currently in team or personal mode
  const isCurrentlyInTeamMode = segments.includes('team');
  const modeLabel = isCurrentlyInTeamMode ? 'Team mode' : 'Personal mode';

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) router.back();
  }, []);

  const handleSelectTeam = useCallback((teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(teamId);
    
    // Dismiss sheet first, then navigate if needed
    router.back();
    
    // Only navigate if we're not already in team mode
    if (!isCurrentlyInTeamMode) {
      // Small delay to allow sheet dismissal animation
      setTimeout(() => {
        router.replace('/(protected)/team');
      }, 50);
    }
  }, [setActiveTeam, isCurrentlyInTeamMode]);

  const handleSwitchToPersonal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(null);
    
    // Dismiss sheet first, then navigate if needed
    router.back();
    
    // Only navigate if we're not already in personal mode
    if (isCurrentlyInTeamMode) {
      // Small delay to allow sheet dismissal animation
      setTimeout(() => {
        router.replace('/(protected)/personal');
      }, 50);
    }
  }, [setActiveTeam, isCurrentlyInTeamMode]);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/createTeam' as any);
  }, []);

  const handleJoinTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/acceptInvite' as any);
  }, []);

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Sheet header (grabber + close) */}
      <View style={styles.sheetHeader}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Your Teams</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countText, { color: colors.text }]}>{teams.length}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Currently in {modeLabel}. Switch context anytime.
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleJoinTeam}
            activeOpacity={0.7}
          >
            <Ionicons name="enter-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreateTeam}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Personal Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERSONAL</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.rowInCard,
              !activeTeamId && { backgroundColor: colors.primary + '0F' },
            ]}
            onPress={handleSwitchToPersonal}
            activeOpacity={0.7}
          >
            <View style={[styles.activeBar, { backgroundColor: colors.primary, opacity: !activeTeamId ? 1 : 0 }]} />

            <View style={[styles.rowAvatar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="person" size={18} color={colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowName, { color: colors.text }]}>Personal Mode</Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>Train independently</Text>
            </View>
            {!activeTeamId && (
              <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Teams List */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MY TEAMS</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {teams.map((team, idx) => (
            <View key={team.id}>
              <TeamRow
                name={team.name}
                role={team.my_role}
                memberCount={team.member_count || 0}
                isActive={team.id === activeTeamId}
                isOwner={team.my_role === 'owner'}
                onPress={() => handleSelectTeam(team.id)}
                colors={colors}
              />
              {idx < teams.length - 1 && (
                <View style={[styles.rowSeparator, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Empty State */}
      {teams.length === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No teams yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Create a team or join one with an invite code.
          </Text>

          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={[styles.emptyPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateTeam}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyPrimaryText}>Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptySecondaryBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleJoinTeam}
              activeOpacity={0.7}
            >
              <Ionicons name="enter-outline" size={18} color={colors.primary} />
              <Text style={[styles.emptySecondaryText, { color: colors.text }]}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function formatRoleLabel(role: string) {
  if (role === 'commander' || role === 'team_commander') return 'Team Commander';
  if (role === 'squad_commander') return 'Squad Commander';
  if (role === 'owner') return 'Owner';
  return 'Soldier';
}

function getRolePill(role: string) {
  const normalized = role === 'commander' ? 'team_commander' : role;
  switch (normalized) {
    case 'owner':
      return { icon: 'shield-checkmark' as const, tone: '#8B5CF6' };
    case 'team_commander':
      return { icon: 'shield' as const, tone: '#EF4444' };
    case 'squad_commander':
      return { icon: 'shield-half' as const, tone: '#F59E0B' };
    default:
      return { icon: 'person' as const, tone: '#10B981' };
  }
}

// Team Row Component
const TeamRow = React.memo(function TeamRow({
  name,
  role,
  memberCount,
  isActive,
  isOwner,
  onPress,
  colors,
}: {
  name: string;
  role: string;
  memberCount: number;
  isActive: boolean;
  isOwner?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const roleLabel = formatRoleLabel(role);
  const pill = getRolePill(role);
  
  return (
    <TouchableOpacity
      style={[
        styles.rowInCard,
        isActive && { backgroundColor: colors.primary + '0F' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.activeBar, { backgroundColor: colors.primary, opacity: isActive ? 1 : 0 }]} />

      <View style={[styles.rowAvatar, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.rowInitial, { color: colors.primary }]}>
          {name?.charAt(0).toUpperCase() || 'T'}
        </Text>
      </View>
      
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.rolePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={pill.icon} size={12} color={pill.tone} />
            <Text style={[styles.rolePillText, { color: colors.textMuted }]}>{roleLabel}</Text>
          </View>
          <Text style={[styles.membersMeta, { color: colors.textMuted }]}>{memberCount} members</Text>
          {isOwner && (
            <View style={[styles.ownerTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.ownerTagText, { color: colors.primary }]}>Owner</Text>
            </View>
          )}
        </View>
      </View>
      
      {isActive && (
        <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerSection: {
    paddingTop: 16,
    paddingBottom: 18,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: -6,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  rowInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowSeparator: {
    height: 1,
    marginLeft: 12,
  },
  activeBar: {
    width: 3,
    height: 28,
    borderRadius: 999,
    marginRight: 10,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowInitial: {
    fontSize: 17,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  membersMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  ownerTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  ownerTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActions: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  emptyPrimaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySecondaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  emptySecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
