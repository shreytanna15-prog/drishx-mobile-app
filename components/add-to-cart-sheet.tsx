'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  canAcceptPrescriptionInput,
  parseNumericInput,
  sanitizePositiveIntegerInput,
  sanitizeSignedNumericInput,
  validatePrescriptionValue,
} from '@/lib/cart-utils';
import type { LensItem, LensType } from '@/lib/types/lens';

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
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const tint = Colors[colorScheme].tint;

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
        <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View>
              <ThemedText type="subtitle">Add to cart</ThemedText>
              <ThemedText style={styles.lensTypeLabel}>{LENS_TYPE_LABEL[lensType]}</ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>

          <View style={[styles.productSummary, isDark && styles.productSummaryDark]}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {item.brand || 'Lens'}
            </ThemedText>
            {(item.item || item.coating) && (
              <ThemedText style={styles.summaryMeta} numberOfLines={2}>
                {[item.item, item.coating].filter(Boolean).join(' · ')}
              </ThemedText>
            )}
            <ThemedText style={styles.summaryPrice}>₹{item.price} each</ThemedText>
          </View>

          <ThemedText style={styles.sectionTitle}>Prescription</ThemedText>
          <ThemedText style={styles.validationHint}>{prescriptionHint}</ThemedText>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>SPH</ThemedText>
              <ThemedText style={styles.maxHint}>max {maxSph}</ThemedText>
              <TextInput
                value={sph}
                onChangeText={handleSphChange}
                keyboardType="numbers-and-punctuation"
                placeholder={String(maxSph)}
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>CYL</ThemedText>
              <ThemedText style={styles.maxHint}>max {maxCyl}</ThemedText>
              <TextInput
                value={cyl}
                onChangeText={handleCylChange}
                keyboardType="numbers-and-punctuation"
                placeholder={String(maxCyl)}
                placeholderTextColor="#94a3b8"
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>
            {showAdd && (
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>ADD</ThemedText>
                <ThemedText style={styles.maxHint}>max {maxAdd}</ThemedText>
                <TextInput
                  value={add}
                  onChangeText={handleAddChange}
                  keyboardType="numbers-and-punctuation"
                  placeholder={String(maxAdd)}
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, isDark && styles.inputDark]}
                />
              </View>
            )}
          </View>

          <ThemedText style={styles.sectionTitle}>Quantity</ThemedText>
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.qtyButton, { borderColor: tint }]}
              onPress={() => setQuantity((current) => String(Math.max(1, Number(current || 1) - 1)))}>
              <MaterialIcons name="remove" size={22} color={tint} />
            </Pressable>
            <TextInput
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              style={[styles.qtyInput, isDark && styles.inputDark]}
            />
            <Pressable
              style={[styles.qtyButton, { borderColor: tint }]}
              onPress={() => setQuantity((current) => String(Number(current || 0) + 1))}>
              <MaterialIcons name="add" size={22} color={tint} />
            </Pressable>
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <Pressable style={[styles.confirmButton, { backgroundColor: tint }]} onPress={handleConfirm}>
            <MaterialIcons name="add-shopping-cart" size={20} color="#fff" />
            <ThemedText style={styles.confirmText}>Add to cart</ThemedText>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
  },
  sheetDark: {
    backgroundColor: '#1e293b',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  lensTypeLabel: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
  productSummary: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  productSummaryDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  summaryPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  validationHint: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#64748b',
    marginBottom: 2,
  },
  maxHint: {
    fontSize: 11,
    color: '#0a7ea4',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f1f5f9',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    minWidth: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#dc2626',
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
    marginTop: 4,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
