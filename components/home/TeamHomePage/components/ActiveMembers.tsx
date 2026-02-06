/**
 * ActiveMembers Component
 *
 * Compact row showing team members with avatars.
 * Tappable to navigate to full members list.
 */

import { BaseAvatar } from '@/components/shared/Avatar';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeamMemberDisplay {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
}

interface ActiveMembersProps {
  members: TeamMemberDisplay[];
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
  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.container}>
      {/* Header */}
      <Text style={[s.headerText, { color: colors.textMuted }]}>MEMBERS</Text>

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
          {totalMembers > 4 && (
            <View style={[s.avatarWrapper, { marginLeft: -8, zIndex: 0 }]}>
              <View style={[s.moreAvatar, { backgroundColor: colors.border, width: 28, height: 28, borderColor: colors.card }]}>
                <Text style={[s.moreText, { color: colors.textMuted }]}>+{totalMembers - 4}</Text>
              </View>
            </View>
          )}
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

function MemberAvatar({ member, colors, size }: { member: TeamMemberDisplay; colors: { text: string; card: string; border: string }; size: number }) {
  const initial = member.userName.charAt(0).toUpperCase();

  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: colors.card }]}>
      {member.avatarUrl ? (
        <BaseAvatar source={{ uri: member.avatarUrl }} fallbackText={initial} size="xs" borderWidth={0} />
      ) : (
        <View style={[s.fallbackAvatar, { backgroundColor: colors.border, width: size - 4, height: size - 4 }]}>
          <Text style={[s.fallbackText, { color: colors.text, fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
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
  },
  fallbackAvatar: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '600',
  },
  moreAvatar: {
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 9,
    fontWeight: '700',
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
