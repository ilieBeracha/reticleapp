import type { TeamInvitation, TeamRole } from '@/types/workspace';

export type { TeamInvitation, TeamRole };

export interface AcceptedResult {
  team_id: string;
  team_name: string;
  role: TeamRole;
}

export interface ValidatedInvite extends TeamInvitation {
  team_name?: string;
}

export interface AcceptInviteState {
  inviteCode: string;
  validatedInvite: ValidatedInvite | null;
  isValidating: boolean;
  isAccepting: boolean;
  isAccepted: boolean;
  acceptedResult: AcceptedResult | null;
  error: string | null;
}

export interface AcceptInviteActions {
  setInviteCode: (code: string) => void;
  handleValidate: () => Promise<void>;
  handleAccept: () => Promise<void>;
  handleDecline: () => void;
  handleReset: () => void;
  handleCloseSheet: () => void;
  handleOpenTeam: (teamId: string) => void;
}
