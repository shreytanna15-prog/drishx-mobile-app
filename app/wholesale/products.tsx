'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { fetchLensesPage, LOAD_MORE_AT_INDEX, mapApiLens, PAGE_SIZE } from '@/lib/lenses-api';
import type { LensItem } from '@/lib/types/lens';
import { LensProductListCard } from '@/components/lens-product-list-card';
import {
  parseWholesaleCategory,
  wholesaleCategoryToFilter,
  wholesaleCategoryTitle,
} from '@/lib/wholesale-navigation';

function LensRow({ item, onPress }: { item: LensItem; onPress: () => void }) {
  return <LensProductListCard item={item} onPress={onPress} />;
}

export default function WholesaleProductsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; item?: string }>();

  const category = useMemo(() => parseWholesaleCategory(params.category), [params.category]);
  const selectedItem = useMemo(() => {
    const raw = Array.isArray(params.item) ? params.item[0] : params.item;
    return raw?.trim() ?? '';
  }, [params.item]);

  const filter = useMemo(() => wholesaleCategoryToFilter(category), [category]);

  const [lenses, setLenses] = useState<LensItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const debouncedSearchRef = useRef('');
  debouncedSearchRef.current = debouncedSearch;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      if (pageToLoad > 1) {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setIsRefreshing(true);
      }

      const currentRequestId = ++requestIdRef.current;
      setError(null);
      try {
        const data = await fetchLensesPage({
          page: pageToLoad,
          type: filter,
          search: debouncedSearchRef.current,
          item: selectedItem || undefined,
        });

        if (currentRequestId !== requestIdRef.current) return;
        const mapped = data.items.map(mapApiLens);
        setLenses((current) => (replace ? mapped : [...current, ...mapped]));
        setTotalCount(data.total);
        pageRef.current = data.page;
        hasMoreRef.current = data.hasMore;
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        if (pageToLoad === 1) {
          setLenses([]);
          setTotalCount(0);
        }
        setError('Unable to load product data from the backend.');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
          setIsRefreshing(false);
          setInitialLoading(false);
        }
      }
    },
    [filter, selectedItem]
  );

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setInitialLoading(true);
    loadPage(1, true);
  }, [filter, selectedItem, debouncedSearch, loadPage]);

  useFocusEffect(
    useCallback(() => {
      // On refocus, refresh quietly if list is empty.
      if (lenses.length === 0) {
        loadPage(1, true);
      }
    }, [lenses.length, loadPage])
  );

  const loadNextPage = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current || isRefreshing) return;
    loadPage(pageRef.current + 1, false);
  }, [isRefreshing, loadPage]);

  const loadNextPageRef = useRef(loadNextPage);
  const lensesLengthRef = useRef(0);
  loadNextPageRef.current = loadNextPage;
  lensesLengthRef.current = lenses.length;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const maxIndex = viewableItems.reduce((max, entry) => {
      if (entry.index === null || entry.index === undefined) return max;
      return Math.max(max, entry.index);
    }, -1);
    const triggerIndex = Math.max(LOAD_MORE_AT_INDEX - 1, lensesLengthRef.current - (PAGE_SIZE - LOAD_MORE_AT_INDEX));
    if (maxIndex >= triggerIndex) {
      loadNextPageRef.current();
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  const title = selectedItem || `${wholesaleCategoryTitle(category)} • Wholesale`;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search sv, kt, v2, BRC, brand, power..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
          {isRefreshing && searchQuery.length > 0 ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {initialLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading products…</Text>
          </View>
        ) : error && lenses.length === 0 ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="cloud-off" size={32} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadPage(1, true)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.countHint}>{totalCount} product{totalCount === 1 ? '' : 's'}</Text>
            <FlatList
              data={lenses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={loadNextPage}
              onEndReachedThreshold={0.4}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <LensRow
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/wholesale/product-order',
                      params: { payload: encodeURIComponent(JSON.stringify(item)) },
                    })
                  }
                />
              )}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.footerText}>Loading more…</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.centeredState}>
                  <MaterialIcons name="search-off" size={40} color={colors.textMuted} />
                  <Text style={styles.stateText}>No products found.</Text>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      paddingBottom: 12,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
    countHint: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    listContent: { paddingBottom: 24 },
    separator: { height: 12 },
    centeredState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 28,
    },
    stateText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, fontSize: 14, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 4,
      backgroundColor: c.primary,
    },
    retryText: { color: c.primaryText, fontWeight: '800' },
    productCard: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    compactTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 6,
      gap: 8,
    },
    compactTopLeft: { flex: 1, gap: 0 },
    compactTitle: { fontSize: 16, color: c.text, fontWeight: '700' },
    powerMetaText: { fontSize: 12, color: c.textMuted, fontWeight: '600', marginTop: 2 },
    priceBlock: { flexDirection: 'row', alignItems: 'flex-start' },
    priceCurrency: { fontSize: 13, fontWeight: '700', color: c.primary, marginTop: 1, marginRight: 1 },
    priceAmount: { fontSize: 17, fontWeight: '800', color: c.primary, lineHeight: 21 },
    itemText: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
    footerLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 18,
    },
    footerText: { fontSize: 14, color: c.textMuted },
  });

