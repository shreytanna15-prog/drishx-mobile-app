'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmployeeOrderGroupDetail } from '@/components/employee-order-group-detail';
import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { groupOrdersForList } from '@/lib/order-list-display';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import { fetchOrders, updateOrderStatus } from '@/lib/orders-api';

const GOLD = BrandColors.primary;

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; groupKey?: string | string[] }>();
  const orderIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupKeyParam = Array.isArray(params.groupKey) ? params.groupKey[0] : params.groupKey;
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof fetchOrders>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!orderIdParam) {
      setError('Invalid order id.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchOrders(getAuthHeaders());
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, orderIdParam]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const orderGroup = useMemo(() => {
    if (!orderIdParam && !groupKeyParam) {
      return null;
    }

    const targetKey =
      groupKeyParam ||
      orders.find((order) => order.id === orderIdParam)?.checkoutBatchId?.trim() ||
      orderIdParam;

    if (!targetKey) {
      return null;
    }

    const batch = orders.filter(
      (order) => (order.checkoutBatchId?.trim() || order.id) === targetKey
    );

    if (batch.length === 0 && orderIdParam) {
      const single = orders.find((order) => order.id === orderIdParam);
      if (!single) {
        return null;
      }
      return groupOrdersForList([single])[0] ?? null;
    }

    return groupOrdersForList(batch)[0] ?? null;
  }, [groupKeyParam, orderIdParam, orders]);

  const handleUpdateStatus = useCallback(
    async (orderId: string, status: OrderTrackingStatus) => {
      setUpdatingOrderId(orderId);
      try {
        await updateOrderStatus(orderId, status, getAuthHeaders());
        await loadOrders();
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [getAuthHeaders, loadOrders]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color={GOLD} />
          </Pressable>
          <Text style={styles.headerTitle}>{orderGroup?.displayOrderId ?? 'Order details'}</Text>
          <View style={styles.backButton} />
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.stateText}>Loading order...</Text>
          </View>
        ) : error || !orderGroup ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={44} color="#f87171" />
            <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
            <Pressable style={styles.retryButton} onPress={loadOrders}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
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
            <EmployeeOrderGroupDetail
              group={orderGroup}
              onUpdateStatus={handleUpdateStatus}
              updatingOrderId={updatingOrderId}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  stateText: { color: BrandColors.textMuted },
  errorText: { color: '#f87171', textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: GOLD,
  },
  retryText: { color: BrandColors.primaryText, fontWeight: '700' },
});
