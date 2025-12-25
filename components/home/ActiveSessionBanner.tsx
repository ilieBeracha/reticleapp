/**
 * ActiveSessionBanner
 * 
 * Displays a prominent banner when the user has an active session.
 * Allows quick continuation or ending of the session from the home page.
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  endSession,
  getSessionAge,
  type SessionWithDetails,
} from '@/services/sessionService';
import { router } from 'expo-router';
import { AlertTriangle, Clock, Play, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

interface ActiveSessionBannerProps {
  session: SessionWithDetails;
  /** Called when session is ended (for parent to refresh state) */
  onSessionEnded?: () => void;
}

export function ActiveSessionBanner({ session, onSessionEnded }: ActiveSessionBannerProps) {
  const colors = useColors();
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState('');

  // Update elapsed time display
  useEffect(() => {
    const updateElapsed = () => {
      setElapsed(getSessionAge(session));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [session]);

  const sessionName = session.drill_name || session.training_title || 'Active Session';

  const handleContinue = useCallback(() => {
    router.push(`/(protected)/activeSession?sessionId=${session.id}`);
  }, [session.id]);

  const handleEnd = useCallback(async () => {
    Alert.alert(
      'End Session?',
      `End "${sessionName}" now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            try {
              await endSession(session.id);
              onSessionEnded?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to end session');
              setEnding(false);
            }
          },
        },
      ]
    );
  }, [session.id, sessionName, onSessionEnded]);

  return (
    <Animated.View 
      entering={SlideInDown.duration(300)}
      style={[
        localStyles.container,
        { 
          backgroundColor: colors.card,
          borderColor: '#F59E0B',
          borderWidth: 1,
        }
      ]}
    >
      {/* Warning indicator */}
      <View style={localStyles.iconContainer}>
        <AlertTriangle size={24} color="#F59E0B" />
      </View>

      {/* Session info */}
      <View style={localStyles.content}>
        <Text 
          style={[localStyles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {sessionName}
        </Text>
        <View style={localStyles.metaRow}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[localStyles.meta, { color: colors.textMuted }]}>
            Active for {elapsed}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={localStyles.actions}>
        <TouchableOpacity
          onPress={handleContinue}
          style={[localStyles.continueButton, { backgroundColor: '#10B981' }]}
          disabled={ending}
        >
          <Play size={14} color="#fff" fill="#fff" />
          <Text style={localStyles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEnd}
          style={[localStyles.endButton, { borderColor: colors.textMuted }]}
          disabled={ending}
        >
          <X size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  endButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});

