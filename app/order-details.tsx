'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderTrackingTimeline } from '@/components/order-tracking-timeline';
import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import {
  formatOrderStatusLabel,
  getStaffStatusOptions,
  normalizeOrderStatus,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import { fetchOrderById, getOrderLensDetails, updateOrderStatus, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';

function StatusChip({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.statusChip, danger ? styles.statusChipDanger : styles.statusChipPrimary, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}>
      <Text style={[styles.statusChipText, danger ? styles.statusChipTextDanger : styles.statusChipTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const { getAuthHeaders } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderIdParam) {
      setError('Invalid order id.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchOrderById(orderIdParam, getAuthHeaders());
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, orderIdParam]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  function confirmStatusUpdate(nextStatus: OrderTrackingStatus) {
    if (!order) {
      return;
    }
    const message =
      nextStatus === 'CANCELLED'
        ? 'Cancel this order? Stock will be restored.'
        : `Mark this order as "${formatOrderStatusLabel(nextStatus)}"?`;

    Alert.alert('Update order status', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, update',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await updateOrderStatus(order.id, nextStatus, getAuthHeaders());
            setOrder(updated);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update order.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.loadingWrap}>
        <MaterialIcons name="error-outline" size={44} color="#f87171" />
        <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
      </View>
    );
  }

  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const total = Number(order.totalAmount || 0);
  const status = normalizeOrderStatus(order.status);
  const statusOptions = getStaffStatusOptions(status);
  const customerName = order.user?.name?.trim() || order.user?.email || 'Customer';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.name}>{customerName}</Text>
                <Text style={styles.sub}>{lensLabel}</Text>
                <Text style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.date}>
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{formatOrderStatusLabel(status)}</Text>
                </View>
                <Text style={styles.amount}>Rs {total}</Text>
              </View>
            </View>

            {order.user?.email ? <Text style={styles.lineText}>{order.user.email}</Text> : null}

            {details ? (
              <Text style={styles.lineText}>
                SPH {details.sph} · CYL {details.cyl ?? '-'}
                {'add' in details && details.add !== undefined ? ` · ADD ${details.add}` : ''}
                {'eye' in details && details.eye ? ` · ${details.eye}` : ''}
              </Text>
            ) : null}

            <Text style={styles.lineText}>Quantity: {order.quantity}</Text>

            {order.notes?.trim() ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Order notes</Text>
                <Text style={styles.notesText}>{order.notes.trim()}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Order tracking</Text>
            <OrderTrackingTimeline status={order.status} />

            {statusOptions.length > 0 ? (
              <View style={styles.updateWrap}>
                <Text style={styles.sectionTitle}>Update status</Text>
                <View style={styles.chipsRow}>
                  {statusOptions.map((nextStatus) => (
                    <StatusChip
                      key={nextStatus}
                      label={formatOrderStatusLabel(nextStatus)}
                      danger={nextStatus === 'CANCELLED'}
                      disabled={updating}
                      onPress={() => confirmStatusUpdate(nextStatus)}
                    />
                  ))}
                </View>
                {updating ? (
                  <View style={styles.updatingRow}>
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                    <Text style={styles.updatingText}>Updating...</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  name: { color: BrandColors.text, fontSize: 18, fontWeight: '700' },
  sub: { color: BrandColors.textMuted, fontSize: 14, marginTop: 2 },
  orderId: { color: BrandColors.textMuted, fontSize: 12, marginTop: 4 },
  date: { color: BrandColors.textMuted, fontSize: 12, marginTop: 4 },
  statusPill: {
    backgroundColor: 'rgba(242, 170, 76, 0.14)',
    borderColor: BrandColors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: { color: BrandColors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  amount: { color: BrandColors.primary, fontSize: 24, fontWeight: '800' },
  lineText: { color: BrandColors.textMuted, fontSize: 14, marginBottom: 4 },
  notesBox: {
    marginTop: 8,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    backgroundColor: BrandColors.background,
  },
  notesTitle: { color: BrandColors.primary, textTransform: 'uppercase', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  notesText: { color: BrandColors.text, fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    color: BrandColors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.6,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  updateWrap: { marginTop: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusChipPrimary: {
    borderColor: BrandColors.primary,
    backgroundColor: 'rgba(242, 170, 76, 0.12)',
  },
  statusChipDanger: {
    borderColor: '#fca5a5',
    backgroundColor: '#450a0a',
  },
  statusChipText: { fontSize: 13, fontWeight: '700' },
  statusChipTextPrimary: { color: BrandColors.primary },
  statusChipTextDanger: { color: '#fda4af' },
  updatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  updatingText: { color: BrandColors.textMuted, fontSize: 13 },
  disabled: { opacity: 0.7 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: BrandColors.background,
  },
  loadingText: { color: BrandColors.textMuted },
  errorText: { color: '#f87171', textAlign: 'center' },
});
