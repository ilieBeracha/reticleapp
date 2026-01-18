import { SQUAD_TEMPLATES } from '@/helpers/team/squads';
import {
  addSquad,
  isDuplicateSquadName,
  isTeamNamePresent,
  normalizeSquadName,
  normalizeTeamDescription,
  normalizeTeamName,
  removeSquad,
} from '@/helpers/team/validation';
import { useTeamStore } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

/** Form step: basics, squads, success (weapon policy removed - weapons assigned directly) */
type FormStep = 'basics' | 'squads' | 'success';
type CreatedTeamSummary = { id: string; name: string };

/** Total number of form steps (excluding success) */
const TOTAL_STEPS = 2;

export function useCreateTeamForm() {
  const { createTeam, setActiveTeam } = useTeamStore();

  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [squads, setSquads] = useState<string[]>([]);
  const [newSquadName, setNewSquadName] = useState('');
  const [showSquadSection, setShowSquadSection] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('basics');
  const [createdTeam, setCreatedTeam] = useState<CreatedTeamSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedTeamName = useMemo(() => normalizeTeamName(teamName), [teamName]);
  
  /** Can proceed from step 1 (basics) to step 2 (squads) */
  const canProceedToSquads = useMemo(
    () => isTeamNamePresent(trimmedTeamName),
    [trimmedTeamName]
  );
  
  /** Can submit form (on step 3) */
  const canSubmit = useMemo(
    () => isTeamNamePresent(trimmedTeamName) && !submitting,
    [trimmedTeamName, submitting]
  );
  
  /** Current step number (1-indexed for display) */
  const currentStepNumber = formStep === 'basics' ? 1 : formStep === 'squads' ? 2 : 2;

  const toggleSquadSection = useCallback(() => {
    setShowSquadSection((v) => !v);
  }, []);

  /** Go to next step */
  const goToNextStep = useCallback(() => {
    Keyboard.dismiss();
    
    if (formStep === 'basics') {
      if (!canProceedToSquads) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Team Name Required', 'Please enter a name for your team.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFormStep('squads');
    }
    // From squads, user clicks "Create Team" button directly (no policy step)
  }, [formStep, canProceedToSquads]);

  /** Go to previous step */
  const goToPreviousStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (formStep === 'squads') {
      setFormStep('basics');
    }
  }, [formStep]);

  const handleCreate = useCallback(async () => {
    if (!isTeamNamePresent(trimmedTeamName)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Team Name Required', 'Please enter a name for your team.');
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const team = await createTeam({
        name: trimmedTeamName,
        description: normalizeTeamDescription(teamDescription) || undefined,
        squads: squads.length > 0 ? squads : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedTeam({ id: team.id, name: team.name });
      setFormStep('success');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  }, [trimmedTeamName, teamDescription, squads, createTeam]);

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
    const normalized = normalizeSquadName(newSquadName);
    if (!normalized) return;

    if (isDuplicateSquadName(squads, normalized)) {
      Alert.alert('Duplicate', 'This squad name already exists');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads(addSquad(squads, normalized));
    setNewSquadName('');
  }, [newSquadName, squads]);

  const handleRemoveSquad = useCallback(
    (squadName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads(removeSquad(squads, squadName));
    },
    [squads]
  );

  const handleApplyTemplate = useCallback((templateSquads: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSquads(templateSquads);
  }, []);

  const clearAllSquads = useCallback(() => setSquads([]), []);

  return {
    // State
    teamName,
    teamDescription,
    squads,
    newSquadName,
    showSquadSection,
    formStep,
    createdTeam,
    submitting,

    // Derived
    canSubmit,
    canProceedToSquads,
    trimmedTeamName,
    currentStepNumber,
    totalSteps: TOTAL_STEPS,
    squadTemplates: SQUAD_TEMPLATES,

    // Setters
    setTeamName,
    setTeamDescription,
    setNewSquadName,
    setShowSquadSection,

    // Actions
    toggleSquadSection,
    goToNextStep,
    goToPreviousStep,
    handleCreate,
    handleOpenTeam,
    handleAddSquad,
    handleRemoveSquad,
    handleApplyTemplate,
    clearAllSquads,
  };
}









