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

type Step = 'form' | 'success';
type CreatedTeamSummary = { id: string; name: string };

export function useCreateTeamForm() {
  const { createTeam, setActiveTeam } = useTeamStore();

  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [squads, setSquads] = useState<string[]>([]);
  const [newSquadName, setNewSquadName] = useState('');
  const [showSquadSection, setShowSquadSection] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [createdTeam, setCreatedTeam] = useState<CreatedTeamSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedTeamName = useMemo(() => normalizeTeamName(teamName), [teamName]);
  const canSubmit = useMemo(
    () => isTeamNamePresent(trimmedTeamName) && !submitting,
    [trimmedTeamName, submitting]
  );

  const toggleSquadSection = useCallback(() => {
    setShowSquadSection((v) => !v);
  }, []);

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
      setStep('success');
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
    step,
    createdTeam,
    submitting,

    // Derived
    canSubmit,
    trimmedTeamName,
    squadTemplates: SQUAD_TEMPLATES,

    // Setters
    setTeamName,
    setTeamDescription,
    setNewSquadName,
    setShowSquadSection,

    // Actions
    toggleSquadSection,
    handleCreate,
    handleOpenTeam,
    handleAddSquad,
    handleRemoveSquad,
    handleApplyTemplate,
    clearAllSquads,
  };
}









