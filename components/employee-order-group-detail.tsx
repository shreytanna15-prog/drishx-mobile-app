'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmployeeOrderRangeSheet } from '@/components/employee-order-range-sheet';
import { OrderNotesDisplay } from '@/components/order-notes-display';
import { OrderTrackingHorizontal } from '@/components/order-tracking-horizontal';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { appAlert } from '@/lib/app-alert';
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
  formatOrderDateTime,
  getStatusPillStyle,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { distributePickedAcrossOrders } from '@/lib/order-line-update';
import {
  formatOrderStatusLabel,
  MAIN_TRACKING_STEPS,
  normalizeOrderStatus,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import type { OrderRecord } from '@/lib/orders-api';


type EmployeeOrderGroupDetailProps = {
  group: OrderListGroup;
  onUpdateLine: (
    orderId: string,
    payload: { status: OrderTrackingStatus; pickedQuantity: number }
  ) => Promise<void>;
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
  onPress,
  updatingOrderId,
}: {
  line: PowerLineRow;
  onPress: () => void;
  updatingOrderId: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const isUpdating = updatingOrderId != null && (line.orderIds ?? [line.orderId]).includes(updatingOrderId);

  return (
    <Pressable
      style={({ pressed }) => [styles.tableRow, styles.tableRowInteractive, pressed && styles.tableRowPressed]}
      onPress={onPress}
      disabled={isUpdating}>
      <Text style={[styles.tableCell, styles.colPower]} numberOfLines={2}>
        {line.sphCylLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colAdd]} numberOfLines={1}>
        {line.addLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colAxis]} numberOfLines={1}>
        {line.axisLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colOrdered]}>{line.ordered}</Text>
      <View style={styles.colPacked}>
        <PackedStatusCell
          state={line.pickState}
          picked={line.picked}
          ordered={line.ordered}
          loading={isUpdating}
        />
      </View>
    </Pressable>
  );
}

function ProductSectionCard({
  section,
  onLinePress,
  updatingOrderId,
}: {
  section: OrderProductSection;
  onLinePress: (line: PowerLineRow) => void;
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
            <View style={styles.colAddHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextCenter]}>ADD</Text>
            </View>
            <View style={styles.colAxisHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextCenter]}>AXIS</Text>
            </View>
            <View style={styles.colOrderedHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextCenter]}>Ordered</Text>
            </View>
            <View style={styles.colPackedHead}>
              <Text style={[styles.tableHeadText, styles.tableHeadTextRight]}>Packed</Text>
            </View>
          </View>
          {section.lines.map((line) => (
            <PowerTableRow
              key={line.orderIds?.join(':') ?? line.orderId}
              line={line}
              onPress={() => onLinePress(line)}
              updatingOrderId={updatingOrderId}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function EmployeeOrderGroupDetail({
  group,
  onUpdateLine,
  updatingOrderId,
}: EmployeeOrderGroupDetailProps) {
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const productSections = useMemo(() => buildOrderProductSections(group.orders), [group.orders]);
  const trackingStatus = useMemo(() => getBatchTrackingStatus(group.orders), [group.orders]);
  const ordersById = useMemo(
    () => new Map(group.orders.map((order) => [order.id, order])),
    [group.orders]
  );
  const customerEmail = group.orders[0]?.user?.email;

  const [selectedLine, setSelectedLine] = useState<PowerLineRow | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [updatingLine, setUpdatingLine] = useState(false);

  const selectedLineOrders = useMemo(() => {
    if (!selectedLine) {
      return [];
    }
    const ids = selectedLine.orderIds ?? [selectedLine.orderId];
    return ids.map((id) => ordersById.get(id)).filter((order): order is OrderRecord => Boolean(order));
  }, [ordersById, selectedLine]);

  const selectedLineStatus = useMemo(() => {
    if (selectedLineOrders.length === 0) {
      return 'PENDING' as OrderTrackingStatus;
    }
    return normalizeOrderStatus(selectedLineOrders[0].status);
  }, [selectedLineOrders]);

  const handleLinePress = useCallback((line: PowerLineRow) => {
    setSelectedLine(line);
    setSheetVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedLine(null);
  }, []);

  const handleUpdateLine = useCallback(
    async (payload: { pickedQuantity: number; status: OrderTrackingStatus }) => {
      if (!selectedLine || selectedLineOrders.length === 0) {
        return;
      }

      const message =
        payload.status === 'CANCELLED'
          ? 'Cancel this product range? Stock will be restored.'
          : `Update this range to ${payload.pickedQuantity} picked pair${payload.pickedQuantity === 1 ? '' : 's'} with status "${formatOrderStatusLabel(payload.status)}"?`;

      await new Promise<void>((resolve, reject) => {
        appAlert('Update product range', message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Update',
            onPress: async () => {
              setUpdatingLine(true);
              try {
                const assignments = distributePickedAcrossOrders(selectedLineOrders, payload.pickedQuantity);
                for (const assignment of assignments) {
                  await onUpdateLine(assignment.orderId, {
                    status: payload.status,
                    pickedQuantity: assignment.pickedQuantity,
                  });
                }
                handleCloseSheet();
                resolve();
              } catch (error) {
                reject(error);
              } finally {
                setUpdatingLine(false);
              }
            },
          },
        ]);
      });
    },
    [handleCloseSheet, onUpdateLine, selectedLine, selectedLineOrders]
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

      appAlert('Update order tracking', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdatingTracking(true);
            try {
              for (const order of activeOrders) {
                if (normalizeOrderStatus(order.status) !== step) {
                  await onUpdateLine(order.id, {
                    status: step,
                    pickedQuantity:
                      typeof order.pickedQuantity === 'number' && Number.isFinite(order.pickedQuantity)
                        ? Math.max(0, Math.floor(order.pickedQuantity))
                        : 0,
                  });
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
      onUpdateLine,
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
          onLinePress={handleLinePress}
          updatingOrderId={updatingOrderId}
        />
      ))}

      {group.orders.some((order) => order.notes?.trim()) ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Order notes</Text>
          <OrderNotesDisplay notes={group.orders.find((o) => o.notes?.trim())?.notes?.trim() ?? ''} />
        </View>
      ) : null}

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

      <EmployeeOrderRangeSheet
        visible={sheetVisible}
        line={selectedLine}
        currentStatus={selectedLineStatus}
        onClose={handleCloseSheet}
        onUpdate={handleUpdateLine}
        updating={updatingLine || updatingOrderId != null}
      />
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
    fontSize: 9,
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
  tableRowInteractive: {
    borderRadius: 8,
  },
  tableRowPressed: {
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
  },
  tableCell: { color: c.text, fontSize: 11, fontWeight: '600' },
  colPowerHead: { flex: 1.5 },
  colAddHead: { flex: 0.7, alignItems: 'center' },
  colAxisHead: { flex: 0.75, alignItems: 'center' },
  colOrderedHead: { flex: 0.75, alignItems: 'center' },
  colPackedHead: { flex: 1.1, alignItems: 'flex-end' },
  colPower: { flex: 1.5 },
  colAdd: { flex: 0.7, textAlign: 'center' },
  colAxis: { flex: 0.75, textAlign: 'center' },
  colOrdered: { flex: 0.75, textAlign: 'center' },
  colPacked: { flex: 1.1, alignItems: 'flex-end', justifyContent: 'center' },
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
