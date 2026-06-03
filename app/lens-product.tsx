'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { RelatedLensCard } from '@/components/related-lens-card';
import { PRESCRIPTION_PICKER_HEIGHT, PrescriptionWheelPicker } from '@/components/prescription-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useCart } from '@/lib/cart';
import {
  buildCartLineId,
  canAcceptPrescriptionInput,
  formatPowerLabel,
  parseNumericInput,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  validatePrescriptionInRange,
  validatePrescriptionValue,
} from '@/lib/cart-utils';
import { useOrderMode } from '@/lib/order-mode';
import {
  coerceDisplayQuantity,
  getDefaultDisplayQuantity,
  getDefaultQuantityUnit,
  piecesFromDisplayQuantity,
  validateDisplayQuantityForMode,
  type QuantityUnit,
} from '@/lib/order-quantity';
import { formatAddValue, formatAxisValue, isSameLensPower } from '@/lib/lens-display';
import { fetchRelatedLenses } from '@/lib/lenses-api';
import { resolveSelectableRange } from '@/lib/prescription-range';
import { setPendingOnBehalfSelection } from '@/lib/on-behalf-selection';
import type { LensItem } from '@/lib/types/lens';

function parseLensPayload(rawPayload: string | string[] | undefined): LensItem | null {
  if (!rawPayload) return null;
  const single = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
  try {
    return JSON.parse(decodeURIComponent(single)) as LensItem;
  } catch {
    return null;
  }
}

