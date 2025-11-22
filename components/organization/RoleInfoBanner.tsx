import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RoleInfoBannerProps {
  isInstructor: boolean;
  canManageWorkspace: boolean;
}

const RoleInfoBanner = memo(function RoleInfoBanner({
  isInstructor,
  canManageWorkspace,
}: RoleInfoBannerProps) {
  const colors = useColors();

  if (canManageWorkspace) {
    return null;
  }

  const message = isInstructor
    ? "As an instructor, you can create trainings and view team progress"
    : "You can participate in sessions and view team activities";

  return (
    <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
      <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
        {message}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
});

export default RoleInfoBanner;
