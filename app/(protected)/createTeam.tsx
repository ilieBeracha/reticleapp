import { useCreateTeamForm } from '@/hooks/team/useCreateTeamForm';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

/**
 * CREATE TEAM - Stepper Form Sheet
 * Step 1: Name and description
 * Step 2: Squads (weapons are assigned per-member, not via policy)
 */
export default function CreateTeamSheet() {
  const colors = useColors();

  const {
    teamName,
    teamDescription,
    squads,
    newSquadName,
    formStep,
    createdTeam,
    submitting,
    canSubmit,
    canProceedToSquads,
    currentStepNumber,
    totalSteps,
    squadTemplates,
    setTeamName,
    setTeamDescription,
    setNewSquadName,
    goToNextStep,
    goToPreviousStep,
    handleCreate,
    handleOpenTeam,
    handleAddSquad,
    handleRemoveSquad,
    handleApplyTemplate,
    clearAllSquads,
  } = useCreateTeamForm();

  // Success state
  if (formStep === 'success' && createdTeam) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.successTitle, { color: colors.text }]}>Team Created!</Text>

        <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
          <Text style={{ fontWeight: '600', color: colors.text }}>{createdTeam.name}</Text> is ready. You can invite
          team members anytime.
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
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
          {/* Header with Step Indicator */}
          <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Team</Text>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={styles.stepDots}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: i + 1 <= currentStepNumber ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.stepText, { color: colors.textMuted }]}>
              Step {currentStepNumber} of {totalSteps}
            </Text>
          </View>
        </View>

        {/* STEP 1: Name & Description */}
        {formStep === 'basics' && (
          <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutLeft.duration(200)}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What's your team?</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Basic information about your team</Text>

            {/* Team Name */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="flag" size={16} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>Team Name</Text>
                <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.background, borderColor: teamName ? colors.primary : colors.border },
                ]}
              >
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
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
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
          </Animated.View>
        )}

        {/* STEP 2: Squads */}
        {formStep === 'squads' && (
          <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutLeft.duration(200)}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Organize into squads</Text>
            <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
              Add sub-units to your team (optional)
            </Text>

            {/* Templates */}
            {squads.length === 0 && (
              <View style={styles.templatesSection}>
                <Text style={[styles.templatesLabel, { color: colors.textMuted }]}>Quick templates:</Text>
                <View style={styles.templateChips}>
                  {squadTemplates.map((template, index) => (
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
              <View
                style={[
                  styles.squadInputWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.squadInput, { color: colors.text }]}
                  placeholder="Enter squad name..."
                  placeholderTextColor={colors.textMuted}
                  value={newSquadName}
                  onChangeText={setNewSquadName}
                  onSubmitEditing={handleAddSquad}
                  returnKeyType="done"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.addSquadBtn,
                  { backgroundColor: newSquadName.trim() ? colors.primary : colors.muted },
                ]}
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
                  <View
                    key={squad}
                    style={[
                      styles.squadChip,
                      { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
                    ]}
                  >
                    <Ionicons name="shield" size={14} color={colors.primary} />
                    <Text style={[styles.squadChipText, { color: colors.primary }]}>{squad}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveSquad(squad)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Clear All */}
            {squads.length > 0 && (
              <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllSquads}>
                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                <Text style={[styles.clearAllText, { color: colors.destructive }]}>Clear all</Text>
              </TouchableOpacity>
            )}

            {/* Skip hint */}
            {squads.length === 0 && (
              <View style={[styles.infoCard, { backgroundColor: colors.secondary, marginTop: 20 }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  Squads are optional. You can skip this step and add them later.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

      </ScrollView>

      {/* Footer with Navigation - fixed at bottom */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {formStep === 'basics' && (
          <>
            <View style={styles.footerSpacer} />
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: canProceedToSquads ? colors.primary : colors.muted }]}
              onPress={goToNextStep}
              disabled={!canProceedToSquads}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {formStep === 'squads' && (
          <>
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.85 : 1,
                },
              ]}
              onPress={handleCreate}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.createButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Team</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 20 },

  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 12 },

  stepIndicator: { alignItems: 'center', gap: 8 },
  stepDots: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 32, height: 4, borderRadius: 2 },
  stepText: { fontSize: 13, fontWeight: '500' },

  stepTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, marginBottom: 20 },

  inputSection: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600' },
  required: { fontSize: 14, fontWeight: '600' },
  optional: { fontSize: 12, fontWeight: '500', marginLeft: 'auto' },
  inputWrapper: { borderRadius: 12, borderWidth: 1.5 },
  textAreaWrapper: { minHeight: 80 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 15 },
  textArea: { minHeight: 80, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  squadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
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
  squadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadChipText: { fontSize: 13, fontWeight: '600' },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  clearAllText: { fontSize: 13, fontWeight: '500' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 12, gap: 10 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  footerSpacer: { flex: 1 },

  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  backButtonText: { fontSize: 15, fontWeight: '500' },

  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 },
  successSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successActions: { width: '100%', gap: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
