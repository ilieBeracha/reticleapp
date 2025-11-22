/**
 * 🏗️ TEAM HIERARCHY BUILDER
 * 
 * Visual drag-and-drop team structure builder
 * Shows commander at top, squad commanders, and soldiers
 */

import { getTeamRoleColor, getTeamRoleDisplayName } from "@/services/roleService";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

export interface TeamMemberUI {
  profile_id: string;
  display_name: string | null;
  role: 'commander' | 'squad_commander' | 'soldier';
  squad_id: string | null;
  avatar_url: string | null;
}

interface TeamHierarchyBuilderProps {
  teamMembers: TeamMemberUI[];
  updateMemberRole: (profileId: string, role: TeamMemberUI['role'], squadId?: string) => void;
  squads: string[];
  colors: any;
}

export default function TeamHierarchyBuilder({
  teamMembers,
  updateMemberRole,
  squads,
  colors
}: TeamHierarchyBuilderProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const commander = teamMembers.find(m => m.role === 'commander');
  const squadCommanders = teamMembers.filter(m => m.role === 'squad_commander');
  const soldiers = teamMembers.filter(m => m.role === 'soldier');

  const handleMemberPress = (member: TeamMemberUI) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMember(member.profile_id);
    
    Alert.alert(
      `Edit ${member.display_name || 'Member'}`,
      "Choose their role in the team:",
      [
        {
          text: "Commander",
          onPress: () => {
            // Check if we already have a commander
            if (commander && commander.profile_id !== member.profile_id) {
              Alert.alert(
                "Replace Commander?",
                `${commander.display_name} is already the commander. Replace with ${member.display_name}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Replace",
                    style: "destructive",
                    onPress: () => {
                      // Demote current commander to soldier
                      updateMemberRole(commander.profile_id, 'soldier');
                      // Promote new commander
                      updateMemberRole(member.profile_id, 'commander');
                    }
                  }
                ]
              );
            } else {
              updateMemberRole(member.profile_id, 'commander');
            }
            setSelectedMember(null);
          }
        },
        {
          text: "Squad Commander",
          onPress: () => {
            if (squads.length > 0) {
              // Show squad selection
              Alert.alert(
                "Select Squad",
                "Which squad should they command?",
                [
                  ...squads.map(squad => ({
                    text: squad,
                    onPress: () => {
                      updateMemberRole(member.profile_id, 'squad_commander', squad);
                      setSelectedMember(null);
                    }
                  })),
                  { text: "No Squad", onPress: () => {
                    updateMemberRole(member.profile_id, 'squad_commander');
                    setSelectedMember(null);
                  }},
                  { text: "Cancel", style: "cancel", onPress: () => setSelectedMember(null) }
                ]
              );
            } else {
              updateMemberRole(member.profile_id, 'squad_commander');
              setSelectedMember(null);
            }
          }
        },
        {
          text: "Soldier",
          onPress: () => {
            updateMemberRole(member.profile_id, 'soldier');
            setSelectedMember(null);
          }
        },
        { text: "Cancel", style: "cancel", onPress: () => setSelectedMember(null) }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Commander Section */}
      <View style={styles.roleSection}>
        <View style={styles.roleSectionHeader}>
          <View style={[styles.roleIcon, { backgroundColor: getTeamRoleColor('commander') + '20' }]}>
            <Ionicons name="star" size={20} color={getTeamRoleColor('commander')} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.text }]}>Team Commander</Text>
          <Text style={[styles.roleCount, { color: colors.textMuted }]}>
            {commander ? '1/1' : '0/1'}
          </Text>
        </View>
        
        <View style={[styles.roleDropZone, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {commander ? (
            <TeamMemberCard
              member={commander}
              onPress={() => handleMemberPress(commander)}
              selected={selectedMember === commander.profile_id}
              colors={colors}
            />
          ) : (
            <View style={[styles.emptySlot, { borderColor: colors.border }]}>
              <Ionicons name="person-add-outline" size={24} color={colors.textMuted} />
              <Text style={[styles.emptySlotText, { color: colors.textMuted }]}>
                Tap a member to assign as commander
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Squad Commanders Section */}
      <View style={styles.roleSection}>
        <View style={styles.roleSectionHeader}>
          <View style={[styles.roleIcon, { backgroundColor: getTeamRoleColor('squad_commander') + '20' }]}>
            <Ionicons name="ribbon" size={20} color={getTeamRoleColor('squad_commander')} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.text }]}>Squad Commanders</Text>
          <Text style={[styles.roleCount, { color: colors.textMuted }]}>
            {squadCommanders.length}/{squads.length || '∞'}
          </Text>
        </View>
        
        <View style={[styles.roleDropZone, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {squadCommanders.length > 0 ? (
            <View style={styles.membersGrid}>
              {squadCommanders.map((member) => (
                <TeamMemberCard
                  key={member.profile_id}
                  member={member}
                  onPress={() => handleMemberPress(member)}
                  selected={selectedMember === member.profile_id}
                  colors={colors}
                  showSquad={true}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptySlot, { borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={24} color={colors.textMuted} />
              <Text style={[styles.emptySlotText, { color: colors.textMuted }]}>
                Tap members to assign as squad commanders
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Soldiers Section */}
      <View style={styles.roleSection}>
        <View style={styles.roleSectionHeader}>
          <View style={[styles.roleIcon, { backgroundColor: getTeamRoleColor('soldier') + '20' }]}>
            <Ionicons name="shield" size={20} color={getTeamRoleColor('soldier')} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.text }]}>Soldiers</Text>
          <Text style={[styles.roleCount, { color: colors.textMuted }]}>
            {soldiers.length}
          </Text>
        </View>
        
        <View style={[styles.roleDropZone, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {soldiers.length > 0 ? (
            <View style={styles.membersGrid}>
              {soldiers.map((member) => (
                <TeamMemberCard
                  key={member.profile_id}
                  member={member}
                  onPress={() => handleMemberPress(member)}
                  selected={selectedMember === member.profile_id}
                  colors={colors}
                  showSquad={true}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptySlot, { borderColor: colors.border }]}>
              <Ionicons name="shield-outline" size={24} color={colors.textMuted} />
              <Text style={[styles.emptySlotText, { color: colors.textMuted }]}>
                Remaining members will be soldiers
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const TeamMemberCard = ({ member, onPress, selected, colors, showSquad = false }: any) => (
  <Pressable
    style={[
      styles.memberCard,
      {
        backgroundColor: selected ? colors.primary + '20' : colors.background,
        borderColor: selected ? colors.primary : colors.border,
      }
    ]}
    onPress={onPress}
  >
    <View style={[styles.memberAvatar, { backgroundColor: getTeamRoleColor(member.role) + '20' }]}>
      <Ionicons name="person" size={16} color={getTeamRoleColor(member.role)} />
    </View>
    
    <View style={styles.memberInfo}>
      <Text style={[styles.memberName, { color: colors.text }]}>
        {member.display_name || 'Member'}
      </Text>
      <View style={styles.memberRoleBadge}>
        <Text style={[styles.memberRoleText, { color: getTeamRoleColor(member.role) }]}>
          {getTeamRoleDisplayName(member.role)}
        </Text>
      </View>
      {showSquad && member.squad_id && (
        <View style={[styles.squadBadge, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.squadBadgeText, { color: colors.primary }]}>
            {member.squad_id}
          </Text>
        </View>
      )}
    </View>
  </Pressable>
);

export function TeamHierarchyPreview({ preview, colors }: { preview: any, colors: any }) {
  return (
    <View style={styles.hierarchyPreview}>
      {/* Commander */}
      {preview.commander && (
        <View style={styles.commanderSection}>
          <Text style={[styles.hierarchyLabel, { color: colors.text }]}>Commander</Text>
          <View style={[styles.commanderCard, { backgroundColor: getTeamRoleColor('commander') + '10', borderColor: getTeamRoleColor('commander') }]}>
            <Ionicons name="star" size={16} color={getTeamRoleColor('commander')} />
            <Text style={[styles.hierarchyMemberName, { color: colors.text }]}>
              {preview.commander.display_name}
            </Text>
          </View>
        </View>
      )}

      {/* Squad Commanders */}
      {preview.squad_commanders.length > 0 && (
        <View style={styles.squadCommandersSection}>
          <Text style={[styles.hierarchyLabel, { color: colors.text }]}>Squad Commanders</Text>
          <View style={styles.squadCommandersGrid}>
            {preview.squad_commanders.map((sc: any) => (
              <View key={sc.profile_id} style={[styles.squadCommanderCard, { backgroundColor: getTeamRoleColor('squad_commander') + '10' }]}>
                <Ionicons name="ribbon" size={14} color={getTeamRoleColor('squad_commander')} />
                <Text style={[styles.hierarchyMemberName, { color: colors.text, fontSize: 12 }]}>
                  {sc.display_name}
                </Text>
                {sc.squad_id && (
                  <Text style={[styles.squadLabel, { color: colors.textMuted }]}>
                    {sc.squad_id}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Soldiers */}
      {preview.soldiers.length > 0 && (
        <View style={styles.soldiersSection}>
          <Text style={[styles.hierarchyLabel, { color: colors.text }]}>Soldiers ({preview.soldiers.length})</Text>
          <View style={styles.soldiersGrid}>
            {preview.soldiers.map((soldier: any) => (
              <View key={soldier.profile_id} style={[styles.soldierCard, { backgroundColor: getTeamRoleColor('soldier') + '10' }]}>
                <Ionicons name="shield" size={12} color={getTeamRoleColor('soldier')} />
                <Text style={[styles.hierarchyMemberName, { color: colors.text, fontSize: 11 }]}>
                  {soldier.display_name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  roleCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleDropZone: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  emptySlot: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptySlotText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberRoleBadge: {
    alignSelf: 'flex-start',
  },
  memberRoleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  squadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  squadBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Preview styles
  hierarchyPreview: {
    gap: 16,
  },
  commanderSection: {
    alignItems: 'center',
    gap: 8,
  },
  hierarchyLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  commanderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadCommandersSection: {
    gap: 8,
  },
  squadCommandersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  squadCommanderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  soldiersSection: {
    gap: 8,
  },
  soldiersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  soldierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  hierarchyMemberName: {
    fontSize: 12,
    fontWeight: '600',
  },
  squadLabel: {
    fontSize: 10,
    fontStyle: 'italic',
  },
});
