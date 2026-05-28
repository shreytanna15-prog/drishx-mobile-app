'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand-colors';

const GOLD = BrandColors.primary;

type OrderPlacedModalProps = {
  visible: boolean;
  message: string;
  notes?: string;
  onViewOrders: () => void;
  onContinueShopping: () => void;
};

export function OrderPlacedModal({
  visible,
  message,
  notes,
  onViewOrders,
  onContinueShopping,
}: OrderPlacedModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinueShopping}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="check-circle" size={48} color={GOLD} />
          </View>
          <Text style={styles.title}>Order placed</Text>
          <Text style={styles.message}>{message}</Text>
          {notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onContinueShopping}>
              <Text style={styles.secondaryBtnText}>Continue shopping</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onViewOrders}>
              <Text style={styles.primaryBtnText}>View orders</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: BrandColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    color: BrandColors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  message: {
    color: BrandColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  notesBox: {
    width: '100%',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
    padding: 12,
    marginBottom: 20,
  },
  notesLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    color: BrandColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: BrandColors.primaryText,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.cardBorder,
  },
  secondaryBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
  },
});
