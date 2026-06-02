'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
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

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { formatOrderDateTime, getStatusPillStyle, groupOrdersForList, type OrderListGroup } from '@/lib/order-list-display';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { resolvePhotoOrderImageUrl } from '@/lib/photo-orders-api';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';


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
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const photoUri =
    group.isPhotoOrder && group.photoUrl ? resolvePhotoOrderImageUrl(group.photoUrl) : null;

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
        <>
          <Text style={styles.photoOrderNote}>Prescription photo order · details in image</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoThumb} contentFit="cover" />
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.listMetricsRow}>
            <Text style={styles.listMetricsText}>
              {group.productCount} Product{group.productCount === 1 ? '' : 's'} · {group.pairCount}{' '}
              Pair{group.pairCount === 1 ? '' : 's'}
            </Text>
            <Text style={styles.listAmount}>₹{group.totalAmount.toLocaleString('en-IN')}</Text>
          </View>

          {(group.readyProductCount > 0 || group.procurementProductCount > 0) && (
            <View style={styles.fulfillmentRow}>
              {group.readyProductCount > 0 ? (
                <View style={styles.readyPill}>
                  <Text style={styles.readyPillText}>{group.readyProductCount} Ready</Text>
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
        </>
      )}
    </Pressable>
  );
}

export default function EmployeeOrdersScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
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
          <View style={styles.headerTopRow}>
            <Text style={styles.screenTitle}>Orders</Text>
            <Pressable
              style={styles.newOrderButton}
              onPress={() => router.push('/employee-order-on-behalf')}
              accessibilityRole="button">
              <MaterialIcons name="add-shopping-cart" size={18} color={colors.primaryText} />
              <Text style={styles.newOrderButtonText}>Order on Behalf</Text>
            </Pressable>
          </View>
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color={colors.danger} />
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
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="receipt-long" size={48} color={colors.textMuted} />
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

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  screenTitle: { fontSize: 30, fontWeight: '800', color: c.text },
  subtitle: { marginTop: 4, fontSize: 14, color: c.textMuted },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.primary,
  },
  newOrderButtonText: { color: c.primaryText, fontSize: 12, fontWeight: '700' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 6, marginBottom: 8, gap: 10 },
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
  filterChipText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: c.primary, fontWeight: '700' },
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
  listOrderId: { color: c.text, fontSize: 17, fontWeight: '800', flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  listCompany: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  listDate: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  listMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  listMetricsText: { color: c.text, fontSize: 13, fontWeight: '600', flex: 1 },
  listAmount: { color: c.text, fontSize: 16, fontWeight: '800' },
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
  procurementPillText: { color: c.danger, fontSize: 11, fontWeight: '700' },
  photoOrderNote: { color: c.textMuted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  photoThumb: {
    marginTop: 10,
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
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
