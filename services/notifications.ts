import { supabase } from '@/services/supabase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLER CONFIGURATION
// Controls how notifications appear when app is in foreground
// ═══════════════════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface NotificationData {
  screen?: string;
  id?: string;
  type?: 'training' | 'session' | 'team' | 'reminder' | 'achievement';
  [key: string]: any;
}

export interface ScheduleNotificationOptions {
  title: string;
  body: string;
  data?: NotificationData;
  trigger?: Notifications.NotificationTriggerInput;
  /** If true, don't save to history (for scheduled reminders) */
  skipHistory?: boolean;
}

export interface NotificationHistoryItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  screen: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request notification permissions
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  // Android requires notification channels
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  // Get push token (only on physical device)
  if (Device.isDevice) {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      return tokenData.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return '';
    }
  }

  console.log('Running on simulator - local notifications enabled');
  return '';
}

async function setupAndroidChannels() {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
  });

  await Notifications.setNotificationChannelAsync('trainings', {
    name: 'Training Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
  });

  await Notifications.setNotificationChannelAsync('sessions', {
    name: 'Session Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#3B82F6',
  });

  await Notifications.setNotificationChannelAsync('achievements', {
    name: 'Achievements',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F59E0B',
  });

  await Notifications.setNotificationChannelAsync('teams', {
    name: 'Team Updates',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#8B5CF6',
  });
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════

export async function scheduleNotification({
  title,
  body,
  data,
  trigger,
  skipHistory = false,
}: ScheduleNotificationOptions): Promise<string> {
  // Save to history if it's an immediate notification (not scheduled for future)
  const isImmediate = !trigger || trigger === null;
  if (isImmediate && !skipHistory) {
    await saveNotificationToHistory(title, body, data);
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {}, sound: true },
    trigger: trigger || null,
  });
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearDeliveredNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HISTORY (DATABASE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a notification to the history database
 */
async function saveNotificationToHistory(
  title: string,
  body: string,
  data?: NotificationData
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notification_history').insert({
      user_id: user.id,
      title,
      body,
      type: data?.type || 'default',
      screen: data?.screen || null,
      reference_id: data?.id || null,
    });
  } catch (error) {
    console.error('[Notifications] Failed to save to history:', error);
  }
}

/**
 * Get notification history for current user
 */
export async function getNotificationHistory(
  limit = 50
): Promise<NotificationHistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notification_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Notifications] Failed to get history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notification_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('[Notifications] Failed to get unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notification_history')
    .update({ read: true })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notification_history')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
}

/**
 * Delete a notification from history
 */
export async function deleteNotificationFromHistory(notificationId: string): Promise<void> {
  await supabase
    .from('notification_history')
    .delete()
    .eq('id', notificationId);
}

/**
 * Clear all notification history
 */
