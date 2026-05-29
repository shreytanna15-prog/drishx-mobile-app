'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderTrackingTimeline } from '@/components/order-tracking-timeline';
import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { formatOrderStatusLabel, normalizeOrderStatus } from '@/lib/order-tracking';
import { cancelOrder, fetchOrders, getOrderLensDetails, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

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

function formatOrderDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

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

function ListOrderRow({
  order,
  onPress,
}: {
  order: OrderRecord;
  onPress: () => void;
}) {
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount);
  const status = normalizeOrderStatus(order.status);
  const statusLabel = formatOrderStatusLabel(status);
  const isProcurement = status === 'AWAITING_PROCUREMENT';

  return (
    <Pressable style={styles.listRow} onPress={onPress}>
      <View style={styles.listRowLeft}>
        <View style={styles.listIconWrap}>
          <MaterialIcons
            name={status === 'CANCELLED' ? 'cancel' : 'inventory'}
            size={15}
            color={status === 'CANCELLED' ? '#f87171' : GOLD}
          />
        </View>
        <View style={styles.listMeta}>
          <Text style={styles.listOrderId}>#{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.listLensType}>{lensLabel}</Text>
          <Text style={styles.listDate}>{formatOrderDate(order.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.listRowRight}>
        <Text style={styles.listAmount}>₹{total.toLocaleString('en-IN')}</Text>
        <Text style={[styles.listStatus, isProcurement && styles.listStatusProcurement]}>
          {statusLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function DetailOrderCard({
  order,
  onCancel,
  cancelling,
}: {
  order: OrderRecord;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount);
  const status = normalizeOrderStatus(order.status);
  const canCancel = status === 'PENDING' || status === 'AWAITING_PROCUREMENT';
  const isProcurement = status === 'AWAITING_PROCUREMENT';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderTitle}>{lensLabel}</Text>
          <Text style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.totalText}>₹{total}</Text>
      </View>

      {details ? (
        <Text style={styles.specText}>
          SPH {details.sph} · CYL {details.cyl ?? '—'}
          {'add' in details && details.add !== undefined && ` · ADD ${details.add}`}
          {'eye' in details && details.eye ? ` · ${details.eye}` : ''}
        </Text>
      ) : null}

      <Text style={styles.qtyText}>Quantity: {order.quantity}</Text>

      {isProcurement ? (
        <View style={styles.procurementBanner}>
          <MaterialIcons name="local-shipping" size={18} color="#2563eb" />
          <Text style={styles.procurementBannerText}>
            Your order is in procurement. We are sourcing this product and will update you when it is
            available.
          </Text>
        </View>
      ) : null}

      {order.notes?.trim() ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Order notes</Text>
          <Text style={styles.notesText}>{order.notes.trim()}</Text>
        </View>
      ) : null}

      <Text style={styles.trackingTitle}>Order tracking</Text>
      <OrderTrackingTimeline status={order.status} />

      {canCancel && (
        <Pressable
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={cancelling}>
          {cancelling ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <Text style={styles.cancelText}>Cancel order</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function MyOrdersScreen() {
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders.find((entry) => entry.id === selectedOrderId) ?? null : null),
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (selectedOrderId && !selectedOrder) {
      setSelectedOrderId(null);
    }
  }, [selectedOrder, selectedOrderId]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesFilter(order, activeFilter)),
    [orders, activeFilter]
  );

  function handleCancel(orderId: string) {
    Alert.alert('Cancel order', 'Are you sure you want to cancel this order?', [
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
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel order.');
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
          {selectedOrder ? (
            <View style={styles.detailHeaderRow}>
              <Pressable onPress={() => setSelectedOrderId(null)} style={styles.backButton} hitSlop={10}>
                <MaterialIcons name="arrow-back" size={22} color={GOLD} />
              </Pressable>
              <Text style={styles.detailHeaderTitle}>Order #{selectedOrder.id.slice(-8).toUpperCase()}</Text>
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
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.stateText}>Loading your orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadOrders}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : selectedOrder ? (
          <ScrollView
            contentContainerStyle={styles.detailContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadOrders();
                }}
                tintColor={GOLD}
              />
            }>
            <DetailOrderCard
              order={selectedOrder}
              onCancel={() => handleCancel(selectedOrder.id)}
              cancelling={cancellingId === selectedOrder.id}
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
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadOrders();
                  }}
                  tintColor={GOLD}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.centeredState}>
                  <MaterialIcons name="receipt-long" size={48} color={BrandColors.textMuted} />
                  <Text style={styles.emptyTitle}>No orders in this section</Text>
                  <Text style={styles.stateText}>Try another filter or place a new order from Shop.</Text>
                </View>
              }
              renderItem={({ item }) => <ListOrderRow order={item} onPress={() => setSelectedOrderId(item.id)} />}
            />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: BrandColors.text },
  subtitle: { marginTop: 4, fontSize: 14, color: BrandColors.textMuted },
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
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  filterChipActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(240, 161, 50, 0.15)',
  },
  filterChipText: {
    fontSize: 12,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: GOLD,
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  listIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  listMeta: { flex: 1 },
  listOrderId: { color: BrandColors.text, fontSize: 15, fontWeight: '700' },
  listLensType: { color: BrandColors.textMuted, fontSize: 12, marginTop: 2 },
  listDate: { color: BrandColors.label, fontSize: 11, marginTop: 2 },
  listRowRight: { alignItems: 'flex-end', gap: 4 },
  listAmount: { color: BrandColors.text, fontSize: 15, fontWeight: '700' },
  listStatus: { color: GOLD, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  listStatusProcurement: { color: '#60a5fa' },
  procurementBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.35)',
  },
  procurementBannerText: {
    flex: 1,
    color: '#93c5fd',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  detailContent: { paddingHorizontal: 16, paddingBottom: 24 },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderHeaderLeft: { flex: 1, paddingRight: 12 },
  orderTitle: { color: BrandColors.text, fontSize: 24, fontWeight: '700' },
  orderId: { fontSize: 12, color: BrandColors.label, marginTop: 2 },
  orderDate: { fontSize: 12, color: BrandColors.label, marginTop: 2 },
  totalText: { fontSize: 30, fontWeight: '800', color: GOLD },
  specText: { fontSize: 14, color: BrandColors.textMuted, marginBottom: 4 },
  qtyText: { fontSize: 13, color: BrandColors.textMuted, marginBottom: 8 },
  notesBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: BrandColors.text,
    lineHeight: 20,
  },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
    alignItems: 'center',
  },
  cancelText: { color: GOLD, fontWeight: '700', fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  separator: { height: 12 },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: BrandColors.text },
  stateText: { fontSize: 15, color: BrandColors.textMuted, textAlign: 'center' },
  errorText: { fontSize: 15, color: '#f87171', textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: GOLD,
  },
  retryText: { color: BrandColors.primaryText, fontWeight: '700' },
});
