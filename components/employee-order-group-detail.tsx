'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderTrackingHorizontal } from '@/components/order-tracking-horizontal';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  buildOrderProductSections,
  getBatchTrackingStatus,
  type OrderProductSection,
  type PickState,
  type PowerLineRow,
} from '@/lib/order-detail-display';
import {
  formatDisplayOrderId,
  formatOrderDateTime,
  getStatusPillStyle,
  type OrderListGroup,
} from '@/lib/order-list-display';
import {
  canStaffMarkLinePacked,
  formatOrderStatusLabel,
  getStaffStatusOptions,
  isSpecialStatus,
  MAIN_TRACKING_STEPS,
  normalizeOrderStatus,
  SPECIAL_STATUS_CONFIG,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import { getOrderLensDetails, type OrderRecord } from '@/lib/orders-api';
import { formatLensType } from '@/lib/types/lens';


type EmployeeOrderGroupDetailProps = {
  group: OrderListGroup;
  onUpdateStatus: (orderId: string, status: OrderTrackingStatus) => Promise<void>;
  updatingOrderId: string | null;
};

function PackedStatusCell({
  state,
  picked,
  ordered,
  interactive = false,
  loading = false,
  onPress,
}: {
  state: PickState;
  picked: number;
  ordered: number;
  interactive?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const fraction = `${picked}/${ordered}`;

  const circleContent = (() => {
    if (state === 'cancelled') {
      return (
        <>
          <Text style={styles.packedFractionMuted}>—</Text>
          <View style={[styles.checkCircle, styles.checkCircleMuted]}>
            <MaterialIcons name="remove" size={14} color={colors.textMuted} />
          </View>
        </>
      );
    }

    if (state === 'full') {
      return (
        <>
          <Text style={styles.packedFractionDone}>{fraction}</Text>
          <View style={[styles.checkCircle, styles.checkCircleDone]}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="check" size={16} color="#ffffff" />
            )}
          </View>
        </>
      );
    }

    if (state === 'partial') {
      return (
        <>
          <Text style={styles.packedFractionPartial}>{fraction}</Text>
          <View style={[styles.checkCircle, styles.checkCirclePartial]}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="check" size={16} color="#ffffff" />
            )}
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={styles.packedFractionPending}>{fraction}</Text>
        <View style={[styles.checkCircle, styles.checkCirclePending]}>
          {loading ? <ActivityIndicator size="small" color={colors.danger} /> : null}
        </View>
      </>
    );
  })();

  if (interactive && onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.packedCell,
          styles.packedCellInteractive,
          (pressed || loading) && styles.packedCellPressed,
        ]}
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Mark line as packed"
        hitSlop={8}>
        {circleContent}
      </Pressable>
    );
  }

  return <View style={styles.packedCell}>{circleContent}</View>;
}

function PowerTableRow({
  line,
  order,
  onMarkPacked,
  updatingOrderId,
}: {
  line: PowerLineRow;
  order: OrderRecord;
  onMarkPacked: (orderId: string) => void;
  updatingOrderId: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const status = normalizeOrderStatus(order.status);
  const canMarkPacked = canStaffMarkLinePacked(status);
  const isUpdating = updatingOrderId === line.orderId;

  function handlePackedPress() {
    if (!canMarkPacked || isUpdating) {
      return;
    }

    Alert.alert('Mark as packed', 'Mark this power line as packed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark packed',
        onPress: () => onMarkPacked(order.id),
      },
    ]);
  }

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.colPower]} numberOfLines={1}>
        {line.sphCylLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colOrdered]}>{line.ordered}</Text>
      <View style={styles.colPacked}>
        <PackedStatusCell
          state={line.pickState}
          picked={line.picked}
          ordered={line.ordered}
          interactive={canMarkPacked}
          loading={isUpdating}
          onPress={handlePackedPress}
        />
      </View>
    </View>
  );
}

