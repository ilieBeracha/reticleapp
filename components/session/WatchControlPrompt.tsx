/**
 * WatchControlPrompt - Modal asking user if watch should control the session
 * 
 * Shown before session starts when a Garmin watch is connected.
 * User's choice is stored in the session's watch_controlled field.
 */

import { useGarminDevice, useIsGarminConnected } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface WatchControlPromptProps {
  visible: boolean;
  onSelect: (watchControlled: boolean) => void;
  drillName?: string;
}

export function WatchControlPrompt({ visible, onSelect, drillName }: WatchControlPromptProps) {
  const isConnected = useIsGarminConnected();
  const device = useGarminDevice();

  // If no watch connected, auto-select "No" and don't show modal
  React.useEffect(() => {
    if (visible && !isConnected) {
      onSelect(false);
    }
  }, [visible, isConnected, onSelect]);

  if (!isConnected) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onSelect(false)}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View className="bg-neutral-900 rounded-2xl w-full max-w-sm overflow-hidden border border-neutral-700">
          {/* Header */}
          <View className="px-6 pt-6 pb-4 items-center">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-4">
              <Ionicons name="watch-outline" size={32} color="#10B981" />
            </View>
            <Text className="text-white text-xl font-semibold text-center mb-2">
              Watch Control
            </Text>
            <Text className="text-neutral-400 text-center text-sm">
              {device?.name || 'Garmin Watch'} is connected
            </Text>
          </View>

          {/* Description */}
          <View className="px-6 pb-6">
            <Text className="text-neutral-300 text-center text-sm leading-5">
              Let your watch control this session? The watch will track shots and timing, and sync data when you finish.
            </Text>
            {drillName && (
              <Text className="text-neutral-500 text-center text-xs mt-2">
                Drill: {drillName}
              </Text>
            )}
          </View>

          {/* Buttons */}
          <View className="flex-row border-t border-neutral-700">
            <Pressable
              onPress={() => onSelect(false)}
              className="flex-1 py-4 items-center active:bg-neutral-800"
            >
              <Text className="text-neutral-400 font-medium">Phone Only</Text>
            </Pressable>
            <View className="w-px bg-neutral-700" />
            <Pressable
              onPress={() => onSelect(true)}
              className="flex-1 py-4 items-center active:bg-neutral-800"
            >
              <Text className="text-emerald-400 font-semibold">Use Watch</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook to check if watch is connected and should prompt for control
 * Returns a function that shows the prompt only if needed
 */
export function useWatchControlPrompt() {
  const isConnected = useIsGarminConnected();
  
  return {
    shouldPrompt: isConnected,
    isConnected,
  };
}

