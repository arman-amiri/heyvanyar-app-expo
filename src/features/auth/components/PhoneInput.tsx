import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { Colors, FontFamilies, Spacing } from '@/constants/theme';
import { normalizeDigits } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  accessibilityLabel: string;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder,
  accessibilityLabel,
  error,
}: PhoneInputProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoComplete="tel"
        keyboardType="phone-pad"
        maxLength={11}
        onChangeText={(text) => onChange(normalizeDigits(text).replace(/\D/g, '').slice(0, 11))}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
        underlineColorAndroid="transparent"
        style={[
          styles.input,
          { backgroundColor: colors.backgroundElement, color: colors.text },
          error ? [styles.inputError, { borderColor: colors.error }] : null,
          Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : null,
        ]}
        textAlign="right"
        value={value}
      />
      {error ? <Text style={[styles.error, { fontSize: 12, color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  input: {
    borderRadius: 12,
    borderWidth: 0,
    fontSize: 16,
    fontFamily: FontFamilies.regular,
    minHeight: 54,
    paddingHorizontal: Spacing.three,
    writingDirection: 'ltr',
  },
  inputError: { borderWidth: 1 },
  error: { textAlign: 'right' },
});