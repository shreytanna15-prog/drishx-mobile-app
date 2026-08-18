'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { CoatingDot } from '@/components/coating-dot';
import { LensProductListCard } from '@/components/lens-product-list-card';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  DEFAULT_LENS_SORT,
  fetchLensFacets,
  fetchLensesPage,
  LENS_SORT_OPTIONS,
  LOAD_MORE_AT_INDEX,
  mapApiLens,
  PAGE_SIZE,
  POWER_SHAPE_OPTIONS,
  type LensSortOption,
  type PowerShapeFilter,
} from '@/lib/lenses-api';
import { useOrderMode } from '@/lib/order-mode';
import type { LensItem } from '@/lib/types/lens';
import {
  parseWholesaleCategory,
  wholesaleCategoryToFilter,
} from '@/lib/wholesale-navigation';

function LensRow({ item, onPress }: { item: LensItem; onPress: () => void }) {
  return <LensProductListCard item={item} onPress={onPress} />;
}

export default function ShopProductsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { setMode } = useOrderMode();
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
  const [sort, setSort] = useState<LensSortOption>(DEFAULT_LENS_SORT);
  const [sortOpen, setSortOpen] = useState(false);
  const [coatings, setCoatings] = useState<string[]>([]);
  const [powerShapes, setPowerShapes] = useState<PowerShapeFilter[]>([]);
  const [selectedCoating, setSelectedCoating] = useState('');
  const [selectedPowerShape, setSelectedPowerShape] = useState<PowerShapeFilter | ''>('');

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const debouncedSearchRef = useRef('');
  const sortRef = useRef(sort);
  const coatingRef = useRef(selectedCoating);
  const powerShapeRef = useRef(selectedPowerShape);
  debouncedSearchRef.current = debouncedSearch;
  sortRef.current = sort;
  coatingRef.current = selectedCoating;
  powerShapeRef.current = selectedPowerShape;

  const usePowerFilters = coatings.length === 0 && powerShapes.length > 0;

  const sortLabel =
    LENS_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Sort';

  useFocusEffect(
    useCallback(() => {
      setMode('retail');
    }, [setMode])
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedCoating('');
    coatingRef.current = '';
    setSelectedPowerShape('');
    powerShapeRef.current = '';
    setCoatings([]);
    setPowerShapes([]);
    if (!selectedItem) return;

    let cancelled = false;
    void (async () => {
      try {
        const facets = await fetchLensFacets({
          type: filter,
          item: selectedItem,
        });
        if (!cancelled) {
          setCoatings(facets.coatings);
          setPowerShapes(facets.powerShapes);
        }
      } catch {
        if (!cancelled) {
          setCoatings([]);
          setPowerShapes([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, selectedItem]);

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
        const powerShape = powerShapeRef.current || undefined;
        const coating = powerShape ? undefined : coatingRef.current || undefined;

        const data = await fetchLensesPage({
          page: pageToLoad,
          type: filter,
          search: debouncedSearchRef.current,
          item: selectedItem || undefined,
          coating,
          powerShape,
          sort: sortRef.current,
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
  }, [filter, selectedItem, debouncedSearch, sort, selectedCoating, selectedPowerShape, loadPage]);

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
    const triggerIndex = Math.max(
      LOAD_MORE_AT_INDEX - 1,
      lensesLengthRef.current - (PAGE_SIZE - LOAD_MORE_AT_INDEX)
    );
    if (maxIndex >= triggerIndex) {
      loadNextPageRef.current();
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;

  const title = selectedItem || 'Products';

  const emptyMessage = selectedPowerShape
    ? 'No products found for this power filter.'
    : selectedCoating
      ? 'No products found for this coating.'
      : 'No products found.';

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
            placeholder="Search brand, coating, power, plano..."
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
          {isRefreshing && searchQuery.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>

        <Pressable style={styles.sortButton} onPress={() => setSortOpen(true)}>
          <MaterialIcons name="sort" size={18} color={colors.primary} />
          <Text style={styles.sortButtonText} numberOfLines={1}>
            {sortLabel}
          </Text>
          <MaterialIcons name="expand-more" size={20} color={colors.textMuted} />
        </Pressable>

        {usePowerFilters ? (
          <View style={styles.coatingWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coatingRow}
            >
              <Pressable
                onPress={() => setSelectedPowerShape('')}
                style={[styles.coatingChip, !selectedPowerShape && styles.coatingChipActive]}
              >
                <Text
                  style={[
                    styles.coatingChipText,
                    !selectedPowerShape && styles.coatingChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {POWER_SHAPE_OPTIONS.filter((option) => powerShapes.includes(option.value)).map(
                (option) => {
                  const active = selectedPowerShape === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setSelectedPowerShape(option.value)}
                      style={[styles.coatingChip, active && styles.coatingChipActive]}
                    >
                      <Text
                        style={[
                          styles.coatingChipText,
                          active && styles.coatingChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          </View>
        ) : coatings.length > 0 ? (
          <View style={styles.coatingWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coatingRow}
            >
              <Pressable
                onPress={() => setSelectedCoating('')}
                style={[styles.coatingChip, !selectedCoating && styles.coatingChipActive]}
              >
                <Text
                  style={[
                    styles.coatingChipText,
                    !selectedCoating && styles.coatingChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {coatings.map((coating) => {
                const active =
                  selectedCoating.toLowerCase() === coating.toLowerCase();
                return (
                  <Pressable
                    key={coating}
                    onPress={() => setSelectedCoating(coating)}
                    style={[styles.coatingChip, active && styles.coatingChipActive]}
                  >
                    <CoatingDot coating={coating} />
                    <Text
                      style={[
                        styles.coatingChipText,
                        active && styles.coatingChipTextActive,
                      ]}
                    >
                      {coating}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

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
          <View style={styles.listSection}>
            <Text style={styles.countHint}>
              {totalCount} product{totalCount === 1 ? '' : 's'}
            </Text>
            <FlatList
              style={styles.list}
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
                  <Text style={styles.stateText}>{emptyMessage}</Text>
                </View>
              }
            />
          </View>
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
                }}
              >
                <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>
                  {option.label}
                </Text>
                {selected ? (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                ) : null}
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
      marginBottom: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 10,
    },
    sortButtonText: { flex: 1, color: c.text, fontSize: 14, fontWeight: '700' },
    coatingWrap: {
      flexGrow: 0,
      flexShrink: 0,
      marginBottom: 10,
    },
    coatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 8,
    },
    coatingChip: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    coatingChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary + '14',
    },
    coatingChipText: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    coatingChipTextActive: { color: c.primary, fontWeight: '800' },
    listSection: { flex: 1, minHeight: 0 },
    countHint: {
      flexShrink: 0,
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    list: { flex: 1 },
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
    footerLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 18,
    },
    footerText: { fontSize: 14, color: c.textMuted },
    modalSafe: { flex: 1, backgroundColor: c.background, paddingHorizontal: 16 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    modalCloseBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 8,
    },
    sortOptionSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary + '14',
    },
    sortOptionText: { color: c.text, fontSize: 15, fontWeight: '600' },
    sortOptionTextSelected: { color: c.primary, fontWeight: '800' },
  });
