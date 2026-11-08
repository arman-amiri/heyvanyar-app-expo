import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';

export default function CompleteProfileScreen() {
  const completeProfile = useAuthStore((state) => state.completeProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleContinue = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await completeProfile();
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, strings.auth.unexpectedError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.auth.profileTitle}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {strings.auth.profileDescription}
        </Text>
        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel={strings.auth.enterApp}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving }}
          disabled={isSaving}
          onPress={() => void handleContinue()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.text },
            pressed && !isSaving ? styles.pressed : null,
            isSaving ? styles.disabled : null,
          ]}>
          {isSaving ? (
            <ActivityIndicator
              accessibilityLabel={strings.common.loading}
              color={colors.background}
            />
          ) : (
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {strings.auth.enterApp}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  error: { color: '#c62828', textAlign: 'right' },
});
