'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { appAlert } from '@/lib/app-alert';
import {
  formatMoneyInput,
  formatPowerLabel,
  parseNumericInput,
  roundMoney,
  sanitizePositiveDecimalInput,
  sanitizePositiveIntegerInput,
} from '@/lib/cart-utils';
import {
  formatAddValue,
  formatAxisValue,
  formatSphCylSlash,
} from '@/lib/lens-display';
import {
  getOrderLensRef,
  getOrderPowerDisplayLines,
  orderToLensItem,
} from '@/lib/order-list-display';
import { formatPairQuantity, pairsFromPieces } from '@/lib/order-quantity';
import { isOfflineQueuedError } from '@/lib/api-request';
import type { OrderRecord } from '@/lib/orders-api';
import { recordStockIntake } from '@/lib/procurement-api';
import { formatProgressiveEyeLabel } from '@/lib/progressive-eye';
import { formatLensType } from '@/lib/types/lens';
import { AlternatePowerPanel } from '@/components/alternate-power-panel';

function formatPowerCell(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return formatPowerLabel(Number(value));
}
type EmployeeProcurementProductSheetProps = {
  visible: boolean;
  order: OrderRecord | null;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => Record<string, string>;
};

export function EmployeeProcurementProductSheet({
  visible,
  order,
  onClose,
  onSuccess,
  getAuthHeaders,
}: EmployeeProcurementProductSheetProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [quantity, setQuantity] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lensRef = useMemo(() => (order ? getOrderLensRef(order) : null), [order]);
  const lensItem = useMemo(() => (order ? orderToLensItem(order) : null), [order]);
  const powerLines = useMemo(
    () => (order ? getOrderPowerDisplayLines(order) : []),
    [order]
  );
  const productLabel = lensItem
    ? [lensItem.brand, lensItem.coating, lensItem.item]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' · ')
    : '';
  const eyeLabel = formatProgressiveEyeLabel(lensItem?.eye);

  useEffect(() => {
    if (!visible || !order) {
      return;
    }
    const qty = Math.max(1, Number(order.quantity) || 1);
    setQuantity(String(qty));
    setCostPrice('');
    setTotalPrice('');
  }, [visible, order]);

  function syncTotalFromPerUnit(qty: number, perUnit: string) {
    const per = parseNumericInput(perUnit);
    if (per !== null && per >= 0 && qty > 0) {
      setTotalPrice(formatMoneyInput(per * qty));
    }
  }

  function syncPerUnitFromTotal(qty: number, total: string) {
    const lineTotal = parseNumericInput(total);
    if (lineTotal !== null && lineTotal >= 0 && qty > 0) {
      setCostPrice(formatMoneyInput(lineTotal / qty));
    }
  }

  function handleQuantityChange(text: string) {
    const sanitized = sanitizePositiveIntegerInput(text) || '';
    setQuantity(sanitized);
    const qty = Number(sanitized);
    if (!Number.isInteger(qty) || qty <= 0) {
      return;
    }
    const perUnit = parseNumericInput(costPrice);
    const total = parseNumericInput(totalPrice);
    if (perUnit !== null && perUnit >= 0) {
      setTotalPrice(formatMoneyInput(perUnit * qty));
    } else if (total !== null && total >= 0) {
      setCostPrice(formatMoneyInput(total / qty));
    }
  }

  async function handleSubmit() {
    if (!order || !lensRef) {
      appAlert('Missing product', 'This order line has no linked lens product.');
      return;
    }

    const qty = Number(quantity);
    const perUnit = parseNumericInput(costPrice);
    const purchaseTotal = parseNumericInput(totalPrice);
    const sellPrice = Number(order.unitPrice || 0);

    if (!Number.isInteger(qty) || qty <= 0) {
      appAlert('Invalid quantity', 'Enter a whole number greater than 0.');
      return;
    }
    if (perUnit === null || perUnit <= 0) {
      appAlert('Invalid cost price', 'Enter the purchase price per unit.');
      return;
    }
    if (purchaseTotal === null || purchaseTotal <= 0) {
      appAlert('Invalid total cost', 'Enter the total purchase amount.');
      return;
    }
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      appAlert('Missing sell price', 'This order line has no customer selling price on file.');
      return;
    }

    const expectedTotal = roundMoney(perUnit * qty);
    if (Math.abs(expectedTotal - roundMoney(purchaseTotal)) > 0.05) {
      appAlert('Price mismatch', 'Total cost should match cost per unit × quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await recordStockIntake(
        {
          lensType: lensRef.lensType,
          lensId: lensRef.lensId,
          quantityAdded: qty,
          amount: roundMoney(purchaseTotal),
          costPrice: roundMoney(perUnit),
          sellingPrice: roundMoney(sellPrice),
          orderId: order.id,
          description: `Procurement for order line ${order.id.slice(-6).toUpperCase()}`,
        },
        getAuthHeaders()
      );
      appAlert('Purchase recorded', 'Stock added. This order line will now appear in Orders.');
      onSuccess();
      onClose();
    } catch (err) {
      if (isOfflineQueuedError(err)) {
        appAlert('Saved offline', err.message);
        onSuccess();
        onClose();
        return;
      }
      appAlert('Failed', err instanceof Error ? err.message : 'Could not record purchase.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!order) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle}>Add purchase</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={2}>
                {productLabel || 'Record stock intake for this order line.'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {lensItem ? (
              <View style={styles.powersBox}>
                <Text style={styles.powersLabel}>Product details</Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {productLabel || 'Lens product'}
                </Text>
                <Text style={styles.productMeta}>
                  {formatLensType(order.lensType ?? '')}
                  {lensItem.index != null ? ` · Index ${lensItem.index}` : ''}
                </Text>
                {eyeLabel ? (
                  <View style={styles.eyeBadge}>
                    <Text style={styles.eyeBadgeText}>{eyeLabel}</Text>
                  </View>
                ) : null}
                <Text style={styles.productPrice}>₹{lensItem.price} / pr</Text>
              </View>
            ) : null}

            {powerLines.length > 0 ? (
              <View style={styles.powersSection}>
                <Text style={styles.powersLabel}>Ordered powers</Text>
                {powerLines.map((line) => (
                  <View key={line.key} style={styles.powersBox}>
                    <View style={styles.powerRow}>
                      <Text style={styles.powerText}>
                        {formatSphCylSlash({
                          sph: line.sph,
                          cyl: line.cyl,
                          crossPower: line.crossPower,
                        })}
                      </Text>
                      <Text style={styles.powerQty}>
                        {formatPairQuantity(pairsFromPieces(line.quantity))} pr
                      </Text>
                    </View>
                    <View style={styles.detailGrid}>
                      {(
                        [
                          ['SPH', formatPowerCell(line.sph)],
                          ['CYL', formatPowerCell(line.cyl)],
                          ['ADD', formatAddValue(line.add)],
                          ['AXIS', formatAxisValue(line.axis)],
                        ] as const
                      ).map(([label, value]) => (
                        <View key={label} style={styles.detailCell}>
                          <Text style={styles.detailLabel}>{label}</Text>
                          <Text style={styles.detailValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                    {eyeLabel ? (
                      <Text style={styles.eyeOrderedText}>Ordered for: {eyeLabel}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Quantity to add</Text>
            <TextInput
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              placeholder="e.g. 10"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Cost / unit (₹)</Text>
                <TextInput
                  value={costPrice}
                  onChangeText={(text) => {
                    const sanitized = sanitizePositiveDecimalInput(text);
                    setCostPrice(sanitized);
                    const qty = Number(quantity);
                    if (Number.isInteger(qty) && qty > 0) {
                      syncTotalFromPerUnit(qty, sanitized);
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Per unit"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Total cost (₹)</Text>
                <TextInput
                  value={totalPrice}
                  onChangeText={(text) => {
                    const sanitized = sanitizePositiveDecimalInput(text);
                    setTotalPrice(sanitized);
                    const qty = Number(quantity);
                    if (Number.isInteger(qty) && qty > 0) {
                      syncPerUnitFromTotal(qty, sanitized);
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Line total"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </View>
            </View>

            {order && (order.lineType ?? 'RETAIL') === 'RETAIL' ? (
              <View style={{ marginTop: 16 }}>
                <AlternatePowerPanel
                  order={order}
                  mode="staff"
                  getAuthHeaders={getAuthHeaders}
                  onChanged={onSuccess}
                />
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.submitButtonText}>Record purchase</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.65)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 20,
      paddingTop: 8,
      maxHeight: '88%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(240, 161, 50, 0.35)',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    sheetHeaderText: { flex: 1, minWidth: 0 },
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    sheetSubtitle: { marginTop: 4, color: c.textMuted, fontSize: 14, fontWeight: '600' },
    powersSection: { marginBottom: 8, gap: 8 },
    powersBox: {
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
      gap: 8,
    },
    powersLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    productName: { color: c.text, fontSize: 16, fontWeight: '800' },
    productMeta: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    productPrice: { color: c.primary, fontSize: 14, fontWeight: '800' },
    eyeBadge: {
      alignSelf: 'flex-start',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(240, 161, 50, 0.35)',
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    eyeBadgeText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    eyeOrderedText: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    powerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    powerText: { color: c.text, fontSize: 14, fontWeight: '700', flex: 1 },
    powerQty: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    detailGrid: { flexDirection: 'row', gap: 6 },
    detailCell: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    detailValue: {
      marginTop: 4,
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      backgroundColor: c.inputBg,
    },
    rowFields: { flexDirection: 'row', gap: 10 },
    halfField: { flex: 1 },
    submitButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 12,
      backgroundColor: c.primary,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: c.primaryText, fontSize: 16, fontWeight: '800' },
  });
