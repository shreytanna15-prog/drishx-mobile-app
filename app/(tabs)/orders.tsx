'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { formatOrderDateTime, getStatusPillStyle, groupOrdersForList, type OrderListGroup } from '@/lib/order-list-display';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';

const GOLD = BrandColors.primary;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

type StaffOrderFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

const FILTERS: { key: StaffOrderFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

function isInProgressStatus(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized !== 'COMPLETED' && normalized !== 'CANCELLED';
}

function groupMatchesStaffFilter(group: OrderListGroup, filter: StaffOrderFilter): boolean {
  if (filter === 'ALL') {
    return true;
  }
  if (filter === 'COMPLETED') {
    return group.orders.some((order) => normalizeOrderStatus(order.status) === 'COMPLETED');
  }
  return group.orders.some((order) => isInProgressStatus(order.status));
}

function OrderListRow({ group, onPress }: { group: OrderListGroup; onPress: () => void }) {
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

      <View style={styles.listMetricsRow}>
        <Text style={styles.listMetricsText}>
          {productLabel} · {pairLabel}
        </Text>
        <Text style={styles.listAmount}>₹{group.totalAmount.toLocaleString('en-IN')}</Text>
      </View>

      {(group.readyProductCount > 0 || group.procurementProductCount > 0) && (
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

export default function EmployeeOrdersScreen() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StaffOrderFilter>('ALL');

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

  const orderGroups = useMemo(() => groupOrdersForList(orders), [orders]);

  const filteredGroups = useMemo(
    () => orderGroups.filter((group) => groupMatchesStaffFilter(group, activeFilter)),
    [orderGroups, activeFilter]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Orders</Text>
          <Text style={styles.subtitle}>Manage and update customer orders</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.stateText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadOrders}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
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
                tintColor={GOLD}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="receipt-long" size={48} color={BrandColors.textMuted} />
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.stateText}>Try switching filters or refresh the list.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <OrderListRow
                group={item}
                onPress={() =>
                  router.push({
                    pathname: '/order-details',
                    params: { id: item.orders[0].id, groupKey: item.key },
                  } as never)
                }
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  screenTitle: { fontSize: 30, fontWeight: '800', color: BrandColors.text },
  subtitle: { marginTop: 4, fontSize: 14, color: BrandColors.textMuted },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 6, marginBottom: 8, gap: 10 },
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
  filterChipText: { color: BrandColors.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: GOLD, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  listRow: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    gap: 6,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  listOrderId: { color: BrandColors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  listCompany: { color: BrandColors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  listDate: { color: BrandColors.textMuted, fontSize: 12, marginTop: 2 },
  listMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  listMetricsText: { color: BrandColors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  listAmount: { color: BrandColors.text, fontSize: 16, fontWeight: '800' },
  fulfillmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  readyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  readyPillText: { color: '#4ade80', fontSize: 11, fontWeight: '700' },
  procurementPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  procurementPillText: { color: '#f87171', fontSize: 11, fontWeight: '700' },
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
