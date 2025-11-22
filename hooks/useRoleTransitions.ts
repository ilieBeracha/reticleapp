import { Profile } from '@/contexts/ProfileContext';
import { OrgRole } from '@/services/roleService';
import {
    CommanderCandidate,
    executeRoleTransition,
    getCommanderReplacementCandidates,
    planRoleTransition,
    RoleTransitionPlan
} from '@/services/roleTransitionService';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useRoleTransitions() {
  const [loading, setLoading] = useState(false);
  const [transitionPlan, setTransitionPlan] = useState<RoleTransitionPlan | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<CommanderCandidate[]>([]);

  /**
   * Analyze a role change and create a transition plan
   */
  const analyzeRoleChange = async (profile: Profile, targetRole: OrgRole) => {
    try {
      setLoading(true);
      
      const plan = planRoleTransition(profile, targetRole);
      setTransitionPlan(plan);
      
      // If commander replacement is needed, load candidates
      if (plan.requiresCommanderReplacement && profile.team_id) {
        const candidates = await getCommanderReplacementCandidates(profile.team_id);
        setReplacementCandidates(candidates);
      }
      
      return plan;
    } catch (error: any) {
      Alert.alert('Error', `Failed to analyze role change: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute a role transition (with confirmation for complex cases)
   */
  const executeTransition = async (
    profileId: string, 
    targetRole: OrgRole,
    newCommanderId?: string
  ) => {
    if (!transitionPlan) {
      throw new Error('No transition plan available');
    }

    try {
      setLoading(true);
      
      // Show confirmation for complex transitions
      if (transitionPlan.requiresCommanderReplacement) {
        const shouldProceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Confirm Role Change',
            `This will remove the current team commander. Are you sure you want to proceed?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Proceed', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!shouldProceed) {
          return false;
        }
        
        if (!newCommanderId) {
          throw new Error('New commander must be selected');
        }
      }
      
      await executeRoleTransition(profileId, targetRole, newCommanderId);
      
      // Clear state
      setTransitionPlan(null);
      setReplacementCandidates([]);
      
      return true;
    } catch (error: any) {
      Alert.alert('Error', `Role transition failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quick check if a role change can proceed directly
   */
  const canChangeRoleDirectly = (profile: Profile, targetRole: OrgRole): boolean => {
    const plan = planRoleTransition(profile, targetRole);
    return plan.canProceedDirectly;
  };

  /**
   * Reset state
   */
  const reset = () => {
    setTransitionPlan(null);
    setReplacementCandidates([]);
  };

  return {
    // State
    loading,
    transitionPlan,
    replacementCandidates,
    
    // Actions
    analyzeRoleChange,
    executeTransition,
    canChangeRoleDirectly,
    reset
  };
}
