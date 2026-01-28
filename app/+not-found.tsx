import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Not Found Screen
 *
 * Catches any unmatched routes and provides a way back to the app.
 */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  const pathname = usePathname();
  useEffect(() => {
    console.log(pathname || '');
  }, [pathname]);
  return (
    <>
      <Stack.Screen options={{ title: t('common.oops') }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text }]}>{t('common.pageNotFound')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('common.screenNotExist')}</Text>
        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          {t('common.goHome')}
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  link: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});
