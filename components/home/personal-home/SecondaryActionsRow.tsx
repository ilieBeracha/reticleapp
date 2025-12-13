import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, BarChart3, ScanLine } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors } from './types';

interface SecondaryActionsRowProps {
  colors: ThemeColors;
}

export function SecondaryActionsRow({ colors }: SecondaryActionsRowProps) {
  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => handlePress('/(protected)/scans')}
        activeOpacity={0.7}
        style={[styles.button, { borderColor: colors.border }]}
      >
        <ScanLine size={18} color={colors.text} strokeWidth={1.5} />
        <Text style={[styles.label, { color: colors.text }]}>Scans</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('/(protected)/(tabs)/insights')}
        activeOpacity={0.7}
        style={[styles.button, { borderColor: colors.border }]}
      >
        <BarChart3 size={18} color={colors.text} strokeWidth={1.5} />
        <Text style={[styles.label, { color: colors.text }]}>Insights</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('/(protected)/(tabs)/trainings')}
        activeOpacity={0.7}
        style={[styles.button, { borderColor: colors.border }]}
      >
        <Calendar size={18} color={colors.text} strokeWidth={1.5} />
        <Text style={[styles.label, { color: colors.text }]}>Trainings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,

  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
