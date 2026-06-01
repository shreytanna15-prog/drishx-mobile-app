'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useCart } from '@/lib/cart';
import {
  canAcceptPrescriptionInput,
  parseNumericInput,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  validatePrescriptionValue,
} from '@/lib/cart-utils';
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
  const lensType = item?.lensType ?? 'Progressive';
  const showAdd = lensType !== 'Single Vision';

  const [sph, setSph] = useState(item ? String(item.sph) : '');
  const [cyl, setCyl] = useState(item ? String(item.cyl ?? '') : '');
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

  const maxSph = item.sph ?? 0;
  const maxCyl = item.cyl ?? 0;
  const maxAdd = item.add ?? 0;

  const prescriptionHint = `Enter ${maxSph} or lower for SPH, ${maxCyl} or lower for CYL (numbers only).`;

  function handleSphChange(text: string) {
    const sanitized = sanitizeSignedNumericInput(text);
    if (!canAcceptPrescriptionInput(sanitized, maxSph)) {
      setError(`SPH cannot be greater than ${maxSph}.`);
      return;
    }
    setSph(sanitized);
    setError(null);
  }

  function handleCylChange(text: string) {
    const sanitized = sanitizeSignedNumericInput(text);
    if (!canAcceptPrescriptionInput(sanitized, maxCyl)) {
      setError(`CYL cannot be greater than ${maxCyl}.`);
      return;
    }
    setCyl(sanitized);
    setError(null);
  }

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

    const sphError = validatePrescriptionValue('SPH', sph, maxSph);
    if (sphError) {
      setError(sphError);
      return;
    }
    const cylError = validatePrescriptionValue('CYL', cyl, maxCyl);
    if (cylError) {
      setError(cylError);
      return;
    }

    const parsedSph = parseNumericInput(sph)!;
    const parsedCyl = parseNumericInput(cyl)!;

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
      sph: parsedSph,
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

          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>SPH</Text>
              <Text style={styles.maxHint}>max {maxSph}</Text>
              <TextInput
                value={sph}
                onChangeText={handleSphChange}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                placeholder={String(maxSph)}
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CYL</Text>
              <Text style={styles.maxHint}>max {maxCyl}</Text>
              <TextInput
                value={cyl}
                onChangeText={handleCylChange}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                placeholder={String(maxCyl)}
                placeholderTextColor={colors.placeholder}
              />
            </View>
            {showAdd ? (
              <View style={styles.field}>
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
          </View>

          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => String(Math.max(1, Number(current || 1) - 1)))}>
              <MaterialIcons name="remove" size={22} color={colors.primary} />
            </Pressable>
            <TextInput
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              style={styles.qtyInput}
            />
            <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => String(Number(current || 0) + 1))}>
              <MaterialIcons name="add" size={22} color={colors.primary} />
            </Pressable>
          </View>

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
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  field: { flex: 1 },
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
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  qtyButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 64,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.inputBg,
    color: c.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: 12,
    paddingVertical: 8,
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