function ProductSectionCard({
  section,
  ordersById,
  onMarkPacked,
  updatingOrderId,
}: {
  section: OrderProductSection;
  ordersById: Map<string, OrderRecord>;
  onMarkPacked: (orderId: string) => void;
  updatingOrderId: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const [expanded, setExpanded] = useState(true);
  const progress =
    section.totalPairs > 0 ? Math.round((section.pickedPairs / section.totalPairs) * 100) : 0;

  return (
    <View style={styles.productCard}>
      <Pressable style={styles.productHeader} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.productHeaderLeft}>
          <View style={styles.productThumb}>
            <MaterialIcons name="visibility" size={20} color={colors.primary} />
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
            color={colors.textMuted}
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
          {section.lines.map((line) => {
            const order = ordersById.get(line.orderId);
            if (!order) {
              return null;
            }
            return (
              <PowerTableRow
                key={line.orderId}
                line={line}
                order={order}
                onMarkPacked={onMarkPacked}
                updatingOrderId={updatingOrderId}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function StaffLineStatusPanel({
  order,
  onUpdateStatus,
  updatingOrderId,
}: {
  order: OrderRecord;
  onUpdateStatus: (orderId: string, status: OrderTrackingStatus) => Promise<void>;
  updatingOrderId: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const status = normalizeOrderStatus(order.status);
  const options = getStaffStatusOptions(status);
  const details = getOrderLensDetails(order);
  const lensLabel = formatLensType(order.lensType);
  const isUpdating = updatingOrderId === order.id;

  function confirmUpdate(nextStatus: OrderTrackingStatus) {
    const message =
      nextStatus === 'CANCELLED'
        ? 'Cancel this order line? Stock will be restored.'
        : `Mark this line as "${formatOrderStatusLabel(nextStatus)}"?`;

    Alert.alert('Update order status', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, update',
        onPress: () => onUpdateStatus(order.id, nextStatus),
      },
    ]);
  }

  return (
    <View style={styles.lineStatusCard}>
      <View style={styles.lineStatusHeader}>
        <View style={styles.lineStatusMeta}>
          <Text style={styles.lineStatusTitle}>{formatDisplayOrderId(order)}</Text>
          <Text style={styles.lineStatusSub}>
            {lensLabel}
            {details
              ? ` · SPH ${details.sph} / CYL ${details.cyl ?? '—'}`
              : ''}
            {' · '}
            {order.quantity} pairs
          </Text>
        </View>
        <View style={styles.lineStatusPill}>
          <Text style={styles.lineStatusPillText}>{formatOrderStatusLabel(status)}</Text>
        </View>
      </View>

      {isSpecialStatus(status) ? (
        <View style={styles.procurementBanner}>
          <MaterialIcons
            name={status === 'PARTIALLY_FULFILLED' ? 'inventory' : 'schedule'}
            size={18}
            color={SPECIAL_STATUS_CONFIG[status].color}
          />
          <Text style={[styles.procurementBannerText, { color: SPECIAL_STATUS_CONFIG[status].color }]}>
            {SPECIAL_STATUS_CONFIG[status].description}
          </Text>
        </View>
      ) : null}

      {options.length > 0 ? (
        <View style={styles.chipsRow}>
          {options.map((nextStatus) => (
            <Pressable
              key={nextStatus}
              style={[
                styles.statusChip,
                nextStatus === 'CANCELLED' ? styles.statusChipDanger : styles.statusChipPrimary,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={() => confirmUpdate(nextStatus)}
              disabled={isUpdating}>
              <Text
                style={[
                  styles.statusChipText,
                  nextStatus === 'CANCELLED' ? styles.statusChipTextDanger : styles.statusChipTextPrimary,
                ]}>
                {formatOrderStatusLabel(nextStatus)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.noActionsText}>No further status updates for this line.</Text>
      )}

      {isUpdating ? (
        <View style={styles.updatingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.updatingText}>Updating status...</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EmployeeOrderGroupDetail({
  group,
  onUpdateStatus,
  updatingOrderId,
}: EmployeeOrderGroupDetailProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const productSections = useMemo(() => buildOrderProductSections(group.orders), [group.orders]);
  const trackingStatus = useMemo(() => getBatchTrackingStatus(group.orders), [group.orders]);
  const ordersById = useMemo(
    () => new Map(group.orders.map((order) => [order.id, order])),
    [group.orders]
  );
  const customerEmail = group.orders[0]?.user?.email;

  const handleMarkPacked = useCallback(
    (orderId: string) => onUpdateStatus(orderId, 'PACKED'),
    [onUpdateStatus]
  );

  const [updatingTracking, setUpdatingTracking] = useState(false);

  const activeOrders = useMemo(
    () =>
      group.orders.filter((order) => {
        const lineStatus = normalizeOrderStatus(order.status);
        return lineStatus !== 'CANCELLED' && lineStatus !== 'COMPLETED';
      }),
    [group.orders]
  );

  const canEditTracking = activeOrders.length > 0;

  const handleTrackingStepPress = useCallback(
    (step: OrderTrackingStatus) => {
      if (!canEditTracking || updatingTracking || updatingOrderId) {
        return;
      }

      const stepLabel = MAIN_TRACKING_STEPS.find((item) => item.key === step)?.label ?? step;
      const allAlreadyAtStep = activeOrders.every(
        (order) => normalizeOrderStatus(order.status) === step
      );
      if (allAlreadyAtStep) {
        return;
      }

      const lineCount = activeOrders.length;
      const message =
        lineCount === 1
          ? `Set this order to "${stepLabel}"?`
          : `Set all ${lineCount} active lines in this order to "${stepLabel}"?`;

      Alert.alert('Update order tracking', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdatingTracking(true);
            try {
              for (const order of activeOrders) {
                if (normalizeOrderStatus(order.status) !== step) {
                  await onUpdateStatus(order.id, step);
                }
              }
            } finally {
              setUpdatingTracking(false);
            }
          },
        },
      ]);
    },
    [
      activeOrders,
      canEditTracking,
      onUpdateStatus,
      updatingOrderId,
      updatingTracking,
    ]
  );

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
        {customerEmail ? <Text style={styles.customerEmail}>{customerEmail}</Text> : null}
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
        <ProductSectionCard
          key={section.key}
          section={section}
          ordersById={ordersById}
          onMarkPacked={handleMarkPacked}
          updatingOrderId={updatingOrderId}
        />
      ))}

      {group.orders.some((order) => order.notes?.trim()) ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Order notes</Text>
          <Text style={styles.notesText}>{group.orders.find((o) => o.notes?.trim())?.notes?.trim()}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Update status</Text>
      {group.orders.map((order) => (
        <StaffLineStatusPanel
          key={order.id}
          order={order}
          onUpdateStatus={onUpdateStatus}
          updatingOrderId={updatingOrderId}
        />
      ))}

      <View style={styles.trackingCard}>
        <OrderTrackingHorizontal
          status={trackingStatus}
          onStepPress={canEditTracking ? handleTrackingStepPress : undefined}
          disabled={updatingTracking || updatingOrderId != null}
        />
        {canEditTracking ? (
          <Text style={styles.trackingHint}>Tap a step to update tracking for this order.</Text>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  wrap: { gap: 14 },
  heroCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    gap: 8,
  },
  orderId: { color: c.text, fontSize: 22, fontWeight: '800' },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  companyName: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
  customerEmail: { color: c.textMuted, fontSize: 13 },
  dateTime: { color: c.textMuted, fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: c.cardBorder, marginVertical: 4 },
  statValue: { color: c.text, fontSize: 16, fontWeight: '800' },
  statLabel: { color: c.textMuted, fontSize: 11, marginTop: 4, fontWeight: '600' },
  sectionTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  productCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 14,
    gap: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  productHeaderLeft: { flexDirection: 'row', flex: 1, gap: 10, minWidth: 0 },
  productThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeaderText: { flex: 1, minWidth: 0 },
  productTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  productSubtitle: { color: c.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  productHeaderRight: { alignItems: 'flex-end', gap: 4 },
  productPairs: { color: c.primary, fontSize: 12, fontWeight: '700' },
  progressBlock: { gap: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  progressPercent: { color: c.primary, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.background, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4ade80', borderRadius: 3 },
  tableWrap: { borderTopWidth: 1, borderTopColor: c.cardBorder, paddingTop: 10, gap: 4 },
  tableHead: { flexDirection: 'row', paddingBottom: 6 },
  tableHeadText: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableHeadTextCenter: { textAlign: 'center', width: '100%' },
  tableHeadTextRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  tableCell: { color: c.text, fontSize: 13, fontWeight: '600' },
  colPowerHead: { flex: 2 },
  colOrderedHead: { flex: 1, alignItems: 'center' },
  colPackedHead: { flex: 1.4, alignItems: 'flex-end' },
  colPower: { flex: 2 },
  colOrdered: { flex: 1, textAlign: 'center' },
  colPacked: { flex: 1.4, alignItems: 'flex-end', justifyContent: 'center' },
  packedCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  packedCellInteractive: {
    paddingVertical: 4,
    paddingLeft: 8,
    borderRadius: 8,
  },
  packedCellPressed: { opacity: 0.75 },
  packedFractionDone: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
  packedFractionPartial: { fontSize: 12, fontWeight: '700', color: '#fb923c' },
  packedFractionPending: { fontSize: 12, fontWeight: '700', color: c.danger },
  packedFractionMuted: { fontSize: 12, fontWeight: '700', color: c.textMuted },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  checkCirclePartial: { backgroundColor: '#f97316', borderColor: '#f97316' },
  checkCirclePending: { backgroundColor: 'transparent', borderColor: c.danger },
  checkCircleMuted: { backgroundColor: 'transparent', borderColor: c.cardBorder },
  notesBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: { fontSize: 14, color: c.text, lineHeight: 20 },
  lineStatusCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 14,
    gap: 10,
  },
  lineStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  lineStatusMeta: { flex: 1, minWidth: 0 },
  lineStatusTitle: { color: c.text, fontSize: 14, fontWeight: '800' },
  lineStatusSub: { color: c.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  lineStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
  },
  lineStatusPillText: {
    color: c.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  procurementBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  procurementBannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusChipPrimary: {
    borderColor: c.primary,
    backgroundColor: 'rgba(240, 161, 50, 0.12)',
  },
  statusChipDanger: {
    borderColor: '#fca5a5',
    backgroundColor: '#450a0a',
  },
  statusChipText: { fontSize: 13, fontWeight: '700' },
  statusChipTextPrimary: { color: c.primary },
  statusChipTextDanger: { color: '#fda4af' },
  noActionsText: { color: c.textMuted, fontSize: 13 },
  updatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  updatingText: { color: c.textMuted, fontSize: 13 },
  buttonDisabled: { opacity: 0.7 },
  trackingCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    paddingBottom: 12,
  },
  trackingHint: {
    marginTop: 10,
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'center',
  },
});
