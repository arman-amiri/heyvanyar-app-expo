import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, FontFamilies, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [fontsLoaded, fontError] = useFonts({
    [FontFamilies.regular]: require('@/assets/fonts/iransans/IRANSans-web.ttf'),
    [FontFamilies.light]: require('@/assets/fonts/iransans/IRANSans-Light-web.ttf'),
    [FontFamilies.medium]: require('@/assets/fonts/iransans/IRANSans-Medium-web.ttf'),
    [FontFamilies.bold]: require('@/assets/fonts/iransans/IRANSans-Bold-web.ttf'),
  });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
  );
  const [hydrationError, setHydrationError] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const restoreSession = useCallback(async () => {
    setHydrationError(false);
    setIsHydrated(false);
    try {
      await hydrate();
    } catch {
      setHydrationError(true);
    } finally {
      setIsHydrated(true);
    }
  }, [hydrate]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isHydrated || (!fontsLoaded && !fontError)) return;
    void SplashScreen.hideAsync().catch(() => setHydrationError(true));
  }, [fontError, fontsLoaded, isHydrated]);

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isLoading = !isHydrated || status === 'loading' || (!fontsLoaded && !fontError);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          {isLoading ? null : hydrationError ? (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
              <View style={styles.errorContent}>
                <Text style={[styles.errorText, { color: colors.text }]}>
                  {strings.auth.sessionRestoreError}
                </Text>
                <Pressable
                  accessibilityLabel={strings.common.retry}
                  accessibilityRole="button"
                  onPress={() => void restoreSession()}
                  style={[styles.retryButton, { backgroundColor: colors.text }]}>
                  <Text style={{ color: colors.background }}>{strings.common.retry}</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          ) : fontError ? (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
              <View style={styles.errorContent}>
                <Text style={[styles.errorText, { color: colors.text }]}>
                  {strings.common.fontLoadError}
                </Text>
              </View>
            </SafeAreaView>
          ) : (
            <AuthNavigation />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AuthNavigation() {
  const status = useAuthStore((state) => state.status);
  const isNewUser = useAuthStore((state) => state.isNewUser);
  const postLoginRoute = useAuthStore((state) => state.postLoginRoute);
  const segments = useSegments();
  const rootSegment = segments[0];
  const childSegment = segments[1];

  if (status === 'unauthenticated') {
    if (rootSegment === '(auth)') {
      if (childSegment === 'complete-profile') return <Redirect href="/(tabs)" />;
    } else if (rootSegment !== '(tabs)') {
      return <Redirect href="/(tabs)" />;
    }
  } else if (status === 'authenticated') {
    const destination = isNewUser
      ? '/(auth)/complete-profile'
      : (postLoginRoute ?? '/(tabs)');
    if (rootSegment === '(auth)') {
      if (childSegment === 'login') return <Stack screenOptions={{ headerShown: false }} />;
      if (childSegment !== 'complete-profile' || !isNewUser) {
        return <Redirect href={destination} />;
      }
    } else if (rootSegment !== '(tabs)') {
      return <Redirect href={destination} />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  errorContent: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  errorText: { fontSize: 16, textAlign: 'right' },
  retryButton: {
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
});