/**
 * SaveDrillPrompt - Modal asking if user wants to save a custom drill as a template
 * 
 * Shown after a session ends that used an inline drill_config (custom drill).
 * User can choose to save it for future reuse or dismiss.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

interface SaveDrillPromptProps {
  visible: boolean;
  drillName: string;
  onSave: (name: string) => Promise<void>;
  onDismiss: () => void;
}

export function SaveDrillPrompt({ visible, drillName, onSave, onDismiss }: SaveDrillPromptProps) {
  const [name, setName] = useState(drillName);
  const [saving, setSaving] = useState(false);

  // Reset name when prompt opens
  React.useEffect(() => {
    if (visible) {
      setName(drillName);
    }
  }, [visible, drillName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await onSave(name.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View className="bg-neutral-900 rounded-2xl w-full max-w-sm overflow-hidden border border-neutral-700">
          {/* Header */}
          <View className="px-6 pt-6 pb-4 items-center">
            <View className="w-16 h-16 rounded-full bg-blue-500/20 items-center justify-center mb-4">
              <Ionicons name="bookmark-outline" size={32} color="#3B82F6" />
            </View>
            <Text className="text-white text-xl font-semibold text-center mb-2">
              Save This Drill?
            </Text>
            <Text className="text-neutral-400 text-center text-sm">
              Save this drill to use it again in future sessions
            </Text>
          </View>

          {/* Name Input */}
          <View className="px-6 pb-6">
            <TextInput
              className="bg-neutral-800 border border-neutral-600 rounded-xl px-4 py-3 text-white text-base"
              placeholder="Drill name"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              autoFocus
              selectTextOnFocus
            />
          </View>

          {/* Buttons */}
          <View className="flex-row border-t border-neutral-700">
            <Pressable
              onPress={onDismiss}
              disabled={saving}
              className="flex-1 py-4 items-center active:bg-neutral-800"
            >
              <Text className="text-neutral-400 font-medium">Not Now</Text>
            </Pressable>
            <View className="w-px bg-neutral-700" />
            <Pressable
              onPress={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 py-4 items-center active:bg-neutral-800"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className={`font-semibold ${name.trim() ? 'text-blue-400' : 'text-neutral-600'}`}>
                  Save Drill
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

