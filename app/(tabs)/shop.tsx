'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCart } from '@/lib/cart';
import { fetchLensesPage, LOAD_MORE_AT_INDEX, mapApiLens, PAGE_SIZE } from '@/lib/lenses-api';
import type { FilterOption, LensItem, LensType } from '@/lib/types/lens';

const FILTER_OPTIONS: FilterOption[] = ['All', 'Kryptok', 'Progressive', 'Single Vision'];
const SEARCH_DEBOUNCE_MS = 500;

const LENS_TYPE_CONFIG: Record<LensType, { color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  Kryptok: { color: '#0a7ea4', bg: '#e0f2fe', icon: 'visibility' },
  Progressive: { color: '#7c3aed', bg: '#ede9fe', icon: 'center-focus-strong' },
  'Single Vision': { color: '#059669', bg: '#d1fae5', icon: 'remove-red-eye' },
};

function SpecPill({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.specPill, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
      <ThemedText style={[styles.specLabel, muted && styles.specMuted]}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.specValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.detailValue, isDark && styles.detailValueDark]}
        numberOfLines={2}>
        {value?.trim() ? value : '—'}
      </ThemedText>
    </View>
  );
}

function LensProductCard({
  item,
  onAddToCart,
  inCart,
}: {
  item: LensItem;
  onAddToCart: () => void;
  inCart: boolean;
}) {
  const lensType = item.lensType ?? 'Progressive';
  const config = LENS_TYPE_CONFIG[lensType];
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme].tint;

  return (
    <View style={[styles.productCard, isDark && styles.productCardDark]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: isDark ? `${config.color}22` : config.bg }]}>
          <MaterialIcons name={config.icon} size={16} color={config.color} />
          <ThemedText style={[styles.typeBadgeText, { color: config.color }]}>{lensType}</ThemedText>
        </View>
        <View style={styles.priceBlock}>
          <ThemedText style={styles.priceCurrency}>₹</ThemedText>
          <ThemedText style={styles.priceAmount}>{item.price}</ThemedText>
        </View>
      </View>

      <View style={styles.specRow}>
        <SpecPill label="SPH" value={item.sph} />
        <SpecPill label="CYL" value={item.cyl ?? '—'} />
        {lensType !== 'Single Vision' && <SpecPill label="ADD" value={item.add ?? '—'} />}
      </View>

      <View style={[styles.detailsSection, isDark && styles.detailsSectionDark]}>
        <DetailRow label="Brand" value={item.brand} />
        <DetailRow label="Item" value={item.item} />
        <DetailRow label="Coating" value={item.coating} />
      </View>

      <View style={styles.cardFooter}>
        {item.eye ? (
          <View style={[styles.eyeBadge, isDark && styles.eyeBadgeDark]}>
            <MaterialIcons name="visibility" size={14} color={tint} />
            <ThemedText style={styles.eyeBadgeText}>{item.eye}</ThemedText>
          </View>
        ) : (
          <View />
        )}
        {item.axis !== null && item.axis !== undefined && (
          <ThemedText style={styles.axisText}>Axis {item.axis}°</ThemedText>
        )}
      </View>

      <Pressable
        style={[styles.addButton, inCart && styles.addButtonInCart, { borderColor: tint }]}
        onPress={onAddToCart}>
        <MaterialIcons name={inCart ? 'check' : 'add-shopping-cart'} size={18} color={inCart ? '#fff' : tint} />
        <ThemedText style={[styles.addButtonText, { color: inCart ? '#fff' : tint }, inCart && styles.addButtonTextInCart]}>
          {inCart ? 'Added to Cart' : 'Add to Cart'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme].tint;
  const { addToCart, itemCount, isInCart } = useCart();

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
      console.warn('Lens fetch error', fetchError);
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

  const handleAddToCart = useCallback(
    (item: LensItem) => {
      addToCart(item);
    },
    [addToCart]
  );

  const renderItem = useCallback(
    ({ item }: { item: LensItem }) => (
      <LensProductCard
        item={item}
        inCart={isInCart(item.id)}
        onAddToCart={() => handleAddToCart(item)}
      />
    ),
    [handleAddToCart, isInCart]
  );

  const subtitleText = (() => {
    if (isRefreshing && searchQuery.length > 0) {
      return `Searching for "${searchQuery}"…`;
    }
    if (debouncedSearch.length > 0) {
      return `${totalCount} result${totalCount === 1 ? '' : 's'} for "${debouncedSearch}"`;
    }
    return `${totalCount} products available`;
  })();

  const shopHeader = (
    <View style={[styles.header, styles.headerFixed]}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <ThemedText type="title" style={styles.screenTitle}>
            Shop
          </ThemedText>
          <View style={styles.subtitleRow}>
            {isRefreshing && hasLoadedOnce ? (
              <ActivityIndicator size="small" color={tint} style={styles.subtitleSpinner} />
            ) : null}
            <ThemedText style={styles.subtitle}>{subtitleText}</ThemedText>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconButton, isDark && styles.iconButtonDark, searchActive && styles.iconButtonActive]}
            onPress={() => setSearchActive((current) => !current)}>
            <MaterialIcons name="search" size={22} color={searchActive ? '#fff' : tint} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, isDark && styles.iconButtonDark]}
            onPress={() => router.push('/cart')}>
            <MaterialIcons name="shopping-cart" size={22} color={tint} />
            {itemCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: tint }]}>
                <ThemedText style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {searchActive && (
        <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search SPH, CYL, price, brand, eye..."
            placeholderTextColor="#94a3b8"
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color="#94a3b8" />
            </Pressable>
          )}
          {isRefreshing && searchQuery.length > 0 ? (
            <ActivityIndicator size="small" color={tint} />
          ) : null}
        </View>
      )}

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
              style={[
                styles.filterChip,
                isDark && styles.filterChipDark,
                isActive && { backgroundColor: tint, borderColor: tint },
              ]}>
              <ThemedText
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                  isActive && { color: '#fff' },
                ]}>
                {filter}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {initialLoading && !hasLoadedOnce ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={tint} />
            <ThemedText style={styles.stateText}>Loading products…</ThemedText>
          </View>
        ) : (
          <>
            {shopHeader}
            {error && lenses.length === 0 ? (
              <View style={styles.inlineError}>
                <MaterialIcons name="cloud-off" size={32} color="#b91c1c" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <Pressable style={[styles.retryButton, { backgroundColor: tint }]} onPress={() => loadPage(1, true)}>
                  <ThemedText style={styles.retryText}>Retry</ThemedText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={lenses}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
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
                      <ActivityIndicator color={tint} />
                      <ThemedText style={styles.footerText}>Loading more lenses…</ThemedText>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  isRefreshing ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color={tint} />
                      <ThemedText style={styles.stateText}>Searching…</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="search-off" size={40} color="#94a3b8" />
                      <ThemedText style={styles.stateText}>
                        {debouncedSearch ? 'No lenses match your search' : 'No lenses found for this filter'}
                      </ThemedText>
                    </View>
                  )
                }
              />
            )}
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  },
  titleBlock: { flex: 1, paddingRight: 8 },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { fontSize: 14, color: '#64748b', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: { backgroundColor: '#0a7ea422' },
  iconButtonActive: { backgroundColor: '#0a7ea4' },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  searchBarDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    padding: 0,
  },
  searchInputDark: { color: '#f1f5f9' },
  filterList: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  filterChipDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  filterChipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { fontWeight: '700' },
  productCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  priceBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  priceCurrency: { fontSize: 16, fontWeight: '700', color: '#0a7ea4', marginTop: 2, marginRight: 1 },
  priceAmount: { fontSize: 24, fontWeight: '800', color: '#0a7ea4', lineHeight: 28 },
  specRow: { flexDirection: 'row', gap: 8 },
  specPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specMuted: { color: '#94a3b8' },
  specValue: { fontSize: 15 },
  detailsSection: {
    marginTop: 12,
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailsSectionDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    width: 64,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingTop: 2,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#0f172a',
  },
  detailValueDark: {
    color: '#e2e8f0',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  eyeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  eyeBadgeDark: { backgroundColor: '#0a7ea418' },
  eyeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  axisText: { fontSize: 13, color: '#64748b' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  addButtonInCart: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  addButtonText: { fontSize: 15, fontWeight: '700' },
  addButtonTextInCart: { color: '#fff' },
  separator: { height: 12 },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  footerText: { fontSize: 14, color: '#64748b' },
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
  stateText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#b91c1c', textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});