import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import {
  searchAdCategories,
  searchAds,
  type Ad,
  type AdCategorySuggestion,
} from '@/features/ads/api';
import {
  getCategoryChildren,
  getParentCategories,
  type Category,
} from '@/features/ads/categoryApi';
import { getAuthErrorMessage } from '@/features/auth/api';
import { LocationPickerModal } from '@/features/location/LocationPickerModal';
import type { LocationSelectionAction } from '@/features/location/locationApi';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AdFilter =
  | { type: 'text'; query: string }
  | { type: 'category'; categoryId: number }
  | null;

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { height } = useWindowDimensions();
  const [searchText, setSearchText] = useState('');
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdFilter>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSelection, setLocationSelection] = useState<LocationSelectionAction[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);
  const listRef = useRef<FlatList<Ad>>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSuggestionQuery(searchText.trim()), 150);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const categorySuggestionsQuery = useQuery({
    queryKey: ['ad-category-suggestions', suggestionQuery],
    queryFn: () => searchAdCategories(suggestionQuery),
    enabled: showSuggestions && suggestionQuery.length > 0,
    retry: false,
  });
  const parentCategoriesQuery = useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: getParentCategories,
    retry: false,
  });
  const childCategoriesQuery = useQuery({
    queryKey: ['categories', 'children', selectedCategory?.id],
    queryFn: () => {
      if (!selectedCategory) throw new Error(strings.auth.invalidResponse);
      return getCategoryChildren(selectedCategory.id);
    },
    enabled: selectedCategory !== null,
    retry: false,
  });
  const adsQueryKey =
    activeFilter?.type === 'text'
      ? ['ads', 'search', activeFilter.query, selectedLocationIds]
      : activeFilter?.type === 'category'
        ? ['ads', 'category', activeFilter.categoryId, selectedLocationIds]
        : ['ads', selectedLocationIds];

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeFilter, selectedLocationIds]);

  const adsQuery = useInfiniteQuery({
    queryKey: adsQueryKey,
    queryFn: ({ pageParam }) =>
      searchAds({
        page: pageParam,
        search: activeFilter?.type === 'text' ? activeFilter.query : undefined,
        categoryId: activeFilter?.type === 'category' ? activeFilter.categoryId : undefined,
        locationIds: selectedLocationIds,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
  const ads = adsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const renderAd = useCallback(
    ({ item }: { item: Ad }) => (
      <AdCard
        ad={item}
        colors={colors}
        onPress={() =>
          router.push({ pathname: '/ad/[shortLink]', params: { shortLink: item.shortLink } })
        }
      />
    ),
    [colors],
  );

  const handleSearchByText = () => {
    const query = searchText.trim();
    if (!query) return;
    Keyboard.dismiss();
    setShowSuggestions(false);
    setActiveFilter({ type: 'text', query });
    setSelectedCategory(null);
    setActiveCategoryId(null);
  };

  const handleCategorySelect = (category: AdCategorySuggestion) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setActiveFilter({ type: 'category', categoryId: category.categoryId });
    setSelectedCategory(
      category.parent
        ? { id: category.parent.id, title: category.parent.title }
        : { id: category.categoryId, title: category.categoryTitle },
    );
    setActiveCategoryId(category.categoryId);
  };

  const handleParentSelect = (category: Category) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setActiveFilter({ type: 'category', categoryId: category.id });
    setSelectedCategory(category);
    setActiveCategoryId(category.id);
  };

  const handleChildSelect = (category: Category) => {
    setActiveFilter({ type: 'category', categoryId: category.id });
    setActiveCategoryId(category.id);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSuggestionQuery('');
    setShowSuggestions(false);
    setActiveFilter(null);
    setSelectedCategory(null);
    setActiveCategoryId(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        <View pointerEvents="box-none" style={styles.searchSection}>
          <View style={styles.searchRow}>
            <Pressable
              accessibilityLabel={strings.tabs.locationModalTitle}
              accessibilityRole="button"
              onPress={() => {
                Keyboard.dismiss();
                setShowSuggestions(false);
                setShowLocationPicker(true);
              }}
              style={({ pressed }) => [
                styles.locationButton,
                { backgroundColor: colors.backgroundElement },
                pressed ? styles.pressed : null,
              ]}>
              <SymbolView
                name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                size={21}
                tintColor={colors.textSecondary}
              />
            </Pressable>
            <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement }]}>
              <TextInput
                accessibilityLabel={strings.tabs.adSearchPlaceholder}
                autoCapitalize="none"
                onChangeText={(value) => {
                  setSearchText(value);
                  setShowSuggestions(Boolean(value.trim()));
                }}
                onFocus={() => {
                  if (searchText.trim()) setShowSuggestions(true);
                }}
                placeholder={strings.tabs.adSearchPlaceholder}
                placeholderTextColor={colors.textSecondary}
                returnKeyType="search"
                underlineColorAndroid="transparent"
                selectionColor={colors.text}
                cursorColor={colors.text}
                style={[
                  styles.searchInput,
                  { color: colors.text, backgroundColor: 'transparent' },
                  Platform.OS === 'web'
                    ? ({ outlineStyle: 'none', outlineWidth: 0 } as any)
                    : null,
                ]}
                textAlign="right"
                value={searchText}
              />
              {searchText ? (
                <Pressable
                  accessibilityLabel={strings.common.clear}
                  accessibilityRole="button"
                  onPress={handleClearSearch}
                  style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}>
                  <Text style={[styles.clearText, { color: colors.textSecondary }]}>×</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={strings.tabs.searchButton}
                accessibilityRole="button"
                disabled={!searchText.trim()}
                onPress={handleSearchByText}
                style={({ pressed }) => [
                  styles.searchIconButton,
                  pressed ? styles.pressed : null,
                ]}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  size={20}
                  tintColor={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        </View>
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.listContent}
          data={ads}
          keyExtractor={(item) => String(item.id)}
          onEndReached={() => {
            if (adsQuery.hasNextPage && !adsQuery.isFetchingNextPage) {
              void adsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          renderItem={renderAd}
          ListHeaderComponent={
            <View>
              {selectedCategory ? (
                <View style={styles.categoryNavigation}>
                  <Pressable
                    accessibilityLabel={strings.tabs.categoryBack}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedCategory(null);
                      setActiveFilter(null);
                      setActiveCategoryId(null);
                    }}
                    style={({ pressed }) => [
                      styles.categoryBackButton,
                      { borderColor: colors.backgroundSelected },
                      pressed ? styles.pressed : null,
                    ]}>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
                      size={20}
                      tintColor={colors.text}
                    />
                  </Pressable>
                  <View style={styles.categoryChipList}>
                    {childCategoriesQuery.isPending ? (
                      <ActivityIndicator
                        color={colors.textSecondary}
                        style={styles.categoryLoading}
                      />
                    ) : childCategoriesQuery.isError ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void childCategoriesQuery.refetch()}
                        style={styles.categoryStatus}>
                        <Text style={[styles.categoryStatusText, { color: colors.textSecondary }]}>
                          {getAuthErrorMessage(
                            childCategoriesQuery.error,
                            strings.tabs.categoryLoadingError,
                          )}
                        </Text>
                      </Pressable>
                    ) : childCategoriesQuery.data?.length ? (
                      childCategoriesQuery.data.map((category) => (
                        <CategoryChip
                          active={activeCategoryId === category.id}
                          category={category}
                          colors={colors}
                          key={category.id}
                          onPress={() => handleChildSelect(category)}
                        />
                      ))
                    ) : (
                      <Text style={[styles.categoryStatusText, { color: colors.textSecondary }]}>
                        {strings.tabs.categoryChildrenEmpty}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.parentCategories}>
                  {parentCategoriesQuery.isPending ? (
                    <ActivityIndicator
                      color={colors.textSecondary}
                      style={styles.categoryLoading}
                    />
                  ) : parentCategoriesQuery.isError ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void parentCategoriesQuery.refetch()}
                      style={styles.categoryStatus}>
                      <Text style={[styles.categoryStatusText, { color: colors.textSecondary }]}>
                        {getAuthErrorMessage(
                          parentCategoriesQuery.error,
                          strings.tabs.categoryLoadingError,
                        )}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.categoryChipList}>
                      {(parentCategoriesQuery.data ?? []).map((category) => (
                        <CategoryChip
                          active={activeCategoryId === category.id}
                          category={category}
                          colors={colors}
                          key={category.id}
                          onPress={() => handleParentSelect(category)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
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
                  <Text style={[styles.retryText, { color: colors.text }]}>
                    {strings.common.retry}
                  </Text>
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
        {showSuggestions && searchText.trim() ? (
          <View style={styles.suggestionsOverlay}>
            <Pressable
              accessibilityLabel={strings.tabs.closeSearchSuggestions}
              accessibilityRole="button"
              onPress={() => setShowSuggestions(false)}
              style={styles.searchBackdrop}
            />
            <View
              style={[
                styles.suggestionPanel,
                styles.suggestionPanelOverlay,
                {
                  backgroundColor: colors.backgroundElement,
                  maxHeight: Math.round(height * 0.3),
                },
              ]}>
              <Pressable
                accessibilityRole="button"
                onPress={handleSearchByText}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  { borderBottomColor: colors.backgroundSelected },
                  pressed ? styles.pressed : null,
                ]}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                  {strings.tabs.searchByText(searchText.trim())}
                </Text>
              </Pressable>
              <ScrollView
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                style={styles.suggestionScroll}>
                {categorySuggestionsQuery.isPending ? (
                  <View style={styles.suggestionMessage}>
                    <ActivityIndicator color={colors.textSecondary} />
                  </View>
                ) : categorySuggestionsQuery.isError ? (
                  <Text style={[styles.suggestionHint, { color: colors.textSecondary }]}>
                    {getAuthErrorMessage(
                      categorySuggestionsQuery.error,
                      strings.tabs.adCategorySuggestionsError,
                    )}
                  </Text>
                ) : categorySuggestionsQuery.data?.length ? (
                  categorySuggestionsQuery.data.map((category) => (
                    <Pressable
                      key={category.categoryId}
                      accessibilityRole="button"
                      onPress={() => handleCategorySelect(category)}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        { borderBottomColor: colors.backgroundSelected },
                        pressed ? styles.pressed : null,
                      ]}>
                      <View style={styles.suggestionDetails}>
                        <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                          {category.categoryTitle}
                        </Text>
                        {category.parent ? (
                          <Text style={[styles.suggestionHint, { color: colors.textSecondary }]}>
                            {category.parent.title}
                          </Text>
                        ) : null}
                      </View>
                      <SymbolView
                        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                        size={18}
                        tintColor={colors.textSecondary}
                      />
                    </Pressable>
                  ))
                ) : (
                  <Text style={[styles.suggestionHint, { color: colors.textSecondary }]}>
                    {strings.tabs.adCategorySuggestionsEmpty}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        ) : null}
        <LocationPickerModal
          onClose={() => setShowLocationPicker(false)}
          onConfirm={(locationIds) => {
            setSelectedLocationIds(locationIds);
            setShowLocationPicker(false);
          }}
          onSelectionChange={setLocationSelection}
          selection={locationSelection}
          visible={showLocationPicker}
        />
      </View>
    </SafeAreaView>
  );
}

function CategoryChip({
  active = false,
  category,
  colors,
  onPress,
}: {
  active?: boolean;
  category: Category;
  colors: (typeof Colors)[keyof typeof Colors];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: colors.backgroundSelected },
        pressed ? styles.pressed : null,
      ]}>
      <Text
        style={[
          styles.categoryChipText,
          { color: active ? colors.onPrimary : colors.textSecondary },
        ]}>
        {category.title}
      </Text>
    </Pressable>
  );
}

function AdCard({
  ad,
  colors,
  onPress,
}: {
  ad: Ad;
  colors: (typeof Colors)[keyof typeof Colors];
  onPress: () => void;
}) {
  const price = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(
    Number(ad.price),
  );

  return (
    <Pressable
      accessibilityLabel={`${ad.title}, ${price} ${strings.tabs.priceUnit}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.adCard,
        { backgroundColor: colors.background, borderBottomColor: colors.backgroundElement },
        pressed ? styles.pressed : null,
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
        <Text numberOfLines={2} style={[styles.adTitle, { color: colors.text }]}>
          {ad.title}
        </Text>
        {ad.category ? (
          <Text numberOfLines={1} style={[styles.category, { color: colors.textSecondary }]}>
            {ad.category.parent?.title
              ? `${ad.category.parent.title}/${ad.category.title}`
              : ad.category.title}
          </Text>
        ) : null}

        <Text style={[styles.price, { color: colors.textSecondary }]}>
          {price} {strings.tabs.priceUnit}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, position: 'relative' },
  listContent: { flexGrow: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  searchSection: {
    elevation: 30,
    paddingHorizontal: Spacing.three,
    position: 'relative',
    zIndex: 30,
    backgroundColor: 'transparent',
  },
  searchRow: { alignItems: 'center', flexDirection: 'row-reverse', gap: Spacing.two },
  locationButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    marginVertical: Spacing.three,
    width: 50,
  },
  searchBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  suggestionsOverlay: {
    bottom: 0,
    elevation: 20,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row-reverse',
    marginVertical: Spacing.three,
    minHeight: 50,
    paddingHorizontal: Spacing.one,
    position: 'relative',
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500', minHeight: 50, textAlign: 'right', borderWidth: 0 },
  clearButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  searchIconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  clearText: { fontSize: 25, lineHeight: 30 },
  parentCategories: { minHeight: 42, justifyContent: 'center', position: 'relative', zIndex: 0 },
  categoryNavigation: {
    alignItems: 'flex-start',
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    position: 'relative',
    zIndex: 0,
  },
  categoryBackButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categoryChipList: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.two,
    position: 'relative',
    zIndex: 0,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  categoryChipText: { fontSize: 13, textAlign: 'center' },
  categoryLoading: { marginHorizontal: Spacing.three },
  categoryStatus: { minHeight: 38, justifyContent: 'center' },
  categoryStatusText: { fontSize: 12, textAlign: 'right' },
  suggestionPanel: {
    borderRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  suggestionPanelOverlay: {
    elevation: 21,
    left: Spacing.three,
    position: 'absolute',
    right: Spacing.three,
    top: 72,
    zIndex: 21,
  },
  suggestionScroll: { flexShrink: 1 },
  suggestionRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  suggestionDetails: { alignItems: 'flex-end', flex: 1, gap: 2 },
  suggestionTitle: { fontSize: 12, fontWeight: '500', textAlign: 'right' },
  suggestionHint: { fontSize: 12, lineHeight: 20, padding: Spacing.three, textAlign: 'right' },
  suggestionMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  description: { fontSize: 14, lineHeight: 26, textAlign: 'right' },
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
  category: { fontSize: 10, textAlign: 'right' },
  adTitle: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  price: { fontSize: 12, fontWeight: '500', textAlign: 'right' },
  footer: { alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  pressed: { opacity: 0.7 },
});
