import { sendMessage } from 'react-native-garmin-connect';
import { create } from 'zustand';
// Your watch app UUID

type MessagesStore = {
  messages: any[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => void;
  sendMessage: (message: string) => Promise<void>;
};
  export const useMessagesStore = create<MessagesStore>((set, get) => ({
    messages: [],
    loading: false,
    initialized: false,
    error: null,
    initialize: () => {
      set({ initialized: true });
    },
    sendMessage: async (message: string): Promise<void> => {
      set({ loading: true, error: null });
      await sendMessage(message);
    set({ messages: [...get().messages, message], loading: false });
    console.log('Message sent to watch');
  }
}));