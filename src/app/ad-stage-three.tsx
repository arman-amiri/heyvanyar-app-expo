import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { createAd } from '@/features/ads/createAdApi';
import { useAdDraftStore } from '@/features/ads/draftStore';
import { deleteStoredMedia } from '@/features/ads/mediaStorage';
import { MAX_AD_PRICE } from '@/features/ads/priceUtils';
import { getAuthErrorMessage } from '@/features/auth/api';
import { HttpError } from '@/services/http';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdStageThreeScreen() {
  const draftStatus = useAdDraftStore((state) => state.status);
  const category = useAdDraftStore((state) => state.category);
  const details = useAdDraftStore((state) => state.details);
  const photos = useAdDraftStore((state) => state.photos);
  const video = useAdDraftStore((state) => state.video);
  const activeChat = useAdDraftStore((state) => state.activeChat);
  const showMobile = useAdDraftStore((state) => state.showMobile);
  const hydrate = useAdDraftStore((state) => state.hydrate);
  const setAdOptions = useAdDraftStore((state) => state.setAdOptions);
  const clearDraft = useAdDraftStore((state) => state.clearDraft);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const publishLock = useRef(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (draftStatus === 'idle') {
      void hydrate().catch((error: unknown) =>
        setErrorMessage(getAuthErrorMessage(error, strings.tabs.draftRestoreError)),
      );
    }
  }, [draftStatus, hydrate]);

  const photosAreReady = photos.every(
    (photo) => photo.status === 'uploaded' && photo.id !== undefined,
  );
  const videoIsReady =
    !video || (video.status === 'uploaded' && Boolean(video.storedName));
  const isMediaReady = photosAreReady && videoIsReady;
  const hasContactOption = activeChat || showMobile;
  const titleLength = details.title.trim().length;
  const descriptionLength = details.description.trim().length;
  const price = Number(details.price);
  const isDetailsValid =
    titleLength >= 3 &&
    titleLength <= 100 &&
    /^[0-9]+$/.test(details.price) &&
    price > 0 &&
    price <= MAX_AD_PRICE &&
    descriptionLength >= 10 &&
    descriptionLength <= 1000;
  const isPublishReady =
    Boolean(category) && isDetailsValid && isMediaReady && hasContactOption;

  const updateContactOptions = (changes: { activeChat?: boolean; showMobile?: boolean }) => {
    const current = useAdDraftStore.getState();
    const nextActiveChat = changes.activeChat ?? current.activeChat;
    const nextShowMobile = changes.showMobile ?? current.showMobile;
    if (!nextActiveChat && !nextShowMobile) return;

    setErrorMessage('');
    void setAdOptions(changes).catch((error: unknown) =>
      setErrorMessage(getAuthErrorMessage(error, strings.tabs.adDetailsSaveError)),
    );
  };

  const handlePublish = async () => {
    if (publishLock.current || isPublishing) return;
    const draft = useAdDraftStore.getState();
    const validPhotos = draft.photos.every(
      (photo) => photo.status === 'uploaded' && photo.id !== undefined,
    );
    const validVideo =
      !draft.video ||
      (draft.video.status === 'uploaded' && Boolean(draft.video.storedName));
    if (
      !draft.category ||
      !isDetailsValid ||
      !validPhotos ||
      !validVideo ||
      (!draft.activeChat && !draft.showMobile)
    ) {
      setErrorMessage(
        !validPhotos || !validVideo
          ? strings.tabs.adMediaNotReady
          : !draft.activeChat && !draft.showMobile
            ? strings.tabs.contactOptionRequired
            : strings.tabs.adPublishError,
      );
      return;
    }

    publishLock.current = true;
    setIsPublishing(true);
    setErrorMessage('');
    try {
      const images = draft.photos.flatMap((photo) =>
        photo.id === undefined ? [] : [photo.id],
      );
      await createAd({
        title: draft.details.title,
        price: draft.details.price,
        description: draft.details.description,
        categoryId: draft.category.categoryId,
        images,
        ...(images.length > 0 ? { mainImageId: images[0] } : {}),
        ...(draft.video?.storedName ? { videoStoredName: draft.video.storedName } : {}),
        activeChat: draft.activeChat,
        showMobile: draft.showMobile,
      });

      try {
        const media = await clearDraft();
        const cleanupResults = await Promise.allSettled([
          ...media.photos.map((photo) => deleteStoredMedia(photo.key, photo.uri)),
          ...(media.video ? [deleteStoredMedia(media.video.key, media.video.uri)] : []),
        ]);
        if (cleanupResults.some((result) => result.status === 'rejected')) {
          Alert.alert(strings.tabs.mediaCleanupError);
        }
      } catch {
        Alert.alert(strings.tabs.adPublishCleanupError);
      }

      router.replace('/(tabs)/profile');
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        router.replace({
          pathname: '/(auth)/login',
          params: { returnTo: 'ad-stage-three' },
        });
        return;
      }
      setErrorMessage(getAuthErrorMessage(error, strings.tabs.adPublishError));
    } finally {
      publishLock.current = false;
      setIsPublishing(false);
    }
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {strings.tabs.adStageThreeTitle}
        </Text>

        <View style={[styles.optionRow, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {strings.tabs.activeChatLabel}
          </Text>
          <Switch
            accessibilityLabel={strings.tabs.activeChatLabel}
            accessibilityRole="switch"
            disabled={isPublishing}
            onValueChange={(value) => updateContactOptions({ activeChat: value })}
            trackColor={{ false: colors.backgroundSelected, true: colors.textSecondary }}
            value={activeChat}
          />
        </View>

        <View style={[styles.optionRow, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {strings.tabs.showMobileLabel}
          </Text>
          <Switch
            accessibilityLabel={strings.tabs.showMobileLabel}
            accessibilityRole="switch"
            disabled={isPublishing}
            onValueChange={(value) => updateContactOptions({ showMobile: value })}
            trackColor={{ false: colors.backgroundSelected, true: colors.textSecondary }}
            value={showMobile}
          />
        </View>

        {!hasContactOption ? (
          <Text style={[styles.error, { color: '#c62828' }]}>{strings.tabs.contactOptionRequired}</Text>
        ) : null}
        {!isMediaReady ? (
          <Text style={[styles.error, { color: colors.textSecondary }]}>
            {strings.tabs.adMediaNotReady}
          </Text>
        ) : null}
        {errorMessage ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: '#c62828' }]}>
            {errorMessage}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          disabled={isPublishing}
          onPress={() => router.replace('/ad-stage-two')}
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerSecondaryButton,
            { borderColor: colors.backgroundSelected },
            pressed && !isPublishing ? styles.pressed : null,
            isPublishing ? styles.disabled : null,
          ]}>
          <Text style={{ color: colors.text }}>{strings.tabs.previousAd}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPublishing || !isPublishReady }}
          disabled={isPublishing || !isPublishReady}
          onPress={() => void handlePublish()}
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerPrimaryButton,
            { backgroundColor: colors.text },
            pressed && !isPublishing ? styles.pressed : null,
            isPublishing || !isPublishReady ? styles.disabled : null,
          ]}>
          {isPublishing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={{ color: colors.background }}>{strings.tabs.publishAd}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: { flexGrow: 1, gap: Spacing.three, padding: Spacing.four },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  optionRow: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: Spacing.three,
  },
  optionLabel: { flex: 1, fontSize: 15, textAlign: 'right' },
  footer: {
    borderTopColor: '#e5e5e5',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: 8,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
  },
  footerSecondaryButton: { borderWidth: 1, flex: 1 },
  footerPrimaryButton: { flex: 1 },
  retryButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  error: { lineHeight: 22, textAlign: 'right' },
});
