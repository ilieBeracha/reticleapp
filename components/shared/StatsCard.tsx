import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
}

interface StatsCardProps {
  stats: StatItem[];
}

export default function StatsCard({ stats }: StatsCardProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: stat.iconBg }]}>
                <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
              </View>
              <View style={styles.text}>
                <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>{stat.label}</Text>
              </View>
            </View>
            {index < stats.length - 1 && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  divider: {
    width: 1,
    height: 48,
    position: 'absolute',
    right: -15,
  },
});

