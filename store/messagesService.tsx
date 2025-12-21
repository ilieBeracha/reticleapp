import { Alert, DeviceEventEmitter, NativeEventEmitter, Platform } from "react-native";
import { GarminConnect } from "react-native-garmin-connect";
import { create } from "zustand";

export interface GarminMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

interface MessagesState {
  messages: GarminMessage[];
  isInitialized: boolean;
  addMessage: (message: GarminMessage) => void;
  clearMessages: () => void;
  _initialize: () => () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  isInitialized: false,
  
  addMessage: (message: GarminMessage) => {
    console.log('[GarminMessages] 📩 New message received:', message);
    set((state) => ({ messages: [message, ...state.messages].slice(0, 50) })); // Keep last 50
    
    // Show alert for visual feedback
    Alert.alert(
      '⌚ Garmin Message',
      `Type: ${message.type}\n${message.payload ? JSON.stringify(message.payload) : 'No payload'}`,
      [{ text: 'OK' }]
    );
  },
  
  clearMessages: () => set({ messages: [] }),

  _initialize: () => {
    if (get().isInitialized) {
      console.log('[GarminMessages] Already initialized');
      return () => {};
    }
    
    console.log('[GarminMessages] 🚀 Initializing message listener...');
    set({ isInitialized: true });
    
    const emitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(GarminConnect as any)
      : DeviceEventEmitter;

    const messageSub = emitter.addListener('onMessage', (message: any) => {
      console.log('[GarminMessages] 📨 Raw message from watch:', message);
      get().addMessage({
        type: message?.type || 'unknown',
        payload: message?.payload || message,
        timestamp: Date.now(),
      });
    });

    return () => {
      console.log('[GarminMessages] Cleaning up message listener');
      messageSub.remove();
      set({ isInitialized: false });
    };
  },
}));

// Convenience hooks
export const useGarminMessages = () => useMessagesStore((s) => s.messages);
export const useInitializeMessages = () => useMessagesStore((s) => s._initialize);