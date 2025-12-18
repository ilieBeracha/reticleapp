import { useColors } from "@/hooks/ui/useColors";
// import { garminService } from "@/services/garminService";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CheckCircle2, RefreshCw, Watch, Wifi, WifiOff } from "lucide-react-native";
import { forwardRef, useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { connectDevice, Device, getDevicesList, Status } from "react-native-garmin-connect";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

export const GarminSheet = forwardRef<BaseBottomSheetRef>((_, ref) => {
  const colors = useColors();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  const handleInitialize = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      // await garminService.connect();
      setIsInitialized(true);
      // Fetch devices after init
      const deviceList = await getDevicesList();
      setDevices(deviceList);
    } catch (error) {
      console.error('Garmin init error:', error);
      Alert.alert('Connection Failed', 'Make sure Garmin Connect app is installed on your device.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefreshDevices = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    try {
      const deviceList = await getDevicesList();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnectDevice = useCallback(async (device: Device) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      connectDevice(device.id, device.model, device.name);
      setConnectedDevice(device);
      Alert.alert('Connected!', `Successfully connected to ${device.name}`);
    } catch (error) {
      console.error('Connect device error:', error);
      Alert.alert('Connection Failed', 'Unable to connect to this device.');
    }
  }, []);

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case Status.CONNECTED: return <CheckCircle2 size={18} color={colors.primary} />;
      case Status.ONLINE: return <Wifi size={18} color={colors.green} />;
      case Status.OFFLINE: return <WifiOff size={18} color={colors.textMuted} />;
      default: return <WifiOff size={18} color={colors.textMuted} />;
    }
  };

  return (
    <BaseBottomSheet ref={ref} snapPoints={['55%', '80%']} enableDynamicSizing={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: '#11314B' }]}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Garmin Connect</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sync heart rate, GPS, and biometrics during sessions
          </Text>
        </View>

        {/* Not Initialized State */}
        {!isInitialized ? (
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={handleInitialize}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Watch size={20} color="#FFFFFF" />
                <Text style={styles.connectButtonText}>Connect to Garmin</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {/* Devices Section */}
            <View style={styles.devicesSection}>
              <View style={styles.devicesSectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  AVAILABLE DEVICES
                </Text>
                <TouchableOpacity onPress={handleRefreshDevices} disabled={isLoading}>
                  <RefreshCw 
                    size={16} 
                    color={colors.textMuted} 
                    style={isLoading ? { opacity: 0.5 } : undefined}
                  />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                    Searching for devices...
                  </Text>
                </View>
              ) : devices.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="watch-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    No devices found. Make sure your Garmin device is nearby and paired in the Garmin Connect app.
                  </Text>
                </View>
              ) : (
                devices.map((device) => (
                  <TouchableOpacity
                    key={device.id}
                    style={[
                      styles.deviceCard,
                      { 
                        backgroundColor: colors.card, 
                        borderColor: connectedDevice?.id === device.id ? colors.primary : colors.border 
                      },
                    ]}
                    onPress={() => handleConnectDevice(device)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.deviceIcon, { backgroundColor: '#11314B' }]}>
                      <Watch size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: colors.text }]}>
                        {device.name || device.model}
                      </Text>
                      <Text style={[styles.deviceModel, { color: colors.textMuted }]}>
                        {device.model}
                      </Text>
                    </View>
                    {getStatusIcon(device.status)}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Requires Garmin Connect app installed on your device.
          </Text>
        </View>
      </View>
    </BaseBottomSheet>
  );
});

GarminSheet.displayName = 'GarminSheet';

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 20,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  devicesSection: {
    marginBottom: 20,
  },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  deviceModel: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});




