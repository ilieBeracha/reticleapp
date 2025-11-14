import type { Organization } from '@/types/dashboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface OrganizationCardProps {
  organization: Organization;
  onPress: () => void;
}

const colorMap = {
  mint: '#C7F5E8',
  yellow: '#FEF3C7',
  blue: '#DBEAFE',
  purple: '#E9D5FF',
};

export function OrganizationCard({ organization, onPress }: OrganizationCardProps) {
  const backgroundColor = colorMap[organization.color];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.status}>
          {organization.status === 'active' ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Text style={styles.title}>{organization.name}</Text>
      <Text style={styles.subtitle}>
        {organization.sessionsCount} active session{organization.sessionsCount !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

