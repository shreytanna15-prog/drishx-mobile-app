'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appAlert } from '@/lib/app-alert';

import { CustomerOrderGroupDetail } from '@/components/customer-order-group-detail';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { formatOrderDateTime, getStatusPillStyle, groupOrdersForList, type OrderListGroup } from '@/lib/order-list-display';
import { formatOrderStatusLabel, normalizeOrderStatus } from '@/lib/order-tracking';
import { cancelOrder, fetchOrders, type OrderRecord } from '@/lib/orders-api';


type FilterKey = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type FilterOption = {
  key: FilterKey;
  label: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
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

function ListOrderRow({
  group,
  onPress,
}: {
  group: OrderListGroup;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const productLabel = `${group.productCount} Product${group.productCount === 1 ? '' : 's'}`;
  const pairLabel = `${group.pairCount} Pair${group.pairCount === 1 ? '' : 's'}`;

  return (
    <Pressable style={styles.listRow} onPress={onPress}>
      <View style={styles.listTopRow}>
        <Text style={styles.listOrderId}>{group.displayOrderId}</Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: pillStyle.backgroundColor,
              borderColor: pillStyle.borderColor,
            },
          ]}>
          <Text style={[styles.statusPillText, { color: pillStyle.color }]}>{group.status.label}</Text>
        </View>
      </View>

      <Text style={styles.listCompany}>{group.companyName}</Text>
      <Text style={styles.listDate}>{formatOrderDateTime(group.createdAt)}</Text>

      {group.isPhotoOrder ? (
        <Text style={styles.photoOrderNote}>
          Photo order submitted · your order will be placed soon
        </Text>
      ) : (
        <View style={styles.listMetricsRow}>
          <Text style={styles.listMetricsText}>
            {productLabel} · {pairLabel}
          </Text>
          <Text style={styles.listAmount}>₹{group.totalAmount.toLocaleString('en-IN')}</Text>
        </View>
      )}

      {!group.isPhotoOrder && (group.readyProductCount > 0 || group.procurementProductCount > 0) && (
        <View style={styles.fulfillmentRow}>
          {group.readyProductCount > 0 ? (
            <View style={styles.readyPill}>
              <Text style={styles.readyPillText}>
                {group.readyProductCount} Ready
              </Text>
            </View>
          ) : null}
          {group.procurementProductCount > 0 ? (
            <View style={styles.procurementPill}>
              <Text style={styles.procurementPillText}>
                {group.procurementProductCount} Need Procurement
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export default function MyOrdersScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders, user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const orderGroups = useMemo(
    () => groupOrdersForList(orders, user?.businessName, 'Your company'),
    [orders, user?.businessName]
  );

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchOrders(getAuthHeaders());
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedGroup = useMemo(
    () =>
      selectedGroupKey ? orderGroups.find((entry) => entry.key === selectedGroupKey) ?? null : null,
    [orderGroups, selectedGroupKey]
  );

  useEffect(() => {
    if (selectedGroupKey && !selectedGroup) {
      setSelectedGroupKey(null);
    }
  }, [selectedGroup, selectedGroupKey]);

  const filteredGroups = useMemo(
    () => orderGroups.filter((group) => groupMatchesFilter(group, activeFilter)),
    [orderGroups, activeFilter]
  );

  function handleCancel(orderId: string) {
    appAlert('Cancel order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(orderId);
          try {
            await cancelOrder(orderId, getAuthHeaders());
            await loadOrders();
          } catch (err) {
            appAlert('Error', err instanceof Error ? err.message : 'Failed to cancel order.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  }

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
            <>
              <Text style={styles.screenTitle}>My Orders</Text>
              <Text style={styles.subtitle}>Track your lens orders</Text>
            </>
          )}
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading your orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadOrders}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : selectedGroup ? (
          <ScrollView
            contentContainerStyle={styles.detailContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadOrders();
                }}
                tintColor={colors.primary}
              />
            }>
            <CustomerOrderGroupDetail
              group={selectedGroup}
              onCancelOrder={handleCancel}
              cancellingId={cancellingId}
            />
          </ScrollView>
        ) : (
          <>
            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((option) => {
                const isActive = option.key === activeFilter;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(option.key)}>
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <FlatList
              data={filteredGroups}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadOrders();
                  }}
                  tintColor={colors.primary}
                />
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
    paddingBottom: 12,
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
  subtitle: { marginTop: 4, fontSize: 14, color: c.textMuted },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  filterChipActive: {
    borderColor: c.primary,
    backgroundColor: 'rgba(240, 161, 50, 0.15)',
  },
  filterChipText: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  listRow: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    gap: 6,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  listOrderId: {
    color: c.text,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listCompany: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  listDate: {
    color: c.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  listMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  listMetricsText: {
    color: c.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  listAmount: {
    color: c.text,
    fontSize: 16,
    fontWeight: '800',
  },
  photoOrderNote: {
    color: c.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  readyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  readyPillText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  procurementPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  procurementPillText: {
    color: c.danger,
    fontSize: 11,
    fontWeight: '700',
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
