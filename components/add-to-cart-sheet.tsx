'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
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

import { BrandColors } from '@/constants/brand-colors';
import {
  canAcceptPrescriptionInput,
  parseNumericInput,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  validatePrescriptionValue,
} from '@/lib/cart-utils';
import type { LensItem, LensType } from '@/lib/types/lens';

const GOLD = BrandColors.primary;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

type AddToCartSheetProps = {
  visible: boolean;
  item: LensItem | null;
  onClose: () => void;
  onConfirm: (item: LensItem, quantity: number) => void;
};

const LENS_TYPE_LABEL: Record<LensType, string> = {
  Kryptok: 'Kryptok',
  Progressive: 'Progressive',
  'Single Vision': 'Single Vision',
};

function formatInitial(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function AddToCartSheet({ visible, item, onClose, onConfirm }: AddToCartSheetProps) {
  const insets = useSafeAreaInsets();

  const [sph, setSph] = useState('');
  const [cyl, setCyl] = useState('');
  const [add, setAdd] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const lensType = item?.lensType ?? 'Progressive';
  const showAdd = lensType !== 'Single Vision';

  const maxSph = item?.sph ?? 0;
  const maxCyl = item?.cyl ?? 0;
  const maxAdd = item?.add ?? 0;

  useEffect(() => {
    if (!item || !visible) {
      return;
    }
    setSph(formatInitial(item.sph));
    setCyl(formatInitial(item.cyl));
    setAdd(formatInitial(item.add));
    setQuantity('1');
    setError(null);
  }, [item, visible]);

  const prescriptionHint = useMemo(
    () => `Enter ${maxSph} or lower for SPH, ${maxCyl} or lower for CYL (numbers only).`,
    [maxSph, maxCyl]
  );

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

  function handleConfirm() {
    if (!item) {
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

    onConfirm(
      {
        ...item,
        sph: parsedSph,
        cyl: parsedCyl,
        add: showAdd ? parsedAdd : null,
      },
      parsedQty
    );
    onClose();
  }

  if (!item) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Add to cart</Text>
              <Text style={styles.lensTypeLabel}>{LENS_TYPE_LABEL[lensType]}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={BrandColors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.productSummary}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.brand || 'Lens'}
              </Text>
              {(item.item || item.coating) && (
                <Text style={styles.summaryMeta} numberOfLines={2}>
                  {[item.item, item.coating].filter(Boolean).join(' · ')}
                </Text>
              )}
              <Text style={styles.summaryPrice}>₹{item.price} each</Text>
            </View>

            <Text style={styles.sectionTitle}>Prescription</Text>
            <Text style={styles.validationHint}>{prescriptionHint}</Text>
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SPH</Text>
                <Text style={styles.maxHint}>max {maxSph}</Text>
                <TextInput
                  value={sph}
                  onChangeText={handleSphChange}
                  keyboardType="numbers-and-punctuation"
                  placeholder={String(maxSph)}
                  placeholderTextColor={BrandColors.placeholder}
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>CYL</Text>
                <Text style={styles.maxHint}>max {maxCyl}</Text>
                <TextInput
                  value={cyl}
                  onChangeText={handleCylChange}
                  keyboardType="numbers-and-punctuation"
                  placeholder={String(maxCyl)}
                  placeholderTextColor={BrandColors.placeholder}
                  style={styles.input}
                />
              </View>
              {showAdd && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>ADD</Text>
                  <Text style={styles.maxHint}>max {maxAdd}</Text>
                  <TextInput
                    value={add}
                    onChangeText={handleAddChange}
                    keyboardType="numbers-and-punctuation"
                    placeholder={String(maxAdd)}
                    placeholderTextColor={BrandColors.placeholder}
                    style={styles.input}
                  />
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => String(Math.max(1, Number(current || 1) - 1)))}>
                <MaterialIcons name="remove" size={22} color={GOLD} />
              </Pressable>
              <TextInput
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                style={styles.qtyInput}
              />
              <Pressable style={styles.qtyButton} onPress={() => setQuantity((current) => String(Number(current || 0) + 1))}>
                <MaterialIcons name="add" size={22} color={GOLD} />
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <MaterialIcons name="add-shopping-cart" size={20} color={BrandColors.primaryText} />
            <Text style={styles.confirmText}>Add to cart</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: BORDER,
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
  },
  sheetTitle: {
    color: BrandColors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  lensTypeLabel: {
    marginTop: 4,
    fontSize: 14,
    color: BrandColors.textMuted,
  },
  productSummary: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  productName: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 13,
    color: BrandColors.textMuted,
  },
  summaryPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: GOLD,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  validationHint: {
    fontSize: 12,
    color: BrandColors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.label,
    marginBottom: 2,
  },
  maxHint: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    backgroundColor: BrandColors.inputBg,
    textAlign: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    minWidth: 56,
    borderWidth: 1,
    borderColor: BrandColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
    textAlign: 'center',
    backgroundColor: BrandColors.inputBg,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: GOLD,
  },
  confirmText: {
    color: BrandColors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
});
