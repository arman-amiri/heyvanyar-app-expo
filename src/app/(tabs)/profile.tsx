import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.profile}</Text>
        <View style={styles.profileSummary}>
          <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }}
              size={76}
              tintColor={colors.textSecondary}
            />
          </View>
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
                <Text style={[styles.retryText, { color: colors.text }]}>
                  {strings.common.retry}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.mobile, { color: colors.text }]}>
              {profileQuery.data.mobile}
            </Text>
          )}
        </View>

        <View style={styles.menu}>
          <ProfileMenuItem
            colors={colors}
            icon={{ ios: 'list.bullet.rectangle', android: 'list_alt', web: 'list_alt' }}
            label={strings.tabs.myAdsMenu}
            onPress={() => router.push('/my-ads')}
          />
          <ProfileMenuItem
            colors={colors}
            icon={{ ios: 'plus.app.fill', android: 'add_box', web: 'add_box' }}
            label={strings.tabs.createAdMenu}
            onPress={() => router.push('/(tabs)/ads')}
          />
          <ProfileMenuItem
            colors={colors}
            icon={{
              ios: 'bubble.left.and.bubble.right.fill',
              android: 'chat',
              web: 'chat',
            }}
            label={strings.tabs.chatMenu}
            onPress={() => router.push('/(tabs)/chat')}
          />
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

type MenuIcon = ComponentProps<typeof SymbolView>['name'];

function ProfileMenuItem({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: (typeof Colors)[keyof typeof Colors];
  icon: MenuIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: colors.backgroundElement },
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.menuLabel}>
        <SymbolView name={icon} size={22} tintColor={colors.textSecondary} />
        <Text style={[styles.menuText, { color: colors.text }]}>{label}</Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={18}
        tintColor={colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, gap: Spacing.three, padding: Spacing.four },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'right' },
  profileSummary: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  avatar: {
    alignItems: 'center',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  mobile: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  menu: { gap: Spacing.two, marginTop: Spacing.three },
  menuItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: Spacing.three,
  },
  menuLabel: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  menuText: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
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
