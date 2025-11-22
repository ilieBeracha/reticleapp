import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RoleBadgeProps {
  role: string;
}

const ROLE_CONFIG = {
  owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
  admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
  instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
  member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
};

export const RoleBadge = memo(function RoleBadge({ role }: RoleBadgeProps) {
  const normalizedRole = role.toLowerCase() as keyof typeof ROLE_CONFIG;
  const config = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG.member;
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.roleBadgeText, { color: config.color }]}>
        {displayRole}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

