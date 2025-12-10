import { supabase } from '@/lib/supabase';

export type PushNotificationType =
  | 'training_created'
  | 'training_started'
  | 'training_completed'
  | 'team_invite'
  | 'member_joined';

interface SendPushOptions {
  type: PushNotificationType;
  title: string;
  body: string;
  team_id?: string;
  user_ids?: string[];
  exclude_user_id?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to team members or specific users via Edge Function
 */
export async function sendPushNotification(options: SendPushOptions): Promise<{
  success: boolean;
  sent?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: options,
    });

    if (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }

    console.log('Push notification sent:', data);
    return { success: true, sent: data?.sent ?? 0 };
  } catch (err) {
    console.error('Failed to send push notification:', err);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Notify team members about a new training
 */
export async function notifyTeamNewTraining(
  teamId: string,
  trainingId: string,
  trainingTitle: string,
  teamName: string,
  scheduledAt: Date,
  creatorId: string,
  creatorName: string
) {
  const dateStr = scheduledAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return sendPushNotification({
    type: 'training_created',
    team_id: teamId,
    exclude_user_id: creatorId,
    title: `New Training: ${trainingTitle}`,
    body: `${creatorName} scheduled training for ${teamName} on ${dateStr}`,
    data: {
      screen: 'trainingDetail',
      id: trainingId,
    },
  });
}

/**
 * Notify team members that training has started
 */
export async function notifyTeamTrainingStarted(
  teamId: string,
  trainingId: string,
  trainingTitle: string,
  teamName: string,
  starterId: string
) {
  return sendPushNotification({
    type: 'training_started',
    team_id: teamId,
    exclude_user_id: starterId,
    title: 'Training Started',
    body: `${trainingTitle} with ${teamName} is now live. Join now!`,
    data: {
      screen: 'trainingDetail',
      id: trainingId,
    },
  });
}

/**
 * Notify team members that training is completed
 */
export async function notifyTeamTrainingCompleted(
  teamId: string,
  trainingId: string,
  trainingTitle: string,
  participantCount: number
) {
  return sendPushNotification({
    type: 'training_completed',
    team_id: teamId,
    title: 'Training Completed',
    body: `${trainingTitle} finished with ${participantCount} participants. View results!`,
    data: {
      screen: 'trainingDetail',
      id: trainingId,
    },
  });
}

/**
 * Notify a user about a team invite
 */
export async function notifyUserTeamInvite(
  userId: string,
  teamId: string,
  teamName: string,
  inviterName: string
) {
  return sendPushNotification({
    type: 'team_invite',
    user_ids: [userId],
    title: 'Team Invitation',
    body: `${inviterName} invited you to join ${teamName}`,
    data: {
      screen: 'teamInvite',
      id: teamId,
    },
  });
}

/**
 * Notify team owners/commanders when a new member joins
 */
export async function notifyTeamMemberJoined(
  teamId: string,
  newMemberName: string,
  newMemberId: string,
  teamName: string
) {
  return sendPushNotification({
    type: 'member_joined',
    team_id: teamId,
    exclude_user_id: newMemberId,
    title: 'New Team Member',
    body: `${newMemberName} joined ${teamName}`,
    data: {
      screen: 'team',
      id: teamId,
    },
  });
}
