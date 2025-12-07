import { acceptInvitation, cancelInvitation, validateInviteCode as validateInviteCodeService } from "@/services/invitationService";
import type { TeamInvitationWithDetails } from "@/types/workspace";
import { create } from "zustand";
import { useTeamStore } from "./teamStore";

interface InviteStore {
    invites: TeamInvitationWithDetails[];
    setInvites: (invites: TeamInvitationWithDetails[]) => void;
    validateInviteCode: (inviteCode: string) => Promise<TeamInvitationWithDetails | null>;
    acceptInviteCode: (inviteCode: string) => Promise<void>;
    cancelInviteCode: (inviteCode: string) => Promise<void>;
}

export const inviteStore = create<InviteStore>((set) => ({
    invites: [] as TeamInvitationWithDetails[],
    setInvites: (invites: TeamInvitationWithDetails[]) => set({ invites }),

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
        // Reload teams after accepting an invite
        useTeamStore.getState().loadTeams();
    },
    cancelInviteCode: async (inviteCode: string) => {
        await cancelInvitation(inviteCode);
        set((state) => ({ invites: state.invites.filter((invite) => invite.invite_code !== inviteCode) }));
        // Reload teams after cancelling
        useTeamStore.getState().loadTeams();
    }
}));
