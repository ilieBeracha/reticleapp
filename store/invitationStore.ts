import {
    acceptInvitationService,
    cancelInvitationService,
    createInvitationService,
    deleteInvitationService,
    getInvitationByCodeService,
    getInvitationsService,
} from "@/services/invitationService";
import { Invitation } from "@/types/database";
import { create } from "zustand";

interface InvitationStore {
  invitations: Invitation[];
  pendingInvitations: Invitation[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInvitations: (orgId: string) => Promise<void>;
  fetchPendingInvitations: (code: string) => Promise<void>;
  createInvitation: (
    code: string,
    orgId: string,
    role: "commander" | "member" | "viewer",
    invitedBy: string
  ) => Promise<void>;
  acceptInvitation: (
    inviteCode: string,
    userId: string
  ) => Promise<{ invitation: Invitation; orgName: string }>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  deleteInvitation: (invitationId: string) => Promise<void>;
  resetInvitations: () => void;
}

export const invitationStore = create<InvitationStore>((set, get) => ({
  invitations: [],
  pendingInvitations: [],
  loading: false,
  error: null,

  fetchInvitations: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const invitations = await getInvitationsService(orgId);
      set({ invitations, loading: false });
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      set({ error: error.message, invitations: [], loading: false });
    }
  },

  fetchPendingInvitations: async (inviteCode: string) => {
    try {
      set({ loading: true, error: null });
      const invitation = await getInvitationByCodeService(inviteCode);
      set({ 
        pendingInvitations: invitation ? [invitation] : [], 
        loading: false 
      });
    } catch (error: any) {
      console.error("Error fetching pending invitation:", error);
      set({ error: error.message, pendingInvitations: [], loading: false });
    }
  },

  createInvitation: async (
    code: string,
    orgId: string,
    role: "commander" | "member" | "viewer",
    invitedBy: string
  ) => {
    try {
      const newInvitation = await createInvitationService(
        code,
        orgId,
        role,
        invitedBy
      );

      // Add to invitations list
      set((state) => ({
        invitations: [newInvitation, ...state.invitations],
      }));
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      throw error;
    }
  },

  acceptInvitation: async (inviteCode: string, userId: string) => {
    try {
      const result = await acceptInvitationService(inviteCode, userId);

      // Remove from pending invitations
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter(
          (inv) => inv.code === inviteCode
        ),
      }));

      return result;
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      throw error;
    }
  },

  cancelInvitation: async (invitationId: string) => {
    try {
      await cancelInvitationService(invitationId);

      // Update invitation status in store
      set((state) => ({
        invitations: state.invitations.map((inv) =>
          inv.id === invitationId ? { ...inv, status: "cancelled" } : inv
        ),
      }));
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      throw error;
    }
  },

  deleteInvitation: async (invitationId: string) => {
    try {
      await deleteInvitationService(invitationId);

      // Remove from invitations list
      set((state) => ({
        invitations: state.invitations.filter((inv) => inv.id !== invitationId),
      }));
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      throw error;
    }
  },

  resetInvitations: () => {
    set({ invitations: [], pendingInvitations: [], loading: false, error: null });
  },
}));