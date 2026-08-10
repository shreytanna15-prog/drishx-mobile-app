'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { appAlert } from '@/lib/app-alert';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { fetchCustomerCompanies, type CustomerCompany } from '@/lib/customers-api';
import { formatLensProductCardTitle, formatSphCylSlash } from '@/lib/lens-display';
import { fetchLensesPage, mapApiLens } from '@/lib/lenses-api';
import { LENS_PRICE_PER_PAIR_LABEL, lineTotalForPieceQuantity } from '@/lib/lens-pricing';
import { consumePendingOnBehalfSelection } from '@/lib/on-behalf-selection';
import { formatPairQuantity, pairsFromPieces } from '@/lib/order-quantity';
import { setOnBehalfCustomOrderContext } from '@/lib/on-behalf-custom-order';
import { createOrderFromLens, ORDER_NOTES_MAX_LENGTH } from '@/lib/orders-api';
import { useBrandColors } from '@/lib/theme-provider';
import type { FilterOption, LensItem } from '@/lib/types/lens';

type Step = 'customer' | 'shop';
type SelectedLine = { lens: LensItem; quantity: number };

const FILTER_OPTIONS: FilterOption[] = ['All', 'Kryptok', 'Progressive', 'Single Vision'];

const CUSTOM_ORDER_OPTIONS = [
  {
    id: 'rx',
    label: 'Rx',
    description: 'Custom prescription order',
    path: '/rx' as const,
  },
  {
    id: 'white',
    label: 'White',
    description: 'White lens catalog order',
    path: '/white' as const,
  },
  {
    id: 'color',
    label: 'Color orders',
    description: 'Tinted / fashion color lens',
    path: '/color' as const,
  },
] as const;

function formatLensLabel(lens: LensItem): string {
  return `${formatLensProductCardTitle(lens)} · ${formatSphCylSlash(lens)}`;
}

function getLensStableKey(lens: LensItem): string {
  return [
    lens.id,
    lens.lensType ?? '',
    lens.sph,
    lens.cyl ?? '',
    lens.axis ?? '',
    lens.add ?? '',
    lens.eye ?? '',
  ].join('::');
}

export default function EmployeeOrderOnBehalfScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const [step, setStep] = useState<Step>('customer');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerCompany[]>([]);
  const [products, setProducts] = useState<LensItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const productsPageRef = useRef(1);
  const hasMoreProductsRef = useRef(true);
  const loadingMoreProductsRef = useRef(false);
  const productsRequestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const customerRows = await fetchCustomerCompanies(getAuthHeaders());
      setCustomers(customerRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.businessName ?? ''} ${c.name ?? ''} ${c.email}`.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 400);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const loadProducts = useCallback(async (page: number, replace: boolean) => {
    if (replace) {
      setLoadingProducts(true);
      setProductError(null);
    } else {
      if (loadingMoreProductsRef.current || !hasMoreProductsRef.current) return;
      loadingMoreProductsRef.current = true;
      setLoadingMoreProducts(true);
    }

    const requestId = ++productsRequestIdRef.current;

    try {
      const data = await fetchLensesPage({
        page,
        type: activeFilter,
        search: debouncedProductSearch,
      });
      if (requestId !== productsRequestIdRef.current) return;

      const mapped = data.items.map(mapApiLens);
      setProducts((current) => {
        const merged = replace ? mapped : [...current, ...mapped];
        const deduped = new Map<string, LensItem>();
        for (const lens of merged) {
          deduped.set(getLensStableKey(lens), lens);
        }
        return [...deduped.values()];
      });
      setTotalProducts(data.total);
      hasMoreProductsRef.current = data.hasMore;
      setHasMoreProducts(data.hasMore);
      productsPageRef.current = data.page;
      setProductError(null);
    } catch (e) {
      if (requestId !== productsRequestIdRef.current) return;
      setProductError(e instanceof Error ? e.message : 'Failed to load products.');
      if (replace) {
        setProducts([]);
        setTotalProducts(0);
        hasMoreProductsRef.current = false;
        setHasMoreProducts(false);
      }
    } finally {
      if (requestId === productsRequestIdRef.current) {
        loadingMoreProductsRef.current = false;
        setLoadingProducts(false);
        setLoadingMoreProducts(false);
      }
    }
  }, [activeFilter, debouncedProductSearch]);

  useEffect(() => {
    if (step !== 'shop') return;
    productsPageRef.current = 1;
    hasMoreProductsRef.current = true;
    setHasMoreProducts(true);
    void loadProducts(1, true);
  }, [step, activeFilter, debouncedProductSearch, loadProducts]);

  const totalAmount = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + lineTotalForPieceQuantity(line.lens.price, line.quantity),
        0
      ),
    [selectedLines]
  );

  useFocusEffect(
    useCallback(() => {
      const selection = consumePendingOnBehalfSelection();
      if (!selection) return;
      setSelectedLines((current) => {
        const existing = current.find((line) => line.lens.id === selection.lens.id);
        if (existing) {
          return current.map((line) =>
            line.lens.id === selection.lens.id
              ? { ...line, lens: selection.lens, quantity: line.quantity + selection.quantity }
              : line
          );
        }
        return [...current, selection];
      });
    }, [])
  );

  function updateLineQuantity(lensId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      setSelectedLines((current) => current.filter((line) => line.lens.id !== lensId));
      return;
    }
    setSelectedLines((current) =>
      current.map((line) =>
        line.lens.id === lensId ? { ...line, quantity: Math.max(1, Math.floor(nextQuantity)) } : line
      )
    );
  }

  async function placeOrderOnBehalf() {
    if (!selectedCustomerId) {
      appAlert('Select customer', 'Please select a customer first.');
      return;
    }
    if (selectedLines.length === 0) {
      appAlert('Select products', 'Please add at least one product.');
      return;
    }
    if (orderNotes.trim().length > ORDER_NOTES_MAX_LENGTH) {
      appAlert('Notes too long', `Notes must be at most ${ORDER_NOTES_MAX_LENGTH} characters.`);
      return;
    }

    setPlacingOrder(true);
    const failures: string[] = [];
    let successCount = 0;
    let queuedCount = 0;
    const checkoutBatchId = `staff_batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    for (const line of selectedLines) {
      const result = await createOrderFromLens(line.lens, line.quantity, getAuthHeaders(), {
        userId: selectedCustomerId,
        notes: orderNotes.trim() || undefined,
        checkoutBatchId,
      });
      if (result.success) {
        successCount += 1;
        if (result.queued) {
          queuedCount += 1;
        }
      } else {
        failures.push(`${formatLensLabel(line.lens)}: ${result.error}`);
      }
    }

    setPlacingOrder(false);

    if (failures.length > 0 && successCount === 0) {
      appAlert('Order failed', failures.join('\n\n'));
      return;
    }
    if (failures.length > 0) {
      appAlert('Partial success', `${successCount} order(s) placed.\n\n${failures.join('\n\n')}`);
      return;
    }

    const offlineNote =
      queuedCount > 0 ? ` ${queuedCount} order(s) will sync when you're back online.` : '';
    appAlert('Order placed', `Successfully placed ${successCount} order(s).${offlineNote}`);
    setSelectedLines([]);
    setOrderNotes('');
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading customers and products...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.centered}>
            <MaterialIcons name="error-outline" size={44} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const selectedCustomerLabel =
    selectedCustomer?.businessName || selectedCustomer?.name || selectedCustomer?.email || '';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (step === 'shop') {
                setStep('customer');
                return;
              }
              router.back();
            }}
            hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Order on Behalf</Text>
          <View style={styles.headerSpacer} />
        </View>

        {step === 'customer' ? (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1) Choose company</Text>
                <TextInput
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholder="Search company or email"
                  placeholderTextColor={colors.placeholder}
                  style={styles.searchInput}
                />
              </View>
            }
            renderItem={({ item: customer }) => {
              const active = customer.id === selectedCustomerId;
              return (
                <Pressable
                  style={[styles.choiceCard, active && styles.choiceCardActive]}
                  onPress={() => setSelectedCustomerId(customer.id)}>
                  <Text style={styles.choiceTitle}>{customer.businessName || customer.name || customer.email}</Text>
                  <Text style={styles.choiceMeta}>{customer.email}</Text>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={
              <Pressable
                style={[styles.placeBtn, !selectedCustomerId && styles.disabled]}
                onPress={() => setStep('shop')}
                disabled={!selectedCustomerId}>
                <Text style={styles.placeBtnText}>Continue to shop</Text>
              </Pressable>
            }
          />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => getLensStableKey(item)}
            contentContainerStyle={styles.shopContent}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListHeaderComponent={
              <View style={styles.shopHeader}>
                <View style={styles.customerPill}>
                  <Text style={styles.customerPillText}>Customer: {selectedCustomerLabel}</Text>
                  <Pressable onPress={() => setStep('customer')}>
                    <Text style={styles.changeText}>Change</Text>
                  </Pressable>
                </View>
                <Text style={styles.shopTitle}>Shop</Text>
                <Text style={styles.shopSubtitle}>{totalProducts} products available</Text>

                <View style={styles.searchBar}>
                  <MaterialIcons name="search" size={20} color={colors.textMuted} />
                  <TextInput
                    value={productSearch}
                    onChangeText={setProductSearch}
                    placeholder="Search SPH, CYL, price, brand, item, plano..."
                    placeholderTextColor={colors.placeholder}
                    style={styles.searchBarInput}
                  />
                </View>

                <FlatList
                  horizontal
                  data={FILTER_OPTIONS}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.filterList}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item: filter }) => {
                    const active = activeFilter === filter;
                    return (
                      <Pressable
                        onPress={() => setActiveFilter(filter)}
                        style={[styles.filterChip, active && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
                      </Pressable>
                    );
                  }}
                />

                <Text style={styles.sectionTitle}>Custom orders</Text>
                <View style={styles.customOrderRow}>
                  {CUSTOM_ORDER_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={styles.customOrderCard}
                      onPress={() => {
                        if (!selectedCustomerId) return;
                        setOnBehalfCustomOrderContext({
                          userId: selectedCustomerId,
                          customerLabel: selectedCustomerLabel,
                          returnTo: '/employee-order-on-behalf',
                        });
                        router.push(option.path as never);
                      }}>
                      <Text style={styles.customOrderLabel}>{option.label}</Text>
                      <Text style={styles.customOrderDescription}>{option.description}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Selected products</Text>
                {selectedLines.length === 0 ? (
                  <Text style={styles.emptySelectionText}>Tap a product card below to add it.</Text>
                ) : (
                  <View style={styles.selectedWrap}>
                    {selectedLines.map((line) => (
                      <View key={line.lens.id} style={styles.selectedCard}>
                        <Text style={styles.choiceTitle}>{formatLensLabel(line.lens)}</Text>
                        <Text style={styles.choiceMeta}>
                          {line.lens.lensType ?? 'Lens'} · ₹{line.lens.price}
                          {LENS_PRICE_PER_PAIR_LABEL}
                        </Text>
                        <View style={styles.qtyRow}>
                          <Pressable
                            style={styles.qtyBtn}
                            onPress={() => updateLineQuantity(line.lens.id, line.quantity - 1)}>
                            <MaterialIcons name="remove" size={18} color={colors.primary} />
                          </Pressable>
                          <Text style={styles.qtyValue}>{formatPairQuantity(pairsFromPieces(line.quantity))} pair</Text>
                          <Pressable
                            style={styles.qtyBtn}
                            onPress={() => updateLineQuantity(line.lens.id, line.quantity + 1)}>
                            <MaterialIcons name="add" size={18} color={colors.primary} />
                          </Pressable>
                          <Text style={styles.lineTotal}>
                            ₹{lineTotalForPieceQuantity(line.lens.price, line.quantity)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.sectionTitle}>3) Notes (optional)</Text>
                <TextInput
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  placeholder="Special instructions..."
                  placeholderTextColor={colors.placeholder}
                  style={styles.notesInput}
                  multiline
                  maxLength={ORDER_NOTES_MAX_LENGTH}
                />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>{selectedLines.length} product line(s)</Text>
                  <Text style={styles.summaryAmount}>₹{totalAmount}</Text>
                </View>
                <Pressable
                  style={[styles.placeBtn, placingOrder && styles.disabled]}
                  onPress={placeOrderOnBehalf}
                  disabled={placingOrder}>
                  {placingOrder ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <>
                      <MaterialIcons name="shopping-bag" size={18} color={colors.primaryText} />
                      <Text style={styles.placeBtnText}>Place order for customer</Text>
                    </>
                  )}
                </Pressable>

                <Text style={styles.sectionTitle}>2) Choose products</Text>
              </View>
            }
            renderItem={({ item: lens }) => (
              <Pressable
                style={styles.shopCard}
                onPress={() =>
                  router.push({
                    pathname: '/shop/lens-product',
                    params: {
                      payload: encodeURIComponent(JSON.stringify(lens)),
                      mode: 'on-behalf-select',
                    },
                  })
                }>
                <View style={styles.shopCardTop}>
                  <Text style={styles.shopCardTitle}>
                    {formatLensProductCardTitle(lens).toUpperCase()} {formatSphCylSlash(lens)}
                  </Text>
                  <Text style={styles.shopCardPrice}>₹{lens.price}</Text>
                </View>
                <Text style={styles.shopCardType}>{lens.lensType ?? 'Single Vision'}</Text>
                {!!lens.item && (
                  <Text style={styles.shopCardItem} numberOfLines={1}>
                    {lens.item.toUpperCase()}
                  </Text>
                )}
              </Pressable>
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!hasMoreProducts || loadingProducts || loadingMoreProducts) return;
              void loadProducts(productsPageRef.current + 1, false);
            }}
            ListFooterComponent={
              loadingMoreProducts ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.footerText}>Loading more lenses...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              loadingProducts ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.stateText}>Loading products...</Text>
                </View>
              ) : productError ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="cloud-off" size={36} color={colors.danger} />
                  <Text style={styles.errorText}>{productError}</Text>
                  <Pressable style={styles.retryBtn} onPress={() => void loadProducts(1, true)}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={36} color={colors.textMuted} />
                  <Text style={styles.stateText}>No products found for this filter/search.</Text>
                </View>
              )
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerSpacer: { width: 24 },
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    content: { padding: 16, paddingBottom: 32 },
    shopContent: { paddingHorizontal: 16, paddingBottom: 32 },
    shopHeader: { paddingTop: 8, paddingBottom: 8, gap: 10 },
    section: { marginBottom: 14 },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    searchInput: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    choiceCard: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    choiceCardActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
    },
    choiceTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
    choiceMeta: { color: c.textMuted, fontSize: 12 },
    customerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    customerPillText: { color: c.text, fontSize: 13, fontWeight: '700', flex: 1 },
    changeText: { color: c.primary, fontSize: 13, fontWeight: '700' },
    shopTitle: { fontSize: 30, fontWeight: '800', color: c.text, marginBottom: 0 },
    shopSubtitle: { fontSize: 15, color: c.textMuted, marginBottom: 2 },
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
    searchBarInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
    filterList: { gap: 8, paddingRight: 4 },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterChipText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
    filterChipTextActive: { fontWeight: '700', color: c.primaryText },
    customOrderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    customOrderCard: {
      flexGrow: 1,
      flexBasis: '30%',
      minWidth: 96,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 4,
    },
    customOrderLabel: { color: c.text, fontSize: 15, fontWeight: '800' },
    customOrderDescription: { color: c.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 16 },
    emptySelectionText: { color: c.textMuted, marginBottom: 8 },
    selectedWrap: { gap: 8, marginBottom: 8 },
    selectedCard: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBtn: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.primary,
    },
    qtyValue: { color: c.text, fontSize: 15, fontWeight: '700', minWidth: 18, textAlign: 'center' },
    lineTotal: { marginLeft: 'auto', color: c.primary, fontSize: 15, fontWeight: '800' },
    notesInput: {
      minHeight: 90,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
      marginBottom: 14,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    summaryText: { color: c.textMuted, fontSize: 13 },
    summaryAmount: { color: c.text, fontSize: 20, fontWeight: '800' },
    placeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 14,
      backgroundColor: c.primary,
      marginBottom: 10,
    },
    placeBtnText: { color: c.primaryText, fontSize: 15, fontWeight: '800' },
    disabled: { opacity: 0.7 },
    shopCard: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      gap: 4,
    },
    shopCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    shopCardTitle: { fontSize: 14, color: c.text, fontWeight: '700', flex: 1 },
    shopCardPrice: { fontSize: 17, color: c.primary, fontWeight: '800', lineHeight: 21 },
    shopCardType: { fontSize: 14, color: c.text, fontWeight: '700' },
    shopCardItem: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
    footerLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    footerText: { fontSize: 13, color: c.textMuted },
    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    separator: { height: 10 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
    stateText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, fontSize: 14, textAlign: 'center' },
    retryBtn: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    retryText: { color: c.primaryText, fontWeight: '700' },
  });
