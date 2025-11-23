import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface OrgTaskCardProps {
  title: string;
  date: string;
  hours: string;
  progress: number;
  status: string;
  statusColor: string;
  percentage: number;
  attachments: number;
  subtasks: string;
  comments: number;
  likes: number;
  teamMembers: string[];
  colors: {
    card: string;
    text: string;
    textMuted: string;
    secondary: string;
    icon: string;
  };
}

/**
 * Organization task card component - displays task details with progress.
 * Extracted from OrganizationHomePage for reusability and performance.
 */
export const OrgTaskCard = React.memo(function OrgTaskCard({
  title,
  date,
  hours,
  progress,
  status,
  statusColor,
  percentage,
  attachments,
  subtasks,
  comments,
  likes,
  teamMembers,
  colors,
}: OrgTaskCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>{date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>{hours}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.icon }]}>{percentage}%</Text>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Feather name="paperclip" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.icon }]}>{attachments}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="check-square" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.icon }]}>{subtasks}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="message-circle" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.icon }]}>{comments}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="heart" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.icon }]}>{likes}</Text>
          </View>
        </View>

        <View style={styles.teamMembers}>
          {teamMembers.map((member, idx) => (
            <View
              key={idx}
              style={[
                styles.teamMemberAvatar,
                {
                  marginLeft: idx > 0 ? -8 : 0,
                  backgroundColor: colors.secondary,
                  borderColor: colors.card,
                },
              ]}
            >
              <Text style={styles.teamMemberText}>{member}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  teamMembers: {
    flexDirection: 'row',
  },
  teamMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  teamMemberText: {
    fontSize: 10,
  },
});

export default OrgTaskCard;
