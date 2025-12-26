import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { SheetHeader } from './SheetHeader';
import { styles } from './styles';
import type { AcceptedResult } from './types';
import { getRoleColor, getRoleIcon, getRoleLabel } from './utils';

interface SuccessViewProps {
  result: AcceptedResult;
  onOpenTeam: (teamId: string) => void;
  onClose: () => void;
}

export function SuccessView({ result, onOpenTeam, onClose }: SuccessViewProps) {
  const colors = useColors();
  const roleColor = getRoleColor(result.role);

  return (
    <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
      <SheetHeader onClose={onClose} />

      <View style={[styles.successIcon, { backgroundColor: colors.primary + '18', borderColor: colors.border }]}>
        <Ionicons name="checkmark-circle" size={66} color={colors.primary} />
      </View>

      <Text style={[styles.successTitle, { color: colors.text }]}>You're in</Text>
      <Text style={[styles.successTeam, { color: colors.text }]} numberOfLines={1}>
        {result.team_name}
      </Text>

      <View style={[styles.successBadge, { backgroundColor: roleColor + '18', borderColor: colors.border }]}>
        <Ionicons name={getRoleIcon(result.role)} size={16} color={roleColor} />
        <Text style={[styles.successRole, { color: roleColor }]}>
          Joined as {getRoleLabel(result.role)}
        </Text>
      </View>

      <View style={styles.successActions}>
        <TouchableOpacity
          style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
          onPress={() => onOpenTeam(result.team_id)}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Open Team</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryActionButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryActionText, { color: colors.text }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
