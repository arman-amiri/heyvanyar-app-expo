import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { deleteMyAd, getAdDetails } from '@/features/ads/api';
import MyAdPreviewScreen from '@/features/ads/MyAdPreview';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

const weeklyViews = [
  { day: 'ش', count: 12 },
  { day: 'ی', count: 18 },
  { day: 'د', count: 9 },
  { day: 'س', count: 24 },
  { day: 'چ', count: 16 },
  { day: 'پ', count: 32 },
  { day: 'ج', count: 21 },
];

export default function MyAdManagementScreen() {
  const { shortLink: rawShortLink, view: rawView } = useLocalSearchParams<{
    shortLink: string | string[];
    view?: string;
  }>();
  const shortLink = Array.isArray(rawShortLink) ? rawShortLink[0] : rawShortLink;
  const isPreview = rawView === 'true';
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [actionError, setActionError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const adQuery = useQuery({
    queryKey: ['my-ad', shortLink],
    queryFn: () => getAdDetails(shortLink ?? ''),
    enabled: Boolean(shortLink) && !isPreview,
    retry: false,
  });

  if (isPreview) return <MyAdPreviewScreen />;

  const handleDelete = () => {
    if (!shortLink || isDeleting) return;
    Alert.alert(strings.tabs.deleteAdTitle, strings.tabs.deleteAdConfirm, [
      { text: strings.common.back, style: 'cancel' },
      {
        text: strings.tabs.deleteAd,
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          setActionError('');
          void deleteMyAd(shortLink)
            .then(async () => {
              await queryClient.invalidateQueries({ queryKey: ['my-ads'] });
              router.replace('/my-ads');
            })
            .catch((error: unknown) => {
              setActionError(getAuthErrorMessage(error, strings.tabs.adDeleteError));
            })
            .finally(() => setIsDeleting(false));
        },
      },
    ]);
  };

  if (!shortLink) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{strings.tabs.adDetailsLoadingError}</Text>
      </SafeAreaView>
    );
  }

  if (adQuery.isPending) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.textSecondary} />
      </SafeAreaView>
    );
  }

  if (adQuery.isError) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="alert" style={[styles.message, { color: colors.textSecondary }]}>
          {getAuthErrorMessage(adQuery.error, strings.tabs.adDetailsLoadingError)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void adQuery.refetch()}
          style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}>
          <Text style={{ color: colors.text }}>{strings.common.retry}</Text>
        </Pressable>
        <BackButton colors={colors} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.adManagementTitle}</Text>
        <BackButton colors={colors} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {strings.tabs.adViewsTitle}
          </Text>
          <Text style={[styles.totalViews, { color: colors.text }]}>
            {new Intl.NumberFormat('fa-IR').format(
              weeklyViews.reduce((total, item) => total + item.count, 0),
            )}
          </Text>
          <Text style={[styles.chartCaption, { color: colors.textSecondary }]}>
            {strings.tabs.adViewsCaption}
          </Text>
          <View accessibilityLabel={strings.tabs.adViewsTitle} style={styles.chart}>
            {weeklyViews.map((item) => (
              <View key={item.day} style={styles.chartColumn}>
                <Text style={[styles.chartValue, { color: colors.textSecondary }]}>
                  {new Intl.NumberFormat('fa-IR').format(item.count)}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { backgroundColor: colors.text, height: `${(item.count / 32) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.chartDay, { color: colors.textSecondary }]}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.menu, { backgroundColor: colors.backgroundElement }]}>
          <MenuItem
            colors={colors}
            label={strings.tabs.showAd}
            onPress={() =>
              router.push({
                pathname: '/my-ads/[shortLink]',
                params: { shortLink, view: 'true' },
              })
            }
            symbol="eye"
          />
          <MenuItem
            colors={colors}
            label={strings.tabs.editAd}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/ads',
                params: { shortLink },
              })
            }
            symbol="pencil"
          />
          <MenuItem
            colors={colors}
            disabled={isDeleting}
            destructive
            label={isDeleting ? strings.tabs.deletingAd : strings.tabs.deleteAd}
            onPress={handleDelete}
            symbol={isDeleting ? undefined : 'trash'}
          />
        </View>
        {actionError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: '#c62828' }]}>
            {actionError}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackButton({ colors }: { colors: (typeof Colors)[keyof typeof Colors] }) {
  return (
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
  );
}

function MenuItem({
  colors,
  destructive = false,
  disabled = false,
  label,
  onPress,
  symbol,
}: {
  colors: (typeof Colors)[keyof typeof Colors];
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  symbol?: 'eye' | 'pencil' | 'trash';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { borderBottomColor: colors.backgroundSelected },
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      <Text style={[styles.menuLabel, { color: destructive ? '#c62828' : colors.text }]}>
        {label}
      </Text>
      {symbol ? (
        <SymbolView
          name={{
            ios: symbol,
            android: symbol === 'eye' ? 'visibility' : symbol === 'pencil' ? 'edit' : 'delete',
            web: symbol === 'eye' ? 'visibility' : symbol === 'pencil' ? 'edit' : 'delete',
          }}
          size={20}
          tintColor={destructive ? '#c62828' : colors.textSecondary}
        />
      ) : disabled ? (
        <ActivityIndicator color={colors.textSecondary} size="small" />
      ) : null}
    </Pressable>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: Spacing.three,
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  content: { flexGrow: 1, gap: Spacing.four, padding: Spacing.four },
  chartCard: { borderRadius: 14, gap: Spacing.two, padding: Spacing.three },
  sectionTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  totalViews: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  chartCaption: { fontSize: 13, textAlign: 'right' },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.two,
    height: 150,
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  chartColumn: { alignItems: 'center', flex: 1, gap: 5, height: '100%' },
  chartValue: { fontSize: 10 },
  barTrack: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { borderRadius: 5, minHeight: 8, maxWidth: 22, width: '72%' },
  chartDay: { fontSize: 11 },
  menu: { borderRadius: 14, paddingHorizontal: Spacing.three },
  menuItem: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  menuLabel: { fontSize: 15, textAlign: 'right' },
  message: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  retryButton: { padding: Spacing.two },
  error: { fontSize: 14, lineHeight: 22, textAlign: 'right' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.7 },
});
