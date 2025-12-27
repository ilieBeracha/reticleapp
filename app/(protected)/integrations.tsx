import { useColors } from '@/hooks/ui/useColors';
import { useGarminStore, useWatchEnabled } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Alert, Button, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();
  const watchEnabled = useWatchEnabled();
  const { devices, status, statusReason, messages, openDeviceSelection, send, setWatchEnabled } = useGarminStore();

  const device = devices[0];
  const isConnected = status === 'CONNECTED';
  const isOnline = status === 'ONLINE'; // Watch reachable but app not open

  const handlePing = () => {
    send('PING', { time: Date.now() });
    Alert.alert('Sent', 'PING sent to watch');
  };

  const handleStartWorkout = () => {
    send('COMMAND', { action: 'start_workout', type: 'shooting' });
    Alert.alert('Sent', 'Start workout command sent');
  };

  const handleToggleWatch = async (enabled: boolean) => {
    await setWatchEnabled(enabled);
    if (enabled) {
      Alert.alert(
        'Garmin Enabled',
        'Restart the app to connect to your watch, or tap the Garmin card below to pair now.'
      );
    }
  };

  const handleGarminCardPress = () => {
    if (isOnline) {
      // Watch is reachable but app not open - repair won't help
      Alert.alert(
        'Open Watch App',
        'Your watch is connected but the ReticleIQ app is not open.\n\nPlease open the ReticleIQ app on your Garmin watch.',
        [{ text: 'OK' }]
      );
    } else if (!isConnected) {
      // OFFLINE or needs pairing - open device selection
      openDeviceSelection();
    }
    // If already CONNECTED, do nothing
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Integrations' }} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Watch Toggle */}
        <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.toggleInfo}>
            <Ionicons name="watch-outline" size={24} color={watchEnabled ? '#10B981' : colors.textMuted} />
            <View style={styles.toggleText}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Use Garmin Watch</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textMuted }]}>
                {watchEnabled ? 'Watch integration enabled' : 'Watch features disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={watchEnabled}
            onValueChange={handleToggleWatch}
            trackColor={{ false: colors.border, true: '#10B98150' }}
            thumbColor={watchEnabled ? '#10B981' : '#f4f3f4'}
          />
        </View>

        {/* Only show Garmin options if enabled */}
        {watchEnabled && (
          <>
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>WEARABLES</Text>

            {/* Garmin Card */}
            <TouchableOpacity
              onPress={handleGarminCardPress}
              activeOpacity={isConnected ? 1 : 0.7}
              style={[styles.card, { 
                backgroundColor: colors.card, 
                borderColor: isConnected ? '#10B981' : isOnline ? '#3B82F6' : colors.border 
              }]}
            >
              <View style={[styles.icon, { backgroundColor: '#007CC3' }]}>
                <Text style={styles.iconText}>G</Text>
              </View>
              
              <View style={styles.info}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {device?.name || 'Garmin'}
                </Text>
                <Text style={[styles.subtitle, { 
                  color: isConnected ? '#10B981' : isOnline ? '#3B82F6' : colors.textMuted 
                }]}>
                  {isOnline 
                    ? 'Open ReticleIQ app on watch' 
                    : status + (statusReason ? ` - ${statusReason}` : '')}
                </Text>
              </View>

              <View style={[styles.dot, { 
                backgroundColor: isConnected ? '#10B981' : isOnline ? '#3B82F6' : '#666' 
              }]} />
            </TouchableOpacity>
          </>
        )}

        {/* Test Buttons - only show when connected and enabled */}
        {watchEnabled && isConnected && (
          <>
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>TEST MESSAGES</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.buttons}>
                <Button title="📡 Ping" onPress={handlePing} color="#007CC3" />
                <Button title="🏃 Start Workout" onPress={handleStartWorkout} color="#10B981" />
              </View>
            </View>
          </>
        )}

        {/* Received Messages - only show when enabled */}
        {watchEnabled && messages.length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>MESSAGES FROM WATCH</Text>
            
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {messages.map((msg, i) => (
                <Text key={i} style={[styles.message, { color: colors.text }]}>
                  {msg.type}: {JSON.stringify(msg.payload)}
                </Text>
              ))}
            </View>
          </>
        )}

        {/* Apple Watch */}
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>COMING SOON</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}>
          <View style={[styles.icon, { backgroundColor: '#000' }]}>
            <Ionicons name="watch" size={20} color="#fff" />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>Apple Watch</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 14, flexWrap: 'wrap' },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  buttons: { flexDirection: 'row', gap: 10, flex: 1, justifyContent: 'center' },
  message: { fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  // Toggle card styles
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    gap: 2,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 13,
  },
});
