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
import {
  formatOrderStatusLabel,
  getStaffStatusOptions,
  normalizeOrderStatus,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import {
  fetchOrders,
  getOrderLensDetails,
  updateOrderStatus,
  type OrderRecord,
} from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';

function StatusChip({
  label,
  onPress,
  disabled,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: 'primary' | 'danger';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      style={[
        styles.statusChip,
        isPrimary ? styles.statusChipPrimary : styles.statusChipDanger,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <ThemedText style={[styles.statusChipText, isPrimary ? styles.statusChipTextPrimary : styles.statusChipTextDanger]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function EmployeeOrderCard({
  order,
  onStatusUpdate,
  updating,
}: {
  order: OrderRecord;
  onStatusUpdate: (status: OrderTrackingStatus) => void;
  updating: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount);
  const status = normalizeOrderStatus(order.status);
  const statusOptions = getStaffStatusOptions(status);
  const customerName = order.user?.name?.trim() || order.user?.email || 'Customer';

  return (
    <View style={[styles.orderCard, isDark && styles.orderCardDark]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <ThemedText type="defaultSemiBold">{customerName}</ThemedText>
          <ThemedText style={styles.orderMeta}>{lensLabel}</ThemedText>
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
        <View style={styles.headerRight}>
          <View style={styles.currentStatusBadge}>
            <ThemedText style={styles.currentStatusText}>{formatOrderStatusLabel(status)}</ThemedText>
          </View>
          <ThemedText style={styles.totalText}>₹{total}</ThemedText>
        </View>
      </View>

      {order.user?.email ? <ThemedText style={styles.emailText}>{order.user.email}</ThemedText> : null}

      {details ? (
        <ThemedText style={styles.specText}>
          SPH {details.sph} · CYL {details.cyl ?? '—'}
          {'add' in details && details.add !== undefined && ` · ADD ${details.add}`}
          {'eye' in details && details.eye ? ` · ${details.eye}` : ''}
        </ThemedText>
      ) : null}

      <ThemedText style={styles.qtyText}>Quantity: {order.quantity}</ThemedText>

      {order.notes?.trim() ? (
        <View style={[styles.notesBox, isDark && styles.notesBoxDark]}>
          <ThemedText style={styles.notesLabel}>Order notes</ThemedText>
          <ThemedText style={styles.notesText}>{order.notes.trim()}</ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.trackingTitle}>Order tracking</ThemedText>
      <OrderTrackingTimeline status={order.status} />

      {statusOptions.length > 0 && (
        <View style={styles.statusActions}>
          <ThemedText style={styles.updateTitle}>Update status</ThemedText>
          <View style={styles.statusChipRow}>
            {statusOptions.map((nextStatus) => (
              <StatusChip
                key={nextStatus}
                label={formatOrderStatusLabel(nextStatus)}
                variant={nextStatus === 'CANCELLED' ? 'danger' : 'primary'}
                disabled={updating}
                onPress={() => onStatusUpdate(nextStatus)}
              />
            ))}
          </View>
          {updating && (
            <View style={styles.updatingRow}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <ThemedText style={styles.updatingText}>Updating…</ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function EmployeeOrdersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  function confirmStatusUpdate(orderId: string, nextStatus: OrderTrackingStatus) {
    const message =
      nextStatus === 'CANCELLED'
        ? 'Cancel this order? Stock will be restored.'
        : `Mark this order as "${formatOrderStatusLabel(nextStatus)}"?`;

    Alert.alert('Update order status', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, update',
        onPress: async () => {
          setUpdatingId(orderId);
          try {
            await updateOrderStatus(orderId, nextStatus, getAuthHeaders());
            await loadOrders();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update order.');
          } finally {
            setUpdatingId(null);
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
            Orders
          </ThemedText>
          <ThemedText style={styles.subtitle}>Manage and update customer orders</ThemedText>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={tint} />
            <ThemedText style={styles.stateText}>Loading orders…</ThemedText>
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
                <ThemedText style={styles.emptyTitle}>No customer orders</ThemedText>
                <ThemedText style={styles.stateText}>New orders from customers will appear here.</ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <EmployeeOrderCard
                order={item}
                updating={updatingId === item.id}
                onStatusUpdate={(status) => confirmStatusUpdate(item.id, status)}
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
  headerRight: { alignItems: 'flex-end', gap: 6 },
  orderMeta: { fontSize: 14, color: '#64748b', marginTop: 2 },
  orderId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emailText: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  currentStatusBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentStatusText: { fontSize: 11, fontWeight: '700', color: '#0a7ea4', textTransform: 'uppercase' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#0a7ea4' },
  specText: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  qtyText: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  notesBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: { fontSize: 14, lineHeight: 20 },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statusActions: { marginTop: 16 },
  updateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statusChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusChipPrimary: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  statusChipDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  statusChipTextPrimary: { color: '#0a7ea4' },
  statusChipTextDanger: { color: '#dc2626' },
  updatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  updatingText: { fontSize: 13, color: '#64748b' },
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
