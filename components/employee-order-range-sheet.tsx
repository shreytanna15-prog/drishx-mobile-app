'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import type { PowerLineRow } from '@/lib/order-detail-display';
import { getHalfPairs } from '@/lib/order-line-update';
import {
  formatOrderStatusLabel,
  normalizeOrderStatus,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';

const ALL_ORDER_STATUSES: OrderTrackingStatus[] = [
  'PENDING',
  'PICKING',
  'PACKED',
  'DISPATCHED',
  'PARTIALLY_FULFILLED',
  'AWAITING_PROCUREMENT',
  'COMPLETED',
  'CANCELLED',
];

function formatPairCountLabel(count: number): string {
  return `${count} Pair${count === 1 ? '' : 's'}`;
}

type EmployeeOrderRangeSheetProps = {
  visible: boolean;
  line: PowerLineRow | null;
  currentStatus: OrderTrackingStatus;
  onClose: () => void;
  onUpdate: (payload: { pickedQuantity: number; status: OrderTrackingStatus }) => Promise<void>;
  updating?: boolean;
};

export function EmployeeOrderRangeSheet({
  visible,
  line,
  currentStatus,
  onClose,
  onUpdate,
  updating = false,
}: EmployeeOrderRangeSheetProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [pickedQuantity, setPickedQuantity] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<OrderTrackingStatus>(currentStatus);

  const ordered = line?.ordered ?? 0;
  const currentPicked = line?.picked ?? 0;

  useEffect(() => {
    if (!visible || !line) {
      return;
    }
    setPickedQuantity(currentPicked);
    setSelectedStatus(currentStatus);
  }, [visible, line, currentPicked, currentStatus]);

  const quickOptions = useMemo(() => {
    const twoPairs = Math.min(2, ordered);
    const halfPairs = getHalfPairs(ordered);
    return [
      { label: formatPairCountLabel(twoPairs), value: twoPairs },
      { label: formatPairCountLabel(halfPairs), value: halfPairs },
      { label: formatPairCountLabel(ordered), value: ordered },
    ];
  }, [ordered]);

  function clamp(value: number): number {
    return Math.max(0, Math.min(ordered, Math.floor(value)));
  }

  function handleDecrement() {
    setPickedQuantity((value) => clamp(value - 1));
  }

  function handleIncrement() {
    setPickedQuantity((value) => clamp(value + 1));
  }

  async function handleUpdate() {
    await onUpdate({ pickedQuantity: clamp(pickedQuantity), status: selectedStatus });
  }

  if (!line) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle}>
                {line.sphCylLabel}
                {line.eye ? <Text style={styles.eyeInline}> · {line.eye}</Text> : null}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Ordered: {ordered} Pair{ordered === 1 ? '' : 's'} · Picked: {currentPicked} Pair
                {currentPicked === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <MaterialIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyButton}
                onPress={handleDecrement}
                disabled={updating || pickedQuantity <= 0}>
                <MaterialIcons name="remove" size={22} color={colors.primary} />
              </Pressable>
              <Text style={styles.qtyValue}>{pickedQuantity}</Text>
              <Pressable
                style={styles.qtyButton}
                onPress={handleIncrement}
                disabled={updating || pickedQuantity >= ordered}>
                <MaterialIcons name="add" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              {quickOptions.map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.quickButton,
                    pickedQuantity === option.value && styles.quickButtonActive,
                  ]}
                  onPress={() => setPickedQuantity(clamp(option.value))}
                  disabled={updating}>
                  <Text
                    style={[
                      styles.quickButtonText,
                      pickedQuantity === option.value && styles.quickButtonTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusGrid}>
              {ALL_ORDER_STATUSES.map((status) => {
                const active = selectedStatus === status;
                const isDanger = status === 'CANCELLED';
                return (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusChip,
                      active && (isDanger ? styles.statusChipDangerActive : styles.statusChipActive),
                      isDanger && !active && styles.statusChipDanger,
                    ]}
                    onPress={() => setSelectedStatus(status)}
                    disabled={updating}>
                    <Text
                      style={[
                        styles.statusChipText,
                        active && styles.statusChipTextActive,
                        isDanger && !active && styles.statusChipTextDanger,
                      ]}>
                      {formatOrderStatusLabel(status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.currentStatusNote}>
              Current: {formatOrderStatusLabel(normalizeOrderStatus(currentStatus))}
            </Text>
          </ScrollView>

          <Pressable
            style={[styles.updateButton, updating && styles.updateButtonDisabled]}
            onPress={handleUpdate}
            disabled={updating}>
            {updating ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.updateButtonText}>Update</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
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
    sheetTitle: { color: c.text, fontSize: 22, fontWeight: '800' },
    eyeInline: { color: c.primary, fontWeight: '700' },
    sheetSubtitle: { marginTop: 4, color: c.textMuted, fontSize: 14, fontWeight: '600' },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 16,
    },
    qtyButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    qtyValue: {
      minWidth: 64,
      textAlign: 'center',
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    quickButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    quickButtonActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.15)',
    },
    quickButtonText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    quickButtonTextActive: {
      color: c.primary,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.label,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    statusChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.15)',
    },
    statusChipDanger: {
      borderColor: '#fca5a5',
      backgroundColor: '#450a0a',
    },
    statusChipDangerActive: {
      borderColor: '#fca5a5',
      backgroundColor: '#7f1d1d',
    },
    statusChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
    },
    statusChipTextActive: {
      color: c.primary,
    },
    statusChipTextDanger: {
      color: '#fda4af',
    },
    currentStatusNote: {
      color: c.textMuted,
      fontSize: 12,
      marginBottom: 8,
    },
    updateButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 8,
      backgroundColor: c.primary,
    },
    updateButtonDisabled: {
      opacity: 0.7,
    },
    updateButtonText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '800',
    },
  });
