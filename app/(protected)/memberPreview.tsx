import { BaseAvatar } from "@/components/BaseAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { useModals } from "@/contexts/ModalContext";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * MEMBER PREVIEW - Native Form Sheet
 * 
 * Shows member details from selectedMember in ModalContext
 */
export default function MemberPreviewSheet() {
  const colors = useColors();
  const { selectedMember: member } = useModals();

  if (!member) {
    return (
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
        <View style={styles.grabberSpacer} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No member selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = member.role === 'owner';

  const handleViewActivity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Activity tracking will be available soon');
  };

  const handleEditRole = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Role editing will be available soon');
  };

  const handleRemoveMember = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.profile_full_name || 'this member'} from the workspace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => Alert.alert('Coming Soon', 'Member removal will be available soon') },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="lg" role={member.role} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{member.profile_full_name || 'Unknown'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{member.profile_email}</Text>
            <View style={styles.roleBadgeContainer}>
              <RoleBadge role={member.role} />
            </View>
          </View>
        </View>

        {/* Teams Section */}
        {member.teams && member.teams.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Teams</Text>
            <View style={styles.teamsList}>
              {member.teams.map((team: any, index: number) => (
                <View key={team.team_id || index} style={[styles.teamBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="people" size={14} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.teamText, { color: colors.text }]}>{team.team_name || 'Unknown Team'}</Text>
                  {team.team_role && (
                    <Text style={[styles.teamRoleText, { color: colors.textMuted }]}> • {team.team_role}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions Section */}
        <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Actions</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={[styles.actionButton, { borderBottomColor: colors.border }]} onPress={handleViewActivity} activeOpacity={0.7}>
              <View style={styles.actionContent}>
                <Ionicons name="stats-chart" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>View Activity</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border }]}
              onPress={handleEditRole}
              activeOpacity={0.7}
              disabled={isOwner}
            >
              <View style={styles.actionContent}>
                <Ionicons name="shield-checkmark" size={20} color={isOwner ? colors.textMuted : colors.text} style={{ opacity: isOwner ? 0.4 : 1 }} />
                <Text style={[styles.actionText, { color: isOwner ? colors.textMuted : colors.text, opacity: isOwner ? 0.4 : 1 }]}>Edit Role</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: isOwner ? 0.4 : 1 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleRemoveMember} activeOpacity={0.7} disabled={isOwner}>
              <View style={styles.actionContent}>
                <Ionicons name="person-remove" size={20} color={isOwner ? colors.textMuted : '#ef4444'} style={{ opacity: isOwner ? 0.4 : 1 }} />
                <Text style={[styles.actionText, { color: isOwner ? colors.textMuted : '#ef4444', opacity: isOwner ? 0.4 : 1 }]}>Remove Member</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: isOwner ? 0.4 : 1 }} />
            </TouchableOpacity>
          </View>
        </View>

        {isOwner && (
          <Text style={[styles.ownerNote, { color: colors.textMuted }]}>Workspace owners cannot be edited or removed</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  grabberSpacer: { height: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 24 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emptyText: { fontSize: 15, fontStyle: 'italic' },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  roleBadgeContainer: { marginTop: 8, alignSelf: 'flex-start' },

  section: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  teamsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  teamText: { fontSize: 14, fontWeight: '500' },
  teamRoleText: { fontSize: 12, fontWeight: '400' },

  actionsList: { gap: 0 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { fontSize: 15, fontWeight: '500' },

  ownerNote: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 },
});

