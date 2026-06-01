'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderTrackingHorizontal } from '@/components/order-tracking-horizontal';
import { BrandColors } from '@/constants/brand-colors';
import {
  buildOrderProductSections,
  getBatchTrackingStatus,
  type OrderProductSection,
  type PickState,
  type PowerLineRow,
} from '@/lib/order-detail-display';
import {
  formatOrderDateTime,
  getStatusPillStyle,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { normalizeOrderStatus } from '@/lib/order-tracking';
import type { OrderRecord } from '@/lib/orders-api';

const GOLD = BrandColors.primary;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;
const BG = BrandColors.background;

type CustomerOrderGroupDetailProps = {
  group: OrderListGroup;
  onCancelOrder: (orderId: string) => void;
  cancellingId: string | null;
};

function PackedStatusCell({
  state,
  picked,
  ordered,
}: {
  state: PickState;
  picked: number;
  ordered: number;
}) {
  const fraction = `${picked}/${ordered}`;

  if (state === 'cancelled') {
    return (
      <View style={styles.packedCell}>
        <Text style={styles.packedFractionMuted}>—</Text>
        <View style={[styles.checkCircle, styles.checkCircleMuted]}>
          <MaterialIcons name="remove" size={14} color={BrandColors.textMuted} />
        </View>
      </View>
    );
  }

  if (state === 'full') {
    return (
      <View style={styles.packedCell}>
        <Text style={styles.packedFractionDone}>{fraction}</Text>
        <View style={[styles.checkCircle, styles.checkCircleDone]}>
          <MaterialIcons name="check" size={16} color="#ffffff" />
        </View>
      </View>
    );
  }

  if (state === 'partial') {
    return (
      <View style={styles.packedCell}>
        <Text style={styles.packedFractionPartial}>{fraction}</Text>
        <View style={[styles.checkCircle, styles.checkCirclePartial]}>
          <MaterialIcons name="check" size={16} color="#ffffff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.packedCell}>
      <Text style={styles.packedFractionPending}>{fraction}</Text>
      <View style={[styles.checkCircle, styles.checkCirclePending]} />
    </View>
  );
}

function PowerTableRow({ line }: { line: PowerLineRow }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.colPower]} numberOfLines={1}>
        {line.sphCylLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colOrdered]}>{line.ordered}</Text>
      <View style={[styles.tableCell, styles.colPacked]}>
        <PackedStatusCell state={line.pickState} picked={line.picked} ordered={line.ordered} />
      </View>
    </View>
  );
}

function ProductSectionCard({ section }: { section: OrderProductSection }) {
  const [expanded, setExpanded] = useState(true);
  const progress =
    section.totalPairs > 0 ? Math.round((section.pickedPairs / section.totalPairs) * 100) : 0;

  return (
    <View style={styles.productCard}>
      <Pressable style={styles.productHeader} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.productHeaderLeft}>
          <View style={styles.productThumb}>
            <MaterialIcons name="visibility" size={20} color={GOLD} />
          </View>
          <View style={styles.productHeaderText}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {section.title}
            </Text>
            <Text style={styles.productSubtitle} numberOfLines={2}>
              {section.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.productHeaderRight}>
          <Text style={styles.productPairs}>{section.totalPairs} Pairs</Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={22}
            color={BrandColors.textMuted}
          />
        </View>
      </Pressable>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {section.pickedPairs} / {section.totalPairs} Picked
          </Text>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {expanded ? (
        <View style={styles.tableWrap}>
          <View style={styles.tableHead}>
            <View style={styles.colPowerHead}>
              <Text style={styles.tableHeadText}>SPH / CYL</Text>
            </View>
            <View style={styles.colOrderedHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextCenter]}>Ordered</Text>
            </View>
            <View style={styles.colPackedHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextRight]}>Packed</Text>
            </View>
          </View>
          {section.lines.map((line) => (
            <PowerTableRow key={line.orderId} line={line} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CustomerOrderGroupDetail({
  group,
  onCancelOrder,
  cancellingId,
}: CustomerOrderGroupDetailProps) {
  const pillStyle = getStatusPillStyle(group.status.variant);
  const productSections = useMemo(() => buildOrderProductSections(group.orders), [group.orders]);
  const trackingStatus = useMemo(() => getBatchTrackingStatus(group.orders), [group.orders]);

  const cancellableOrders = group.orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    return status === 'PENDING' || status === 'AWAITING_PROCUREMENT';
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.heroCard}>
        <Text style={styles.orderId}>{group.displayOrderId}</Text>
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
        <Text style={styles.companyName}>{group.companyName}</Text>
        <Text style={styles.dateTime}>{formatOrderDateTime(group.createdAt)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{group.productCount}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{group.pairCount}</Text>
          <Text style={styles.statLabel}>Pairs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>₹{group.totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Amount</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Products & power combinations</Text>
      {productSections.map((section) => (
        <ProductSectionCard key={section.key} section={section} />
      ))}

      {group.orders.some((order) => order.notes?.trim()) ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Order notes</Text>
          <Text style={styles.notesText}>{group.orders.find((o) => o.notes?.trim())?.notes?.trim()}</Text>
        </View>
      ) : null}

      <View style={styles.trackingCard}>
        <OrderTrackingHorizontal status={trackingStatus} />
      </View>

      {cancellableOrders.length > 0 ? (
        <View style={styles.cancelBlock}>
          {cancellableOrders.map((order) => (
            <Pressable
              key={order.id}
              style={[styles.cancelButton, cancellingId === order.id && styles.buttonDisabled]}
              onPress={() => {
                Alert.alert('Cancel order line', 'Cancel this product line from your order?', [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes, cancel',
                    style: 'destructive',
                    onPress: () => onCancelOrder(order.id),
                  },
                ]);
              }}
              disabled={cancellingId === order.id}>
              {cancellingId === order.id ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : (
                <Text style={styles.cancelText}>Cancel line · {order.quantity} pairs</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 8,
  },
  orderId: {
    color: BrandColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  companyName: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  dateTime: {
    color: BrandColors.textMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  statValue: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: BrandColors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  productHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: BrandColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  productSubtitle: {
    color: BrandColors.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  productHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productPairs: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBlock: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: BrandColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: BG,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  tableWrap: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    gap: 4,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  tableHeadText: {
    color: BrandColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableCell: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  colPowerHead: {
    flex: 2,
  },
  colOrderedHead: {
    flex: 1,
    alignItems: 'center',
  },
  colPackedHead: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  tableHeadTextCenter: {
    textAlign: 'center',
    width: '100%',
  },
  tableHeadTextRight: {
    textAlign: 'right',
  },
  colPower: {
    flex: 2,
  },
  colOrdered: {
    flex: 1,
    textAlign: 'center',
  },
  colPacked: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  packedCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  packedFractionDone: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ade80',
  },
  packedFractionPartial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fb923c',
  },
  packedFractionPending: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  packedFractionMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkCirclePartial: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  checkCirclePending: {
    backgroundColor: 'transparent',
    borderColor: '#f87171',
  },
  checkCircleMuted: {
    backgroundColor: 'transparent',
    borderColor: BrandColors.cardBorder,
  },
  notesBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: BrandColors.text,
    lineHeight: 20,
  },
  trackingCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    paddingBottom: 12,
  },
  cancelBlock: {
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
    alignItems: 'center',
  },
  cancelText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
