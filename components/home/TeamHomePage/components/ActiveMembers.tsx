/**
 * ActiveMembers Component
 *
 * Compact horizontal row of member avatars with status.
 */

import { BaseAvatar } from '@/components/shared/Avatar';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ActiveMember {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  status: 'online' | 'training' | 'recent';
  lastActivity?: string;
}

interface ActiveMembersProps {
  members: ActiveMember[];
  totalMembers: number;
  teamColor: string;
  onViewAll: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function ActiveMembers({ members, totalMembers, teamColor, onViewAll, colors }: ActiveMembersProps) {
  const onlineCount = members.filter((m) => m.status === 'online' || m.status === 'training').length;

  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>MEMBERS</Text>
        {onlineCount > 0 && (
          <View style={s.onlineIndicator}>
            <View style={[s.onlineDot, { backgroundColor: colors.green }]} />
            <Text style={[s.onlineText, { color: colors.textMuted }]}>{onlineCount} active</Text>
          </View>
        )}
      </View>

      {/* Members Row */}
      <TouchableOpacity
        style={[s.membersRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onViewAll}
        activeOpacity={0.7}
      >
        {/* Stacked Avatars */}
        <View style={s.avatarStack}>
          {members.slice(0, 4).map((member, index) => (
            <View key={member.userId} style={[s.avatarWrapper, { marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }]}>
              <MemberAvatar member={member} colors={colors} size={28} />
            </View>
          ))}
        </View>

        {/* Member Count */}
        <View style={s.countSection}>
          <Text style={[s.countText, { color: colors.text }]}>{totalMembers} members</Text>
          <Text style={[s.countSubtext, { color: colors.textMuted }]}>View team</Text>
        </View>

        <ChevronRight size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface MemberAvatarProps {
  member: ActiveMember;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
  size: number;
}

function MemberAvatar({ member, colors, size }: MemberAvatarProps) {
  const initial = member.userName.charAt(0).toUpperCase();
  const isActive = member.status === 'online' || member.status === 'training';

  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: colors.card }]}>
      {member.avatarUrl ? (
        <BaseAvatar source={{ uri: member.avatarUrl }} fallbackText={initial} size="xs" borderWidth={0} />
      ) : (
        <View style={[s.fallbackAvatar, { backgroundColor: colors.border, width: size - 4, height: size - 4 }]}>
          <Text style={[s.fallbackText, { color: colors.text, fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
      {isActive && <View style={[s.statusDot, { backgroundColor: colors.green, borderColor: colors.card }]} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '500',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 14,
  },
  avatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fallbackAvatar: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  countSection: {
    flex: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  countSubtext: {
    fontSize: 11,
    fontWeight: '400',
  },
});
