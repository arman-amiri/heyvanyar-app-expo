import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings';
import { AppText as Text } from '@/components/app-text';
import { Colors, Spacing } from '@/constants/theme';
import { getAds, type Ad } from '@/features/ads/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const adsQuery = useInfiniteQuery({
    queryKey: ['ads'],
    queryFn: ({ pageParam }) => getAds(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
  const ads = adsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const renderAd = useCallback(
    ({ item }: { item: Ad }) => <AdCard ad={item} colors={colors} />,
    [colors],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={ads}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => {
          if (adsQuery.hasNextPage && !adsQuery.isFetchingNextPage) {
            void adsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={renderAd}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.adsListTitle}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {strings.tabs.homeDescription}
            </Text>
          </View>
        }
        ListEmptyComponent={
          adsQuery.isPending ? (
            <View style={styles.message}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : adsQuery.isError ? (
            <View style={styles.message}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {strings.tabs.adsLoadingError}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.common.retry}
                onPress={() => void adsQuery.refetch()}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={[styles.retryText, { color: colors.text }]}>{strings.common.retry}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.message}>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {strings.tabs.adsEmpty}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          adsQuery.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : adsQuery.isFetchNextPageError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void adsQuery.fetchNextPage()}
              style={styles.footer}>
              <Text style={[styles.retryText, { color: colors.text }]}>{strings.common.retry}</Text>
            </Pressable>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

function AdCard({
  ad,
  colors,
}: {
  ad: Ad;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const price = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(
    Number(ad.price),
  );

  return (
    <View
      style={[
        styles.adCard,
        { backgroundColor: colors.background, borderBottomColor: colors.backgroundElement },
      ]}>
      {ad.mainImage?.url ? (
        <Image
          accessibilityLabel={ad.title}
          contentFit="cover"
          source={{ uri: ad.mainImage.url }}
          style={styles.image}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
            {strings.tabs.adImageUnavailable}
          </Text>
        </View>
      )}
      <View style={styles.adDetails}>
        {ad.category?.title ? (
          <Text numberOfLines={1} style={[styles.category, { color: colors.textSecondary }]}>
            {ad.category.title}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={[styles.adTitle, { color: colors.text }]}>
          {ad.title}
        </Text>
        <Text style={[styles.price, { color: colors.text }]}>
          {price} {strings.tabs.priceUnit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  header: { gap: Spacing.two, paddingVertical: Spacing.three },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'right' },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
  message: { alignItems: 'center', flex: 1, gap: Spacing.three, justifyContent: 'center', padding: Spacing.four },
  retryText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  adCard: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 124,
    paddingVertical: Spacing.three,
  },
  image: { borderRadius: 10, height: 100, width: 112 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', padding: Spacing.two },
  imagePlaceholderText: { fontSize: 12, textAlign: 'center' },
  adDetails: { flex: 1, gap: Spacing.two, alignItems: 'flex-end' },
  category: { fontSize: 13, textAlign: 'right' },
  adTitle: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  price: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  footer: { alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  pressed: { opacity: 0.7 },
});
