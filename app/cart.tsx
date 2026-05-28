'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderPlacedModal } from '@/components/order-placed-modal';
import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { createOrder, ORDER_NOTES_MAX_LENGTH } from '@/lib/orders-api';
import type { CartItem, LensType } from '@/lib/types/lens';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;

const LENS_TYPE_COLORS: Record<LensType, string> = {
  Kryptok: '#5BC0EB',
  Progressive: '#C084FC',
  'Single Vision': '#7DD3A8',
};

function CartLineItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const lensType = item.lensType ?? 'Progressive';
  const badgeColor = LENS_TYPE_COLORS[lensType];

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemHeader}>
        <View style={[styles.typeBadge, { backgroundColor: `${badgeColor}22` }]}>
          <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{lensType}</Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={22} color="#f87171" />
        </Pressable>
      </View>

      <Text style={styles.specText}>
        SPH {item.sph} · CYL {item.cyl ?? '—'}
        {lensType !== 'Single Vision' && ` · ADD ${item.add ?? '—'}`}
      </Text>
      {(item.brand || item.coating) && (
        <Text style={styles.metaText} numberOfLines={1}>
          {[item.brand, item.coating].filter(Boolean).join(' · ')}
        </Text>
      )}
      {item.eye ? <Text style={styles.eyeText}>Eye: {item.eye}</Text> : null}

      <View style={styles.cartItemFooter}>
        <View style={styles.qtyControls}>
          <Pressable style={styles.qtyButton} onPress={onDecrease}>
            <MaterialIcons name="remove" size={18} color={GOLD} />
          </Pressable>
          <Text style={styles.qtyValue}>{item.cartQuantity}</Text>
          <Pressable style={styles.qtyButton} onPress={onIncrease}>
            <MaterialIcons name="add" size={18} color={GOLD} />
          </Pressable>
        </View>
        <Text style={styles.lineTotal}>₹{item.price * item.cartQuantity}</Text>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const { items, itemCount, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderPlacedModal, setOrderPlacedModal] = useState<{
    message: string;
    notes?: string;
  } | null>(null);

  async function handlePlaceOrder() {
    if (items.length === 0) {
      return;
    }

    const trimmedNotes = orderNotes.trim();
    if (trimmedNotes.length > ORDER_NOTES_MAX_LENGTH) {
      Alert.alert(
        'Notes too long',
        `Order notes must be at most ${ORDER_NOTES_MAX_LENGTH} characters.`
      );
      return;
    }
    setPlacingOrder(true);
    const failures: string[] = [];
    let successCount = 0;

    for (const item of items) {
      const result = await createOrder(item, getAuthHeaders(), trimmedNotes || undefined);
      if (result.success) {
        successCount += 1;
      } else {
        failures.push(`${item.lensType ?? 'Lens'} (SPH ${item.sph}): ${result.error}`);
      }
    }

    setPlacingOrder(false);

    if (successCount > 0) {
      clearCart();
      setOrderNotes('');
    }

    if (failures.length === 0) {
      setOrderPlacedModal({
        message: `Successfully placed ${successCount} order(s).`,
        notes: trimmedNotes || undefined,
      });
      return;
    }

    if (successCount > 0) {
      Alert.alert(
        'Partial success',
        `${successCount} order(s) placed. Some items failed:\n\n${failures.join('\n')}`
      );
      return;
    }

    Alert.alert('Order failed', failures.join('\n\n'));
  }

  const listFooter = (
    <View style={styles.listFooter}>
      <Pressable style={styles.addMoreBtn} onPress={() => router.push('/(tabs)/shop')}>
        <MaterialIcons name="add" size={20} color={GOLD} />
        <Text style={styles.addMoreBtnText}>Add more items</Text>
      </Pressable>

      <Text style={styles.notesTitle}>Order notes</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Enter any special instructions..."
        placeholderTextColor={BrandColors.placeholder}
        value={orderNotes}
        onChangeText={setOrderNotes}
        multiline
        numberOfLines={4}
        maxLength={ORDER_NOTES_MAX_LENGTH}
        textAlignVertical="top"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <OrderPlacedModal
        visible={orderPlacedModal !== null}
        message={orderPlacedModal?.message ?? ''}
        notes={orderPlacedModal?.notes}
        onViewOrders={() => {
          setOrderPlacedModal(null);
          router.replace('/(tabs)/my-orders');
        }}
        onContinueShopping={() => {
          setOrderPlacedModal(null);
          router.push('/(tabs)/shop');
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={GOLD} />
          </Pressable>
          <Text style={styles.screenTitle}>Your cart</Text>
          <Pressable onPress={() => router.push('/(tabs)/my-orders')} style={styles.iconBtn} hitSlop={8}>
            <MaterialIcons name="receipt-long" size={24} color={GOLD} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={56} color={BrandColors.textMuted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add lenses from the Shop tab to get started.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/shop')}>
              <Text style={styles.primaryButtonText}>Browse shop</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <FlatList
              data={items}
              keyExtractor={(item) => item.cartLineId}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={<Text style={styles.sectionTitle}>Select products</Text>}
              ListFooterComponent={listFooter}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <CartLineItem
                  item={item}
                  onIncrease={() => updateQuantity(item.cartLineId, item.cartQuantity + 1)}
                  onDecrease={() => updateQuantity(item.cartLineId, item.cartQuantity - 1)}
                  onRemove={() => removeFromCart(item.cartLineId)}
                />
              )}
            />

            <View style={styles.summaryBar}>
              <View>
                <Text style={styles.summaryLabel}>{itemCount} item(s)</Text>
                <Text style={styles.summaryTotal}>₹{totalPrice}</Text>
              </View>
              <Pressable
                style={[styles.primaryButton, placingOrder && styles.buttonDisabled]}
                onPress={handlePlaceOrder}
                disabled={placingOrder}>
                {placingOrder ? (
                  <ActivityIndicator color={BrandColors.primaryText} />
                ) : (
                  <>
                    <MaterialIcons name="shopping-bag" size={20} color={BrandColors.primaryText} />
                    <Text style={styles.primaryButtonText}>Place order</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconBtn: { padding: 4, width: 32 },
  screenTitle: {
    color: BrandColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 8,
  },
  cartItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  specText: { fontSize: 14, color: BrandColors.textMuted, marginBottom: 4 },
  metaText: { fontSize: 12, color: BrandColors.label, marginBottom: 4 },
  eyeText: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '700',
    marginBottom: 8,
  },
  cartItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
    color: BrandColors.text,
  },
  lineTotal: { fontSize: 18, fontWeight: '800', color: GOLD },
  separator: { height: 12 },
  listFooter: {
    marginTop: 20,
    gap: 12,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(240, 161, 50, 0.08)',
  },
  addMoreBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
  },
  notesTitle: {
    color: BrandColors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    color: BrandColors.text,
    fontSize: 15,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD,
  },
  summaryLabel: { fontSize: 13, color: BrandColors.textMuted },
  summaryTotal: { fontSize: 24, fontWeight: '800', color: GOLD },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GOLD,
  },
  primaryButtonText: {
    color: BrandColors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: { opacity: 0.7 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: BrandColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    color: BrandColors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
