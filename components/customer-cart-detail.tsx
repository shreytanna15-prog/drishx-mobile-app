'use client';

import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import type { CartPowerLine, CartProductSection } from '@/lib/cart-display';
import { buildCartProductSections, buildWholesalePowerLines, getCartSummary } from '@/lib/cart-display';
import type { OrderQuantityMode } from '@/lib/order-quantity';
import type { CartItem } from '@/lib/types/lens';

type CustomerCartDetailProps = {
  items: CartItem[];
  companyName?: string | null;
  orderMode?: OrderQuantityMode;
  onIncrease: (cartLineId: string) => void;
  onDecrease: (cartLineId: string) => void;
  onRemove: (cartLineId: string) => void;
  onRemoveSection: (cartLineIds: string[]) => void;
  onClearCart: () => void;
};

function CartPowerRow({
  line,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  line: CartPowerLine;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const statusParts = [line.reserveLabel, line.backorderNote].filter(Boolean);

  const readOnly = line.isVirtual;

  return (
    <Animated.View
      style={styles.lineBlock}
      layout={LinearTransition.duration(220)}
      exiting={FadeOutLeft.duration(260)}>
      <View style={styles.tableRow}>
        <View style={styles.colPower}>
          <Text style={styles.tableCell} numberOfLines={2}>
            {line.sphCylLabel}
            {line.eye ? <Text style={styles.eyeInline}> · {line.eye}</Text> : null}
          </Text>
        </View>
        <View style={styles.colQty}>
          {readOnly ? (
            <Text style={styles.qtyValue}>{line.quantity}</Text>
          ) : (
            <View style={styles.qtyControls}>
              <Pressable style={styles.qtyButton} onPress={onDecrease} hitSlop={8}>
                <MaterialIcons name="remove" size={16} color={colors.primary} />
              </Pressable>
              <Text style={styles.qtyValue}>{line.quantity}</Text>
              <Pressable style={styles.qtyButton} onPress={onIncrease} hitSlop={8}>
                <MaterialIcons name="add" size={16} color={colors.primary} />
              </Pressable>
            </View>
          )}
        </View>
        <View style={styles.colAmount}>
          <Text style={styles.amountText}>₹{line.lineTotal.toLocaleString('en-IN')}</Text>
          {!readOnly ? (
            <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
              <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {statusParts.length > 0 ? (
        <Text style={styles.statusLine} numberOfLines={2}>
          {statusParts.join(' · ')}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function CartProductSectionCard({
  section,
  isWholesale,
  qtyColumnLabel,
  onIncrease,
  onDecrease,
  onRemove,
  onRemoveSection,
}: {
  section: CartProductSection;
  isWholesale: boolean;
  qtyColumnLabel: string;
  onIncrease: (cartLineId: string) => void;
  onDecrease: (cartLineId: string) => void;
  onRemove: (cartLineId: string) => void;
  onRemoveSection: (cartLineIds: string[]) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const [expanded, setExpanded] = useState(!section.isWholesaleBatch);

  const sectionLineIds = section.parentCartLineId
    ? [section.parentCartLineId]
    : section.lines.map((line) => line.cartLineId);
  const displayLines = useMemo(() => {
    if (!section.isWholesaleBatch || expanded) {
      return section.isWholesaleBatch
        ? buildWholesalePowerLines(section)
        : section.lines;
    }
    return [];
  }, [expanded, section]);

  return (
    <Animated.View
      style={styles.productCard}
      layout={LinearTransition.duration(260)}
      exiting={FadeOutLeft.duration(300)}>
      <View style={styles.productHeader}>
        <View style={styles.productHeaderLeft}>
          <View style={styles.productThumb}>
            <MaterialIcons name="visibility" size={16} color={colors.primary} />
          </View>
          <View style={styles.productHeaderText}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {section.title}
              </Text>
              <Pressable
                onPress={() => onRemoveSection(sectionLineIds)}
                hitSlop={8}
                style={styles.sectionRemoveBtn}>
                <MaterialIcons name="delete-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>
            <Text style={styles.productSubtitle} numberOfLines={1}>
              {section.subtitle}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.productHeaderRight}
          onPress={() => setExpanded((value) => !value)}
          hitSlop={4}>
          <Text style={styles.productPairs}>
            {section.totalPairs} pr
          </Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.tableWrap}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadText, styles.colPowerHead]}>SPH / CYL</Text>
            <Text style={[styles.tableHeadText, styles.colQtyHead]}>{qtyColumnLabel}</Text>
            <Text style={[styles.tableHeadText, styles.colAmountHead]}>Amt</Text>
          </View>
          {displayLines.map((line) => (
            <CartPowerRow
              key={line.cartLineId}
              line={line}
              onIncrease={() => onIncrease(line.cartLineId)}
              onDecrease={() => onDecrease(line.cartLineId)}
              onRemove={() => onRemove(line.cartLineId)}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

export function CustomerCartDetail({
  items,
  companyName,
  orderMode = 'retail',
  onIncrease,
  onDecrease,
  onRemove,
  onRemoveSection,
  onClearCart,
}: CustomerCartDetailProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const isWholesale = orderMode === 'wholesale';
  const sections = buildCartProductSections(items, orderMode);
  const { productCount, pairCount, totalAmount } = getCartSummary(items, orderMode);
  const qtyColumnLabel = 'Pairs';

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        {companyName?.trim() ? (
          <Text style={styles.companyLine} numberOfLines={1}>
            {companyName.trim()}
          </Text>
        ) : null}
        <View style={styles.statsCells}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{productCount}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{pairCount}</Text>
            <Text style={styles.statLabel}>Pairs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Amount</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Products & power</Text>
        <Pressable onPress={onClearCart} hitSlop={8} style={styles.clearCartBtn}>
          <MaterialIcons name="delete-sweep" size={16} color={colors.danger} />
          <Text style={styles.clearCartText}>Clear cart</Text>
        </Pressable>
      </View>

      {sections.map((section) => (
        <CartProductSectionCard
          key={section.key}
          section={section}
          isWholesale={isWholesale}
          qtyColumnLabel={qtyColumnLabel}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          onRemove={onRemove}
          onRemoveSection={onRemoveSection}
        />
      ))}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: { gap: 8 },
    statsRow: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    companyLine: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    statsCells: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statCell: { flex: 1, alignItems: 'center' },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: c.cardBorder,
    },
    statValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
    },
    statLabel: {
      color: c.textMuted,
      fontSize: 10,
      marginTop: 2,
      fontWeight: '600',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
    },
    clearCartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    clearCartText: {
      color: c.danger,
      fontSize: 12,
      fontWeight: '700',
    },
    productCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    productHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    productHeaderLeft: {
      flexDirection: 'row',
      flex: 1,
      gap: 8,
      minWidth: 0,
      alignItems: 'center',
    },
    productThumb: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    productHeaderText: { flex: 1, minWidth: 0 },
    productTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    productTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      flexShrink: 1,
    },
    sectionRemoveBtn: {
      padding: 0,
    },
    productSubtitle: {
      color: c.textMuted,
      fontSize: 11,
    },
    productHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
    },
    productPairs: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    tableWrap: { gap: 0 },
    tableHead: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    tableHeadText: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    colPowerHead: { flex: 1.3 },
    colQtyHead: { flex: 0.9, textAlign: 'center' },
    colAmountHead: { flex: 1, textAlign: 'right' },
    lineBlock: {
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
      gap: 2,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colPower: { flex: 1.3, paddingRight: 4 },
    colQty: { flex: 0.9, alignItems: 'center' },
    colAmount: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    tableCell: {
      color: c.text,
      fontSize: 12,
      fontWeight: '700',
    },
    eyeInline: {
      color: c.primary,
      fontWeight: '700',
    },
    qtyControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    qtyButton: {
      width: 26,
      height: 26,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyValue: {
      fontSize: 13,
      fontWeight: '700',
      minWidth: 18,
      textAlign: 'center',
      color: c.text,
    },
    amountText: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    removeBtn: { padding: 0 },
    statusLine: {
      fontSize: 10,
      color: c.textMuted,
      lineHeight: 14,
    },
  });
