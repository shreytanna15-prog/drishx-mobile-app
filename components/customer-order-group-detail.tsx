'use client';

import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderNotesDisplay } from '@/components/order-notes-display';
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
  formatOrderDateTime,
  getStatusPillStyle,
  isColorLensOrder,
  isRxOrder,
  type OrderListGroup,
} from '@/lib/order-list-display';
import { formatPairQuantity } from '@/lib/order-quantity';
import { resolvePhotoOrderImageUrl } from '@/lib/photo-orders-api';

type CustomerOrderGroupDetailProps = {
  group: OrderListGroup;
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
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const fraction = `${picked}/${ordered}`;

  if (state === 'cancelled') {
    return (
      <View style={styles.packedCell}>
        <Text style={styles.packedFractionMuted}>—</Text>
        <View style={[styles.checkCircle, styles.checkCircleMuted]}>
          <MaterialIcons name="remove" size={14} color={colors.textMuted} />
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
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.colPower]} numberOfLines={2}>
        {line.sphCylLabel}
        {line.eye ? <Text style={styles.eyeInline}> · {line.eye}</Text> : null}
      </Text>
      <Text style={[styles.tableCell, styles.colAdd]} numberOfLines={1}>
        {line.addLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colAxis]} numberOfLines={1}>
        {line.axisLabel}
      </Text>
      <Text style={[styles.tableCell, styles.colOrdered]}>{line.ordered}</Text>
      <View style={styles.colPacked}>
        <PackedStatusCell state={line.pickState} picked={line.picked} ordered={line.ordered} />
      </View>
    </View>
  );
}

function ReferenceImageCard({
  imageUrl,
  onLoadError,
}: {
  imageUrl: string | null;
  onLoadError: () => void;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  if (!imageUrl) {
    return null;
  }

  return (
    <View style={styles.referenceCard}>
      <Text style={styles.referenceTitle}>Prescription reference</Text>
      <Image
        source={{ uri: imageUrl }}
        style={styles.photoImage}
        contentFit="contain"
        onError={onLoadError}
      />
    </View>
  );
}

function ProductSectionCard({ section }: { section: OrderProductSection }) {
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
            {section.subtitle ? (
              <Text style={styles.productSubtitle} numberOfLines={2}>
                {section.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.productHeaderRight}>
          <Text style={styles.productPairs}>
            {formatPairQuantity(section.totalPairs)} Pairs
          </Text>
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
            {formatPairQuantity(section.pickedPairs)} /{' '}
            {formatPairQuantity(section.totalPairs)} Picked
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
            {section.lines.map((line, index) => (
              <PowerTableRow
                key={`${line.orderIds?.join(':') ?? line.orderId}:${line.sphCylLabel}:${line.addLabel}:${line.axisLabel}:${line.eye ?? ''}:${index}`}
                line={line}
              />
            ))}
        </View>
      ) : null}
    </View>
  );
}

