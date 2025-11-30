import { supabase } from "@/lib/supabase";

// ============================================================================
// TYPES
// ============================================================================
export interface Notification {
  id: string;
  user_id: string;
  type: "training_created" | "training_started" | "session_completed" | string;
  title: string;
  body: string | null;
  data: {
    training_id?: string;
    team_id?: string;
    session_id?: string;
    scheduled_at?: string;
    [key: string]: any;
  } | null;
  read: boolean;
  created_at: string;
}

// ============================================================================
// GET NOTIFICATIONS
// ============================================================================
export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  const { limit = 50, unreadOnly = false } = options || {};

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================================
// GET UNREAD COUNT
// ============================================================================
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}

// ============================================================================
// MARK AS READ
// ============================================================================
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

// ============================================================================
// MARK ALL AS READ
// ============================================================================
export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) throw error;
}

// ============================================================================
// DELETE NOTIFICATION
// ============================================================================
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

// ============================================================================
// SUBSCRIBE TO NOTIFICATIONS (Realtime)
// ============================================================================
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// PUSH TOKEN MANAGEMENT
// ============================================================================
export async function savePushToken(
  userId: string,
  expoPushToken: string,
  deviceName?: string
): Promise<void> {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      device_name: deviceName ?? "Unknown Device",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,expo_push_token",
    }
  );

  if (error) throw error;
}

export async function removePushToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("expo_push_token", expoPushToken);

  if (error) throw error;
}

export async function removeAllPushTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

