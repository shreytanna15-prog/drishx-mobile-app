'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { FilterOption, LensItem } from '@/lib/types/lens';
import { LensProductListCard } from '@/components/lens-product-list-card';

const FILTER_OPTIONS: FilterOption[] = ['All', 'Kryptok', 'Progressive', 'Single Vision'];
const SEARCH_DEBOUNCE_MS = 500;

function quantityTone(
  qty: number,
  c: BrandColorScheme
): { label: string; bg: string; border: string; text: string } {
  if (qty <= 0) {
    return { label: 'Out of stock', bg: 'rgba(248, 113, 113, 0.12)', border: c.danger, text: '#fca5a5' };
  }
  if (qty <= 5) {
    return { label: `Qty ${qty}`, bg: 'rgba(240, 161, 50, 0.16)', border: c.primary, text: c.primary };
  }
  return { label: `Qty ${qty}`, bg: 'rgba(125, 211, 168, 0.12)', border: c.success, text: c.success };
}

function InventoryProductCard({ item }: { item: LensItem }) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const qtyStyle = quantityTone(item.quantity, colors);

  return (
    <View style={styles.productCardWrap}>
      <LensProductListCard item={item} showLensType />
      <View style={styles.qtyRow}>
        <View style={styles.qtyLeft}>
          <MaterialIcons name="inventory-2" size={14} color={colors.textMuted} />
          <Text style={styles.qtyLabel}>In stock</Text>
        </View>
        <View style={[styles.qtyPill, { backgroundColor: qtyStyle.bg, borderColor: qtyStyle.border }]}>
          <Text style={[styles.qtyPillText, { color: qtyStyle.text }]}>{qtyStyle.label}</Text>
        </View>
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const [lenses, setLenses] = useState<LensItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const activeFilterRef = useRef(activeFilter);
  const debouncedSearchRef = useRef(debouncedSearch);

  activeFilterRef.current = activeFilter;
  debouncedSearchRef.current = debouncedSearch;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPage = useCallback(async (pageToLoad: number, replace: boolean) => {
    if (pageToLoad > 1) {
      if (loadingMoreRef.current || !hasMoreRef.current) {
        return;
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setIsRefreshing(true);
    }

    const currentRequestId = ++requestIdRef.current;
    const filter = activeFilterRef.current;
    const search = debouncedSearchRef.current;

    setError(null);

    try {
      const data = await fetchLensesPage({
        page: pageToLoad,
        type: filter,
        search,
      });

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const mapped = data.items.map(mapApiLens);
      setLenses((current) => (replace ? mapped : [...current, ...mapped]));
      setTotalCount(data.total);
      setHasMore(data.hasMore);
      pageRef.current = data.page;
      hasMoreRef.current = data.hasMore;
      setHasLoadedOnce(true);
    } catch (fetchError) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      console.warn('Inventory fetch error', fetchError);
      if (pageToLoad === 1) {
        setLenses([]);
        setTotalCount(0);
      }
      setError('Unable to load inventory from the backend.');
    } finally {
      if (currentRequestId === requestIdRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setIsRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    loadPage(1, true);
  }, [activeFilter, debouncedSearch, loadPage]);

  const loadNextPage = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current || isRefreshing) {
      return;
    }
    loadPage(pageRef.current + 1, false);
  }, [loadPage, isRefreshing]);

  const loadNextPageRef = useRef(loadNextPage);
  const lensesLengthRef = useRef(0);
  loadNextPageRef.current = loadNextPage;
  lensesLengthRef.current = lenses.length;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const maxIndex = viewableItems.reduce((max, entry) => {
      if (entry.index === null || entry.index === undefined) {
        return max;
      }
      return Math.max(max, entry.index);
    }, -1);

    const triggerIndex = Math.max(LOAD_MORE_AT_INDEX - 1, lensesLengthRef.current - (PAGE_SIZE - LOAD_MORE_AT_INDEX));
    if (maxIndex >= triggerIndex) {
      loadNextPageRef.current();
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  const subtitleText = (() => {
    if (isRefreshing && searchQuery.length > 0) {
      return `Searching for "${searchQuery}"…`;
    }
    if (debouncedSearch.length > 0) {
      return `${totalCount} result${totalCount === 1 ? '' : 's'} for "${debouncedSearch}"`;
    }
    return `${totalCount} products in inventory`;
  })();

  const inventoryHeader = (
    <View style={[styles.header, styles.headerFixed]}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>Inventory</Text>
          <View style={styles.subtitleRow}>
            {isRefreshing && hasLoadedOnce ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.subtitleSpinner} />
            ) : null}
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.iconButton, searchActive && styles.iconButtonActive]}
          onPress={() => setSearchActive((current) => !current)}>
          <MaterialIcons name="search" size={22} color={searchActive ? colors.primaryText : colors.primary} />
        </Pressable>
      </View>

      {searchActive ? (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search SPH, CYL, price, brand, eye..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
          {isRefreshing && searchQuery.length > 0 ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
      ) : null}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTER_OPTIONS}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterList}
        renderItem={({ item: filter }) => {
          const isActive = activeFilter === filter;
          return (
            <Pressable
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {initialLoading && !hasLoadedOnce ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading inventory…</Text>
          </View>
        ) : (
          <>
            {inventoryHeader}
            {error && lenses.length === 0 ? (
              <View style={styles.inlineError}>
                <MaterialIcons name="cloud-off" size={32} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={() => loadPage(1, true)}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={lenses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <InventoryProductCard item={item} />}
                contentContainerStyle={styles.listContent}
                style={styles.productList}
                showsVerticalScrollIndicator={false}
                initialNumToRender={PAGE_SIZE}
                maxToRenderPerBatch={10}
                windowSize={7}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReached={loadNextPage}
                onEndReachedThreshold={0.4}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.footerText}>Loading more products…</Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  isRefreshing ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.stateText}>Searching…</Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="inventory-2" size={40} color={colors.textMuted} />
                      <Text style={styles.stateText}>
                        {debouncedSearch ? 'No products match your search' : 'No products found for this filter'}
                      </Text>
                    </View>
                  )
                }
              />
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  productList: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 16, gap: 12 },
  headerFixed: { paddingHorizontal: 16 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  subtitleSpinner: { marginTop: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleBlock: { flex: 1, paddingRight: 4 },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: c.text,
  },
  subtitle: { fontSize: 14, color: c.textMuted, flexShrink: 1 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: { backgroundColor: c.primary, borderColor: c.primary },
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
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    padding: 0,
  },
  filterList: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  filterChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterChipText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  filterChipTextActive: { fontWeight: '700', color: c.primaryText },
  productCardWrap: {
    gap: 8,
  },
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
  compactTopLeft: {
    flex: 1,
    gap: 0,
  },
  compactTitle: {
    fontSize: 16,
    color: c.text,
    fontWeight: '700',
  },
  priceBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  priceCurrency: { fontSize: 13, fontWeight: '700', color: c.primary, marginTop: 1, marginRight: 1 },
  priceAmount: { fontSize: 17, fontWeight: '800', color: c.primary, lineHeight: 21 },
  categoryText: {
    fontSize: 12,
    color: c.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
  },
  qtyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyLabel: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  qtyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  qtyPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  separator: { height: 12 },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  footerText: { fontSize: 14, color: c.textMuted },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  inlineError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  stateText: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
  errorText: { fontSize: 15, color: c.danger, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: c.primary,
  },
  retryText: { color: c.primaryText, fontWeight: '700' },
});