export function CustomerOrderGroupDetail({
  group,
}: CustomerOrderGroupDetailProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const pillStyle = getStatusPillStyle(group.status.variant);
  const productSections = useMemo(() => buildOrderProductSections(group.orders), [group.orders]);
  const trackingStatus = useMemo(() => getBatchTrackingStatus(group.orders), [group.orders]);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [referenceLoadFailed, setReferenceLoadFailed] = useState(false);

  const orderReferenceUrl = useMemo(() => {
    const orderWithImage = group.orders.find(
      (order) =>
        (isColorLensOrder(order) || isRxOrder(order)) && order.orderImageUrl?.trim()
    );
    const raw = orderWithImage?.orderImageUrl?.trim() ?? null;
    return raw ? resolvePhotoOrderImageUrl(raw) : null;
  }, [group.orders]);

  useEffect(() => {
    setPhotoLoadFailed(false);
    setReferenceLoadFailed(false);
  }, [group.key, group.photoUrl, orderReferenceUrl]);

  if (group.isPhotoOrder) {
    const order = group.orders[0];
    const rawImageUrl = group.photoUrl ?? order.orderImageUrl ?? null;
    const photoUri = rawImageUrl ? resolvePhotoOrderImageUrl(rawImageUrl) : null;

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
          <Text style={styles.photoHint}>Your order will be placed soon. Details are in your photo.</Text>
        </View>

        {photoUri && !photoLoadFailed ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photoImage}
            contentFit="contain"
            onError={() => setPhotoLoadFailed(true)}
          />
        ) : (
          <View style={styles.photoMissing}>
            <MaterialIcons name="image-not-supported" size={40} color={colors.textMuted} />
            <Text style={styles.photoMissingText}>
              {photoUri ? 'Could not load prescription photo' : 'Photo unavailable'}
            </Text>
          </View>
        )}

        <View style={styles.trackingCard}>
          <OrderTrackingHorizontal status={trackingStatus} />
        </View>
      </View>
    );
  }

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

      {orderReferenceUrl && !referenceLoadFailed ? (
        <ReferenceImageCard
          imageUrl={orderReferenceUrl}
          onLoadError={() => setReferenceLoadFailed(true)}
        />
      ) : orderReferenceUrl && referenceLoadFailed ? (
        <View style={styles.referenceCard}>
          <Text style={styles.referenceTitle}>Prescription reference</Text>
          <View style={styles.photoMissing}>
            <MaterialIcons name="image-not-supported" size={40} color={colors.textMuted} />
            <Text style={styles.photoMissingText}>Could not load reference image</Text>
          </View>
        </View>
      ) : null}

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
          <OrderNotesDisplay notes={group.orders.find((o) => o.notes?.trim())?.notes?.trim() ?? ''} />
        </View>
      ) : null}

      <View style={styles.trackingCard}>
        <OrderTrackingHorizontal status={trackingStatus} />
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
  wrap: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    gap: 8,
  },
  orderId: {
    color: c.text,
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
    color: c.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  dateTime: {
    color: c.textMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: c.cardBorder,
    marginVertical: 4,
  },
  statValue: {
    color: c.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: c.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    color: c.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
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
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
  productSubtitle: {
    color: c.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  productHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productPairs: {
    color: c.primary,
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
    color: c.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  tableWrap: {
    borderTopWidth: 1,
    borderTopColor: c.cardBorder,
    paddingTop: 10,
    gap: 4,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  tableHeadText: {
    color: c.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  tableCell: {
    color: c.text,
    fontSize: 11,
    fontWeight: '600',
  },
  eyeInline: {
    color: c.primary,
    fontWeight: '700',
  },
  colPowerHead: {
    flex: 1.5,
  },
  colAddHead: {
    flex: 0.7,
    alignItems: 'center',
  },
  colAxisHead: {
    flex: 0.75,
    alignItems: 'center',
  },
  colOrderedHead: {
    flex: 0.75,
    alignItems: 'center',
  },
  colPackedHead: {
    flex: 1.1,
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
    flex: 1.5,
  },
  colAdd: {
    flex: 0.7,
    textAlign: 'center',
  },
  colAxis: {
    flex: 0.75,
    textAlign: 'center',
  },
  colOrdered: {
    flex: 0.75,
    textAlign: 'center',
  },
  colPacked: {
    flex: 1.1,
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
    color: c.danger,
  },
  packedFractionMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
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
    borderColor: c.danger,
  },
  checkCircleMuted: {
    backgroundColor: 'transparent',
    borderColor: c.cardBorder,
  },
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
  notesText: {
    fontSize: 14,
    color: c.text,
    lineHeight: 20,
  },
  trackingCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 16,
    paddingBottom: 12,
  },
  referenceCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 14,
    gap: 10,
  },
  referenceTitle: {
    color: c.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  photoHint: {
    color: c.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  photoImage: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  photoMissing: {
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoMissingText: {
    color: c.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
