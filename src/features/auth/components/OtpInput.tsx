import { StyleSheet, TextInput } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { normalizeDigits } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  editable: boolean;
  onComplete: (value: string) => void;
}

export function OtpInput({
  value,
  onChange,
  accessibilityLabel,
  editable,
  onComplete,
}: OtpInputProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoComplete="sms-otp"
      autoFocus
      editable={editable}
      keyboardType="number-pad"
      maxLength={5}
      onChangeText={(text) => {
        const code = normalizeDigits(text).replace(/\D/g, '').slice(0, 5);
        onChange(code);
        if (code.length === 5) onComplete(code);
      }}
      selectTextOnFocus
      style={[
        styles.input,
        { backgroundColor: colors.backgroundElement, color: colors.text },
      ]}
      textAlign="center"
      textContentType="oneTimeCode"
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    writingDirection: 'ltr',
  },
});
