'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  formatPowerLabel,
  formatPowerRangeLabel,
  sanitizePairQuantityInput,
  validatePrescriptionInRange,
} from '@/lib/cart-utils';
import { useOrderMode } from '@/lib/order-mode';
import {
  coerceDisplayQuantity,
  formatPairQuantity,
  getDefaultDisplayQuantity,
  MIN_PAIR_QUANTITY,
  PAIR_QUANTITY_STEP,
  piecesFromDisplayQuantity,
  validateDisplayQuantityForMode,
} from '@/lib/order-quantity';
import {
  formatAddValue,
  formatAxisValue,
  formatLensItemCoatingSummary,
  formatLensProductCardTitle,
  isSameLensPower,
} from '@/lib/lens-display';
import { LENS_PRICE_PER_PAIR_LABEL } from '@/lib/lens-pricing';
import { fetchRelatedLenses } from '@/lib/lenses-api';
import {
  resolveAddOptions,
  resolveCrossCylRangeForSph,
  resolveCrossSphRangeForMax,
  resolveSelectableRange,
} from '@/lib/prescription-range';
import { coerceCrossCylForSph, resolveCrossPowerMeta } from '@/lib/cross-power';
import { setPendingOnBehalfSelection } from '@/lib/on-behalf-selection';
import { setPendingStockLensSelection } from '@/lib/stock-lens-selection';
import type { LensItem } from '@/lib/types/lens';
import {
  PROGRESSIVE_EYE_OPTIONS,
  progressiveCartEyes,
  progressivePairQuantityRequired,
  piecesPerEyeFromDisplayQuantity,
  validateProgressivePairQuantity,
  type ProgressiveEyeOption,
} from '@/lib/progressive-eye';
import { isWhiteCatalogLensId } from '@/lib/white-catalog';
import { WhiteCatalogPowerForm } from '@/components/white-catalog-power-form';

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
  const isWhiteCatalogProduct = item ? isWhiteCatalogLensId(item.id) : false;
  const isOnBehalfSelectMode = params.mode === 'on-behalf-select';
  const isStockSelectMode = params.mode === 'stock-select';
  const isSelectMode = isOnBehalfSelectMode || isStockSelectMode;
  const lensType = item?.lensType ?? 'Progressive';
  const showAdd = lensType !== 'Single Vision';
  const showProgressiveEye = lensType === 'Progressive' && !isWholesale;
  const [relatedLenses, setRelatedLenses] = useState<LensItem[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const selectableRange = useMemo(() => {
    if (!item) {
      return null;
    }
    return resolveSelectableRange(item);
  }, [item]);
  const crossMeta = useMemo(
    () => (item ? resolveCrossPowerMeta(item) : null),
    [item]
  );
  const addOptions = useMemo(() => (item && showAdd ? resolveAddOptions(item) : []), [item, showAdd]);

  const initialSph = selectableRange?.sph.options[0] ?? item?.sph ?? 0;
  const initialCyl =
    crossMeta && selectableRange
      ? coerceCrossCylForSph(
          initialSph,
          selectableRange.cyl?.options[0] ?? 0,
          crossMeta.maxCyl,
          crossMeta.cylStartRange
        )
      : (selectableRange?.cyl?.options[0] ?? item?.cyl ?? 0);
  const initialAdd = addOptions[0] ?? 1;

  const [sph, setSph] = useState<number>(initialSph);
  const [cyl, setCyl] = useState<number>(initialCyl);
  const [add, setAdd] = useState<number>(initialAdd);
  const [selectedEye, setSelectedEye] = useState<ProgressiveEyeOption>('LEFT');
  const [quantity, setQuantity] = useState(() => String(getDefaultDisplayQuantity(orderMode)));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bothEyesSelected =
    showProgressiveEye && progressivePairQuantityRequired(selectedEye);

  const effectiveSelectableRange = useMemo(() => {
    if (!selectableRange || !crossMeta) {
      return selectableRange;
    }

    const sphRange = resolveCrossSphRangeForMax(crossMeta);
    const cylRange = resolveCrossCylRangeForSph(sph, crossMeta);
    return {
      ...selectableRange,
      sph: sphRange,
      cyl: cylRange.options.length ? cylRange : selectableRange.cyl,
    };
  }, [sph, crossMeta, selectableRange]);

  const formQuantityText = quantity.trim();
  const displayQtyNumber = formQuantityText ? Number(formQuantityText) : 0;
  const totalPieces =
    displayQtyNumber > 0 ? piecesFromDisplayQuantity(displayQtyNumber, 'pair') : 0;
  const piecesPerEye =
    showProgressiveEye && displayQtyNumber > 0
      ? piecesPerEyeFromDisplayQuantity(displayQtyNumber, 'pair', selectedEye)
      : totalPieces;

  useEffect(() => {
    if (!item) {
      return;
    }

    const range = resolveSelectableRange(item);
    const nextSph = range.sph.options[0] ?? item.sph;
    const nextCyl =
      crossMeta && range.cyl
        ? coerceCrossCylForSph(
            nextSph,
            range.cyl.options[0] ?? 0,
            crossMeta.maxCyl,
            crossMeta.cylStartRange
          )
        : (range.cyl?.options[0] ?? item.cyl ?? 0);
    setSph(nextSph);
    setCyl(nextCyl);
    setAdd(resolveAddOptions(item)[0] ?? 1);
    setSelectedEye('LEFT');
    setQuantity(String(getDefaultDisplayQuantity(orderMode)));
    setError(null);
  }, [item?.id, orderMode, crossMeta]);

  useEffect(() => {
    setQuantity(String(getDefaultDisplayQuantity(orderMode)));
  }, [orderMode]);

  useEffect(() => {
    if (!bothEyesSelected) {
      return;
    }
    const parsed = Number(quantity);
    if (Number.isFinite(parsed) && Math.abs(parsed - Math.round(parsed)) > 1e-9) {
      setQuantity(String(Math.max(1, Math.round(parsed))));
    }
  }, [bothEyesSelected, quantity]);

  useEffect(() => {
    if (!item?.id || !item.lensType || isWhiteCatalogProduct) {
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
        const relatedItems = await fetchRelatedLenses(lensId, lensType);
        const filtered = relatedItems.filter(
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

  const cartLinesForSelection = useMemo(() => {
    if (!item || isSelectMode) {
      return null;
    }

    const cylForLine = effectiveSelectableRange?.cyl ? cyl : item.cyl ?? 0;
    const eyes = showProgressiveEye ? progressiveCartEyes(selectedEye) : [undefined];

    return eyes.map((eye) => {
      const lineId = buildCartLineId({
        id: item.id,
        sph,
        cyl: cylForLine,
        add: showAdd ? add : null,
        axis: item.axis,
        eye,
      });
      return cartItems.find((entry) => entry.cartLineId === lineId) ?? null;
    });
  }, [
    add,
    cartItems,
    cyl,
    isSelectMode,
    item,
    selectedEye,
    showAdd,
    showProgressiveEye,
    sph,
    effectiveSelectableRange?.cyl,
  ]);

  /** Button reflects whether this exact prescription + qty is already in the cart. */
  const showsAddedState = useMemo(() => {
    if (!cartLinesForSelection || !formQuantityText) {
      return false;
    }
    if (piecesPerEye <= 0) {
      return false;
    }
    return cartLinesForSelection.every(
      (line) => line != null && line.cartQuantity === piecesPerEye
    );
  }, [cartLinesForSelection, piecesPerEye, formQuantityText]);

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

  const prescriptionHint = effectiveSelectableRange
    ? (() => {
        const sphOpts = effectiveSelectableRange.sph.options;
        const sphStart = sphOpts[0] ?? effectiveSelectableRange.sph.min;
        const sphEnd = sphOpts[sphOpts.length - 1] ?? effectiveSelectableRange.sph.max;
        let hint = `Scroll to select SPH (${formatPowerRangeLabel(sphStart, sphEnd)})`;
        if (effectiveSelectableRange.cyl?.options.length) {
          const cylOpts = effectiveSelectableRange.cyl.options;
          const cylStart = cylOpts[0] ?? effectiveSelectableRange.cyl.min;
          const cylEnd = cylOpts[cylOpts.length - 1] ?? effectiveSelectableRange.cyl.max;
          hint += ` and CYL (${formatPowerRangeLabel(cylStart, cylEnd)})`;
        }
        if (showAdd && addOptions.length > 0) {
          const addStart = addOptions[0]!;
          const addEnd = addOptions[addOptions.length - 1]!;
          hint += ` and ADD (${formatPowerRangeLabel(addStart, addEnd)})`;
        }
        return `${hint}.`;
      })()
    : `Select prescription values for this lens.`;

  function handleAddChange(value: number) {
    setAdd(value);
    setError(null);
  }

  function handleQuantityChange(text: string) {
    const sanitized = sanitizePairQuantityInput(text);
    if (sanitized === '') {
      setQuantity('');
      setError(null);
      return;
    }
    setQuantity(coerceDisplayQuantity(sanitized));
    setError(null);
  }

  function adjustQuantity(direction: -1 | 1) {
    const step = bothEyesSelected ? 1 : PAIR_QUANTITY_STEP;
    const min = bothEyesSelected ? 1 : MIN_PAIR_QUANTITY;
    const parsed = Number.parseFloat(quantity);
    const current =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : getDefaultDisplayQuantity(orderMode);
    const snapped = Math.round((current + direction * step) * 2) / 2;
    const next = Math.max(min, snapped);
    setQuantity(formatPairQuantity(next));
    setError(null);
  }

  function handleSphChange(value: number) {
    setSph(value);
    if (crossMeta) {
      setCyl((currentCyl) =>
        coerceCrossCylForSph(value, currentCyl, crossMeta.maxCyl, crossMeta.cylStartRange)
      );
    }
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

    if (!effectiveSelectableRange) {
      setError('Unable to resolve prescription range.');
      return;
    }

    const sphError = validatePrescriptionInRange(
      'SPH',
      String(sph),
      effectiveSelectableRange.sph.min,
      effectiveSelectableRange.sph.max
    );
    if (sphError) {
      setError(sphError);
      return;
    }

    let parsedCyl: number;
    if (effectiveSelectableRange.cyl) {
      const cylError = validatePrescriptionInRange(
        'CYL',
        String(cyl),
        effectiveSelectableRange.cyl.min,
        effectiveSelectableRange.cyl.max
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
    if (showAdd && addOptions.length > 0) {
      const addLow = addOptions[0]!;
      const addHigh = addOptions[addOptions.length - 1]!;
      const addError = validatePrescriptionInRange('ADD', String(add), addLow, addHigh);
      if (addError) {
        setError(addError);
        return;
      }
      parsedAdd = add;
    }

    const parsedDisplayQty = Number(quantity);
    const progressiveQtyError = showProgressiveEye
      ? validateProgressivePairQuantity(selectedEye, parsedDisplayQty)
      : null;
    if (progressiveQtyError) {
      setError(progressiveQtyError);
      return;
    }
    const qtyError = validateDisplayQuantityForMode(parsedDisplayQty, 'pair', orderMode, {
      wholePairsOnly: bothEyesSelected,
    });
    if (qtyError) {
      setError(qtyError);
      return;
    }
    const parsedQty = piecesPerEyeFromDisplayQuantity(
      parsedDisplayQty,
      'pair',
      showProgressiveEye ? selectedEye : 'LEFT'
    );
    const eyesToAdd = showProgressiveEye ? progressiveCartEyes(selectedEye) : [undefined];

    if (isSelectMode) {
      const eye = eyesToAdd[0];
      const updatedItem: LensItem = {
        id: currentItem.id,
        costPrice: currentItem.costPrice,
        price: currentItem.price,
        sph,
        cyl: parsedCyl,
        axis: currentItem.axis,
        add: showAdd ? parsedAdd : null,
        eye,
        quantity: currentItem.quantity,
        createdAt: currentItem.createdAt,
        lensType: currentItem.lensType,
        brand: currentItem.brand,
        item: currentItem.item,
        coating: currentItem.coating,
        index: currentItem.index,
        selectableRange: currentItem.selectableRange,
      };
      const selection = {
        lens: updatedItem,
        quantity: parsedQty,
      };
      if (isStockSelectMode) {
        setPendingStockLensSelection(selection);
      } else {
        setPendingOnBehalfSelection(selection);
      }
      router.back();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      for (const eye of eyesToAdd) {
        const updatedItem: LensItem = {
          id: currentItem.id,
          costPrice: currentItem.costPrice,
          price: currentItem.price,
          sph,
          cyl: parsedCyl,
          axis: currentItem.axis,
          add: showAdd ? parsedAdd : null,
          eye,
          quantity: currentItem.quantity,
          createdAt: currentItem.createdAt,
          lensType: currentItem.lensType,
          brand: currentItem.brand,
          item: currentItem.item,
          coating: currentItem.coating,
          index: currentItem.index,
          selectableRange: currentItem.selectableRange,
        };

        const lineId = buildCartLineId({
          id: updatedItem.id,
          sph,
          cyl: parsedCyl,
          add: parsedAdd,
          axis: currentItem.axis,
          eye,
        });
        const existingLine = cartItems.find((entry) => entry.cartLineId === lineId);

        if (existingLine) {
          await updateQuantity(lineId, parsedQty);
        } else {
          await addToCart(updatedItem, parsedQty);
        }
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
            {item.imageUrl ? (
              <View style={styles.summaryImageWrap}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.summaryImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
            <Text style={styles.summaryBrand}>{formatLensProductCardTitle(item)}</Text>
            <Text style={styles.summaryMeta}>{formatLensItemCoatingSummary(item)}</Text>
            <Text style={styles.summaryType}>{lensType}</Text>
            <Text style={styles.summaryPrice}>
              {isWhiteCatalogProduct ? 'White catalog product' : `₹${item.price}${LENS_PRICE_PER_PAIR_LABEL}`}
            </Text>
            {isWhiteCatalogProduct ? (
              <Text style={styles.whiteCatalogHint}>Select power from the white catalog range below.</Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
              <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
              <Text style={styles.prescriptionHeaderLabel}>AXIS</Text>
              <Text style={styles.prescriptionHeaderLabel}>ADD</Text>
            </View>
            <View style={styles.catalogDetailRow}>
              <Text style={styles.catalogDetailValue}>
                {item.sph != null ? formatPowerLabel(item.sph) : '—'}
              </Text>
              <Text style={styles.catalogDetailValue}>
                {item.cyl != null ? formatPowerLabel(item.cyl) : '—'}
              </Text>
              <Text style={styles.catalogDetailValue}>{formatAxisValue(item.axis)}</Text>
              <Text style={styles.catalogDetailValue}>{formatAddValue(item.add)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Prescription</Text>
          {isWholesale ? (
            <Text style={styles.pairsOnlyNotice}>You are able to order in pairs only.</Text>
          ) : null}
          {showProgressiveEye ? (
            <>
              <Text style={styles.eyeSectionTitle}>Eye</Text>
              <View style={styles.eyeRow}>
                {PROGRESSIVE_EYE_OPTIONS.map((option) => {
                  const active = selectedEye === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.eyeChip, active && styles.eyeChipActive]}
                      onPress={() => {
                        setSelectedEye(option.id);
                        setError(null);
                      }}>
                      <Text style={[styles.eyeChipText, active && styles.eyeChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedEye === 'BOTH' ? (
                <Text style={styles.eyeHint}>
                  Adds one cart line for both eyes. Order in pairs only.
                </Text>
              ) : null}
            </>
          ) : null}
          <Text style={styles.sectionHint}>{prescriptionHint}</Text>

          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
              <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
              {showAdd ? <Text style={styles.prescriptionHeaderLabel}>ADD</Text> : null}
            </View>
            <View style={styles.prescriptionRow}>
              <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
                {effectiveSelectableRange ? (
                  <PrescriptionWheelPicker
                    options={effectiveSelectableRange.sph.options}
                    value={sph}
                    onChange={handleSphChange}
                  />
                ) : null}
              </View>
              <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
                {effectiveSelectableRange?.cyl ? (
                  <PrescriptionWheelPicker
                    options={effectiveSelectableRange.cyl.options}
                    value={cyl}
                    onChange={handleCylChange}
                  />
                ) : (
                  <View style={styles.pickerColumnPlaceholder}>
                    <Text style={styles.pickerPlaceholderText}>—</Text>
                  </View>
                )}
              </View>
              {showAdd && addOptions.length > 0 ? (
                <View style={[styles.pickerColumn, styles.pickerColumnCompact]}>
                  <PrescriptionWheelPicker
                    options={addOptions}
                    value={add}
                    onChange={handleAddChange}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.qtyStepperRow}>
              <Text style={styles.qtyStepperLabel}>Qty</Text>
              <View style={styles.qtyStepperControls}>
                <Pressable
                  style={styles.qtyStepperBtn}
                  onPress={() => adjustQuantity(-1)}
                  accessibilityLabel="Decrease quantity"
                  hitSlop={8}>
                  <MaterialIcons name="remove" size={18} color={colors.primary} />
                </Pressable>
                <TextInput
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  onBlur={() => {
                    const parsed = Number.parseFloat(quantity);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      return;
                    }
                    const min = bothEyesSelected ? 1 : MIN_PAIR_QUANTITY;
                    const snapped = Math.round(parsed * 2) / 2;
                    setQuantity(formatPairQuantity(Math.max(min, snapped)));
                  }}
                  keyboardType="decimal-pad"
                  style={styles.qtyStepperInput}
                  placeholder={String(getDefaultDisplayQuantity(orderMode))}
                  placeholderTextColor={colors.placeholder}
                />
                <Pressable
                  style={styles.qtyStepperBtn}
                  onPress={() => adjustQuantity(1)}
                  accessibilityLabel="Increase quantity"
                  hitSlop={8}>
                  <MaterialIcons name="add" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.addBtn, showsAddedState && styles.addBtnSuccess, submitting && styles.addBtnDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <MaterialIcons
                name={
                  isSelectMode
                    ? 'check-circle-outline'
                    : showsAddedState
                      ? 'check-circle'
                      : 'add-shopping-cart'
                }
                size={20}
                color={colors.primaryText}
              />
            )}
            <Text style={styles.addBtnText}>
              {submitting
                ? 'Adding…'
                : isStockSelectMode
                  ? 'Select for stock'
                  : isOnBehalfSelectMode
                    ? 'Select product'
                    : showsAddedState
                      ? 'Added to cart'
                      : 'Add to cart'}
            </Text>
            {!submitting && (isSelectMode || !showsAddedState) ? (
              <MaterialIcons name="arrow-right-alt" size={20} color={colors.primaryText} />
            ) : null}
          </Pressable>

          {(params.mode !== 'on-behalf-select') && !isWhiteCatalogProduct ? (
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
    summaryImageWrap: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    summaryImage: {
      width: '100%',
      height: '100%',
    },
    summaryBrand: { color: c.text, fontSize: 22, fontWeight: '700' },
    summaryMeta: { color: c.textMuted, fontSize: 14, marginTop: 4 },
    summaryType: { color: c.text, fontSize: 16, marginTop: 6, fontWeight: '600' },
    summaryPrice: { color: c.primary, fontSize: 18, marginTop: 8, fontWeight: '800' },
    whiteCatalogHint: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
      lineHeight: 18,
    },
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
    eyeSectionTitle: {
      color: c.label,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    eyeRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 8,
    },
    eyeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyeChipActive: { backgroundColor: c.primary },
    eyeChipText: { color: c.textMuted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
    eyeChipTextActive: { color: c.primaryText },
    eyeHint: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    qtyStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
      backgroundColor: c.card,
    },
    qtyStepperLabel: {
      color: c.label,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    qtyStepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    qtyStepperBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    qtyStepperInput: {
      width: 72,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
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
    prescriptionHeaderLabel: {
      flex: 1,
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
