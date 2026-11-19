import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import {
  getAdDetails,
  getMyAds,
  type AdDetails,
  type AdMedia,
  type MyAd,
} from '@/features/ads/api';
import { formatPersianRelativeTime } from '@/features/ads/relativeTime';
import { registerAdViewOnce } from '@/features/ads/viewTracking';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MediaSlide = { type: 'video' | 'image'; key: string; uri: string };

export default function MyAdPreviewScreen({
  showDisabledContactActions = false,
}: {
  showDisabledContactActions?: boolean;
}) {
  const { shortLink: rawShortLink } = useLocalSearchParams<{ shortLink: string | string[] }>();
  const shortLink = Array.isArray(rawShortLink) ? rawShortLink[0] : rawShortLink;
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const mediaHeight = Math.round(height * 0.3);
  const adQuery = useQuery({
    queryKey: ['my-ad', shortLink],
    queryFn: () => getAdDetails(shortLink ?? '', !showDisabledContactActions),
    enabled: Boolean(shortLink),
    retry: false,
  });
  const [viewTrackingError, setViewTrackingError] = useState('');
  const adId = adQuery.data?.id;

  useEffect(() => {
    if (adId == null) return;
    let isMounted = true;
    void registerAdViewOnce(adId).catch((error: unknown) => {
      if (isMounted) {
        setViewTrackingError(
          getAuthErrorMessage(error, strings.tabs.adViewTrackingError),
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adId]);

  const needsMediaLookup =
    !showDisabledContactActions && adQuery.isSuccess && hasMissingMediaUrl(adQuery.data);
  const mediaQuery = useQuery({
    queryKey: ['my-ads', 1],
    queryFn: () => getMyAds(1),
    enabled: Boolean(shortLink) && needsMediaLookup,
    retry: false,
    staleTime: 60_000,
  });

  if (!shortLink) {
    return (
      <ScreenMessage
        colors={colors}
        message={strings.tabs.adDetailsLoadingError}
        onBack={() => router.back()}
        title={strings.tabs.myAdDetailsTitle}
      />
    );
  }

  if (adQuery.isPending) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary }}>{strings.common.loading}</Text>
      </SafeAreaView>
    );
  }

  if (adQuery.isError) {
    return (
      <ScreenMessage
        colors={colors}
        message={getAuthErrorMessage(adQuery.error, strings.tabs.adDetailsLoadingError)}
        onBack={() => router.back()}
        onRetry={() => void adQuery.refetch()}
        title={strings.tabs.myAdDetailsTitle}
      />
    );
  }

  const ad = adQuery.data;
  const listAd = mediaQuery.data?.find((item) => item.shortLink === shortLink);
  const slides = getMediaSlides(ad, listAd);
  const price = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(
    Number(ad.price),
  );
  const relativeTime = formatPersianRelativeTime(ad.publishAt);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={strings.common.back}
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={[styles.gallery, { height: mediaHeight }]}>
          {slides.length > 0 ? (
            <FlatList
              data={slides}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              inverted
              horizontal
              initialNumToRender={2}
              keyExtractor={(item) => item.key}
              pagingEnabled
              renderItem={({ item }) => (
                <View style={[styles.slide, { height: mediaHeight, width }]}>
                  {item.type === 'video' ? (
                    <AdVideoSlide height={mediaHeight} uri={item.uri} />
                  ) : (
                    <Image
                      accessibilityLabel={ad.title}
                      contentFit="cover"
                      source={{ uri: item.uri }}
                      style={{ height: mediaHeight, width }}
                    />
                  )}
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />
          ) : needsMediaLookup && mediaQuery.isPending ? (
            <View style={[styles.mediaPlaceholder, { height: mediaHeight }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : needsMediaLookup ? (
            <View style={[styles.mediaPlaceholder, { height: mediaHeight }]}>
              <Text style={[styles.placeholderText, { color: colors.textSubtle }]}>
                {mediaQuery.isError
                  ? getAuthErrorMessage(mediaQuery.error, strings.tabs.adMediaLoadingError)
                  : strings.tabs.adMediaLoadingError}
              </Text>
            </View>
          ) : (
            <View style={[styles.mediaPlaceholder, { height: mediaHeight }]}>
              <Text style={[styles.placeholderText, { color: colors.textSubtle }]}>
                {strings.tabs.adImageUnavailable}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          {ad.category ? (
            <Text style={[styles.category, { color: colors.textSecondary }]}>
              {ad.category.parent
                ? `${ad.category.parent.title} / ${ad.category.title}`
                : ad.category.title}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{ad.title}</Text>
          {relativeTime ? (
            <Text style={[styles.publishedAt, { color: colors.textSecondary }]}>
              {strings.tabs.adPublishedAt(relativeTime)}
            </Text>
          ) : null}
          <Text style={[styles.price, { color: colors.textSecondary }]}>
            {price} {strings.tabs.priceUnit}
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>{ad.description}</Text>
          {viewTrackingError ? (
            <Text accessibilityRole="alert" style={[styles.viewTrackingError, { color: colors.error }]}>
              {viewTrackingError}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      {showDisabledContactActions ? (
        <View style={[styles.contactActions, { backgroundColor: colors.background }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.contactButton, { backgroundColor: colors.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }}
              size={20}
              tintColor={colors.textSecondary}
            />
            <Text style={[styles.contactButtonText, { color: colors.textSecondary }]}>
              {strings.tabs.chatAction}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.contactButton, { backgroundColor: colors.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'phone.fill', android: 'call', web: 'call' }}
              size={20}
              tintColor={colors.textSecondary}
            />
            <Text style={[styles.contactButtonText, { color: colors.textSecondary }]}>
              {strings.tabs.callAction}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function AdVideoSlide({ height, uri }: { height: number; uri: string }) {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      contentFit="contain"
      nativeControls
      player={player}
      style={{ height, width: '100%' }}
    />
  );
}

function ScreenMessage({
  colors,
  message,
  onBack,
  onRetry,
  title,
}: {
  colors: (typeof Colors)[keyof typeof Colors];
  message: string;
  onBack: () => void;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
      <View style={styles.messageHeader}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <Pressable
          accessibilityLabel={strings.common.back}
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
      </View>
      <Text accessibilityRole="alert" style={[styles.messageText, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => (pressed ? styles.pressed : null)}>
          <Text style={[styles.retryText, { color: colors.text }]}>{strings.common.retry}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

function hasMissingMediaUrl(ad: AdDetails): boolean {
  return [ad.mainImage, ad.video, ...(ad.files ?? [])].some(
    (file) => file !== null && file !== undefined && !file.url,
  );
}

function getMediaSlides(ad: AdDetails, listAd?: MyAd): MediaSlide[] {
  const mediaById = new Map<number, AdMedia>();
  const fallbackFiles = [
    ...(listAd?.mainImage ? [listAd.mainImage] : []),
    ...(listAd?.files ?? []),
    ...(listAd?.video ? [listAd.video] : []),
  ];
  const detailFiles = [
    ...(ad.mainImage ? [ad.mainImage] : []),
    ...(ad.files ?? []),
    ...(ad.video ? [ad.video] : []),
  ];

  for (const file of [...fallbackFiles, ...detailFiles]) {
    const previous = mediaById.get(file.id);
    mediaById.set(file.id, {
      ...previous,
      ...file,
      url: file.url ?? previous?.url,
    });
  }

  const videoFile =
    ad.video ??
    listAd?.video ??
    [...mediaById.values()].find((file) => isVideoFile(file));
  const video = videoFile ? mediaById.get(videoFile.id) : undefined;
  const slides: MediaSlide[] =
    video?.url
      ? [{ type: 'video', key: `video-${video.id}`, uri: video.url }]
      : [];
  const orderedImages = [
    ...(ad.mainImage ? [ad.mainImage] : []),
    ...(listAd?.mainImage ? [listAd.mainImage] : []),
    ...(ad.files ?? []),
    ...(listAd?.files ?? []),
  ];
  const addedImages = new Set<number>();

  for (const file of orderedImages) {
    if (file.id === videoFile?.id || isVideoFile(file) || addedImages.has(file.id)) continue;
    const image = mediaById.get(file.id);
    if (!image?.url) continue;
    addedImages.add(file.id);
    slides.push({ type: 'image', key: `image-${image.id}`, uri: image.url });
  }

  return slides;
}

function isVideoFile(file: AdMedia): boolean {
  return /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(file.storedName ?? file.url ?? '');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.three },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  headerTitle: { fontSize: 16, fontWeight: '500', textAlign: 'right' },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center' },
  gallery: { backgroundColor: Colors.light.surfaceMuted, width: '100%' },
  slide: {
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    justifyContent: 'center',
  },
  mediaPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, textAlign: 'center' },
  details: { gap: Spacing.two, padding: Spacing.four },
  contactActions: {
    borderTopColor: Colors.light.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  contactButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 50,
    opacity: 0.6,
  },
  contactButtonText: { fontSize: 16, fontWeight: '500' },
  category: { fontSize: 10, textAlign: 'right' },
  title: { fontSize: 16, fontWeight: '500', lineHeight: 27, textAlign: 'right' },
  publishedAt: { fontSize: 12, textAlign: 'right' },
  price: { fontSize: 14, fontWeight: '400', textAlign: 'right' },
  description: { fontSize: 15, lineHeight: 27, textAlign: 'right' },
  viewTrackingError: { fontSize: 12, textAlign: 'right' },
  messageHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  },
  messageText: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  retryText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
