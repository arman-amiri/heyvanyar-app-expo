import { useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { getAuthErrorMessage, normalizePhone } from '@/features/auth/api';
import { useSendOtp } from '@/features/auth/useSendOtp';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HttpError } from '@/services/http';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const submitLock = useRef(false);
  const sendOtpMutation = useSendOtp();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleSendCode = async () => {
    if (submitLock.current || sendOtpMutation.isPending) return;
    const normalizedPhone = normalizePhone(phone);
    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setPhoneError(phone ? strings.auth.phoneInvalid : strings.auth.phoneRequired);
      return;
    }

    submitLock.current = true;
    setPhoneError('');
    setErrorMessage('');
    try {
      await sendOtpMutation.mutateAsync(normalizedPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: normalizedPhone } });
    } catch (error) {
      const retryAfter = error instanceof HttpError ? error.retryAfter : undefined;
      setErrorMessage(
        getAuthErrorMessage(
          error,
          retryAfter ? strings.auth.requestLimit(retryAfter) : strings.auth.serverError,
        ),
      );
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>{strings.auth.loginTitle}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {strings.auth.loginDescription}
            </Text>

            <PhoneInput
              accessibilityLabel={strings.auth.phoneLabel}
              error={phoneError}
              label={strings.auth.phoneLabel}
              onChange={(value) => {
                setPhone(value);
                setPhoneError('');
                setErrorMessage('');
              }}
              placeholder={strings.auth.phonePlaceholder}
              value={phone}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel={strings.auth.sendCode}
              accessibilityRole="button"
              accessibilityState={{ disabled: sendOtpMutation.isPending }}
              disabled={sendOtpMutation.isPending}
              onPress={() => void handleSendCode()}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.text },
                pressed && !sendOtpMutation.isPending ? styles.pressed : null,
                sendOtpMutation.isPending ? styles.disabled : null,
              ]}>
              {sendOtpMutation.isPending ? (
                <ActivityIndicator
                  accessibilityLabel={strings.common.loading}
                  color={colors.background}
                />
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  {strings.auth.sendCode}
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
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  error: { color: '#c62828', textAlign: 'right', lineHeight: 22 },
});
