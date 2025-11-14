import { StyleSheet, Text, View } from 'react-native';

interface StatItemProps {
  value: string | number;
  label: string;
}

export function StatItem({ value, label }: StatItemProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

