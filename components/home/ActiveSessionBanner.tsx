/**
 * ActiveSessionBanner
 * 
 * Displays a subtle, elegant banner when the user has an active session.
 * Full-width design matching other home page sections.
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  endSession,
  getSessionAge,
  type SessionWithDetails,
} from '@/services/sessionService';
import { router } from 'expo-router';
import { ChevronRight, Clock, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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
      `End "${sessionName}" without saving?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
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
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        { 
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
        }
      ]}
    >
      {/* Live indicator */}
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
      </View>

      {/* Main tap area */}
      <TouchableOpacity 
        style={styles.content}
        onPress={handleContinue}
        activeOpacity={0.7}
        disabled={ending}
      >
        <View style={styles.textContainer}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              IN PROGRESS
            </Text>
          </View>
        <Text 
            style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {sessionName}
        </Text>
          <View style={styles.metaRow}>
            <Clock size={11} color={colors.textMuted} />
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {elapsed}
          </Text>
        </View>
      </View>

        <View style={styles.continueHint}>
          <Text style={[styles.continueText, { color: colors.primary }]}>
            Continue
          </Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
        </TouchableOpacity>

      {/* End button */}
        <TouchableOpacity
          onPress={handleEnd}
        style={[styles.endButton, { borderColor: colors.border }]}
          disabled={ending}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
        <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 8,
    marginHorizontal: -4, // Counteract scrollContent padding for true full-width
  },
  liveIndicator: {
    marginRight: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
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
  continueHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  continueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  endButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
});
