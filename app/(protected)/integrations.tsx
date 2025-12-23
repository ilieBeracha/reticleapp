import { useColors } from '@/hooks/ui/useColors';
import { useGarminStore } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Alert, Button, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();
  const { devices, status, statusReason, messages, openDeviceSelection, send } = useGarminStore();

  const device = devices[0];
  const isConnected = status === 'CONNECTED';

  const handlePing = () => {
    send('PING', { time: Date.now() });
    Alert.alert('Sent', 'PING sent to watch');
  };

  const handleStartWorkout = () => {
    send('COMMAND', { action: 'start_workout', type: 'shooting' });
    Alert.alert('Sent', 'Start workout command sent');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Integrations' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.textMuted }]}>WEARABLES</Text>

        {/* Garmin Card */}
        <TouchableOpacity
          onPress={openDeviceSelection}
          style={[styles.card, { backgroundColor: colors.card, borderColor: isConnected ? '#10B981' : colors.border }]}
        >
          <View style={[styles.icon, { backgroundColor: '#007CC3' }]}>
            <Text style={styles.iconText}>G</Text>
          </View>
          
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>
              {device?.name || 'Garmin'}
            </Text>
            <Text style={[styles.subtitle, { color: isConnected ? '#10B981' : colors.textMuted }]}>
              {status}{statusReason ? ` - ${statusReason}` : ''}
            </Text>
          </View>

          <View style={[styles.dot, { backgroundColor: isConnected ? '#10B981' : '#666' }]} />
        </TouchableOpacity>

        {/* Test Buttons - only show when connected */}
        {isConnected && (
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

        {/* Received Messages */}
        {messages.length > 0 && (
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
});
