'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { LensProductListCard } from '@/components/lens-product-list-card';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  DEFAULT_LENS_SORT,
  fetchLensesPage,
  LENS_SORT_OPTIONS,
  LOAD_MORE_AT_INDEX,
  mapApiLens,
  PAGE_SIZE,
  type LensSortOption,
  type PowerMatchMeta,
} from '@/lib/lenses-api';
import { useOrderMode } from '@/lib/order-mode';
import type { FilterOption, LensItem } from '@/lib/types/lens';
import {
  parseWholesaleCategory,
  wholesaleCategoryToFilter,
  type WholesaleCategoryId,
} from '@/lib/wholesale-navigation';

const TYPE_FILTERS: { key: 'all' | WholesaleCategoryId; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sv', label: 'SV' },
  { key: 'kt', label: 'KT' },
  { key: 'v2', label: 'Prog' },
];

const CATEGORY_SHORTCUTS: Record<string, WholesaleCategoryId> = {
  sv: 'sv',
  kt: 'kt',
  v2: 'v2',
  prog: 'v2',
  progressive: 'v2',
  kryptok: 'kt',
  'single-vision': 'sv',
  singlevision: 'sv',
};

function typeToFilter(key: 'all' | WholesaleCategoryId): FilterOption {
  if (key === 'all') return 'All';
  return wholesaleCategoryToFilter(parseWholesaleCategory(key));
}

function formatDiopter(value: number): string {
  if (Math.abs(value) < 1e-9) return '0';
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPowerMatchLabel(match: PowerMatchMeta): string {
  const sph = formatDiopter(match.querySph);
  const cyl =
    match.queryCyl === null || match.queryCyl === undefined
      ? '—'
      : formatDiopter(match.queryCyl);
  return `${sph}/${cyl}`;
}

function powerMatchHint(match: PowerMatchMeta): string | null {
  if (match.mode === 'exact') return null;
  const label = formatPowerMatchLabel(match);
  if (match.mode === 'range') {
    return `No exact ${label} endpoint — showing products whose power range covers it.`;
  }
  return `No exact ${label} — showing closest available powers.`;
}

function syncTypeChipFromQuery(query: string): WholesaleCategoryId | null {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, '');
  return CATEGORY_SHORTCUTS[normalized] ?? null;
}

