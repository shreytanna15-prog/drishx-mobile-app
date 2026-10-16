'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { EmployeePhotoOrderDetail } from '@/components/employee-photo-order-detail';
import { StaffDeliveryPackCard } from '@/components/staff-delivery-pack-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { appAlert } from '@/lib/app-alert';
import { isOfflineQueuedError } from '@/lib/api-request';
import { filterStaffFulfillmentOrders, groupOrdersForList } from '@/lib/order-list-display';
import { downloadEmployeeOrderPdf, printEmployeeOrder } from '@/lib/order-print';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import { updateOrderStatus } from '@/lib/orders-api';
import { useGetOrders } from '@/lib/modules/orders/query/use-get-orders';

/**
 * Order detail needs the full orders list so checkout-batch siblings can be
 * grouped. No compact batch endpoint — keep fetchOrders via useGetOrders.
 */
export default function OrderDetailsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; groupKey?: string | string[] }>();
  const orderIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupKeyParam = Array.isArray(params.groupKey) ? params.groupKey[0] : params.groupKey;
  const { getAuthHeaders } = useAuth();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'print' | 'download' | null>(null);

  const enabled = Boolean(orderIdParam);
  const {
    data: orders = [],
    loading,
    refreshing,
    error,
    refetch,
  } = useGetOrders({ enabled });

  const orderGroup = useMemo(() => {
    if (!orderIdParam && !groupKeyParam) {
      return null;
    }

    // Match Orders list: never include procurement lines in fulfillment detail.
    const staffOrders = filterStaffFulfillmentOrders(orders);

    const targetKey =
      groupKeyParam ||
      staffOrders.find((order) => order.id === orderIdParam)?.checkoutBatchId?.trim() ||
      orderIdParam;

    if (!targetKey) {
      return null;
    }

    const batch = staffOrders.filter(
      (order) => (order.checkoutBatchId?.trim() || order.id) === targetKey
    );

    if (batch.length === 0 && orderIdParam) {
      const single = staffOrders.find((order) => order.id === orderIdParam);
      if (!single) {
        return null;
      }
      return groupOrdersForList([single])[0] ?? null;
    }

    return groupOrdersForList(batch)[0] ?? null;
  }, [groupKeyParam, orderIdParam, orders]);

  const handleUpdateLine = useCallback(
    async (orderId: string, payload: { status: OrderTrackingStatus; pickedQuantity: number }) => {
      setUpdatingOrderId(orderId);
      try {
        await updateOrderStatus(orderId, payload.status, getAuthHeaders(), payload.pickedQuantity);
        await refetch();
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          appAlert('Saved offline', err.message);
          return;
        }
        throw err;
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [getAuthHeaders, refetch]
  );

  const handlePrintOrder = useCallback(async () => {
    if (!orderGroup) return;
    setExporting('print');
    try {
      await printEmployeeOrder(orderGroup);
    } catch (err) {
      appAlert('Print failed', err instanceof Error ? err.message : 'Could not print order.');
    } finally {
      setExporting(null);
    }
  }, [orderGroup]);

  const handleDownloadOrder = useCallback(async () => {
    if (!orderGroup) return;
    setExporting('download');
    try {
      await downloadEmployeeOrderPdf(orderGroup);
    } catch (err) {
      appAlert('Download failed', err instanceof Error ? err.message : 'Could not download order.');
    } finally {
      setExporting(null);
    }
  }, [orderGroup]);

  const missingId = !orderIdParam;
  const showExportActions = Boolean(orderGroup) && !loading && !error && !missingId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {orderGroup?.displayOrderId ?? 'Order details'}
          </Text>
          {showExportActions ? (
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerActionButton}
                onPress={() => void handlePrintOrder()}
                disabled={exporting !== null}
                hitSlop={8}
                accessibilityLabel="Print order">
                {exporting === 'print' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="print" size={22} color={colors.primary} />
                )}
              </Pressable>
              <Pressable
                style={styles.headerActionButton}
                onPress={() => void handleDownloadOrder()}
                disabled={exporting !== null}
                hitSlop={8}
                accessibilityLabel="Download order">
                {exporting === 'download' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialIcons name="download" size={22} color={colors.primary} />
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerActionsPlaceholder} />
          )}
        </View>

        {missingId ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={44} color={colors.danger} />
            <Text style={styles.errorText}>Invalid order id.</Text>
          </View>
        ) : loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading order...</Text>
          </View>
        ) : error || !orderGroup ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={44} color={colors.danger} />
            <Text style={styles.errorText}>
              {error?.message || 'Order not found or not assigned to you.'}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void refetch()}>
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
                  void refetch();
                }}
                tintColor={colors.primary}
              />
            }>
            {orderGroup.isPhotoOrder ? (
              <EmployeePhotoOrderDetail
                group={orderGroup}
                onUpdateStatus={(orderId, status) =>
                  handleUpdateLine(orderId, {
                    status,
                    pickedQuantity: (() => {
                      const order = orderGroup.orders.find((entry) => entry.id === orderId);
                      const value = order?.pickedQuantity;
                      return typeof value === 'number' && Number.isFinite(value)
                        ? Math.floor(value)
                        : 0;
                    })(),
                  })
                }
                updatingOrderId={updatingOrderId}
              />
            ) : (
              <>
                {orderGroup.orders.map((line) => (
                  <StaffDeliveryPackCard
                    key={line.id}
                    order={line}
                    getAuthHeaders={getAuthHeaders}
                    onDone={() => void refetch()}
                  />
                ))}
                <EmployeeOrderGroupDetail
                  group={orderGroup}
                  onUpdateLine={handleUpdateLine}
                  updatingOrderId={updatingOrderId}
                  getAuthHeaders={getAuthHeaders}
                  onAlternateChanged={() => void refetch()}
                />
              </>
            )}
          </ScrollView>
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
      flex: 1,
      color: c.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginHorizontal: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 56,
      justifyContent: 'flex-end',
    },
    headerActionsPlaceholder: {
      width: 56,
    },
    headerActionButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 8,
    },
    stateText: { color: c.textMuted },
    errorText: { color: c.danger, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 8,
      backgroundColor: c.primary,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
  });
