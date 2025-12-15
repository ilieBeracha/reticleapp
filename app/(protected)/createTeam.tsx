import { useColors } from "@/hooks/ui/useColors";
import { useTeamStore } from "@/store/teamStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Squad templates
const SQUAD_TEMPLATES = [
  { label: 'Alpha, Bravo, Charlie', squads: ['Alpha', 'Bravo', 'Charlie'] },
  { label: '1st, 2nd, 3rd', squads: ['1st Squad', '2nd Squad', '3rd Squad'] },
  { label: 'Red, Blue, Green', squads: ['Red', 'Blue', 'Green'] },
];

/**
 * CREATE TEAM - Native Form Sheet
 * Team-First Architecture: Teams are the primary entity
 */
export default function CreateTeamSheet() {
  const colors = useColors();
  const { createTeam, setActiveTeam } = useTeamStore();

  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [squads, setSquads] = useState<string[]>([]);
  const [newSquadName, setNewSquadName] = useState("");
  const [showSquadSection, setShowSquadSection] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdTeam, setCreatedTeam] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!teamName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Team Name Required", "Please enter a name for your team.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const team = await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
        squads: squads.length > 0 ? squads : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedTeam({ id: team.id, name: team.name });
      setStep('success');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  }, [teamName, teamDescription, squads, createTeam]);

  const handleOpenTeam = useCallback(() => {
    if (!createdTeam) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(createdTeam.id);
    
    // Navigate to home (dismiss the sheet)
    if (router.canDismiss()) {
      router.dismiss();
    }
  }, [createdTeam, setActiveTeam]);

  const handleAddSquad = useCallback(() => {
    const trimmedName = newSquadName.trim();
    if (!trimmedName) return;

    if (squads.includes(trimmedName)) {
      Alert.alert("Duplicate", "This squad name already exists");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads([...squads, trimmedName]);
    setNewSquadName("");
  }, [newSquadName, squads]);

  const handleRemoveSquad = useCallback((squadName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads(squads.filter(s => s !== squadName));
  }, [squads]);

  const handleApplyTemplate = useCallback((template: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads(template);
  }, []);

  // Success state
  if (step === 'success' && createdTeam) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
        </View>
        
        <Text style={[styles.successTitle, { color: colors.text }]}>
          Team Created!
        </Text>
        
        <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
          <Text style={{ fontWeight: '600', color: colors.text }}>{createdTeam.name}</Text>
          {' '}is ready. You can invite team members anytime.
        </Text>
        
        <View style={styles.successActions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenTeam}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Team</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Start training together with your team
          </Text>
        </View>

        {/* Team Name */}
        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Ionicons name="flag" size={16} color={colors.primary} />
            <Text style={[styles.inputLabel, { color: colors.text }]}>Team Name</Text>
            <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: teamName ? colors.primary : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Alpha Team, First Platoon..."
              placeholderTextColor={colors.textMuted}
              value={teamName}
              onChangeText={setTeamName}
              returnKeyType="next"
              autoCapitalize="words"
              autoFocus
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <Text style={[styles.optional, { color: colors.textMuted }]}>optional</Text>
          </View>
          <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="What's this team's purpose?"
              placeholderTextColor={colors.textMuted}
              value={teamDescription}
              onChangeText={setTeamDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Squads Toggle */}
        <TouchableOpacity
          style={[styles.squadToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowSquadSection(!showSquadSection)}
          activeOpacity={0.7}
        >
          <View style={styles.squadToggleLeft}>
            <View style={[styles.squadToggleIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="shield-outline" size={18} color={colors.text} />
            </View>
            <View>
              <Text style={[styles.squadToggleTitle, { color: colors.text }]}>Add Squads</Text>
              <Text style={[styles.squadToggleDesc, { color: colors.textMuted }]}>
                {squads.length > 0 ? `${squads.length} squad${squads.length > 1 ? 's' : ''} added` : 'Organize into sub-units'}
              </Text>
            </View>
          </View>
          <Ionicons name={showSquadSection ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Squads Section */}
        {showSquadSection && (
          <View style={[styles.squadSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Templates */}
            {squads.length === 0 && (
              <View style={styles.templatesSection}>
                <Text style={[styles.templatesLabel, { color: colors.textMuted }]}>Quick templates:</Text>
                <View style={styles.templateChips}>
                  {SQUAD_TEMPLATES.map((template, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.templateChip, { backgroundColor: colors.secondary }]}
                      onPress={() => handleApplyTemplate(template.squads)}
                    >
                      <Text style={[styles.templateChipText, { color: colors.text }]}>{template.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Squad Input */}
            <View style={styles.squadInputRow}>
              <View style={[styles.squadInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.squadInput, { color: colors.text }]}
                  placeholder="Enter squad name..."
                  placeholderTextColor={colors.textMuted}
                  value={newSquadName}
                  onChangeText={setNewSquadName}
                  onSubmitEditing={handleAddSquad}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={[styles.addSquadBtn, { backgroundColor: newSquadName.trim() ? colors.primary : colors.muted }]}
                onPress={handleAddSquad}
                disabled={!newSquadName.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Squad Chips */}
            {squads.length > 0 && (
              <View style={styles.squadChipsContainer}>
                {squads.map((squad) => (
                  <View key={squad} style={[styles.squadChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="shield" size={14} color={colors.primary} />
                    <Text style={[styles.squadChipText, { color: colors.primary }]}>{squad}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSquad(squad)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Clear All */}
            {squads.length > 0 && (
              <TouchableOpacity style={styles.clearAllBtn} onPress={() => setSquads([])}>
                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                <Text style={[styles.clearAllText, { color: colors.destructive }]}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            You'll be the team owner. Invite members and assign roles after creating.
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton, 
            { 
              backgroundColor: teamName.trim() ? colors.primary : colors.muted,
              opacity: submitting ? 0.85 : 1,
            }
          ]}
          onPress={handleCreate}
          disabled={!teamName.trim() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.createButtonText}>Creating...</Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Team</Text>
            </>
          )}
        </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  inputSection: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600' },
  required: { fontSize: 14, fontWeight: '600' },
  optional: { fontSize: 12, fontWeight: '500', marginLeft: 'auto' },
  inputWrapper: { borderRadius: 12, borderWidth: 1.5 },
  textAreaWrapper: { minHeight: 80 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 15 },
  textArea: { minHeight: 80, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  squadToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  squadToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  squadToggleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  squadToggleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  squadToggleDesc: { fontSize: 12 },

  squadSection: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  templatesSection: { marginBottom: 14 },
  templatesLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  templateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  templateChipText: { fontSize: 13, fontWeight: '500' },
  squadInputRow: { flexDirection: 'row', gap: 8 },
  squadInputWrapper: { flex: 1, borderRadius: 10, borderWidth: 1 },
  squadInput: { height: 44, paddingHorizontal: 12, fontSize: 14 },
  addSquadBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  squadChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  squadChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  squadChipText: { fontSize: 13, fontWeight: '600' },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 8 },
  clearAllText: { fontSize: 13, fontWeight: '500' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, gap: 10, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  successSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successActions: { width: '100%', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
