import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, FontFamilies, Spacing } from '@/constants/theme';
import { useAdDraftStore, type DraftDetails } from '@/features/ads/draftStore';
import {
  formatPriceWithCommas,
  MAX_AD_PRICE,
  priceToPersianWords,
} from '@/features/ads/priceUtils';
import { getAuthErrorMessage, normalizeDigits } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdStageTwoScreen() {
  const draftStatus = useAdDraftStore((state) => state.status);
  const details = useAdDraftStore((state) => state.details);
  const hydrate = useAdDraftStore((state) => state.hydrate);
  const setDetails = useAdDraftStore((state) => state.setDetails);
  const [errorMessage, setErrorMessage] = useState('');
  const [priceLimitError, setPriceLimitError] = useState(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const titleLength = details.title.trim().length;
  const priceAmount = Number(details.price);
  const descriptionLength = details.description.trim().length;
  const isFormValid =
    titleLength >= 3 &&
    titleLength <= 100 &&
    /^[0-9]+$/.test(details.price) &&
    priceAmount > 0 &&
    priceAmount <= MAX_AD_PRICE &&
    descriptionLength >= 10 &&
    descriptionLength <= 1000;

  useEffect(() => {
    if (draftStatus === 'idle') {
      void hydrate().catch((error: unknown) =>
        setErrorMessage(getAuthErrorMessage(error, strings.tabs.draftRestoreError)),
      );
    }
  }, [draftStatus, hydrate]);

  const updateDetails = (changes: Partial<DraftDetails>) => {
    setErrorMessage('');
    void setDetails(changes).catch((error: unknown) =>
      setErrorMessage(getAuthErrorMessage(error, strings.tabs.adDetailsSaveError)),
    );
  };

  const priceInWords = priceToPersianWords(details.price);

  const handlePriceChange = (value: string) => {
    const digits = normalizeDigits(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits && Number(digits) > MAX_AD_PRICE) {
      setPriceLimitError(true);
      return;
    }

    setPriceLimitError(false);
    updateDetails({ price: digits });
  };

  if (draftStatus === 'idle' || draftStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary }}>{strings.tabs.loadingDraft}</Text>
      </SafeAreaView>
    );
  }

  if (draftStatus === 'error') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.text }]}>
          {errorMessage || strings.tabs.draftRestoreError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setErrorMessage('');
            void hydrate().catch((error: unknown) =>
              setErrorMessage(getAuthErrorMessage(error, strings.tabs.draftRestoreError)),
            );
          }}
          style={[styles.retryButton, { backgroundColor: colors.text }]}>
          <Text style={{ color: colors.background }}>{strings.common.retry}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.adDetailsTitle}</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{strings.tabs.adTitleLabel}</Text>
            <TextInput
              accessibilityLabel={strings.tabs.adTitleLabel}
              autoCapitalize="sentences"
              maxLength={100}
              onChangeText={(title) => updateDetails({ title })}
              placeholder={strings.tabs.adTitlePlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              textAlign="right"
              value={details.title}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{strings.tabs.adPriceLabel}</Text>
            <TextInput
              accessibilityLabel={strings.tabs.adPriceLabel}
              maxLength={15}
              keyboardType="number-pad"
              onChangeText={handlePriceChange}
              placeholder={strings.tabs.adPricePlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { backgroundColor: colors.backgroundElement, color: colors.text },
              ]}
              textAlign="right"
              value={formatPriceWithCommas(details.price)}
            />
            {priceInWords ? (
              <Text style={[styles.priceInWords, { color: colors.textSecondary }]}>
                {priceInWords}
              </Text>
            ) : null}
            {priceLimitError ? (
              <Text style={[styles.hint, { color: '#c62828' }]}>
                {strings.tabs.adPriceMaximumHint}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {strings.tabs.adDescriptionLabel}
            </Text>
            <TextInput
              accessibilityLabel={strings.tabs.adDescriptionLabel}
              autoCapitalize="sentences"
              maxLength={1000}
              multiline
              onChangeText={(description) => updateDetails({ description })}
              placeholder={strings.tabs.adDescriptionPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                styles.descriptionInput,
                { backgroundColor: colors.backgroundElement, color: colors.text },
              ]}
              textAlign="right"
              textAlignVertical="top"
              value={details.description}
            />
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: '#c62828' }]}>
              {errorMessage}
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)/ads')}
            style={({ pressed }) => [
              styles.footerButton,
              styles.secondaryButton,
              { borderColor: colors.backgroundSelected },
              pressed ? styles.pressed : null,
            ]}>
            <Text style={{ color: colors.text }}>{strings.tabs.previousAd}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isFormValid || Boolean(errorMessage) }}
            disabled={!isFormValid || Boolean(errorMessage)}
            onPress={() => router.push('/ad-stage-three')}
            style={({ pressed }) => [
              styles.footerButton,
              styles.primaryButton,
              { backgroundColor: colors.text },
              pressed && isFormValid && !errorMessage ? styles.pressed : null,
              !isFormValid || errorMessage ? styles.disabled : null,
            ]}>
            <Text style={{ color: colors.background }}>{strings.tabs.continueAd}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrollContent: { flexGrow: 1, gap: Spacing.four, padding: Spacing.four },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  field: { gap: Spacing.two },
  label: { fontSize: 15, fontWeight: '500', textAlign: 'right' },
  input: {
    borderRadius: 10,
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  descriptionInput: { minHeight: 320, paddingTop: Spacing.three },
  priceInWords: { fontSize: 12, lineHeight: 20, textAlign: 'right' },
  hint: { fontSize: 13, lineHeight: 20, textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderTopColor: '#e5e5e5',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: { flex: 1 },
  primaryButton: { flex: 1 },
  disabled: { opacity: 0.55 },
  retryButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
  pressed: { opacity: 0.75 },
  error: { lineHeight: 22, textAlign: 'right' },
});
