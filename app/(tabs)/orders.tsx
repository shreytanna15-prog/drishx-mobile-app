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
import { formatOrderStatusLabel, normalizeOrderStatus } from '@/lib/order-tracking';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';

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

function CompactOrderRow({ order, onPress }: { order: OrderRecord; onPress: () => void }) {
  const status = normalizeOrderStatus(order.status);
  const customerName = order.user?.name?.trim() || order.user?.email || 'Customer';
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount || 0);
  const shortId = order.id.slice(-7).toUpperCase();
  const dateLabel = new Date(order.createdAt).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Pressable style={styles.rowCard} onPress={onPress}>
      <View style={styles.rowTop}>
        <View style={styles.rowTopLeft}>
          <Text style={styles.rowName}>{customerName}</Text>
          <Text style={styles.rowSub}>{lensLabel}</Text>
        </View>
        <Text style={styles.rowAmount}>Rs {total}</Text>
      </View>

      <View style={styles.rowBottom}>
        <Text style={styles.rowOrderId}>#DRX{shortId}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{formatOrderStatusLabel(status)}</Text>
        </View>
      </View>

      <View style={styles.rowMeta}>
        <Text style={styles.rowDate}>{dateLabel}</Text>
        <MaterialIcons name="chevron-right" size={18} color={BrandColors.textMuted} />
      </View>
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

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') {
      return orders;
    }
    if (activeFilter === 'COMPLETED') {
      return orders.filter((order) => normalizeOrderStatus(order.status) === 'COMPLETED');
    }
    return orders.filter((order) => isInProgressStatus(order.status));
  }, [activeFilter, orders]);

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
            <ActivityIndicator size="large" color={BrandColors.primary} />
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
                tintColor={BrandColors.primary}
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
              <CompactOrderRow
                order={item}
                onPress={() => router.push({ pathname: '/order-details', params: { id: item.id } } as never)}
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    backgroundColor: BrandColors.card,
  },
  filterChipActive: {
    borderColor: BrandColors.primary,
    backgroundColor: 'rgba(242, 170, 76, 0.12)',
  },
  filterChipText: { color: BrandColors.textMuted, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: BrandColors.primary },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  rowCard: {
    backgroundColor: BrandColors.card,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    borderRadius: 14,
    padding: 12,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTopLeft: { flex: 1, paddingRight: 10 },
  rowName: { color: BrandColors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: BrandColors.textMuted, fontSize: 13, marginTop: 2 },
  rowAmount: { color: BrandColors.primary, fontWeight: '800', fontSize: 20 },
  rowBottom: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowOrderId: { color: BrandColors.textMuted, fontSize: 12, fontWeight: '600' },
  statusPill: {
    backgroundColor: 'rgba(242, 170, 76, 0.14)',
    borderColor: BrandColors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: { color: BrandColors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  rowMeta: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowDate: { color: BrandColors.textMuted, fontSize: 12 },
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
    backgroundColor: BrandColors.primary,
  },
  retryText: { color: '#111', fontWeight: '700' },
});
