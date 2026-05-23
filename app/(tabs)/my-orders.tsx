'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderTrackingTimeline } from '@/components/order-tracking-timeline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { cancelOrder, fetchOrders, getOrderLensDetails, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';

function OrderCard({
  order,
  onCancel,
  cancelling,
}: {
  order: OrderRecord;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount);
  const status = normalizeOrderStatus(order.status);
  const canCancel = status === 'PENDING';

  return (
    <View style={[styles.orderCard, isDark && styles.orderCardDark]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <ThemedText type="defaultSemiBold">{lensLabel}</ThemedText>
          <ThemedText style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</ThemedText>
          <ThemedText style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </ThemedText>
        </View>
        <ThemedText style={styles.totalText}>₹{total}</ThemedText>
      </View>

      {details ? (
        <ThemedText style={styles.specText}>
          SPH {details.sph} · CYL {details.cyl ?? '—'}
          {'add' in details && details.add !== undefined && ` · ADD ${details.add}`}
          {'eye' in details && details.eye ? ` · ${details.eye}` : ''}
        </ThemedText>
      ) : null}

      <ThemedText style={styles.qtyText}>Quantity: {order.quantity}</ThemedText>

      <ThemedText style={styles.trackingTitle}>Order tracking</ThemedText>
      <OrderTrackingTimeline status={order.status} />

      {canCancel && (
        <Pressable
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={cancelling}>
          {cancelling ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <ThemedText style={styles.cancelText}>Cancel order</ThemedText>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function MyOrdersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.screenTitle}>
            My Orders
          </ThemedText>
          <ThemedText style={styles.subtitle}>Track your lens orders</ThemedText>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={tint} />
            <ThemedText style={styles.stateText}>Loading your orders…</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color="#b91c1c" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={[styles.retryButton, { backgroundColor: tint }]} onPress={loadOrders}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadOrders();
                }}
                tintColor={tint}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
                <ThemedText style={styles.emptyTitle}>No orders yet</ThemedText>
                <ThemedText style={styles.stateText}>Place an order from the Shop tab to track it here.</ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                onCancel={() => handleCancel(item.id)}
                cancelling={cancellingId === item.id}
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderHeaderLeft: { flex: 1, paddingRight: 12 },
  orderId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  totalText: { fontSize: 18, fontWeight: '800', color: '#0a7ea4' },
  specText: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  qtyText: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  cancelText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
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
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  stateText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#b91c1c', textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
