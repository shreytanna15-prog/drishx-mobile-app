'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { PRESCRIPTION_PICKER_HEIGHT, PrescriptionWheelPicker } from '@/components/prescription-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useCart } from '@/lib/cart';
import {
  canAcceptPrescriptionInput,
  formatPowerLabel,
  parseNumericInput,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  validatePrescriptionInRange,
  validatePrescriptionValue,
} from '@/lib/cart-utils';
import { resolveSelectableRange } from '@/lib/prescription-range';
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
  const params = useLocalSearchParams<{ payload?: string }>();
  const { addToCart } = useCart();

  const item = useMemo(() => parseLensPayload(params.payload), [params.payload]);
  const selectableRange = useMemo(() => (item ? resolveSelectableRange(item) : null), [item]);
  const lensType = item?.lensType ?? 'Progressive';
  const showAdd = lensType !== 'Single Vision';

  const initialSph = selectableRange?.sph.options[0] ?? item?.sph ?? 0;
  const initialCyl = selectableRange?.cyl?.options[0] ?? item?.cyl ?? 0;

  const [sph, setSph] = useState<number>(initialSph);
  const [cyl, setCyl] = useState<number>(initialCyl);
  const [add, setAdd] = useState(item ? String(item.add ?? '') : '');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

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
    ? `Scroll to select SPH (${formatPowerLabel(selectableRange.sph.max)} to ${formatPowerLabel(selectableRange.sph.min)})${
        selectableRange.cyl
          ? ` and CYL (${formatPowerLabel(selectableRange.cyl.max)} to ${formatPowerLabel(selectableRange.cyl.min)})`
          : ''
      }.`
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
    setQuantity(sanitized === '' ? '' : sanitized);
    setError(null);
  }

  function handleAddToCart() {
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

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

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

    setAddedToCart(true);
    setError(null);
    void addToCart(updatedItem, parsedQty).catch((err) => {
      setAddedToCart(false);
      setError(err instanceof Error ? err.message : 'Failed to add to cart.');
    });
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

          <Text style={styles.sectionTitle}>Prescription</Text>
          <Text style={styles.sectionHint}>{prescriptionHint}</Text>

          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
              <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
              <Text style={styles.prescriptionHeaderLabel}>QTY</Text>
            </View>
            <View style={styles.prescriptionRow}>
              <View style={styles.pickerColumn}>
                {selectableRange ? (
                  <PrescriptionWheelPicker
                    options={selectableRange.sph.options}
                    value={sph}
                    onChange={setSph}
                  />
                ) : null}
              </View>
              <View style={styles.pickerColumn}>
                {selectableRange?.cyl ? (
                  <PrescriptionWheelPicker
                    options={selectableRange.cyl.options}
                    value={cyl}
                    onChange={setCyl}
                  />
                ) : (
                  <View style={styles.pickerColumnPlaceholder}>
                    <Text style={styles.pickerPlaceholderText}>—</Text>
                  </View>
                )}
              </View>
              <View style={styles.qtyColumn}>
                <TextInput
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  keyboardType="number-pad"
                  style={styles.qtyFieldInput}
                  placeholder="Qty"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
          </View>

          {showAdd ? (
            <View style={styles.addFieldWrap}>
              <Text style={styles.fieldLabel}>ADD</Text>
              <Text style={styles.maxHint}>max {maxAdd}</Text>
              <TextInput
                value={add}
                onChangeText={handleAddChange}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                placeholder={String(maxAdd)}
                placeholderTextColor={colors.placeholder}
              />
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.addBtn, addedToCart && styles.addBtnSuccess]}
            onPress={handleAddToCart}>
            <MaterialIcons
              name={addedToCart ? 'check-circle' : 'add-shopping-cart'}
              size={20}
              color={colors.primaryText}
            />
            <Text style={styles.addBtnText}>{addedToCart ? 'Added to cart' : 'Add to cart'}</Text>
            {!addedToCart ? <MaterialIcons name="arrow-right-alt" size={20} color={colors.primaryText} /> : null}
          </Pressable>
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
    sectionTitle: {
      color: c.label,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
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
    pickerColumnPlaceholder: {
      height: PRESCRIPTION_PICKER_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerPlaceholderText: { color: c.textMuted, fontSize: 18 },
    qtyColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
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
    addFieldWrap: { marginBottom: 18 },
    fieldLabel: { color: c.label, fontWeight: '600', fontSize: 12, marginBottom: 3 },
    maxHint: { color: c.primary, fontWeight: '600', fontSize: 11, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 16,
      fontWeight: '600',
      borderRadius: 12,
      textAlign: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
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
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  });
