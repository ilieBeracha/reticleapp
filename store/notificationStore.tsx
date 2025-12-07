import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  Notification,
  subscribeToNotifications,
} from "@/services/notificationService";
import * as Haptics from "expo-haptics";
import { create } from "zustand";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  loadNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  subscribeRealtime: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  loadNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const [notifications, count] = await Promise.all([
        getNotifications({ limit: 50 }),
        getUnreadCount(),
      ]);
      set({ notifications, unreadCount: count, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  refreshUnreadCount: async () => {
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error("Failed to refresh unread count:", error);
    }
  },

  markRead: async (id: string) => {
    try {
      await markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  },

  markAllRead: async () => {
    try {
      await markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  },

  remove: async (id: string) => {
    try {
      const notification = get().notifications.find((n) => n.id === id);
      await deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      }));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  addNotification: (notification: Notification) => {
    // Play haptic feedback for new notification
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  subscribeRealtime: (userId: string) => {
    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      get().addNotification(notification);
    });
    return unsubscribe;
  },
}));









