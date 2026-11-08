import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { getAuthErrorMessage, HttpError } from '@/features/auth/api';
import { useResendTimer } from '@/features/auth/useResendTimer';
import { useSendOtp } from '@/features/auth/useSendOtp';
import { useVerifyOtp } from '@/features/auth/useVerifyOtp';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';

export default function VerifyScreen() {
  const { phone: rawPhone } = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof rawPhone === 'string' ? rawPhone : '';
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const submitLock = useRef(false);
  const resendLock = useRef(false);
  const verifyOtpMutation = useVerifyOtp();
  const sendOtpMutation = useSendOtp();
  const { remainingSeconds, start } = useResendTimer(60);
  const login = useAuthStore((state) => state.login);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleVerify = useCallback(
    async (value: string) => {
      if (submitLock.current || verifyOtpMutation.isPending || value.length !== 5) return;
      submitLock.current = true;
      setErrorMessage('');
      try {
        const result = await verifyOtpMutation.mutateAsync({ phone, code: value });
        await login(
          { accessToken: result.accessToken, refreshToken: result.refreshToken },
          result.isNewUser,
        );
      } catch (error) {
        if (error instanceof HttpError && (error.status === 400 || error.status === 401)) {
          setCode('');
          setErrorMessage(getAuthErrorMessage(error, strings.auth.invalidOtp));
        } else {
          setErrorMessage(getAuthErrorMessage(error));
        }
      } finally {
        submitLock.current = false;
      }
    },
    [login, phone, verifyOtpMutation],
  );

  const handleResend = async () => {
    if (resendLock.current || remainingSeconds > 0 || sendOtpMutation.isPending) return;
    resendLock.current = true;
    setErrorMessage('');
    try {
      await sendOtpMutation.mutateAsync(phone);
      setCode('');
      start(60);
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        start(error.retryAfter ?? 60);
      }
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      resendLock.current = false;
    }
  };

  if (!/^09\d{9}$/.test(phone)) return <Redirect href="/(auth)/login" />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Pressable
              accessibilityLabel={strings.auth.editPhone}
              accessibilityRole="button"
              onPress={() => router.replace('/(auth)/login')}
              style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.editPhone, { color: colors.textSecondary }]}>
                {strings.auth.editPhone}
              </Text>
            </Pressable>

            <Text style={[styles.title, { color: colors.text }]}>{strings.auth.verifyTitle}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {strings.auth.verifyDescription}
            </Text>
            <Text style={[styles.phone, { color: colors.text }]}>{phone}</Text>

            <OtpInput
              accessibilityLabel={strings.auth.codeLabel}
              editable={!verifyOtpMutation.isPending}
              onChange={(value) => {
                setCode(value);
                setErrorMessage('');
              }}
              onComplete={(value) => void handleVerify(value)}
              value={code}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel={strings.auth.verifyCode}
              accessibilityRole="button"
              accessibilityState={{ disabled: verifyOtpMutation.isPending || code.length !== 5 }}
              disabled={verifyOtpMutation.isPending || code.length !== 5}
              onPress={() => void handleVerify(code)}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.text },
                pressed && !verifyOtpMutation.isPending ? styles.pressed : null,
                verifyOtpMutation.isPending || code.length !== 5 ? styles.disabled : null,
              ]}>
              {verifyOtpMutation.isPending ? (
                <ActivityIndicator
                  accessibilityLabel={strings.common.loading}
                  color={colors.background}
                />
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  {strings.auth.verifyCode}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel={
                remainingSeconds > 0 ? strings.auth.resendIn(remainingSeconds) : strings.auth.resendCode
              }
              accessibilityRole="button"
              accessibilityState={{
                disabled: remainingSeconds > 0 || sendOtpMutation.isPending,
              }}
              disabled={remainingSeconds > 0 || sendOtpMutation.isPending}
              onPress={() => void handleResend()}
              style={({ pressed }) => pressed && styles.pressed}>
              {sendOtpMutation.isPending ? (
                <View style={styles.resendRow}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                    {strings.auth.resendingCode}
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    { color: colors.textSecondary },
                    remainingSeconds > 0 ? styles.disabledText : null,
                  ]}>
                  {remainingSeconds > 0
                    ? strings.auth.resendIn(remainingSeconds)
                    : strings.auth.resendCode}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  form: { gap: Spacing.three, width: '100%', alignSelf: 'center', maxWidth: 480 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  phone: { fontSize: 18, fontWeight: '600', textAlign: 'right', writingDirection: 'ltr' },
  editPhone: { fontSize: 15, textAlign: 'right', textDecorationLine: 'underline' },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  resendText: { fontSize: 15, textAlign: 'center' },
  resendRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  disabledText: { opacity: 0.65 },
  error: { color: '#c62828', textAlign: 'right', lineHeight: 22 },
});