export default function LensProductScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string; mode?: string }>();
  const { addToCart, updateQuantity, items: cartItems } = useCart();
  const { mode: orderMode, isWholesale } = useOrderMode();

  const item = useMemo(() => parseLensPayload(params.payload), [params.payload]);
  const isOnBehalfSelectMode = params.mode === 'on-behalf-select';
  const selectableRange = useMemo(() => (item ? resolveSelectableRange(item) : null), [item]);
  const lensType = item?.lensType ?? 'Progressive';
  const showAdd = lensType !== 'Single Vision';

  const initialSph = selectableRange?.sph.options[0] ?? item?.sph ?? 0;
  const initialCyl = selectableRange?.cyl?.options[0] ?? item?.cyl ?? 0;

  const [sph, setSph] = useState<number>(initialSph);
  const [cyl, setCyl] = useState<number>(initialCyl);
  const [add, setAdd] = useState(item ? String(item.add ?? '') : '');
  const [qtyUnit, setQtyUnit] = useState<QuantityUnit>(() => getDefaultQuantityUnit(orderMode));
  const [quantity, setQuantity] = useState(() =>
    String(getDefaultDisplayQuantity(orderMode, getDefaultQuantityUnit(orderMode)))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relatedLenses, setRelatedLenses] = useState<LensItem[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const formQuantityText = quantity.trim();
  const displayQtyNumber = formQuantityText ? Number(formQuantityText) : 0;
  const totalPieces =
    displayQtyNumber > 0 ? piecesFromDisplayQuantity(displayQtyNumber, qtyUnit) : 0;

  useEffect(() => {
    if (!item) {
      return;
    }

    const range = resolveSelectableRange(item);
    setSph(range?.sph.options[0] ?? item.sph);
    setCyl(range?.cyl?.options[0] ?? item.cyl ?? 0);
    setAdd(String(item.add ?? ''));
    const unit = getDefaultQuantityUnit(orderMode);
    setQtyUnit(unit);
    setQuantity(String(getDefaultDisplayQuantity(orderMode, unit)));
    setError(null);
  }, [item?.id, orderMode]);

  useEffect(() => {
    const unit = getDefaultQuantityUnit(orderMode);
    setQtyUnit(unit);
    setQuantity(String(getDefaultDisplayQuantity(orderMode, unit)));
  }, [orderMode]);

  function handleQtyUnitChange(nextUnit: QuantityUnit) {
    if (nextUnit === qtyUnit) {
      return;
    }
    setQtyUnit(nextUnit);
    setQuantity(String(getDefaultDisplayQuantity(orderMode, nextUnit)));
    setError(null);
  }

  useEffect(() => {
    if (!item?.id || !item.lensType) {
      setRelatedLenses([]);
      return;
    }

    const lensId = item.id;
    const lensType = item.lensType;
    const currentLens = item;
    let cancelled = false;

    async function loadRelated() {
      setRelatedLoading(true);
      try {
        const items = await fetchRelatedLenses(lensId, lensType);
        const filtered = items.filter(
          (related) => !isSameLensPower(related, currentLens)
        );
        if (!cancelled) {
          setRelatedLenses(filtered);
        }
      } catch {
        if (!cancelled) {
          setRelatedLenses([]);
        }
      } finally {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      }
    }

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.lensType, item?.sph, item?.cyl]);

  function openRelatedLens(related: LensItem) {
    router.push({
      pathname: '/lens-product',
      params: {
        payload: encodeURIComponent(JSON.stringify(related)),
        ...(params.mode ? { mode: params.mode } : {}),
      },
    });
  }

  const cartLineForSelection = useMemo(() => {
    if (!item || isOnBehalfSelectMode) {
      return null;
    }

    const parsedAdd = showAdd ? parseNumericInput(add) : null;
    const cylForLine = selectableRange?.cyl ? cyl : item.cyl ?? 0;
    const lineId = buildCartLineId({
      id: item.id,
      sph,
      cyl: cylForLine,
      add: parsedAdd,
    });

    return cartItems.find((entry) => entry.cartLineId === lineId) ?? null;
  }, [add, cartItems, cyl, isOnBehalfSelectMode, item, showAdd, sph, selectableRange?.cyl]);

  /** Button reflects whether this exact prescription + qty is already in the cart. */
  const showsAddedState = useMemo(() => {
    if (!cartLineForSelection || !formQuantityText) {
      return false;
    }
    return (
      totalPieces > 0 && cartLineForSelection.cartQuantity === totalPieces
    );
  }, [cartLineForSelection, totalPieces]);

  if (!item) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>Lens details</Text>
            <View style={styles.backBtn} />
          </View>
          <View style={styles.emptyWrap}>
            <Text style={styles.errorText}>Unable to load product details.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const maxAdd = item.add ?? 0;

  const prescriptionHint = selectableRange
    ? (() => {
        const sphOpts = selectableRange.sph.options;
        const sphStart = sphOpts[0] ?? selectableRange.sph.min;
        const sphEnd = sphOpts[sphOpts.length - 1] ?? selectableRange.sph.max;
        let hint = `Scroll to select SPH (${formatPowerLabel(sphStart)} to ${formatPowerLabel(sphEnd)})`;
        if (selectableRange.cyl?.options.length) {
          const cylOpts = selectableRange.cyl.options;
          const cylStart = cylOpts[0] ?? selectableRange.cyl.min;
          const cylEnd = cylOpts[cylOpts.length - 1] ?? selectableRange.cyl.max;
          hint += ` and CYL (${formatPowerLabel(cylStart)} to ${formatPowerLabel(cylEnd)})`;
        }
        return `${hint}.`;
      })()
    : `Select prescription values for this lens.`;

  function handleAddChange(text: string) {
    const sanitized = sanitizeSignedNumericInput(text);
    if (!canAcceptPrescriptionInput(sanitized, maxAdd)) {
      setError(`ADD cannot be greater than ${maxAdd}.`);
      return;
    }
    setAdd(sanitized);
    setError(null);
  }

  function handleQuantityChange(text: string) {
    const sanitized = sanitizePositiveIntegerInput(text);
    if (sanitized === '') {
      setQuantity('');
      setError(null);
      return;
    }
    setQuantity(coerceDisplayQuantity(sanitized, qtyUnit, orderMode));
    setError(null);
  }

  function handleSphChange(value: number) {
    setSph(value);
    setError(null);
  }

  function handleCylChange(value: number) {
    setCyl(value);
    setError(null);
  }

  async function handleSubmit() {
    const currentItem = item;
    if (!currentItem) {
      return;
    }

    if (!selectableRange) {
      setError('Unable to resolve prescription range.');
      return;
    }

    const sphError = validatePrescriptionInRange(
      'SPH',
      String(sph),
      selectableRange.sph.min,
      selectableRange.sph.max
    );
    if (sphError) {
      setError(sphError);
      return;
    }

    let parsedCyl: number;
    if (selectableRange.cyl) {
      const cylError = validatePrescriptionInRange(
        'CYL',
        String(cyl),
        selectableRange.cyl.min,
        selectableRange.cyl.max
      );
      if (cylError) {
        setError(cylError);
        return;
      }
      parsedCyl = cyl;
    } else {
      parsedCyl = currentItem.cyl ?? 0;
    }

    let parsedAdd: number | null = null;
    if (showAdd) {
      const addError = validatePrescriptionValue('ADD', add, maxAdd);
      if (addError) {
        setError(addError);
        return;
      }
      parsedAdd = parseNumericInput(add)!;
    }

    const parsedDisplayQty = Number(quantity);
    const qtyError = validateDisplayQuantityForMode(parsedDisplayQty, qtyUnit, orderMode);
    if (qtyError) {
      setError(qtyError);
      return;
    }
    const parsedQty = piecesFromDisplayQuantity(parsedDisplayQty, qtyUnit);

    const updatedItem: LensItem = {
      id: currentItem.id,
      costPrice: currentItem.costPrice,
      price: currentItem.price,
      sph,
      cyl: parsedCyl,
      axis: currentItem.axis,
      add: showAdd ? parsedAdd : null,
      eye: currentItem.eye,
      quantity: currentItem.quantity,
      createdAt: currentItem.createdAt,
      lensType: currentItem.lensType,
      brand: currentItem.brand,
      item: currentItem.item,
      coating: currentItem.coating,
      index: currentItem.index,
      selectableRange: currentItem.selectableRange,
    };

    if (isOnBehalfSelectMode) {
      setPendingOnBehalfSelection({
        lens: updatedItem,
        quantity: parsedQty,
      });
      router.back();
      return;
    }

    const lineId = buildCartLineId({
      id: updatedItem.id,
      sph,
      cyl: parsedCyl,
      add: parsedAdd,
    });
    const existingLine = cartItems.find((entry) => entry.cartLineId === lineId);

    setSubmitting(true);
    setError(null);
    try {
      if (existingLine) {
        await updateQuantity(lineId, parsedQty);
      } else {
        await addToCart(updatedItem, parsedQty);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Lens details</Text>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAwareScroll contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryBrand}>{item.brand || 'Lens'}</Text>
            <Text style={styles.summaryMeta}>{[item.item, item.coating].filter(Boolean).join(' · ') || 'Standard'}</Text>
            <Text style={styles.summaryType}>{lensType}</Text>
            <Text style={styles.summaryPrice}>₹{item.price} / pc</Text>
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
              <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
              <Text style={styles.prescriptionHeaderLabel}>ADD</Text>
              <Text style={styles.prescriptionHeaderLabel}>AXIS</Text>
            </View>
            <View style={styles.catalogDetailRow}>
              <Text style={styles.catalogDetailValue}>{formatPowerLabel(item.sph)}</Text>
              <Text style={styles.catalogDetailValue}>
                {item.cyl != null ? formatPowerLabel(item.cyl) : '—'}
              </Text>
              <Text style={styles.catalogDetailValue}>{formatAddValue(item.add)}</Text>
              <Text style={styles.catalogDetailValue}>{formatAxisValue(item.axis)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Prescription</Text>
          {isWholesale ? (
            <Text style={styles.pairsOnlyNotice}>You are able to order in pairs only.</Text>
          ) : null}
          <Text style={styles.sectionHint}>{prescriptionHint}</Text>

          <View style={styles.qtyUnitRow}>
            <Text style={styles.qtyUnitLabel}>Qty</Text>
            <Pressable
              style={styles.qtyUnitOption}
              onPress={() => handleQtyUnitChange('piece')}
              accessibilityRole="radio"
              accessibilityState={{ selected: qtyUnit === 'piece' }}>
              <View style={[styles.qtyUnitRadio, qtyUnit === 'piece' && styles.qtyUnitRadioSelected]}>
                {qtyUnit === 'piece' ? <View style={styles.qtyUnitRadioDot} /> : null}
              </View>
              <Text style={[styles.qtyUnitOptionText, qtyUnit === 'piece' && styles.qtyUnitOptionTextActive]}>
                Piece
              </Text>
            </Pressable>
            <Pressable
              style={styles.qtyUnitOption}
              onPress={() => handleQtyUnitChange('pair')}
              accessibilityRole="radio"
              accessibilityState={{ selected: qtyUnit === 'pair' }}>
              <View style={[styles.qtyUnitRadio, qtyUnit === 'pair' && styles.qtyUnitRadioSelected]}>
                {qtyUnit === 'pair' ? <View style={styles.qtyUnitRadioDot} /> : null}
              </View>
              <Text style={[styles.qtyUnitOptionText, qtyUnit === 'pair' && styles.qtyUnitOptionTextActive]}>
                Pair
              </Text>
            </Pressable>
            {totalPieces > 0 ? (
              <Text style={styles.qtyUnitPiecesHint}>
                = {totalPieces} pc{totalPieces === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>

          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
              <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
              <Text
                style={[
                  styles.prescriptionHeaderLabel,
                  showAdd ? styles.prescriptionHeaderLabelNarrow : null,
                ]}>
                QTY
              </Text>
              {showAdd ? (
                <View style={styles.addHeaderCell}>
                  <Text style={styles.prescriptionHeaderLabelCompact}>ADD</Text>
                  <Text style={styles.addMaxHint}>max {formatPowerLabel(maxAdd)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.prescriptionRow}>
              <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
                {selectableRange ? (
                  <PrescriptionWheelPicker
                    options={selectableRange.sph.options}
                    value={sph}
                    onChange={handleSphChange}
                  />
                ) : null}
              </View>
              <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
                {selectableRange?.cyl ? (
                  <PrescriptionWheelPicker
                    options={selectableRange.cyl.options}
                    value={cyl}
                    onChange={handleCylChange}
                  />
                ) : (
                  <View style={styles.pickerColumnPlaceholder}>
                    <Text style={styles.pickerPlaceholderText}>—</Text>
                  </View>
                )}
              </View>
              <View style={[styles.compactFieldColumn, showAdd && styles.compactFieldColumnNarrow]}>
                <TextInput
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  keyboardType="number-pad"
                  style={showAdd ? styles.compactFieldInput : styles.qtyFieldInput}
                  placeholder={String(getDefaultDisplayQuantity(orderMode, qtyUnit))}
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              {showAdd ? (
                <View style={styles.compactFieldColumnNarrow}>
                  <TextInput
                    value={add}
                    onChangeText={handleAddChange}
                    keyboardType="numbers-and-punctuation"
                    style={styles.compactFieldInput}
                    placeholder={formatPowerLabel(maxAdd)}
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.addBtn, showsAddedState && styles.addBtnSuccess, submitting && styles.addBtnDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={submitting}>
            <MaterialIcons
              name={
                isOnBehalfSelectMode
                  ? 'check-circle-outline'
                  : showsAddedState
                    ? 'check-circle'
                    : 'add-shopping-cart'
              }
              size={20}
              color={colors.primaryText}
            />
            <Text style={styles.addBtnText}>
              {isOnBehalfSelectMode ? 'Select product' : showsAddedState ? 'Added to cart' : 'Add to cart'}
            </Text>
            {isOnBehalfSelectMode || !showsAddedState ? (
              <MaterialIcons name="arrow-right-alt" size={20} color={colors.primaryText} />
            ) : null}
          </Pressable>

          {!isOnBehalfSelectMode ? (
            <View style={styles.relatedSection}>
              <View style={styles.relatedDivider} />
              <Text style={styles.relatedTitle}>Related Products</Text>
              {relatedLoading ? (
                <Text style={styles.relatedHint}>Loading related lenses…</Text>
              ) : relatedLenses.length > 0 ? (
                relatedLenses.map((related) => (
                  <RelatedLensCard
                    key={related.id}
                    item={related}
                    onPress={() => openRelatedLens(related)}
                  />
                ))
              ) : (
                <Text style={styles.relatedHint}>No related lenses found for this product.</Text>
              )}
            </View>
          ) : null}
        </KeyboardAwareScroll>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    content: { padding: 16, paddingBottom: 32 },
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      marginBottom: 18,
    },
    summaryBrand: { color: c.text, fontSize: 22, fontWeight: '700' },
    summaryMeta: { color: c.textMuted, fontSize: 14, marginTop: 4 },
    summaryType: { color: c.text, fontSize: 16, marginTop: 6, fontWeight: '600' },
    summaryPrice: { color: c.primary, fontSize: 18, marginTop: 8, fontWeight: '800' },
    catalogDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    catalogDetailValue: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: c.textMuted,
    },
    sectionTitle: {
      color: c.label,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    pairsOnlyNotice: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
    },
    qtyUnitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    qtyUnitLabel: {
      color: c.text,
      fontSize: 14,
      fontWeight: '700',
      marginRight: 4,
    },
    qtyUnitOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    qtyUnitRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyUnitRadioSelected: {
      borderColor: c.primary,
    },
    qtyUnitRadioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    qtyUnitOptionText: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    qtyUnitOptionTextActive: {
      color: c.text,
      fontWeight: '700',
    },
    qtyUnitPiecesHint: {
      marginLeft: 'auto',
      color: c.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    sectionHint: { color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
    prescriptionCard: {
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    prescriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.menuRowAlt,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    addHeaderCell: {
      flex: 0.85,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addMaxHint: {
      fontSize: 9,
      fontWeight: '600',
      color: c.primary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    prescriptionHeaderLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: c.label,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    prescriptionHeaderLabelNarrow: {
      flex: 0.82,
    },
    prescriptionHeaderLabelCompact: {
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: c.label,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    prescriptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    pickerColumn: { flex: 1 },
    pickerColumnCompact: { flex: 1.05 },
    pickerColumnPlaceholder: {
      height: PRESCRIPTION_PICKER_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerPlaceholderText: { color: c.textMuted, fontSize: 18 },
    compactFieldColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    compactFieldColumnNarrow: {
      flex: 0.82,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    qtyFieldInput: {
      width: '100%',
      maxWidth: 88,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    compactFieldInput: {
      width: '100%',
      minWidth: 48,
      maxWidth: 62,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 7,
      paddingHorizontal: 4,
    },
    errorText: { color: c.danger, textAlign: 'center', marginBottom: 12, fontSize: 14 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 4,
    },
    addBtnSuccess: {
      opacity: 0.92,
    },
    addBtnDisabled: {
      opacity: 0.6,
    },
    addBtnText: { color: c.primaryText, fontWeight: '800', fontSize: 16 },
    relatedSection: { marginTop: 28 },
    relatedDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.cardBorder,
      marginBottom: 16,
    },
    relatedTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 14,
    },
    relatedHint: {
      color: c.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  });
