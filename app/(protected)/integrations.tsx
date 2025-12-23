import { useColors } from '@/hooks/ui/useColors';
import { useGarminStore } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();
  const { devices, status, reason, openDeviceSelection } = useGarminStore();

  const device = devices[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Integrations' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.textMuted }]}>WEARABLES</Text>

        {/* Garmin */}
        <TouchableOpacity
          onPress={openDeviceSelection}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.icon, { backgroundColor: '#007CC3' }]}>
            <Text style={styles.iconText}>G</Text>
          </View>
          
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>
              {device?.name || 'Garmin'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {device ? `${status} ${reason ? `- ${reason}` : ''}` : 'Tap to pair'}
            </Text>
          </View>

          <View style={[styles.dot, { backgroundColor: status === 'CONNECTED' ? '#10B981' : '#666' }]} />
        </TouchableOpacity>

        {/* Apple Watch */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}>
          <View style={[styles.icon, { backgroundColor: '#000' }]}>
            <Ionicons name="watch" size={20} color="#fff" />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>Apple Watch</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Coming soon</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
