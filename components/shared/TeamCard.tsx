import { useColors } from '@/hooks/ui/useColors';
import type { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TeamCardProps {
  team: Team;
  memberCount?: number;
  onPress?: (team: Team) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function TeamCard({ team, memberCount = 0, onPress, isFirst, isLast }: TeamCardProps) {
  const colors = useColors();
  const isFieldTeam = team.team_type === 'field';

  return (
    <TouchableOpacity
      style={[styles.card]}
      onPress={() => onPress?.(team)}
      activeOpacity={0.8}
    >
      <View style={[
        styles.icon,
        { backgroundColor: isFieldTeam ? '#5B7A8C15' : '#E7692515' }
      ]}>
        <Ionicons 
          name={isFieldTeam ? 'shield' : 'desktop'} 
          size={20} 
          color={isFieldTeam ? '#5B7A8C' : '#E76925'} 
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{team.name}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {memberCount} members
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
});

