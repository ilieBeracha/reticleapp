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
  const segments = useSegments();
  
  // Determine if we're currently in team or personal mode
  const isCurrentlyInTeamMode = segments.includes('team');

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
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
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
        <TouchableOpacity
          style={[styles.row, !activeTeamId && { backgroundColor: colors.primary + '10' }]}
          onPress={handleSwitchToPersonal}
          activeOpacity={0.7}
        >
          <View style={[styles.rowAvatar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="person" size={18} color={colors.text} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowName, { color: colors.text }]}>Personal Mode</Text>
            <Text style={[styles.rowRole, { color: colors.textMuted }]}>Train independently</Text>
          </View>
          {!activeTeamId && (
            <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Teams List */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MY TEAMS</Text>
        {teams.map(team => (
          <TeamRow
            key={team.id}
            name={team.name}
            role={team.my_role}
            memberCount={team.member_count || 0}
            isActive={team.id === activeTeamId}
            isOwner={team.my_role === 'owner'}
            onPress={() => handleSelectTeam(team.id)}
            colors={colors}
          />
        ))}
      </View>

      {/* Empty State */}
      {teams.length === 0 && (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No teams yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Create a team or join one with an invite code
          </Text>
        </View>
      )}
    </ScrollView>
  );
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
  const roleLabel = role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return (
    <TouchableOpacity
      style={[styles.row, isActive && { backgroundColor: colors.primary + '10' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
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
          <Text style={[styles.rowRole, { color: colors.textMuted }]}>{roleLabel}</Text>
          <Text style={[styles.rowDot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.rowRole, { color: colors.textMuted }]}>{memberCount} members</Text>
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
  },
  headerSection: {
    paddingTop: 24,
    paddingBottom: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
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
    fontWeight: '500',
    marginBottom: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowRole: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  rowDot: {
    fontSize: 10,
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
});
