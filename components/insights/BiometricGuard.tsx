import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface BiometricGuardProps {
  children: React.ReactNode;
  enabled?: boolean;
  onUnlock?: () => void;
  onLock?: () => void;
}

export const BiometricGuard = React.memo(function BiometricGuard({
  children,
  enabled = true,
  onUnlock,
  onLock,
}: BiometricGuardProps) {
  const colors = useColors();
  const [isUnlocked, setIsUnlocked] = useState(!enabled);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'none'>('none');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const pulseScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  useEffect(() => {
    if (!isUnlocked && enabled) {
      // Subtle pulse animation for the lock icon
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [isUnlocked, enabled]);

  const checkBiometricSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      }
    } catch (error) {
      console.error('Biometric check failed:', error);
    }
  };

  const authenticate = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your insights',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Success animation
        iconRotation.value = withSpring(360, { damping: 10 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          setIsUnlocked(true);
          onUnlock?.();
        }, 200);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, onUnlock]);

  const lockContent = useCallback(() => {
    setIsUnlocked(false);
    iconRotation.value = 0;
    onLock?.();
  }, [onLock]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${iconRotation.value}deg` }],
  }));

  // If biometric is disabled or not available, show content
  if (!enabled || biometricType === 'none') {
    return <>{children}</>;
  }

  // Locked state
  if (!isUnlocked) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[styles.lockedContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.lockedContent}>
          <Animated.View style={[styles.iconCircle, { backgroundColor: colors.secondary }, pulseStyle]}>
            <Animated.View style={iconStyle}>
              <Ionicons
                name={biometricType === 'face' ? 'scan' : 'finger-print'}
                size={48}
                color={colors.primary}
              />
            </Animated.View>
          </Animated.View>

          <Text style={[styles.lockedTitle, { color: colors.text }]}>
            Insights Locked
          </Text>
          <Text style={[styles.lockedSubtitle, { color: colors.textMuted }]}>
            {biometricType === 'face'
              ? 'Use Face ID to view your analytics'
              : 'Use Touch ID to view your analytics'}
          </Text>

          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={authenticate}
            activeOpacity={0.8}
            disabled={isAuthenticating}
          >
            <Ionicons
              name={biometricType === 'face' ? 'scan-outline' : 'finger-print-outline'}
              size={20}
              color={colors.primaryForeground}
            />
            <Text style={[styles.unlockButtonText, { color: colors.primaryForeground }]}>
              {isAuthenticating ? 'Authenticating...' : 'Unlock Now'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.securityNote, { color: colors.textMuted }]}>
            Your data is protected
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Unlocked - show children with lock button
  return (
    <View style={styles.unlockedContainer}>
      {children}
      
      {/* Floating lock button */}
      <TouchableOpacity
        style={[styles.lockButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={lockContent}
        activeOpacity={0.8}
      >
        <Ionicons name="lock-open-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedContent: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  lockedSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 12,
    marginTop: 24,
  },
  unlockedContainer: {
    flex: 1,
  },
  lockButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

