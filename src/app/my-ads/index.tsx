import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { getMyAds, type MyAd } from '@/features/ads/api';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MyAdsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const adsQuery = useQuery({
    queryKey: ['my-ads', 1],
    queryFn: () => getMyAds(1),
    retry: false,
  });
  const ads = adsQuery.data ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={ads}
        keyExtractor={(item) => String(item.id)}
        onRefresh={() => void adsQuery.refetch()}
        refreshing={adsQuery.isRefetching}
        renderItem={({ item }) => <MyAdRow ad={item} colors={colors} />}
        ListEmptyComponent={
          adsQuery.isPending ? (
            <View style={styles.message}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : adsQuery.isError ? (
            <View style={styles.message}>
              <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                {getAuthErrorMessage(adsQuery.error, strings.tabs.myAdsLoadingError)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void adsQuery.refetch()}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={[styles.retryText, { color: colors.text }]}>
                  {strings.common.retry}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.message}>
              <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                {strings.tabs.myAdsEmpty}
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.myAdsMenu}</Text>
            <Pressable
              accessibilityLabel={strings.common.back}
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
                size={22}
                tintColor={colors.text}
              />
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function MyAdRow({
  ad,
  colors,
}: {
  ad: MyAd;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const price = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(
    Number(ad.price),
  );

  return (
    <Pressable
      accessibilityLabel={`${ad.title}, ${price} ${strings.tabs.priceUnit}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/my-ads/[shortLink]',
          params: { shortLink: ad.shortLink },
        })
      }
      style={({ pressed }) => [styles.adRow, pressed ? styles.pressed : null]}>
      {ad.mainImage?.url ? (
        <Image
          accessibilityLabel={ad.title}
          contentFit="cover"
          source={{ uri: ad.mainImage.url }}
          style={styles.image}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            {strings.tabs.adImageUnavailable}
          </Text>
        </View>
      )}
      <View style={styles.adDetails}>
        <Text numberOfLines={2} style={[styles.adTitle, { color: colors.text }]}>
          {ad.title}
        </Text>
        <Text style={[styles.price, { color: colors.text }]}>
          {price} {strings.tabs.priceUnit}
        </Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={18}
        tintColor={colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right' },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  message: { alignItems: 'center', flex: 1, gap: Spacing.two, justifyContent: 'center', padding: Spacing.four },
  messageText: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  retryText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  adRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    minHeight: 104,
    paddingVertical: Spacing.two,
  },
  image: { borderRadius: 10, height: 84, width: 96 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', padding: Spacing.two },
  placeholderText: { fontSize: 12, textAlign: 'center' },
  adDetails: { alignItems: 'flex-end', flex: 1, gap: Spacing.two },
  adTitle: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  price: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  separator: { backgroundColor: '#e5e5e5', height: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.7 },
});