export async function clearNotificationHistory(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notification_history')
    .delete()
    .eq('user_id', user.id);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TESTING
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTestNotification(): Promise<string> {
  return scheduleNotification({
    title: 'Test Notification',
    body: 'This is a test notification from Reticle!',
    data: { type: 'reminder', screen: 'personal' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: 'default',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAININGS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTrainingReminder(
  trainingId: string,
  trainingName: string,
  teamName: string,
  scheduledAt: Date
): Promise<string | null> {
  const reminderTime = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
  if (reminderTime <= new Date()) return null;

  return scheduleNotification({
    title: 'Training Starting Soon',
    body: `${trainingName} with ${teamName} starts in 30 minutes`,
    data: { type: 'training', screen: 'trainingDetail', id: trainingId },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
      channelId: Platform.OS === 'android' ? 'trainings' : undefined,
    },
  });
}

export async function notifyTrainingStarted(
  trainingId: string,
  trainingName: string,
  teamName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Training Started',
    body: `${trainingName} with ${teamName} is now live. Join now!`,
    data: { type: 'training', screen: 'trainingDetail', id: trainingId },
  });
}

export async function notifyTrainingCompleted(
  trainingId: string,
  trainingName: string,
  participantCount: number
): Promise<string> {
  return scheduleNotification({
    title: 'Training Completed',
    body: `${trainingName} finished with ${participantCount} participants. View results!`,
    data: { type: 'training', screen: 'trainingDetail', id: trainingId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function notifySessionStarted(sessionId: string): Promise<string> {
  return scheduleNotification({
    title: 'Session Started',
    body: 'Your shooting session has begun. Good luck!',
    data: { type: 'session', screen: 'activeSession', id: sessionId },
  });
}

export async function notifySessionCompleted(
  sessionId: string,
  targetCount: number,
  accuracy: number
): Promise<string> {
  const rating = accuracy >= 80 ? 'Excellent' : accuracy >= 60 ? 'Good' : 'Keep practicing';
  return scheduleNotification({
    title: 'Session Complete!',
    body: `${targetCount} targets • ${accuracy}% accuracy • ${rating}!`,
    data: { type: 'session', screen: 'sessionDetail', id: sessionId },
  });
}

export async function remindActiveSession(
  sessionId: string,
  elapsedMinutes: number
): Promise<string> {
  return scheduleNotification({
    title: 'Session Still Active',
    body: `Your session has been running for ${elapsedMinutes} minutes. Continue or end it?`,
    data: { type: 'session', screen: 'activeSession', id: sessionId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD ENGAGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify a user they've been invited to a squad engagement
 * Called for: Each invited participant
 */
export async function notifySquadEngagementInvite(
  sessionId: string,
  trainingId: string,
  drillName: string,
  commanderName: string,
  teamName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Squad Engagement Invite',
    body: `${commanderName} invited you to join "${drillName}" with ${teamName}`,
    data: {
      type: 'session',
      screen: 'squadEngagementInvite',
      id: sessionId,
      trainingId,
    },
  });
}

/**
 * Notify the commander that a participant joined
 * Called for: Session owner (commander)
 */
export async function notifyParticipantJoined(
  sessionId: string,
  participantName: string,
  drillName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Participant Joined',
    body: `${participantName} joined the squad engagement "${drillName}"`,
    data: { type: 'session', screen: 'activeSession', id: sessionId },
  });
}

/**
 * Notify the commander that a participant declined
 * Called for: Session owner (commander)
 */
export async function notifyParticipantDeclined(
  sessionId: string,
  participantName: string,
  drillName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Participant Declined',
    body: `${participantName} declined the squad engagement "${drillName}"`,
    data: { type: 'session', screen: 'activeSession', id: sessionId },
  });
}

/**
 * Notify all participants that the squad engagement is starting
 * Called for: All joined participants
 */
export async function notifySquadEngagementStarting(
  sessionId: string,
  drillName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Squad Engagement Starting',
    body: `"${drillName}" is starting now! Join your squad.`,
    data: { type: 'session', screen: 'activeSession', id: sessionId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyTeamInvite(
  teamId: string,
  teamName: string,
  inviterName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Team Invitation',
    body: `${inviterName} invited you to join ${teamName}`,
    data: { type: 'team', screen: 'teamInvite', id: teamId },
  });
}

export async function notifyMemberJoined(
  teamId: string,
  teamName: string,
  memberName: string
): Promise<string> {
  return scheduleNotification({
    title: 'New Team Member',
    body: `${memberName} joined ${teamName}`,
    data: { type: 'team', screen: 'team', id: teamId },
  });
}

export async function notifyRoleChanged(
  teamId: string,
  teamName: string,
  newRole: string
): Promise<string> {
  return scheduleNotification({
    title: 'Role Updated',
    body: `Your role in ${teamName} has been changed to ${newRole}`,
    data: { type: 'team', screen: 'team', id: teamId },
  });
}

/**
 * Notify team members about new training created
 * Called for: All team members
 */
export async function notifyNewTrainingCreated(
  trainingId: string,
  trainingName: string,
  teamName: string,
  scheduledAt: Date,
  creatorName: string
): Promise<string> {
  const dateStr = scheduledAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return scheduleNotification({
    title: `New Training: ${trainingName}`,
    body: `${creatorName} scheduled training for ${teamName} on ${dateStr}`,
    data: { type: 'training', screen: 'trainingDetail', id: trainingId },
  });
}

/**
 * Notify commanders/owners when invite is accepted
 * Called for: Team owner and commanders
 */
export async function notifyInviteAccepted(
  teamId: string,
  teamName: string,
  newMemberName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Invite Accepted',
    body: `${newMemberName} has joined ${teamName}`,
    data: { type: 'team', screen: 'team', id: teamId },
  });
}

/**
 * Notify commanders/owners when someone starts a session during training
 * Called for: Team owner and commanders
 */
export async function notifyTrainingSessionStarted(
  trainingId: string,
  trainingName: string,
  memberName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Training Session Started',
    body: `${memberName} started their session in ${trainingName}`,
    data: { type: 'training', screen: 'trainingDetail', id: trainingId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEAPONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify commander when a soldier requests a weapon
 * Called for: Team commanders/owners
 */
export async function notifyWeaponRequested(
  teamId: string,
  teamName: string,
  soldierName: string,
  trainingId?: string
): Promise<string> {
  return scheduleNotification({
    title: 'Weapon Request',
    body: `${soldierName} is requesting a weapon${trainingId ? ' during training' : ` in ${teamName}`}`,
    data: trainingId
      ? { type: 'training', screen: 'trainingDetail', id: trainingId }
      : { type: 'team', screen: 'teamArmory', id: teamId },
  });
}

/**
 * Notify soldier when their weapon request is approved
 * Called for: The soldier who made the request
 */
export async function notifyWeaponRequestApproved(
  teamId: string,
  weaponName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Weapon Request Approved',
    body: `Your request was approved. ${weaponName} has been assigned to you.`,
    data: { type: 'team', screen: 'teamArmory', id: teamId },
  });
}

/**
 * Notify soldier when their weapon request is rejected
 * Called for: The soldier who made the request
 */
export async function notifyWeaponRequestRejected(
  teamId: string
): Promise<string> {
  return scheduleNotification({
    title: 'Weapon Request Declined',
    body: 'Your weapon request was not approved. Contact your commander.',
    data: { type: 'team', screen: 'teamArmory', id: teamId },
  });
}

/**
 * Notify soldier when a weapon is assigned to them
 * Called for: The soldier receiving the weapon
 */
export async function notifyWeaponAssigned(
  teamId: string,
  weaponName: string,
  teamName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Weapon Assigned',
    body: `${weaponName} has been assigned to you in ${teamName}`,
    data: { type: 'team', screen: 'teamArmory', id: teamId },
  });
}

