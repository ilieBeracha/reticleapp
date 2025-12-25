/**
 * GarminConnectionBanner
 * 
 * Inline banner showing Garmin watch status with quick reconnect.
 * Use anywhere the user needs watch connectivity (session screens, etc.)
 * 
 * Features:
 * - Shows current status (Connected, Needs Pairing, Offline)
 * - One-tap reconnect (opens GCM for device selection)
 * - Collapsible when connected
 * - Non-blocking - sessions work without watch
 */

import { useColors } from '@/hooks/ui/useColors';
import { useGarminStore, useIsGarminConnected } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface GarminConnectionBannerProps {
  /** Show even when connected (default: false - auto-hide when connected) */
  alwaysShow?: boolean;
  /** Compact mode - smaller, less prominent (default: false) */
  compact?: boolean;
  /** Called when connection status changes */
  onStatusChange?: (connected: boolean) => void;
}

type BannerState = 'connected' | 'needs_pairing' | 'offline' | 'connecting';

export function GarminConnectionBanner({
  alwaysShow = false,
  compact = false,
  onStatusChange,
}: GarminConnectionBannerProps) {
  const colors = useColors();
  const isConnected = useIsGarminConnected();
  const { status, statusReason, devices, openDeviceSelection, refreshDevices, isReady } = useGarminStore();
  
  const [isRetrying, setIsRetrying] = useState(false);
  const fadeAnim = useState(() => new Animated.Value(1))[0];
  
  // Determine banner state
  const device = devices[0];
  const needsPairing = device?.needsRepairing || (!device && isReady);
  
  const bannerState: BannerState = isRetrying 
    ? 'connecting'
    : isConnected 
      ? 'connected' 
      : needsPairing 
        ? 'needs_pairing' 
        : 'offline';
  
  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(isConnected);
  }, [isConnected, onStatusChange]);
  
  // Auto-hide when connected (unless alwaysShow)
  useEffect(() => {
    if (isConnected && !alwaysShow) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 2000,
        delay: 1500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, alwaysShow, fadeAnim]);
  
  // Quick reconnect - tries refresh first, then opens GCM if needed
  const handleReconnect = useCallback(async () => {
    setIsRetrying(true);
    
    try {
      // Try to reconnect to existing device first
      const refreshedDevices = await refreshDevices();
      
      // If no devices or needs re-pairing, open GCM
      if (refreshedDevices.length === 0 || refreshedDevices[0]?.needsRepairing) {
        // Small delay so user sees the "connecting" state
        setTimeout(() => {
          openDeviceSelection();
          setIsRetrying(false);
        }, 500);
      } else {
        // Give it a moment to connect
        setTimeout(() => {
          setIsRetrying(false);
        }, 1500);
      }
    } catch {
      setIsRetrying(false);
      openDeviceSelection();
    }
  }, [refreshDevices, openDeviceSelection]);
  
  // Config per state
  const stateConfig = {
    connected: {
      icon: 'checkmark-circle' as const,
      iconColor: '#10B981',
      bgColor: '#10B98115',
      borderColor: '#10B981',
      text: device?.name || 'Watch Connected',
      subtext: null,
      actionText: null,
    },
    needs_pairing: {
      icon: 'watch-outline' as const,
      iconColor: '#F59E0B',
      bgColor: '#F59E0B15',
      borderColor: '#F59E0B',
      text: 'Watch needs pairing',
      subtext: 'Tap to connect via Garmin Connect',
      actionText: 'Connect',
    },
    offline: {
      icon: 'bluetooth-outline' as const,
      iconColor: colors.textMuted,
      bgColor: colors.card,
      borderColor: colors.border,
      text: device?.name || 'Watch Offline',
      subtext: statusReason || 'Open Garmin Connect app',
      actionText: 'Retry',
    },
    connecting: {
      icon: 'sync' as const,
      iconColor: colors.primary,
      bgColor: `${colors.primary}15`,
      borderColor: colors.primary,
      text: 'Connecting...',
      subtext: null,
      actionText: null,
    },
  };
  
  const config = stateConfig[bannerState];
  
  // Don't render if connected and not alwaysShow
  if (isConnected && !alwaysShow) {
    return null;
  }
  
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={bannerState !== 'connected' && bannerState !== 'connecting' ? handleReconnect : undefined}
        activeOpacity={bannerState === 'connected' || bannerState === 'connecting' ? 1 : 0.7}
        style={[
          styles.banner,
          compact && styles.bannerCompact,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
          {bannerState === 'connecting' ? (
            <ActivityIndicator size="small" color={config.iconColor} />
          ) : (
            <Ionicons name={config.icon} size={compact ? 18 : 22} color={config.iconColor} />
          )}
        </View>
        
        {/* Text */}
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.mainText, 
              compact && styles.mainTextCompact,
              { color: colors.text }
            ]}
            numberOfLines={1}
          >
            {config.text}
          </Text>
          {config.subtext && !compact && (
            <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={1}>
              {config.subtext}
            </Text>
          )}
        </View>
        
        {/* Action Button */}
        {config.actionText && (
          <View style={[styles.actionButton, { backgroundColor: config.iconColor }]}>
            <Text style={styles.actionText}>{config.actionText}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 0,
    marginVertical: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mainTextCompact: {
    fontSize: 13,
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GarminConnectionBanner;

