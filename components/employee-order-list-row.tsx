'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LensProductListCard } from '@/components/lens-product-list-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  formatOrderDateTime,
  getOrderPowerDisplayLines,
  getStatusPillStyle,
  isColorLensOrder,
  isCrossOrder,
  isRxOrder,
  orderPowerLineToLensItem,
  shouldShowOrderReadyProgress,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { formatPairQuantity, pairsFromPieces } from '@/lib/order-quantity';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import { resolvePhotoOrderImageUrl } from '@/lib/photo-orders-api';
import type { OrderRecord } from '@/lib/orders-api';

type EmployeeOrderListRowProps = {
  group: OrderListGroup;
  onPress?: () => void;
  onProductPress?: (order: OrderRecord) => void;
  /** Procurement tab: only awaiting-procurement lines. */
  procurementOnly?: boolean;
};

function OrderTypeBadge({
  label,
  backgroundColor,
  borderColor,
  color,
}: {
  label: string;
  backgroundColor: string;
  borderColor: string;
  color: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.typeBadge, { backgroundColor, borderColor }]}>
      <Text style={[styles.typeBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmployeeOrderListRow({
  group,
  onPress,
  onProductPress,
  procurementOnly = false,
}: EmployeeOrderListRowProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const photoUri =
    group.isPhotoOrder && group.photoUrl ? resolvePhotoOrderImageUrl(group.photoUrl) : null;

  const visibleOrders = procurementOnly
    ? group.orders.filter((order) => normalizeOrderStatus(order.status) === 'AWAITING_PROCUREMENT')
    : group.orders;

  const pairCount = visibleOrders.reduce(
    (sum, order) => sum + pairsFromPieces(Math.max(1, Number(order.quantity) || 1)),
    0
  );
  const totalAmount = visibleOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0
  );
  const hasColorOrder = visibleOrders.some(isColorLensOrder);
  const hasRxOrder = visibleOrders.some(isRxOrder);
  const hasCrossOrder = visibleOrders.some(isCrossOrder);
  const canCollapseProducts = !group.isPhotoOrder;

  if (procurementOnly && visibleOrders.length === 0) {
    return null;
  }

  function toggleExpanded() {
    setExpanded((value) => !value);
  }

  const typeBadges =
    group.isPhotoOrder || hasColorOrder || hasRxOrder || hasCrossOrder ? (
      <View style={styles.typeBadgeRow}>
        {group.isPhotoOrder ? (
          <OrderTypeBadge
            label="Image attached"
            backgroundColor="rgba(240, 161, 50, 0.14)"
            borderColor="rgba(240, 161, 50, 0.35)"
            color="#f0a132"
          />
        ) : null}
        {hasCrossOrder ? (
          <OrderTypeBadge
            label="Cross order"
            backgroundColor="rgba(245, 158, 11, 0.14)"
            borderColor="rgba(245, 158, 11, 0.35)"
            color="#d97706"
          />
        ) : null}
        {hasColorOrder ? (
          <OrderTypeBadge
            label="Color order"
            backgroundColor="rgba(139, 92, 246, 0.14)"
            borderColor="rgba(139, 92, 246, 0.35)"
            color="#8b5cf6"
          />
        ) : null}
        {hasRxOrder ? (
          <OrderTypeBadge
            label="RX order"
            backgroundColor="rgba(14, 165, 233, 0.14)"
            borderColor="rgba(14, 165, 233, 0.35)"
            color="#0ea5e9"
          />
        ) : null}
      </View>
    ) : null;

  const productCards = (
    <View style={[styles.productCards, styles.productCardsExpanded]}>
      {visibleOrders.flatMap((order, orderIndex) =>
        getOrderPowerDisplayLines(order).map((line, lineIndex) => {
          const rowKey = `${line.key}:${orderIndex}:${lineIndex}`;
          return onProductPress ? (
            <LensProductListCard
              key={rowKey}
              item={orderPowerLineToLensItem(line)}
              onPress={() => onProductPress(order)}
            />
          ) : (
            <Pressable key={rowKey} onPress={onPress} disabled={!onPress}>
              <LensProductListCard item={orderPowerLineToLensItem(line)} />
            </Pressable>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.listRow}>
      <View style={styles.listTopRow}>
        <Pressable
          style={styles.headerLeft}
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : undefined}>
          <Text style={styles.listOrderId}>{group.displayOrderId}</Text>
          <Text style={styles.listCompany}>{group.companyName}</Text>
          <Text style={styles.listDate}>{formatOrderDateTime(group.createdAt)}</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: pillStyle.backgroundColor,
                borderColor: pillStyle.borderColor,
              },
            ]}>
            <Text style={[styles.statusPillText, { color: pillStyle.color }]}>
              {group.status.label}
            </Text>
          </View>
          {canCollapseProducts ? (
            <Pressable
              onPress={toggleExpanded}
              style={styles.pairToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={
                expanded
                  ? `Collapse products for ${group.displayOrderId}`
                  : `Expand products for ${group.displayOrderId}`
              }>
              <Text style={styles.pairToggleText}>{formatPairQuantity(pairCount)} pr</Text>
              <MaterialIcons
                name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {typeBadges}

      {group.isPhotoOrder ? (
        <Pressable onPress={onPress} disabled={!onPress}>
          <Text style={styles.photoOrderNote}>Image attached · details in image</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoThumb} contentFit="cover" />
          ) : null}
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={toggleExpanded}
            style={styles.metricsToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded }}>
            <Text style={styles.listMetricsText}>
              {visibleOrders.length} Product{visibleOrders.length === 1 ? '' : 's'} ·{' '}
              {formatPairQuantity(pairCount)} Pair{pairCount === 1 ? '' : 's'}
              <Text style={styles.showHideLabel}> {expanded ? 'Hide' : 'Show'}</Text>
            </Text>
            <Text style={styles.listAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </Pressable>

          {expanded ? productCards : null}

          {!procurementOnly && shouldShowOrderReadyProgress(group) && group.readyProductCount > 0 ? (
            <View style={styles.fulfillmentRow}>
              <View style={styles.readyPill}>
                <Text style={styles.readyPillText}>{group.readyProductCount} Ready</Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
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
    headerLeft: { flex: 1, minWidth: 0, gap: 2 },
    headerRight: { alignItems: 'flex-end', gap: 8 },
    listOrderId: { color: c.text, fontSize: 17, fontWeight: '800' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    pairToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    pairToggleText: { color: c.primary, fontSize: 12, fontWeight: '700' },
    listCompany: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
    listDate: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    typeBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    typeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
    },
    typeBadgeText: { fontSize: 11, fontWeight: '700' },
    productCards: { gap: 8, marginTop: 10 },
    productCardsExpanded: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    metricsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 12,
    },
    listMetricsText: { color: c.text, fontSize: 13, fontWeight: '600', flex: 1 },
    showHideLabel: { color: c.primary, fontSize: 12, fontWeight: '700' },
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
