import { BaseButton } from '@/components/ui/baseButton';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomePage() {
  const { signOut } = useAuth();
  const { background } = useColors();

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text>Home Page</Text>
      <BaseButton onPress={() => router.push('/(protected)/modal')}>
        <Text>Open Organization Modal</Text>
      </BaseButton>
      <BaseButton onPress={() => signOut()}>
        <Text>Sign Out</Text>
      </BaseButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '500',
  },
});
