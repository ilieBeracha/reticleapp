/**
 * Integrations Page - Simple & Clean
 * 
 * Note: Garmin SDK is initialized at app level in ProtectedLayout
 * so it persists across navigation.
 */
import { useColors } from '@/hooks/ui/useColors';
import { GarminDeviceStatus, useGarminStore } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();
  const { devices, isConnecting, lastError, startDeviceSelection, connectToDevice, clearError } = useGarminStore();

  const handleGarminPress = () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Garmin is only available on iOS and Android');
      return;
    }
    
    // If there was a "device not found" error, prompt to re-pair
    if (lastError?.includes('not found') || lastError?.includes('re-select')) {
      Alert.alert(
        'Re-pair Required',
        'Your device needs to be re-paired. Open Garmin Connect to select your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Garmin Connect', 
            onPress: () => {
              clearError();
              startDeviceSelection();
            }
          }
        ]
      );
      return;
    }
    
    const connectedDevice = devices.find(d => d.status === GarminDeviceStatus.CONNECTED);
    if (connectedDevice) {
      Alert.alert(
        'Garmin Connected',
        `Connected to ${connectedDevice.name || 'your device'}.\n\nTo disconnect, use the Garmin Connect app.`,
        [
          { text: 'OK' },
          { text: 'Re-pair', onPress: startDeviceSelection }
        ]
      );
    } else if (devices.length > 0) {
      // Devices are paired but not connected - offer to connect or re-pair
      Alert.alert(
        'Garmin Device',
        `${devices[0].name}\nStatus: ${devices[0].status || 'OFFLINE'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-pair', onPress: startDeviceSelection },
          { 
            text: 'Connect', 
            onPress: () => connectToDevice(devices[0])
          }
        ]
      );
    } else {
      startDeviceSelection();
    }
  };

  const connectedDevice = devices.find(d => d.status === GarminDeviceStatus.CONNECTED);
  const isConnected = !!connectedDevice;

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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Section Label */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          WEARABLES
        </Text>

        {/* Garmin */}
        <TouchableOpacity
          onPress={handleGarminPress}
          disabled={isConnecting}
          activeOpacity={0.7}
          style={[
            styles.card,
            { 
              backgroundColor: colors.card,
              borderColor: isConnected ? '#10B981' : colors.border,
              opacity: isConnecting ? 0.6 : 1,
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: '#007CC3' }]}>
            <Text style={styles.iconText}>G</Text>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Garmin</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              {isConnecting 
                ? 'Connecting...' 
                : isConnected 
                  ? connectedDevice?.name 
                  : devices.length > 0 
                    ? `${devices.length} device(s) paired`
                    : 'Heart rate & GPS sync'}
            </Text>
          </View>

          {isConnected ? (
            <View style={styles.connectedDot} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Apple Watch */}
        <View
          style={[
            styles.card,
            { 
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: 0.5,
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: '#000' }]}>
            <Ionicons name="watch" size={20} color="#fff" />
          </View>
          
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Apple Watch</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>Coming soon</Text>
          </View>
        </View>

        {/* Info */}
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Connected devices sync heart rate and GPS during training.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  content: { 
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
