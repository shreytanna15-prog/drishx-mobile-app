'use client';

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LensProductListCard } from '@/components/lens-product-list-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import {
  formatOrderDateTime,
  getStatusPillStyle,
  orderToLensItem,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { resolvePhotoOrderImageUrl } from '@/lib/photo-orders-api';
import type { OrderRecord } from '@/lib/orders-api';

type EmployeeOrderListRowProps = {
  group: OrderListGroup;
  onPress?: () => void;
  onProductPress?: (order: OrderRecord) => void;
  procurementOnly?: boolean;
};

export function EmployeeOrderListRow({
  group,
  onPress,
  onProductPress,
  procurementOnly = false,
}: EmployeeOrderListRowProps) {
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const photoUri =
    group.isPhotoOrder && group.photoUrl ? resolvePhotoOrderImageUrl(group.photoUrl) : null;

  const visibleOrders = procurementOnly
    ? group.orders.filter((order) => normalizeOrderStatus(order.status) === 'AWAITING_PROCUREMENT')
    : group.orders;

  const content = (
    <>
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
          <View style={styles.productCards}>
            {visibleOrders.map((order) =>
              onProductPress ? (
                <LensProductListCard
                  key={order.id}
                  item={orderToLensItem(order)}
                  onPress={() => onProductPress(order)}
                />
              ) : (
                <LensProductListCard key={order.id} item={orderToLensItem(order)} />
              )
            )}
          </View>

          <View style={styles.listMetricsRow}>
            <Text style={styles.listMetricsText}>
              {visibleOrders.length} Product{visibleOrders.length === 1 ? '' : 's'} ·{' '}
              {visibleOrders.reduce((sum, order) => sum + Math.max(1, Number(order.quantity) || 1), 0)}{' '}
              Pair
              {visibleOrders.reduce((sum, order) => sum + Math.max(1, Number(order.quantity) || 1), 0) === 1
                ? ''
                : 's'}
            </Text>
            <Text style={styles.listAmount}>
              ₹
              {visibleOrders
                .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
                .toLocaleString('en-IN')}
            </Text>
          </View>

          {!procurementOnly && (group.readyProductCount > 0 || group.procurementProductCount > 0) && (
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
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.listRow} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.listRow}>{content}</View>;
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
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
    productCards: { gap: 8, marginTop: 10 },
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
  });
