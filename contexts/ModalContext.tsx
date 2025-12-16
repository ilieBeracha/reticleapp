/**
 * Modal Context
 * 
 * Now simplified for native form sheet navigation pattern.
 * Provides selected items and callbacks for data coordination.
 * Sheet refs have been removed - use router.push() instead.
 * 
 * OPTIMIZED: 
 * - Callback refs prevent re-renders when updating callbacks
 * - Stable setter functions via useCallback
 * - Getter functions to access current callback values
 */

import type { Team, TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type TeamWithMemberCount = Team & { member_count?: number };

interface ModalContextType {
  // Selected items for preview sheets
  selectedTeam: TeamWithMemberCount | null;
  setSelectedTeam: (team: TeamWithMemberCount | null) => void;
  selectedMember: TeamMemberWithProfile | null;
  setSelectedMember: (member: TeamMemberWithProfile | null) => void;
  selectedTraining: TrainingWithDetails | null;
  setSelectedTraining: (training: TrainingWithDetails | null) => void;
  
  // Callback getters - call these to get current callback and invoke
  getOnSessionCreated: () => (() => void) | null;
  getOnTeamCreated: () => (() => void) | null;
  getOnMemberInvited: () => (() => void) | null;
  getOnInviteAccepted: () => (() => void) | null;
  getOnWorkspaceCreated: () => (() => void) | null;
  getOnTrainingCreated: () => (() => void) | null;
  getOnTrainingUpdated: () => (() => void) | null;
  
  // Legacy callback accessors for backward compatibility
  onSessionCreated: (() => void) | null;
  onTeamCreated: (() => void) | null;
  onMemberInvited: (() => void) | null;
  onInviteAccepted: (() => void) | null;
  onWorkspaceCreated: (() => void) | null;
  onTrainingCreated: (() => void) | null;
  onTrainingUpdated: (() => void) | null;
  
  // Callback setters - stable functions
  setOnSessionCreated: (callback: (() => void) | null) => void;
  setOnTeamCreated: (callback: (() => void) | null) => void;
  setOnMemberInvited: (callback: (() => void) | null) => void;
  setOnInviteAccepted: (callback: (() => void) | null) => void;
  setOnWorkspaceCreated: (callback: (() => void) | null) => void;
  setOnTrainingCreated: (callback: (() => void) | null) => void;
  setOnTrainingUpdated: (callback: (() => void) | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  // Selected items - need state since they affect UI
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMemberCount | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithProfile | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithDetails | null>(null);
  
  // Callback refs - updating these doesn't cause re-renders
  const onSessionCreatedRef = useRef<(() => void) | null>(null);
  const onTeamCreatedRef = useRef<(() => void) | null>(null);
  const onMemberInvitedRef = useRef<(() => void) | null>(null);
  const onInviteAcceptedRef = useRef<(() => void) | null>(null);
  const onWorkspaceCreatedRef = useRef<(() => void) | null>(null);
  const onTrainingCreatedRef = useRef<(() => void) | null>(null);
  const onTrainingUpdatedRef = useRef<(() => void) | null>(null);

  // Stable setter functions
  const setOnSessionCreated = useCallback((cb: (() => void) | null) => {
    onSessionCreatedRef.current = cb;
  }, []);
  const setOnTeamCreated = useCallback((cb: (() => void) | null) => {
    onTeamCreatedRef.current = cb;
  }, []);
  const setOnMemberInvited = useCallback((cb: (() => void) | null) => {
    onMemberInvitedRef.current = cb;
  }, []);
  const setOnInviteAccepted = useCallback((cb: (() => void) | null) => {
    onInviteAcceptedRef.current = cb;
  }, []);
  const setOnWorkspaceCreated = useCallback((cb: (() => void) | null) => {
    onWorkspaceCreatedRef.current = cb;
  }, []);
  const setOnTrainingCreated = useCallback((cb: (() => void) | null) => {
    onTrainingCreatedRef.current = cb;
  }, []);
  const setOnTrainingUpdated = useCallback((cb: (() => void) | null) => {
    onTrainingUpdatedRef.current = cb;
  }, []);

  // Stable getter functions - always return current ref value
  const getOnSessionCreated = useCallback(() => onSessionCreatedRef.current, []);
  const getOnTeamCreated = useCallback(() => onTeamCreatedRef.current, []);
  const getOnMemberInvited = useCallback(() => onMemberInvitedRef.current, []);
  const getOnInviteAccepted = useCallback(() => onInviteAcceptedRef.current, []);
  const getOnWorkspaceCreated = useCallback(() => onWorkspaceCreatedRef.current, []);
  const getOnTrainingCreated = useCallback(() => onTrainingCreatedRef.current, []);
  const getOnTrainingUpdated = useCallback(() => onTrainingUpdatedRef.current, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<ModalContextType>(() => ({
    // Selected items
    selectedTeam,
    setSelectedTeam,
    selectedMember,
    setSelectedMember,
    selectedTraining,
    setSelectedTraining,
    // Getters for accessing current callback
    getOnSessionCreated,
    getOnTeamCreated,
    getOnMemberInvited,
    getOnInviteAccepted,
    getOnWorkspaceCreated,
    getOnTrainingCreated,
    getOnTrainingUpdated,
    // Legacy direct access (reads from refs at access time)
    get onSessionCreated() { return onSessionCreatedRef.current; },
    get onTeamCreated() { return onTeamCreatedRef.current; },
    get onMemberInvited() { return onMemberInvitedRef.current; },
    get onInviteAccepted() { return onInviteAcceptedRef.current; },
    get onWorkspaceCreated() { return onWorkspaceCreatedRef.current; },
    get onTrainingCreated() { return onTrainingCreatedRef.current; },
    get onTrainingUpdated() { return onTrainingUpdatedRef.current; },
    // Stable setters
    setOnSessionCreated,
    setOnTeamCreated,
    setOnMemberInvited,
    setOnInviteAccepted,
    setOnWorkspaceCreated,
    setOnTrainingCreated,
    setOnTrainingUpdated,
  }), [
    selectedTeam,
    selectedMember,
    selectedTraining,
    // All other values are stable refs/callbacks
    getOnSessionCreated,
    getOnTeamCreated,
    getOnMemberInvited,
    getOnInviteAccepted,
    getOnWorkspaceCreated,
    getOnTrainingCreated,
    getOnTrainingUpdated,
    setOnSessionCreated,
    setOnTeamCreated,
    setOnMemberInvited,
    setOnInviteAccepted,
    setOnWorkspaceCreated,
    setOnTrainingCreated,
    setOnTrainingUpdated,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}
