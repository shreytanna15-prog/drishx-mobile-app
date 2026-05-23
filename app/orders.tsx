'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { cancelOrder, fetchOrders, getOrderLensDetails, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATUS_CONFIG = {
  PENDING: { color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  COMPLETED: { color: '#059669', bg: '#d1fae5', label: 'Completed' },
  CANCELLED: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
};

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
  const status = STATUS_CONFIG[order.status];
  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount);

  return (
    <View style={[styles.orderCard, isDark && styles.orderCardDark]}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="defaultSemiBold">{lensLabel}</ThemedText>
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
        <View style={[styles.statusBadge, { backgroundColor: isDark ? `${status.color}22` : status.bg }]}>
          <ThemedText style={[styles.statusText, { color: status.color }]}>{status.label}</ThemedText>
        </View>
      </View>

      {details ? (
        <ThemedText style={styles.specText}>
          SPH {details.sph} · CYL {details.cyl ?? '—'}
          {'add' in details && details.add !== undefined && ` · ADD ${details.add}`}
          {'eye' in details && details.eye ? ` · ${details.eye}` : ''}
        </ThemedText>
      ) : null}

      <View style={styles.orderFooter}>
        <ThemedText style={styles.qtyText}>Qty: {order.quantity}</ThemedText>
        <ThemedText style={styles.totalText}>₹{total}</ThemedText>
      </View>

      {order.status !== 'CANCELLED' && (
        <Pressable
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={cancelling}>
          {cancelling ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <ThemedText style={styles.cancelText}>Cancel Order</ThemedText>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={tint} />
          </Pressable>
          <ThemedText type="subtitle">My Orders</ThemedText>
          <View style={styles.backButton} />
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={tint} />
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} tintColor={tint} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
                <ThemedText style={styles.emptyText}>No orders yet</ThemedText>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4, width: 32 },
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
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  specText: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyText: { fontSize: 14, color: '#64748b' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#0a7ea4' },
  cancelButton: {
    marginTop: 12,
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
    gap: 12,
  },
  emptyText: { fontSize: 15, color: '#64748b' },
  errorText: { fontSize: 15, color: '#b91c1c', textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
