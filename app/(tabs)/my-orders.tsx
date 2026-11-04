'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomerOrderGroupDetail } from '@/components/customer-order-group-detail';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import {
  formatOrderDateTime,
  getStatusPillStyle,
  groupOrdersForList,
  shouldShowOrderReadyProgress,
  type OrderCardStatusVariant,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { usePaginatedListState } from '@/lib/hooks/use-paginated-list-state';
import { useGetOrders } from '@/lib/modules/orders/query/use-get-orders';
import { useGetOrderGroup } from '@/lib/modules/orders/query/use-get-order-group';
import type { OrderRecord } from '@/lib/orders-api';
import { onOfflineSyncComplete } from '@/lib/offline-sync';
import { appAlert } from '@/lib/app-alert';

type FilterKey = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type FilterOption = {
  key: FilterKey;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'ALL', label: 'All Orders', icon: 'format-list-bulleted' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: 'schedule' },
  { key: 'COMPLETED', label: 'Completed', icon: 'check-circle-outline' },
  { key: 'CANCELLED', label: 'Cancelled', icon: 'cancel' },
];

function isInProgressStatus(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return (
    normalized === 'PENDING' ||
    normalized === 'PICKING' ||
    normalized === 'PACKED' ||
    normalized === 'DISPATCHED' ||
    normalized === 'PARTIALLY_FULFILLED' ||
    normalized === 'AWAITING_PROCUREMENT'
  );
}

function orderMatchesFilter(order: OrderRecord, filter: FilterKey): boolean {
  const normalized = normalizeOrderStatus(order.status);
  if (filter === 'ALL') return true;
  if (filter === 'COMPLETED') return normalized === 'COMPLETED';
  if (filter === 'CANCELLED') return normalized === 'CANCELLED';
  return isInProgressStatus(normalized);
}

function groupMatchesFilter(group: OrderListGroup, filter: FilterKey): boolean {
  return group.orders.some((order) => orderMatchesFilter(order, filter));
}

function accentForVariant(variant: OrderCardStatusVariant): string {
  switch (variant) {
    case 'ready':
      return '#22C55E';
    case 'completed':
      return '#16A34A';
    case 'procurement':
      return '#EF4444';
    case 'partial':
      return '#14B8A6';
    case 'cancelled':
      return '#9CA3AF';
    case 'progress':
    default:
      return '#F0A132';
  }
}

function iconForVariant(variant: OrderCardStatusVariant): keyof typeof MaterialIcons.glyphMap {
  switch (variant) {
    case 'ready':
    case 'completed':
      return 'shopping-bag';
    case 'procurement':
      return 'inventory';
    case 'partial':
      return 'pending-actions';
    case 'cancelled':
      return 'remove-shopping-cart';
    default:
      return 'assignment';
  }
}

async function copyOrderId(orderId: string) {
  try {
    await Clipboard.setStringAsync(orderId);
    appAlert('Copied', `${orderId} copied to clipboard.`);
  } catch {
    appAlert('Order ID', orderId);
  }
}

