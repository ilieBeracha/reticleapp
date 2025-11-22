/**
 * Modal Context
 * Provides refs to all bottom sheet modals for use across the app
 */

import type { BaseBottomSheetRef } from '@/components/modals/BaseBottomSheet';
import type { BaseDetachedBottomSheetRef } from '@/components/modals/BaseDetachedBottomSheet';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

interface ModalContextType {
  chartDetailsSheetRef: React.RefObject<BaseDetachedBottomSheetRef | null>;
  createSessionSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  createTeamSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  inviteMembersSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  createWorkspaceSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  acceptInviteSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  workspaceSwitcherSheetRef: React.RefObject<BaseBottomSheetRef | null>;
  onSessionCreated: (() => void) | null;
  onTeamCreated: (() => void) | null;
  onMemberInvited: (() => void) | null;
  onInviteAccepted: (() => void) | null;
  onWorkspaceCreated: (() => void) | null;
  onWorkspaceSwitched: (() => void) | null;
  setOnSessionCreated: (callback: (() => void) | null) => void;
  setOnTeamCreated: (callback: (() => void) | null) => void;
  setOnMemberInvited: (callback: (() => void) | null) => void;
  setOnInviteAccepted: (callback: (() => void) | null) => void;
  setOnWorkspaceCreated: (callback: (() => void) | null) => void;
  setOnWorkspaceSwitched: (callback: (() => void) | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const chartDetailsSheetRef = useRef<BaseDetachedBottomSheetRef>(null);
  const createSessionSheetRef = useRef<BaseBottomSheetRef>(null);
  const createTeamSheetRef = useRef<BaseBottomSheetRef>(null);
  const inviteMembersSheetRef = useRef<BaseBottomSheetRef>(null);
  const createWorkspaceSheetRef = useRef<BaseBottomSheetRef>(null);
  const acceptInviteSheetRef = useRef<BaseBottomSheetRef>(null);
  const workspaceSwitcherSheetRef = useRef<BaseBottomSheetRef>(null);
  const [onWorkspaceSwitched, setOnWorkspaceSwitched] = useState<(() => void) | null>(null);
  const [onSessionCreated, setOnSessionCreated] = useState<(() => void) | null>(null);
  const [onTeamCreated, setOnTeamCreated] = useState<(() => void) | null>(null);
  const [onMemberInvited, setOnMemberInvited] = useState<(() => void) | null>(null);
  const [onInviteAccepted, setOnInviteAccepted] = useState<(() => void) | null>(null);
  const [onWorkspaceCreated, setOnWorkspaceCreated] = useState<(() => void) | null>(null);


  return (
    <ModalContext.Provider
      value={{
        chartDetailsSheetRef,
        createSessionSheetRef,
        createTeamSheetRef,
        inviteMembersSheetRef,
        createWorkspaceSheetRef,
        acceptInviteSheetRef,
        workspaceSwitcherSheetRef,
        onSessionCreated,
        onTeamCreated,
        onMemberInvited,
        onInviteAccepted,
        onWorkspaceSwitched,
        onWorkspaceCreated,
        setOnSessionCreated,
        setOnTeamCreated,
        setOnMemberInvited,
        setOnInviteAccepted,
        setOnWorkspaceCreated,
        setOnWorkspaceSwitched,
        }}
    >
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
