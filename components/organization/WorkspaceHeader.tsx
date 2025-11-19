import { RoleBadge } from '@/components/shared/RoleBadge';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WorkspaceHeaderProps {
  workspaceName: string;
  role: string;
  onSettingsPress: () => void;
}

const WorkspaceHeader = memo(function WorkspaceHeader({
  workspaceName,
  role,
  onSettingsPress,
}: WorkspaceHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.workspaceName, { color: colors.text }]}>
          {workspaceName}
        </Text>
        <RoleBadge role={role} />
      </View>
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onSettingsPress}
      >
        <Ionicons name="settings-outline" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  workspaceName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default WorkspaceHeader;