/**
 * Notify soldier when a weapon is unassigned from them
 * Called for: The soldier losing the weapon
 */
export async function notifyWeaponUnassigned(
  teamId: string,
  weaponName: string
): Promise<string> {
  return scheduleNotification({
    title: 'Weapon Unassigned',
    body: `${weaponName} has been unassigned from you`,
    data: { type: 'team', screen: 'teamArmory', id: teamId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS & MILESTONES
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyAchievement(
  achievementTitle: string,
  achievementDesc: string
): Promise<string> {
  return scheduleNotification({
    title: 'Achievement Unlocked!',
    body: `${achievementTitle} - ${achievementDesc}`,
    data: { type: 'achievement', screen: 'insights' },
  });
}

export async function notifyMilestone(
  milestoneType: 'sessions' | 'targets' | 'accuracy' | 'streak',
  value: number
): Promise<string> {
  const messages: Record<string, { title: string; body: string }> = {
    sessions: { title: 'Session Milestone!', body: `You've completed ${value} sessions. Keep it up!` },
    targets: { title: 'Target Milestone!', body: `You've hit ${value} targets total. Amazing!` },
    accuracy: { title: 'Accuracy Milestone!', body: `You reached ${value}% average accuracy!` },
    streak: { title: 'Streak Milestone!', body: `${value} day training streak! Don't break it!` },
  };

  const { title, body } = messages[milestoneType] || { title: 'Milestone!', body: `New milestone: ${value}` };
  return scheduleNotification({ title, body, data: { type: 'achievement', screen: 'insights' } });
}

export async function notifyPersonalBest(metric: string, value: string): Promise<string> {
  return scheduleNotification({
    title: 'New Personal Best!',
    body: `${metric}: ${value}`,
    data: { type: 'achievement', screen: 'insights' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailyReminder(hour: number, minute: number): Promise<string> {
  return scheduleNotification({
    title: 'Time to Train',
    body: "Don't forget your daily practice session!",
    data: { type: 'reminder', screen: 'personal' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'default',
    },
  });
}

export async function notifyInactivity(daysSinceLastSession: number): Promise<string> {
  return scheduleNotification({
    title: 'We Miss You!',
    body: `It's been ${daysSinceLastSession} days since your last session. Ready to get back?`,
    data: { type: 'reminder', screen: 'personal' },
  });
}