export default function CatalogSearchScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { setMode } = useOrderMode();
  const params = useLocalSearchParams<{ q?: string }>();
  const urlQuery = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? '';

  const [typeFilter, setTypeFilter] = useState<'all' | WholesaleCategoryId>(
    () => syncTypeChipFromQuery(urlQuery) ?? 'all'
  );
  const [lenses, setLenses] = useState<LensItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [powerMatch, setPowerMatch] = useState<PowerMatchMeta | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQuery);
  const [sort, setSort] = useState<LensSortOption>(DEFAULT_LENS_SORT);
  const [sortOpen, setSortOpen] = useState(false);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const debouncedSearchRef = useRef(urlQuery);
  const sortRef = useRef(sort);
  const typeRef = useRef(typeFilter);
  const skipParamSyncRef = useRef(false);
  debouncedSearchRef.current = debouncedSearch;
  sortRef.current = sort;
  typeRef.current = typeFilter;

  const sortLabel = LENS_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Sort';
  const matchHint = powerMatch ? powerMatchHint(powerMatch) : null;
  const hasQuery = debouncedSearch.trim().length > 0;

  useFocusEffect(
    useCallback(() => {
      setMode('retail');
    }, [setMode])
  );

  useEffect(() => {
    skipParamSyncRef.current = true;
    setSearchQuery(urlQuery);
    setDebouncedSearch(urlQuery);
    const synced = syncTypeChipFromQuery(urlQuery);
    if (synced) {
      setTypeFilter(synced);
    } else if (!urlQuery) {
      setTypeFilter('all');
    }
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const synced = syncTypeChipFromQuery(debouncedSearch);
    if (synced) {
      setTypeFilter(synced);
      return;
    }
    if (!debouncedSearch.trim()) {
      setTypeFilter('all');
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (skipParamSyncRef.current) {
      skipParamSyncRef.current = false;
      return;
    }
    const next = debouncedSearch.trim();
    if (next === urlQuery) return;
    router.setParams({ q: next });
  }, [debouncedSearch, router, urlQuery]);

  const loadPage = useCallback(async (pageToLoad: number, replace: boolean) => {
    const q = debouncedSearchRef.current.trim();
    const shortcutType = syncTypeChipFromQuery(q);
    const typeForRequest = shortcutType ?? typeRef.current;

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
        type: typeToFilter(typeForRequest),
        search: q,
        sort: sortRef.current,
      });

      if (currentRequestId !== requestIdRef.current) return;
      const mapped = data.items.map(mapApiLens);
      setLenses((current) => (replace ? mapped : [...current, ...mapped]));
      setTotalCount(data.total);
      if (replace) {
        setPowerMatch(data.powerMatch ?? null);
      }
      pageRef.current = data.page;
      hasMoreRef.current = data.hasMore;
    } catch {
      if (currentRequestId !== requestIdRef.current) return;
      if (pageToLoad === 1) {
        setLenses([]);
        setTotalCount(0);
        setPowerMatch(null);
      }
      setError('Unable to load search results.');
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
    setInitialLoading(true);
    void loadPage(1, true);
  }, [debouncedSearch, sort, typeFilter, loadPage]);

  const loadNextPage = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current || isRefreshing) return;
    void loadPage(pageRef.current + 1, false);
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
    const triggerIndex = Math.max(
      LOAD_MORE_AT_INDEX - 1,
      lensesLengthRef.current - (PAGE_SIZE - LOAD_MORE_AT_INDEX)
    );
    if (maxIndex >= triggerIndex) {
      loadNextPageRef.current();
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Search catalog</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="sv, kt, v2, coating, brand, or -0.25/-0.25…"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setTypeFilter(filter.key)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.sortButton} onPress={() => setSortOpen(true)}>
          <MaterialIcons name="sort" size={18} color={colors.primary} />
          <Text style={styles.sortButtonText} numberOfLines={1}>
            {sortLabel}
          </Text>
          <MaterialIcons name="expand-more" size={20} color={colors.textMuted} />
        </Pressable>

        {initialLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Searching…</Text>
          </View>
        ) : error && lenses.length === 0 ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="cloud-off" size={32} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadPage(1, true)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.countBlock}>
              <Text style={styles.countHint}>
                {totalCount} result{totalCount === 1 ? '' : 's'}
                {hasQuery ? ` for "${debouncedSearch}"` : ''}
              </Text>
              {matchHint ? <Text style={styles.powerMatchHint}>{matchHint}</Text> : null}
            </View>
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
                <LensProductListCard
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/shop/lens-product',
                      params: {
                        payload: encodeURIComponent(JSON.stringify(item)),
                      },
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
                  <Text style={styles.stateText}>
                    {hasQuery
                      ? `No products found for "${debouncedSearch}".`
                      : 'No products found.'}
                  </Text>
                  <Text style={styles.stateHint}>
                    Shortcuts: sv (Single Vision), kt (Kryptok), v2 (Progressive). Power search uses
                    SPH/CYL like -1.00/-0.50.
                  </Text>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>

      <Modal visible={sortOpen} animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort by</Text>
            <Pressable onPress={() => setSortOpen(false)} hitSlop={8} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          {LENS_SORT_OPTIONS.map((option) => {
            const selected = option.value === sort;
            return (
              <Pressable
                key={option.value}
                style={[styles.sortOption, selected && styles.sortOptionSelected]}
                onPress={() => {
                  setSort(option.value);
                  setSortOpen(false);
                }}>
                <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>
                  {option.label}
                </Text>
                {selected ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </SafeAreaView>
      </Modal>
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
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    filterChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.15)',
    },
    filterChipText: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
    filterChipTextActive: { color: c.primary },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
    },
    sortButtonText: { color: c.text, fontSize: 13, fontWeight: '700', maxWidth: 180 },
    countBlock: { marginBottom: 8, gap: 4 },
    countHint: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    powerMatchHint: { color: c.primary, fontSize: 12, fontWeight: '600' },
    listContent: { paddingBottom: 24, flexGrow: 1 },
    separator: { height: 10 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 10,
    },
    stateText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    stateHint: { color: c.textMuted, fontSize: 12, textAlign: 'center', opacity: 0.9 },
    errorText: { color: c.danger, fontSize: 14, textAlign: 'center' },
    retryButton: {
      marginTop: 4,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
    footerLoader: { paddingVertical: 16, alignItems: 'center', gap: 8 },
    footerText: { color: c.textMuted, fontSize: 12 },
    modalSafe: { flex: 1, backgroundColor: c.background, paddingHorizontal: 16 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    modalCloseBtn: { padding: 4 },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sortOptionSelected: { backgroundColor: 'rgba(240, 161, 50, 0.08)' },
    sortOptionText: { color: c.text, fontSize: 15, fontWeight: '600' },
    sortOptionTextSelected: { color: c.primary, fontWeight: '800' },
  });
