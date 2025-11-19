import { acceptInvitation, cancelInvitation, validateInviteCode as validateInviteCodeService } from "@/services/invitationService";
import type { WorkspaceInvitationWithDetails } from "@/types/workspace";
import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface InviteStore {
    invites: WorkspaceInvitationWithDetails[];
    setInvites: (invites: WorkspaceInvitationWithDetails[]) => void;
    validateInviteCode: (inviteCode: string) => Promise<WorkspaceInvitationWithDetails | null>;
}

export const inviteStore = create<InviteStore>((set) => ({
    invites: [] as WorkspaceInvitationWithDetails[],
    setInvites: (invites: WorkspaceInvitationWithDetails[]) => set({ invites }),

    validateInviteCode: async (inviteCode: string) => {
        const invite = await validateInviteCodeService(inviteCode);
        if (invite) {
            set((state) => ({ invites: [...state.invites, invite] }));
            return invite;
        }
        return null;
    },
    acceptInviteCode: async (inviteCode: string) => {
        await acceptInvitation(inviteCode);
        set((state) => ({ invites: state.invites.filter((invite) => invite.id !== inviteCode) }));
        useWorkspaceStore.getState().loadWorkspaces();
    },
    cancelInviteCode: async (inviteCode: string) => {
        await cancelInvitation(inviteCode);
        set((state) => ({ invites: state.invites.filter((invite) => invite.invite_code !== inviteCode) }));
        useWorkspaceStore.getState().loadWorkspaces();
    }
}));