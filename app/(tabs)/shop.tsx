'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { fetchLensesPage, LOAD_MORE_AT_INDEX, mapApiLens, PAGE_SIZE } from '@/lib/lenses-api';
import { uploadPhotoOrder } from '@/lib/photo-orders-api';
import type { FilterOption, LensItem, LensType } from '@/lib/types/lens';

const FILTER_OPTIONS: FilterOption[] = ['All', 'Kryptok', 'Progressive', 'Single Vision'];
const SEARCH_DEBOUNCE_MS = 500;

const FILTER_PARAM_ALIASES: Record<string, FilterOption> = {
  singlevision: 'Single Vision',
  progressive: 'Progressive',
  kryptok: 'Kryptok',
};

function parseFilterParam(raw: string | undefined): FilterOption | null {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = decodeURIComponent(raw).replace(/\+/g, ' ').trim().toLowerCase();
  if (normalized === 'all') return 'All';
  const alias = FILTER_PARAM_ALIASES[normalized.replace(/\s+/g, '')];
  if (alias) return alias;
  for (const opt of FILTER_OPTIONS) {
    if (opt === 'All') continue;
    if (opt.toLowerCase() === normalized) return opt;
    if (opt.replace(/\s+/g, '').toLowerCase() === normalized.replace(/\s+/g, '')) return opt;
  }
  return null;
}

const LENS_TYPE_CONFIG: Record<LensType, { color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  Kryptok: { color: '#0a7ea4', bg: '#e0f2fe', icon: 'visibility' },
  Progressive: { color: '#7c3aed', bg: '#ede9fe', icon: 'center-focus-strong' },
  'Single Vision': { color: '#059669', bg: '#d1fae5', icon: 'remove-red-eye' },
};

function LensProductCard({
  item,
  onPress,
}: {
  item: LensItem;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const lensType = item.lensType ?? 'Progressive';
  const brand = item.brand?.trim() ? item.brand.trim() : 'Lens';
  const itemName = item.item?.trim() ? item.item.trim() : item.coating?.trim() || 'Standard Lens';
  const sphCyl = `${item.sph}/${item.cyl ?? '—'}`;

  return (
    <Pressable style={styles.productCard} onPress={onPress}>
      <View style={styles.compactTopRow}>
        <View style={styles.compactTopLeft}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {brand} {sphCyl}
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceCurrency}>₹</Text>
          <Text style={styles.priceAmount}>{item.price}</Text>
        </View>
      </View>

      <Text style={styles.categoryText}>{lensType}</Text>
      <Text style={styles.itemText} numberOfLines={1}>
        {itemName}
      </Text>
    </Pressable>
  );
}

export default function ShopScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { itemCount } = useCart();
  const { getAuthHeaders } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const applyFilterFromParams = useCallback(() => {
    const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    if (raw === undefined || raw === '') return;
    const parsed = parseFilterParam(raw);
    if (parsed) {
      setActiveFilter(parsed);
    }
  }, [params.filter]);

  useEffect(() => {
    applyFilterFromParams();
  }, [applyFilterFromParams]);

  useFocusEffect(
    useCallback(() => {
      applyFilterFromParams();
    }, [applyFilterFromParams])
  );

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

  const submitPhotoOrder = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const uri = asset.uri;
      if (!uri) {
        Alert.alert('Upload failed', 'Could not read the selected image.');
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileName =
        asset.fileName ?? `prescription-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;

      setUploadingPhoto(true);
      try {
        const result = await uploadPhotoOrder(uri, mimeType, fileName, getAuthHeaders());
        Alert.alert(
          'Order received',
          result.message || 'Your order will be placed soon. Our team will process your prescription photo.'
        );
      } catch (err) {
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setUploadingPhoto(false);
      }
    },
    [getAuthHeaders]
  );

  const handlePhotoOrderPress = useCallback(() => {
    if (uploadingPhoto) return;

    Alert.alert('Order with photo', 'Upload a prescription photo for our team to place your order.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission needed', 'Camera access is required to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await submitPhotoOrder(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission needed', 'Photo library access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await submitPhotoOrder(result.assets[0]);
          }
        },
      },
    ]);
  }, [submitPhotoOrder, uploadingPhoto]);

  const renderItem = useCallback(
    ({ item }: { item: LensItem }) => (
      <LensProductCard
        item={item}
        onPress={() =>
          router.push({
            pathname: '/lens-product',
            params: {
              payload: encodeURIComponent(JSON.stringify(item)),
            },
          })
        }
      />
    ),
    [router]
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
          <Text style={styles.screenTitle}>Shop</Text>
          <View style={styles.subtitleRow}>
            {isRefreshing && hasLoadedOnce ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.subtitleSpinner} />
            ) : null}
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconButton, searchActive && styles.iconButtonActive]}
            onPress={() => setSearchActive((current) => !current)}>
            <MaterialIcons name="search" size={22} color={searchActive ? colors.primaryText : colors.primary} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push('/cart')}>
            <MaterialIcons name="shopping-cart" size={22} color={colors.primary} />
            {itemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {searchActive && (
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
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          )}
          {isRefreshing && searchQuery.length > 0 ? (
            <ActivityIndicator size="small" color={colors.primary} />
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
            <Text style={styles.stateText}>Loading products…</Text>
          </View>
        ) : (
          <>
            {shopHeader}
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
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.footerText}>Loading more lenses…</Text>
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
                      <MaterialIcons name="search-off" size={40} color={colors.textMuted} />
                      <Text style={styles.stateText}>
                        {debouncedSearch ? 'No lenses match your search' : 'No lenses found for this filter'}
                      </Text>
                    </View>
                  )
                }
              />
            )}
          </>
        )}

        <Pressable
          style={[styles.fab, uploadingPhoto && styles.fabDisabled]}
          onPress={handlePhotoOrderPress}
          disabled={uploadingPhoto}
          accessibilityRole="button"
          accessibilityLabel="Upload prescription photo for order">
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <MaterialIcons name="add-a-photo" size={26} color={colors.primaryText} />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96 },
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
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: c.text,
  },
  subtitle: { fontSize: 14, color: c.textMuted, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    backgroundColor: c.primary,
  },
  cartBadgeText: { color: c.primaryText, fontSize: 11, fontWeight: '800' },
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabDisabled: { opacity: 0.75 },
});