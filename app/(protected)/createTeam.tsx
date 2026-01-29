import { SpecialtyPicker } from '@/components/teams/SpecialtyPicker';
import { useCreateTeamForm } from '@/hooks/team/useCreateTeamForm';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * CREATE TEAM - Stepper Form Sheet
 * Step 1: Name and description
 * Step 2: Team specialty (training focus)
 * Step 3: Squads
 */
export default function CreateTeamSheet() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    teamName,
    teamDescription,
    specialty,
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
    setSpecialty,
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

        <Text style={[styles.successTitle, { color: colors.text }]}>{t('teams.teamCreated')}</Text>

        <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
          {t('teams.teamReady', { teamName: createdTeam.name })}
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenTeam}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('teams.openTeam')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.card }]}
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
        <Text style={[styles.title, { color: colors.text }]}>{t('teams.createTeam')}</Text>

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
            {t('teams.step', { current: currentStepNumber, total: totalSteps })}
          </Text>
        </View>
      </View>

      {/* STEP 1: Name & Description */}
      {formStep === 'basics' && (
        <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutLeft.duration(200)}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{t('teams.whatsYourTeam')}</Text>
          <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>{t('teams.basicInfo')}</Text>

          {/* Team Name */}
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Ionicons name="flag" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('teams.teamNameLabel')}</Text>
              <Text style={[styles.required, { color: colors.destructive }]}>{t('common.required')}</Text>
            </View>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.background, borderColor: teamName ? colors.primary : colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('teams.teamNamePlaceholderExample')}
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
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('teams.descriptionLabel')}</Text>
              <Text style={[styles.optional, { color: colors.textMuted }]}>{t('common.optional')}</Text>
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
                placeholder={t('teams.whatsThisPurpose')}
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

      {/* STEP 2: Specialty */}
      {formStep === 'specialty' && (
        <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutLeft.duration(200)}>
          <SpecialtyPicker value={specialty} onChange={setSpecialty} allowNone />
        </Animated.View>
      )}

      {/* STEP 3: Squads */}
      {formStep === 'squads' && (
        <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutLeft.duration(200)}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {t('teams.organizeIntoSquads', { teamName: teamName || t('teams.team') })}
          </Text>
          <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>{t('teams.addSubUnits')}</Text>

          {/* Templates */}
          {squads.length === 0 && (
            <View style={styles.templatesSection}>
              <Text style={[styles.templatesLabel, { color: colors.textMuted }]}>{t('teams.quickTemplates')}</Text>
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
              style={[styles.squadInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <TextInput
                style={[styles.squadInput, { color: colors.text }]}
                placeholder={t('teams.enterSquadName')}
                placeholderTextColor={colors.textMuted}
                value={newSquadName}
                onChangeText={setNewSquadName}
                onSubmitEditing={handleAddSquad}
                returnKeyType="done"
                autoFocus
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
              <Text style={[styles.clearAllText, { color: colors.destructive }]}>{t('teams.clearAll')}</Text>
            </TouchableOpacity>
          )}

          {/* Skip hint */}
          {squads.length === 0 && (
            <View style={[styles.infoCard, { backgroundColor: colors.secondary, marginTop: 20 }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>{t('teams.squadsOptional')}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Navigation Buttons - inline at bottom of scroll content */}
      <View style={[styles.buttonsRow, { paddingBottom: Math.max(20, insets.bottom) }]}>
        {formStep === 'basics' && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: canProceedToSquads ? colors.primary : colors.muted }]}
            onPress={goToNextStep}
            disabled={!canProceedToSquads}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('common.continue')}</Text>
          </TouchableOpacity>
        )}

        {formStep === 'specialty' && (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={goToNextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{specialty ? t('common.continue') : t('common.skip')}</Text>
            </TouchableOpacity>
          </>
        )}

        {formStep === 'squads' && (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={goToPreviousStep}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: submitting ? 0.85 : 1 }]}
              onPress={handleCreate}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.primaryButtonText}>{t('common.creating')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>{t('teams.createTeam')}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

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

  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '500' },

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
