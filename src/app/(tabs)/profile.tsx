import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { getAuthErrorMessage, logoutFromServer } from '@/features/auth/api';
import { getCurrentUser } from '@/features/profile/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';

export default function ProfileScreen() {
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const [logoutError, setLogoutError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getCurrentUser,
    enabled: status === 'authenticated',
    retry: false,
  });
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      queryClient.removeQueries({ queryKey: ['profile', 'me'] });
      router.replace('/(auth)/login');
    }
  }, [queryClient, status]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logoutFromServer();
      await logout();
      queryClient.clear();
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (status !== 'authenticated') return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.profile}</Text>
        {profileQuery.isPending ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : profileQuery.isError ? (
          <View style={styles.profileMessage}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {strings.tabs.profileLoadingError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void profileQuery.refetch()}
              style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.retryText, { color: colors.text }]}>{strings.common.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.details}>
            <ProfileField
              label={strings.tabs.profileName}
              value={profileQuery.data.name}
              color={colors.text}
            />
            <ProfileField
              label={strings.tabs.profileFamily}
              value={profileQuery.data.family}
              color={colors.text}
            />
            <ProfileField
              label={strings.tabs.profileMobile}
              value={profileQuery.data.mobile}
              color={colors.text}
            />
          </View>
        )}

        {logoutError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {logoutError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.tabs.logout}
          accessibilityState={{ disabled: isLoggingOut }}
          disabled={isLoggingOut}
          onPress={() => void handleLogout()}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: colors.text },
            pressed && !isLoggingOut ? styles.pressed : null,
            isLoggingOut ? styles.disabled : null,
          ]}>
          {isLoggingOut ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.logoutText, { color: colors.background }]}>
              {strings.tabs.logout}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ProfileField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, gap: Spacing.three, padding: Spacing.four },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'right' },
  details: { gap: Spacing.three, paddingVertical: Spacing.two },
  field: { gap: Spacing.one, alignItems: 'flex-end' },
  fieldLabel: { fontSize: 14, opacity: 0.7, textAlign: 'right' },
  fieldValue: { fontSize: 17, fontWeight: '600', textAlign: 'right' },
  profileMessage: { alignItems: 'center', gap: Spacing.two },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  retryText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  error: { color: '#c62828', textAlign: 'right', lineHeight: 22 },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 'auto',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
});
