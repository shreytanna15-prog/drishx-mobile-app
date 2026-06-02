'use client';

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomerCartDetail } from '@/components/customer-cart-detail';
import { OrderPlacedModal } from '@/components/order-placed-modal';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { getCartSummary } from '@/lib/cart-display';
import { createOrder, ORDER_NOTES_MAX_LENGTH } from '@/lib/orders-api';

export default function CartTabScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { getAuthHeaders, user } = useAuth();
  const {
    items,
    totalPrice,
    loading,
    adjustQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderPlacedModal, setOrderPlacedModal] = useState<{
    message: string;
    notes?: string;
  } | null>(null);

  const summary = getCartSummary(items);

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
    let procurementCount = 0;
    const checkoutBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    for (const item of items) {
      const result = await createOrder(
        item,
        getAuthHeaders(),
        trimmedNotes || undefined,
        checkoutBatchId
      );
      if (result.success) {
        successCount += 1;
        if (result.status === 'AWAITING_PROCUREMENT') {
          procurementCount += 1;
        }
      } else {
        failures.push(`${item.lensType ?? 'Lens'} (SPH ${item.sph}): ${result.error}`);
      }
    }

    setPlacingOrder(false);

    if (successCount > 0) {
      await clearCart();
      await refreshCart();
      setOrderNotes('');
    }

    if (failures.length === 0) {
      const procurementNote =
        procurementCount > 0
          ? ` ${procurementCount} order(s) are in procurement (out of stock). Check My Orders for updates.`
          : '';
      setOrderPlacedModal({
        message: `Successfully placed ${successCount} order(s).${procurementNote}`,
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

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Cart</Text>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading your cart...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="shopping-cart" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.stateText}>Add lenses from the Shop tab to get started.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/shop')}>
              <Text style={styles.primaryButtonText}>Browse shop</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <CustomerCartDetail
                items={items}
                companyName={user?.businessName ?? user?.name}
                onIncrease={(cartLineId) => {
                  void adjustQuantity(cartLineId, 1);
                }}
                onDecrease={(cartLineId) => {
                  void adjustQuantity(cartLineId, -1);
                }}
                onRemove={(cartLineId) => {
                  void removeFromCart(cartLineId);
                }}
              />

              <Pressable style={styles.addMoreBtn} onPress={() => router.push('/(tabs)/shop')}>
                <MaterialIcons name="add" size={20} color={colors.primary} />
                <Text style={styles.addMoreBtnText}>Add more items</Text>
              </Pressable>

              <Text style={styles.notesTitle}>Order notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Enter any special instructions..."
                placeholderTextColor={colors.placeholder}
                value={orderNotes}
                onChangeText={setOrderNotes}
                multiline
                numberOfLines={4}
                maxLength={ORDER_NOTES_MAX_LENGTH}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.summaryBar}>
              <View>
                <Text style={styles.summaryLabel}>
                  {summary.productCount} product{summary.productCount === 1 ? '' : 's'} ·{' '}
                  {summary.pairCount} pair{summary.pairCount === 1 ? '' : 's'}
                </Text>
                <Text style={styles.summaryTotal}>₹{totalPrice.toLocaleString('en-IN')}</Text>
              </View>
              <Pressable
                style={[styles.placeOrderButton, placingOrder && styles.buttonDisabled]}
                onPress={handlePlaceOrder}
                disabled={placingOrder}>
                {placingOrder ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <>
                    <MaterialIcons name="shopping-bag" size={20} color={colors.primaryText} />
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

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 6,
    },
    screenTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    stateText: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    emptyTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '700',
    },
    addMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
    },
    addMoreBtnText: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    notesTitle: {
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
    },
    notesInput: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 72,
      color: c.text,
      fontSize: 14,
    },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.card,
    },
    summaryLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
    },
    summaryTotal: {
      fontSize: 18,
      fontWeight: '800',
      color: c.primary,
      marginTop: 1,
    },
    placeOrderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    primaryButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: c.primary,
    },
    primaryButtonText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '800',
    },
    buttonDisabled: { opacity: 0.7 },
  });
