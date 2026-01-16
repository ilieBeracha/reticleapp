/**
 * Team Switcher Pill
 * 
 * Trigger button that opens the team switcher sheet.
 * The actual sheet is now a native formSheet route at /(protected)/teamSwitcher
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronDown, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SWITCHER PILL
// ─────────────────────────────────────────────────────────────────────────────

interface TeamSwitcherPillProps {
  onPress?: () => void;
}

export function TeamSwitcherPill({ onPress }: TeamSwitcherPillProps) {
  const colors = useColors();
  const { teams, activeTeamId } = useTeamStore();
  
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const teamName = activeTeam?.name || 'Select Team';
  
  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      router.push('/(protected)/teamSwitcher' as any);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Users size={14} color={colors.primary} />
      <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>
        {teamName}
      </Text>
      <ChevronDown size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY: TeamSwitcherSheet (kept for backwards compatibility)
// Now a no-op wrapper - use the route directly instead
// ─────────────────────────────────────────────────────────────────────────────

interface TeamSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function TeamSwitcherSheet({ visible, onClose }: TeamSwitcherSheetProps) {
  // This is now deprecated - the sheet is a native route
  // Open the route when visible becomes true
  if (visible) {
    router.push('/(protected)/teamSwitcher' as any);
    onClose();
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },
});
