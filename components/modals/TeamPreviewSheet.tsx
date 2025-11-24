import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import type { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseDetachedBottomSheet, BaseDetachedBottomSheetRef } from './BaseDetachedBottomSheet';

type TeamWithMemberCount = Team & { member_count?: number };

interface TeamPreviewSheetProps {
  team: TeamWithMemberCount | null;
}

export const TeamPreviewSheet = forwardRef<BaseDetachedBottomSheetRef, TeamPreviewSheetProps>(
  ({ team }, ref) => {
    const { theme } = useTheme();
    const colors = Colors[theme];

    if (!team) return null;

    return (
      <BaseDetachedBottomSheet ref={ref}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
              <Ionicons name="people" size={32} color={colors.text} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>{team.name}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {team.member_count || 0} {(team.member_count || 0) === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>

          {team.description && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Description</Text>
              <Text style={[styles.description, { color: colors.text }]}>{team.description}</Text>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Squads</Text>
            {team.squads && team.squads.length > 0 ? (
              <View style={styles.squadsList}>
                {team.squads.map((squad: string, index: number) => (
                  <View key={index} style={[styles.squadBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.squadText, { color: colors.text }]}>{squad}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No squads defined</Text>
            )}
          </View>
        </View>
      </BaseDetachedBottomSheet>
    );
  }
);

TeamPreviewSheet.displayName = 'TeamPreviewSheet';

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  squadsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  squadBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  squadText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
});

