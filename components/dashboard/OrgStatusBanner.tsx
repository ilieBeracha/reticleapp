import { useColors } from '@/hooks/ui/useColors';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface OrgStatusBannerProps {
  organizationCount: number;
  onConnectPress: () => void;
}

export function OrgStatusBanner({ organizationCount, onConnectPress }: OrgStatusBannerProps) {
  const { text, textMuted, card, border } = useColors();

  if (organizationCount > 0) {
    return null; // Don't show banner if already connected
  }

  return (
    <View style={[styles.container, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.content}>
        <Text style={[styles.emoji]}>🎯</Text>
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: text }]}>Viewing Personal Stats</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Connect to an organization to track team training
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
        ]}
        onPress={onConnectPress}
      >
        <Text style={styles.buttonText}>Connect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});