function ListOrderRow({
  group,
  onPress,
}: {
  group: OrderListGroup;
  onPress: () => void;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const accent = accentForVariant(group.status.variant);
  const productLabel = `${group.productCount} Product${group.productCount === 1 ? '' : 's'}`;
  const pairLabel = `${group.pairCount} Pair${group.pairCount === 1 ? '' : 's'}`;
  const readyTotal =
    group.productCount > 0
      ? group.productCount
      : Math.max(group.readyProductCount + group.procurementProductCount, 1);
  const readyCount = group.readyProductCount;
  const progress =
    group.isPhotoOrder || readyTotal <= 0 ? 0 : Math.min(1, readyCount / readyTotal);
  const showProgress = shouldShowOrderReadyProgress(group);

  return (
    <Pressable style={styles.listRow} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.orderIconWrap, { backgroundColor: `${accent}22` }]}>
          <MaterialIcons name={iconForVariant(group.status.variant)} size={20} color={accent} />
        </View>

        <View style={styles.cardTopMain}>
          <View style={styles.orderIdRow}>
            <Text style={styles.listOrderId} numberOfLines={1}>
              {group.displayOrderId}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                void copyOrderId(group.displayOrderId);
              }}
              accessibilityLabel="Copy order ID">
              <MaterialIcons name="content-copy" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.listCompany} numberOfLines={1}>
            {group.companyName}
          </Text>
        </View>

        <View style={styles.cardTopRight}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: pillStyle.backgroundColor,
                borderColor: pillStyle.borderColor,
              },
            ]}>
            <MaterialIcons
              name={
                group.status.variant === 'ready' || group.status.variant === 'completed'
                  ? 'check-circle'
                  : group.status.variant === 'procurement'
                    ? 'radio-button-unchecked'
                    : 'fiber-manual-record'
              }
              size={11}
              color={pillStyle.color}
            />
            <Text style={[styles.statusPillText, { color: pillStyle.color }]}>
              {group.status.label}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </View>

      {group.isPhotoOrder ? (
        <Text style={styles.photoOrderNote}>
          Image attached · our team will follow up
        </Text>
      ) : (
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <View style={styles.metaLine}>
              <MaterialIcons name="calendar-today" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatOrderDateTime(group.createdAt)}</Text>
            </View>
            <View style={styles.metaLine}>
              <MaterialIcons name="inventory-2" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {productLabel} • {pairLabel}
              </Text>
            </View>
          </View>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.listAmount}>₹{group.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      )}

      {(() => {
        const withDelivery = group.orders.filter((o) => o.delivery || o.deliveryService);
        if (withDelivery.length === 0) return null;
        return (
          <View style={styles.metaRow}>
            <MaterialIcons name="local-shipping" size={13} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={2}>
              {withDelivery
                .map((o) =>
                  o.delivery
                    ? `${o.deliveryService?.serviceName ?? 'Delivery'} · ₹${Number(o.delivery.customerCharge).toLocaleString('en-IN')}`
                    : `${o.deliveryService?.serviceName ?? 'Delivery'} · charge after packing`
                )
                .join(' | ')}
            </Text>
          </View>
        );
      })()}

      {showProgress ? (
        <View style={styles.progressFooter}>
          <View style={styles.progressLeft}>
            <MaterialIcons name="visibility" size={16} color={colors.textMuted} />
            <Text style={styles.progressText}>
              {readyCount} / {readyTotal} Ready
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: progress >= 1 ? '#22C55E' : accent,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const IN_PROGRESS_STATUS =
  'PENDING,PICKING,PACKED,DISPATCHED,PARTIALLY_FULFILLED,AWAITING_PROCUREMENT';

function statusParamForFilter(filter: FilterKey): string | undefined {
  if (filter === 'ALL') return undefined;
  if (filter === 'COMPLETED') return 'COMPLETED';
  if (filter === 'CANCELLED') return 'CANCELLED';
  return IN_PROGRESS_STATUS;
}

export default function MyOrdersScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const listResetKey = `${activeFilter}|${debouncedQ}`;
  const { page, setPage, items, setItems, onPageSuccess } =
    usePaginatedListState<OrderRecord>(listResetKey);

  const { data, loading, refreshing, error, refetch } = useGetOrders(
    {
      page,
      limit: 20,
      status: statusParamForFilter(activeFilter),
      q: debouncedQ || undefined,
    },
    { onSuccess: onPageSuccess }
  );

  const orderGroups = useMemo(
    () => groupOrdersForList(items, user?.businessName, 'Your company'),
    [items, user?.businessName]
  );

  const {
    data: detailOrders = [],
    loading: detailLoading,
    refreshing: detailRefreshing,
    error: detailError,
    refetch: refetchDetail,
  } = useGetOrderGroup(selectedGroupKey ?? undefined);

  useEffect(() => {
    return onOfflineSyncComplete(() => {
      setPage(1);
      setItems([]);
      void refetch();
      if (selectedGroupKey) void refetchDetail();
    });
  }, [refetch, refetchDetail, selectedGroupKey, setPage, setItems]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupKey) return null;
    if (detailOrders.length > 0) {
      return (
        groupOrdersForList(detailOrders, user?.businessName, 'Your company')[0] ?? null
      );
    }
    return orderGroups.find((entry) => entry.key === selectedGroupKey) ?? null;
  }, [selectedGroupKey, detailOrders, orderGroups, user?.businessName]);

  // Server already filtered by status/q; keep group-level match for multi-line batches.
  const filteredGroups = useMemo(
    () => orderGroups.filter((group) => groupMatchesFilter(group, activeFilter)),
    [orderGroups, activeFilter]
  );

  const hasMore = Boolean(data?.hasMore);
  const showInitialLoading = loading && page === 1 && items.length === 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          {selectedGroup ? (
            <View style={styles.detailHeaderRow}>
              <Pressable onPress={() => setSelectedGroupKey(null)} style={styles.backButton} hitSlop={10}>
                <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
              </Pressable>
              <Text style={styles.detailHeaderTitle}>{selectedGroup.displayOrderId}</Text>
              <View style={styles.backButton} />
            </View>
          ) : (
            <View style={styles.headerTopRow}>
              <View style={styles.headerTextCol}>
                <Text style={styles.screenTitle}>My Orders</Text>
                <Text style={styles.subtitle}>Track, manage & reorder your lens orders</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={[styles.headerIconBtn, searchOpen && styles.headerIconBtnActive]}
                  onPress={() => setSearchOpen((open) => !open)}
                  accessibilityLabel="Search orders">
                  <MaterialIcons name="search" size={20} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {showInitialLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading your orders...</Text>
          </View>
        ) : error && items.length === 0 ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color={colors.danger} />
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
        ) : selectedGroupKey && (detailLoading || detailError) && !selectedGroup ? (
          <View style={styles.centeredState}>
            {detailLoading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.stateText}>Loading order…</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="error-outline" size={48} color={colors.danger} />
                <Text style={styles.errorText}>
                  {detailError?.message ?? 'Failed to load order.'}
                </Text>
                <Pressable style={styles.retryButton} onPress={() => void refetchDetail()}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : selectedGroup ? (
          <ScrollView
            contentContainerStyle={styles.detailContent}
            refreshControl={
              <RefreshControl
                refreshing={detailRefreshing}
                onRefresh={() => {
                  void refetchDetail();
                }}
                tintColor={colors.primary}
              />
            }>
            <CustomerOrderGroupDetail
              group={selectedGroup}
              getAuthHeaders={getAuthHeaders}
              onAlternateChanged={() => {
                void refetchDetail();
                setPage(1);
                void refetch();
              }}
            />
          </ScrollView>
        ) : (
          <>
            {searchOpen ? (
              <View style={styles.searchWrap}>
                <MaterialIcons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by order ID or company"
                  placeholderTextColor={colors.placeholder}
                  style={styles.searchInput}
                  autoFocus
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <MaterialIcons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.filterWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}>
                {FILTER_OPTIONS.map((option) => {
                  const isActive = option.key === activeFilter;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setActiveFilter(option.key)}>
                      <MaterialIcons
                        name={option.icon}
                        size={15}
                        color={isActive ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <FlatList
              data={filteredGroups}
              keyExtractor={(item) => item.key}
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
              onEndReached={() => {
                if (hasMore && !loading && !refreshing) {
                  setPage((p) => p + 1);
                }
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                hasMore && (loading || refreshing) && page > 1 ? (
                  <View style={styles.loadMoreFooter}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.centeredState}>
                  <MaterialIcons name="receipt-long" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No orders in this section</Text>
                  <Text style={styles.stateText}>Try another filter or place a new order from Shop.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <ListOrderRow group={item} onPress={() => setSelectedGroupKey(item.key)} />
              )}
            />
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
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerTextCol: { flex: 1, paddingRight: 4 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    headerIconBtnActive: {
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
    },
    detailHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailHeaderTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: '700',
    },
    screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: c.text },
    subtitle: { marginTop: 4, fontSize: 13, color: c.textMuted, lineHeight: 18 },
    searchWrap: {
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      color: c.text,
      fontSize: 14,
      padding: 0,
    },
    filterWrap: {
      flexGrow: 0,
      flexShrink: 0,
      marginBottom: 10,
      paddingTop: 2,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 4,
      minHeight: 48,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
    },
    filterChipText: {
      fontSize: 12,
      lineHeight: 16,
      color: c.textMuted,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: c.primary,
      fontWeight: '700',
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    loadMoreFooter: { paddingVertical: 16, alignItems: 'center' },
    listRow: {
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      gap: 12,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    orderIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTopMain: { flex: 1, minWidth: 0, gap: 2 },
    orderIdRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    listOrderId: {
      color: c.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    listCompany: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    cardTopRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    metaLeft: { flex: 1, gap: 6, minWidth: 0 },
    metaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '500',
      flexShrink: 1,
    },
    amountBlock: { alignItems: 'flex-end' },
    amountLabel: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 2,
    },
    listAmount: {
      color: c.text,
      fontSize: 17,
      fontWeight: '800',
    },
    photoOrderNote: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    progressFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      backgroundColor: c.menuRowAlt,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    progressLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    progressText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(148, 163, 184, 0.25)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    detailContent: { paddingHorizontal: 16, paddingBottom: 32 },
    separator: { height: 12 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
      gap: 8,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text },
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
