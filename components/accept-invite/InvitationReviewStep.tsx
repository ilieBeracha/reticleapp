import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';
import type { ValidatedInvite } from './types';
import { getRoleColor, getRoleIcon, getRoleLabel } from './utils';

interface InvitationReviewStepProps {
  invite: ValidatedInvite;
  isAccepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function InvitationReviewStep({
  invite,
  isAccepting,
  onAccept,
  onDecline,
}: InvitationReviewStepProps) {
  const colors = useColors();
  const roleColor = getRoleColor(invite.role);

  return (
    <>
      <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.inviteCardTopRow}>
          <View style={[styles.sectionPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.sectionPillText, { color: colors.textMuted }]}>INVITATION</Text>
          </View>
        </View>

        <View style={styles.teamHeaderRow}>
          <View style={[styles.teamIcon, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="people" size={28} color={colors.primary} />
          </View>

          <View style={styles.teamHeaderText}>
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {invite.team_name || 'Team'}
            </Text>
            <Text style={[styles.teamSubtitle, { color: colors.textMuted }]}>
              Review details, then join the team
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Role</Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: roleColor + '18', borderColor: colors.border }]}>
            <Ionicons name={getRoleIcon(invite.role)} size={14} color={roleColor} />
            <Text style={[styles.roleChipText, { color: roleColor }]}>
              {getRoleLabel(invite.role)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Expires</Text>
          </View>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {new Date(invite.expires_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Ionicons name="key-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Code</Text>
          </View>
          <Text style={[styles.detailValueMono, { color: colors.text }]}>
            •••• {String(invite.invite_code || '').slice(-4).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.declineButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.secondary,
            },
          ]}
          onPress={onDecline}
          disabled={isAccepting}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.text} />
          <Text style={[styles.declineButtonText, { color: colors.text }]}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            {
              backgroundColor: isAccepting ? colors.secondary : colors.primary,
              opacity: isAccepting ? 0.7 : 1,
            },
          ]}
          onPress={onAccept}
          disabled={isAccepting}
          activeOpacity={0.8}
        >
          {isAccepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={styles.acceptButtonText}>Join Team</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}
