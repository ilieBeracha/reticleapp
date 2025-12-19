/**
 * Integrations Page
 * 
 * Connect wearables and external services:
 * - Garmin Watch
 * - Apple Watch (coming soon)
 */
import { useColors } from '@/hooks/ui/useColors';
import { useGarminStore, useGarminConnectionStatus } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Plug, Watch } from 'lucide-react-native';
import { useEffect } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();
  
  // Use zustand store for persistent Garmin state
  const { 
    devices, 
    isConnecting, 
    startDeviceSelection, 
    refreshDevices,
    _initialize 
  } = useGarminStore();
  
  const connectionStatus = useGarminConnectionStatus();

  useEffect(() => {
    // Initialize Garmin listeners once
    const cleanup = _initialize();
    return cleanup;
  }, [_initialize]);

  const connectGarmin = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Garmin integration is only available on iOS');
      return;
    }
    startDeviceSelection();
  };

  const disconnectGarmin = () => {
    Alert.alert(
      'Disconnect Garmin',
      'To disconnect, open Garmin Connect Mobile and remove this app from your shared devices.',
      [{ text: 'OK' }]
    );
  };

  const isGarminConnected = devices.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Integrations',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Plug size={28} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Connect Your Devices
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Sync biometrics and GPS data during training sessions
          </Text>
        </View>

        {/* Wearables Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Watch size={16} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              WEARABLES
            </Text>
          </View>

          {/* Garmin Watch */}
          <Pressable
            onPress={isGarminConnected ? disconnectGarmin : connectGarmin}
            disabled={isConnecting}
            style={({ pressed }) => [
              styles.integrationCard,
              { 
                backgroundColor: colors.card, 
                borderColor: isGarminConnected ? colors.primary : colors.border,
                borderWidth: isGarminConnected ? 2 : 1,
                opacity: pressed || isConnecting ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.integrationLogo, { backgroundColor: '#007CC3' }]}>
              <Ionicons name="watch-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.integrationInfo}>
              <Text style={[styles.integrationName, { color: colors.text }]}>
                Garmin
              </Text>
              <Text style={[styles.integrationDesc, { color: colors.textMuted }]}>
                {isConnecting 
                  ? 'Opening Garmin Connect...' 
                  : isGarminConnected 
                    ? devices[0]?.friendlyName || 'Connected'
                    : 'Connect your Garmin watch'
                }
              </Text>
            </View>
            {isGarminConnected ? (
              <View style={[styles.connectedBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.connectedText, { color: colors.primary }]}>
                  Connected
                </Text>
              </View>
            ) : (
              <View style={[styles.connectButton, { backgroundColor: isConnecting ? colors.textMuted : colors.primary }]}>
                <Text style={styles.connectButtonText}>
                  {isConnecting ? '...' : 'Connect'}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Apple Watch - Coming Soon */}
          <View
            style={[
              styles.integrationCard,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                opacity: 0.5,
              },
            ]}
          >
            <View style={[styles.integrationLogo, { backgroundColor: '#1C1C1E' }]}>
              <Ionicons name="watch-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.integrationInfo}>
              <Text style={[styles.integrationName, { color: colors.text }]}>
                Apple Watch
              </Text>
              <Text style={[styles.integrationDesc, { color: colors.textMuted }]}>
                Coming soon
              </Text>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.comingSoonText, { color: colors.textMuted }]}>
                Soon
              </Text>
            </View>
          </View>
        </View>

        {/* Connected Device Info */}
        {isGarminConnected && (
          <View style={[styles.deviceInfoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.deviceInfoHeader}>
              <Text style={[styles.deviceInfoTitle, { color: colors.text }]}>
                Connected Device{devices.length > 1 ? 's' : ''}
              </Text>
              <Pressable onPress={refreshDevices} hitSlop={8}>
                <Ionicons name="refresh" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            {devices.map((device) => (
              <View key={device.uuid} style={styles.deviceInfoRow}>
                <Text style={[styles.deviceInfoLabel, { color: colors.textMuted }]}>
                  {device.modelName || 'Garmin Watch'}
                </Text>
                <Text style={[styles.deviceInfoValue, { color: colors.text }]}>
                  {device.friendlyName}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {Platform.OS === 'ios' 
              ? 'Tap Connect to open Garmin Connect Mobile and select devices to share with this app.'
              : 'Garmin integration is only available on iOS devices.'
            }
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingTop: Platform.OS === 'ios' ? 8 : 16 },

  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  integrationLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationInfo: {
    flex: 1,
    gap: 3,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  integrationDesc: {
    fontSize: 13,
  },

  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
  },

  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
  },

  deviceInfoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  deviceInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  deviceInfoLabel: {
    fontSize: 13,
  },
  deviceInfoValue: {
    fontSize: 13,
    fontWeight: '500',
  },

  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
