/**
 * Empty state for users with no teams
 * Shows create/join options
 */
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus, UserPlus, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

export function NoTeamsEmptyState() {
  const colors = useColors();

  const handleCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  };

  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/acceptInvite' as any);
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Icon */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(400)}
        style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}
      >
        <Users size={48} color={colors.primary} />
      </Animated.View>

      {/* Text */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          You're not in a team yet
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Create your own team or join an existing one to coordinate training with others.
        </Text>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreateTeam}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Create Team</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleJoinTeam}
          activeOpacity={0.8}
        >
          <UserPlus size={18} color={colors.text} />
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Join Team</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

