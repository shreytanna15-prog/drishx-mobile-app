"use client";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { createOrder } from "@/lib/orders-api";
import type { CartItem, LensType } from "@/lib/types/lens";

const LENS_TYPE_CONFIG: Record<LensType, { color: string; bg: string }> = {
  Kryptok: { color: "#0a7ea4", bg: "#e0f2fe" },
  Progressive: { color: "#7c3aed", bg: "#ede9fe" },
  "Single Vision": { color: "#059669", bg: "#d1fae5" },
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
  const lensType = item.lensType ?? "Progressive";
  const config = LENS_TYPE_CONFIG[lensType];
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  return (
    <View style={[styles.cartItem, isDark && styles.cartItemDark]}>
      <View style={styles.cartItemHeader}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isDark ? `${config.color}22` : config.bg },
          ]}
        >
          <ThemedText style={[styles.typeBadgeText, { color: config.color }]}>
            {lensType}
          </ThemedText>
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
        </Pressable>
      </View>

      <ThemedText style={styles.specText}>
        SPH {item.sph} · CYL {item.cyl ?? "—"}
        {lensType !== "Single Vision" && ` · ADD ${item.add ?? "—"}`}
      </ThemedText>
      {(item.brand || item.coating) && (
        <ThemedText style={styles.metaText} numberOfLines={1}>
          {[item.brand, item.coating].filter(Boolean).join(" · ")}
        </ThemedText>
      )}
      {item.eye ? (
        <ThemedText style={styles.eyeText}>Eye: {item.eye}</ThemedText>
      ) : null}

      <View style={styles.cartItemFooter}>
        <View style={styles.qtyControls}>
          <Pressable style={styles.qtyButton} onPress={onDecrease}>
            <MaterialIcons name="remove" size={18} color="#0a7ea4" />
          </Pressable>
          <ThemedText style={styles.qtyValue}>{item.cartQuantity}</ThemedText>
          <Pressable style={styles.qtyButton} onPress={onIncrease}>
            <MaterialIcons name="add" size={18} color="#0a7ea4" />
          </Pressable>
        </View>
        <ThemedText style={styles.lineTotal}>
          ₹{item.price * item.cartQuantity}
        </ThemedText>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const tint = Colors[colorScheme].tint;
  const isDark = colorScheme === "dark";
  const { getAuthHeaders } = useAuth();
  const {
    items,
    itemCount,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);

  async function handlePlaceOrder() {
    if (items.length === 0) {
      return;
    }

    setPlacingOrder(true);
    const failures: string[] = [];
    let successCount = 0;

    for (const item of items) {
      const result = await createOrder(item, getAuthHeaders());
      if (result.success) {
        successCount += 1;
      } else {
        failures.push(
          `${item.lensType ?? "Lens"} (SPH ${item.sph}): ${result.error}`,
        );
      }
    }

    setPlacingOrder(false);

    if (successCount > 0) {
      clearCart();
    }

    if (failures.length === 0) {
      Alert.alert(
        "Order placed",
        `Successfully placed ${successCount} order(s).`,
        [
          {
            text: "View orders",
            onPress: () => router.replace("/(tabs)/my-orders"),
          },
          { text: "Continue shopping", onPress: () => router.back() },
        ],
      );
      return;
    }

    if (successCount > 0) {
      Alert.alert(
        "Partial success",
        `${successCount} order(s) placed. Some items failed:\n\n${failures.join("\n")}`,
      );
      return;
    }

    Alert.alert("Order failed", failures.join("\n\n"));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={24} color={tint} />
          </Pressable>
          <ThemedText type="subtitle">Your Cart</ThemedText>
          <Pressable
            onPress={() => router.push("/(tabs)/my-orders")}
            hitSlop={8}
          >
            <MaterialIcons name="receipt-long" size={24} color={tint} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={56} color="#94a3b8" />
            <ThemedText type="subtitle">Your cart is empty</ThemedText>
            <ThemedText style={styles.emptyText}>
              Add lenses from the Shop tab to get started.
            </ThemedText>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: tint }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.primaryButtonText}>
                Browse Shop
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(item) => item.cartLineId}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <CartLineItem
                  item={item}
                  onIncrease={() =>
                    updateQuantity(item.cartLineId, item.cartQuantity + 1)
                  }
                  onDecrease={() =>
                    updateQuantity(item.cartLineId, item.cartQuantity - 1)
                  }
                  onRemove={() => removeFromCart(item.cartLineId)}
                />
              )}
            />

            <View style={[styles.summaryBar, isDark && styles.summaryBarDark]}>
              <View>
                <ThemedText style={styles.summaryLabel}>
                  {itemCount} item(s)
                </ThemedText>
                <ThemedText style={styles.summaryTotal}>
                  ₹{totalPrice}
                </ThemedText>
              </View>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: tint },
                  placingOrder && styles.buttonDisabled,
                ]}
                onPress={handlePlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="shopping-bag" size={20} color="#fff" />
                    <ThemedText style={styles.primaryButtonText}>
                      Place Order
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  cartItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cartItemDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 13, fontWeight: "700" },
  specText: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  metaText: { fontSize: 12, color: "#94a3b8", marginBottom: 4 },
  eyeText: {
    fontSize: 13,
    color: "#0a7ea4",
    fontWeight: "600",
    marginBottom: 8,
  },
  cartItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  lineTotal: { fontSize: 18, fontWeight: "800", color: "#0a7ea4" },
  separator: { height: 12 },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  summaryBarDark: {
    backgroundColor: "#1e293b",
    borderTopColor: "#334155",
  },
  summaryLabel: { fontSize: 13, color: "#64748b" },
  summaryTotal: { fontSize: 24, fontWeight: "800", color: "#0a7ea4" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.7 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
  },
});
