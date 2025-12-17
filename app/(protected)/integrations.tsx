/**
 * Integrations Page
 * 
 * Connect wearables and external services:
 * - Apple Watch (coming soon)
 */
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Watch, Plug } from 'lucide-react-native';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function IntegrationsScreen() {
  const colors = useColors();

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

        {/* Info Section */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Connected devices will automatically sync heart rate and GPS data during active training sessions.
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

  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
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



