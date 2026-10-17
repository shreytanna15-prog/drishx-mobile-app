'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryLoadMoreFooter } from '@/components/query-list-states';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  DEFAULT_INVOICE_SORT,
  filterAndSortInvoices,
  invoiceDateFilterToRange,
  INVOICE_DATE_FILTERS,
  INVOICE_SORT_OPTIONS,
  INVOICE_STATUS_FILTERS,
  type InvoiceDateFilter,
  type InvoiceRecord,
  type InvoiceSortOption,
  type InvoiceStatusFilter,
} from '@/lib/invoices-api';
import { usePaginatedListState } from '@/lib/hooks/use-paginated-list-state';
import { useGetInvoices } from '@/lib/modules/invoices/query/use-get-invoices';
import { useBrandColors } from '@/lib/theme-provider';

const PAGE_SIZE = 20;

function formatAmount(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN');
}

type InvoicesStyles = ReturnType<typeof createStyles>;

function InvoiceRow({
  item,
  onPress,
  styles,
}: {
  item: InvoiceRecord;
  onPress: () => void;
  styles: InvoicesStyles;
}) {
  const statusPaid = item.status === 'PAID';
  return (
    <Pressable style={styles.invoiceRow} onPress={onPress}>
      <View style={styles.invoiceLeft}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
        <Text style={styles.invoiceDate}>
          {new Date(item.issuedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <Text style={styles.invoiceAmount}>₹{formatAmount(item.amount)}</Text>
      <View style={[styles.statusBadge, statusPaid ? styles.paidBadge : styles.unpaidBadge]}>
        <Text style={[styles.statusText, statusPaid ? styles.paidText : styles.unpaidText]}>
          {statusPaid ? 'Paid' : 'Unpaid'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function InvoicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<InvoiceSortOption>(DEFAULT_INVOICE_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const serverStatus =
    statusFilter === 'ALL' || statusFilter === 'UNPAID' ? undefined : statusFilter;
  const dateRange = invoiceDateFilterToRange(dateFilter);

  const listResetKey = `${statusFilter}|${dateFilter}|${debouncedQ}`;
  const { page, setPage, items, onPageSuccess } =
    usePaginatedListState<InvoiceRecord>(listResetKey);

  const { data, loading, refreshing, error, refetch } = useGetInvoices(
    {
      page,
      limit: PAGE_SIZE,
      status: serverStatus,
      q: debouncedQ || undefined,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    },
    { onSuccess: onPageSuccess }
  );

  const filtered = useMemo(
    () =>
      filterAndSortInvoices(items, {
        status: statusFilter === 'UNPAID' ? 'UNPAID' : 'ALL',
        date: 'ALL',
        search: '',
        sort,
      }),
    [items, statusFilter, sort]
  );

  const dateLabel =
    INVOICE_DATE_FILTERS.find((entry) => entry.key === dateFilter)?.label ?? 'All dates';
  const extraFilterCount = (dateFilter !== 'ALL' ? 1 : 0) + (sort !== DEFAULT_INVOICE_SORT ? 1 : 0);
  const filtersActive =
    statusFilter !== 'ALL' || dateFilter !== 'ALL' || searchQuery.trim().length > 0;
  const emptyMessage =
    items.length === 0
      ? 'No invoices found.'
      : filtersActive || extraFilterCount > 0
        ? 'No invoices match these filters.'
        : 'No invoices found.';
  const hasMore = Boolean(data?.hasMore);
  const showInitialLoading = loading && page === 1 && items.length === 0;

  function resetExtraFilters() {
    setDateFilter('ALL');
    setSort(DEFAULT_INVOICE_SORT);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Invoices</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.filters}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search invoices..."
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              style={[styles.iconBtn, extraFilterCount > 0 && styles.iconBtnActive]}
              onPress={() => setFiltersOpen(true)}
              accessibilityLabel="Date and sort filters">
              <MaterialIcons
                name="tune"
                size={20}
                color={extraFilterCount > 0 ? colors.primary : colors.text}
              />
              {extraFilterCount > 0 ? (
                <View style={styles.iconBadge}>
                  <Text style={styles.iconBadgeText}>{extraFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.segment}>
            {INVOICE_STATUS_FILTERS.map((entry) => {
              const active = entry.key === statusFilter;
              return (
                <Pressable
                  key={entry.key}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setStatusFilter(entry.key)}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {entry.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!showInitialLoading && !error ? (
            <View style={styles.metaRow}>
              <Text style={styles.countHint} numberOfLines={1}>
                {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
                {dateFilter !== 'ALL' ? ` · ${dateLabel}` : ''}
                {hasMore ? ' · load more' : ''}
              </Text>
              {extraFilterCount > 0 ? (
                <Pressable onPress={resetExtraFilters} hitSlop={8}>
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {showInitialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Loading invoices...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error.message}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setPage(1);
                void refetch();
              }}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing && page === 1}
                onRefresh={() => {
                  setPage(1);
                  void refetch();
                }}
                tintColor={colors.primary}
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasMore && !loading && !refreshing) {
                setPage((p) => p + 1);
              }
            }}
            ListFooterComponent={
              <QueryLoadMoreFooter
                hasMore={hasMore}
                loading={hasMore && (loading || refreshing) && page > 1}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.helperText}>{emptyMessage}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <InvoiceRow
                item={item}
                styles={styles}
                onPress={() =>
                  router.push({
                    pathname: '/invoice-details' as never,
                    params: { id: item.id },
                  })
                }
              />
            )}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFiltersOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Pressable onPress={() => setFiltersOpen(false)} hitSlop={8} style={styles.headerBtn}>
                <MaterialIcons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.sheetSection}>Date</Text>
            <View style={styles.sheetChipWrap}>
              {INVOICE_DATE_FILTERS.map((entry) => {
                const active = entry.key === dateFilter;
                return (
                  <Pressable
                    key={entry.key}
                    style={[styles.sheetChip, active && styles.sheetChipActive]}
                    onPress={() => setDateFilter(entry.key)}>
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetSection}>Sort</Text>
            {INVOICE_SORT_OPTIONS.map((option) => {
              const selected = option.value === sort;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.sortOption, selected && styles.sortOptionSelected]}
                  onPress={() => setSort(option.value)}>
                  <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}

            <View style={styles.sheetActions}>
              <Pressable
                style={styles.sheetSecondary}
                onPress={() => {
                  resetExtraFilters();
                }}>
                <Text style={styles.sheetSecondaryText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.sheetPrimary} onPress={() => setFiltersOpen(false)}>
                <Text style={styles.sheetPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingVertical: 10,
    },
    headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    filters: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}14`,
    },
    iconBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    iconBadgeText: { color: c.primaryText, fontSize: 9, fontWeight: '800' },
    segment: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 3,
    },
    segmentItem: {
      flex: 1,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentItemActive: { backgroundColor: c.primary },
    segmentText: { color: c.textMuted, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: c.primaryText, fontWeight: '800' },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    countHint: { flex: 1, color: c.textMuted, fontSize: 12, fontWeight: '600' },
    resetText: { color: c.primary, fontSize: 12, fontWeight: '800' },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    invoiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 12,
      gap: 10,
    },
    invoiceLeft: { flex: 1 },
    invoiceNumber: { color: c.text, fontSize: 16, fontWeight: '700' },
    invoiceDate: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    invoiceAmount: { color: c.text, fontSize: 17, fontWeight: '700' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    paidBadge: { backgroundColor: '#134e32' },
    unpaidBadge: { backgroundColor: '#4a2d11' },
    statusText: { fontSize: 12, fontWeight: '700' },
    paidText: { color: '#86efac' },
    unpaidText: { color: '#fdba74' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
    helperText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, textAlign: 'center', fontSize: 14 },
    retryButton: {
      marginTop: 6,
      borderRadius: 10,
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.cardElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(240, 161, 50, 0.35)',
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    sheetSection: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 8,
    },
    sheetChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sheetChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    sheetChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    sheetChipText: { color: c.textMuted, fontSize: 13, fontWeight: '700' },
    sheetChipTextActive: { color: c.primary, fontWeight: '800' },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 8,
    },
    sortOptionSelected: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}14`,
    },
    sortOptionText: { color: c.text, fontSize: 15, fontWeight: '600' },
    sortOptionTextSelected: { color: c.primary, fontWeight: '800' },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    sheetSecondary: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetSecondaryText: { color: c.text, fontSize: 15, fontWeight: '700' },
    sheetPrimary: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetPrimaryText: { color: c.primaryText, fontSize: 15, fontWeight: '800' },
  });
