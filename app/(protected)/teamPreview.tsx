import { useModals } from "@/contexts/ModalContext";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * TEAM PREVIEW - Native Form Sheet
 * 
 * Shows team details from selectedTeam in ModalContext
 */
export default function TeamPreviewSheet() {
  const colors = useColors();
  const { selectedTeam: team } = useModals();

  if (!team) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No team selected</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
            <Ionicons name="people" size={32} color={colors.text} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{team.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {team.member_count || 0} {(team.member_count || 0) === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {team.description && (
          <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text }]}>{team.description}</Text>
          </View>
        )}

        {/* Squads */}
        <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Squads</Text>
          {team.squads && team.squads.length > 0 ? (
            <View style={styles.squadsList}>
              {team.squads.map((squad: string, index: number) => (
                <View key={index} style={[styles.squadBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.squadText, { color: colors.text }]}>{squad}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No squads defined</Text>
          )}
        </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 24 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '500' },

  section: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  description: { fontSize: 15, lineHeight: 22 },

  squadsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  squadBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  squadText: { fontSize: 14, fontWeight: '500' },
  emptyText: { fontSize: 15, fontStyle: 'italic' },
});

