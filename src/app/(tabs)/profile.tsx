import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';

export default function ProfileScreen() {
  const status = useAuthStore((state) => state.status);
  const setPostLoginRoute = useAuthStore((state) => state.setPostLoginRoute);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      setPostLoginRoute('/(tabs)/profile');
      router.replace('/(auth)/login');
    } else if (status === 'authenticated') {
      setPostLoginRoute(null);
    }
  }, [setPostLoginRoute, status]);

  if (status !== 'authenticated') return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.profile}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {strings.tabs.profileDescription}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, gap: Spacing.three, justifyContent: 'center', padding: Spacing.four },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'right' },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
});
