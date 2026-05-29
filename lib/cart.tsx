'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearServerCart, fetchCart, removeCartLine, upsertCartLine } from '@/lib/cart-api';
import { buildCartLineId } from '@/lib/cart-utils';
import { useAuth } from '@/lib/auth';
import type { CartItem, LensItem } from '@/lib/types/lens';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  loading: boolean;
  syncing: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (item: LensItem, quantity: number) => Promise<{ message?: string }>;
  removeFromCart: (cartLineId: string) => Promise<void>;
  updateQuantity: (cartLineId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (lensId: string) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isStaff, getAuthHeaders } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const useServerCart = isSignedIn && !isStaff;

  const refreshCart = useCallback(async () => {
    if (!useServerCart) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const serverItems = await fetchCart(getAuthHeaders());
      setItems(serverItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, useServerCart]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (item: LensItem, quantity: number) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const cartLineId = buildCartLineId(item);
      const existing = items.find((entry) => entry.cartLineId === cartLineId);
      const nextQty = (existing?.cartQuantity ?? 0) + safeQuantity;

      const optimisticItem: CartItem = {
        ...item,
        cartLineId,
        cartLineKey: cartLineId,
        cartQuantity: nextQty,
        reservedQuantity: existing?.reservedQuantity,
        isBackorder: existing?.isBackorder,
        expiresAt: existing?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      setItems((current) => {
        const without = current.filter((entry) => entry.cartLineId !== cartLineId);
        return [...without, optimisticItem];
      });

      if (!useServerCart) {
        return {};
      }

      try {
        const { item: saved } = await upsertCartLine(item, nextQty, getAuthHeaders());
        setItems((current) => {
          const without = current.filter((entry) => entry.cartLineId !== cartLineId);
          return [...without, saved];
        });
        return {};
      } catch (err) {
        setItems((current) => {
          if (existing) {
            return current.map((entry) => (entry.cartLineId === cartLineId ? existing : entry));
          }
          return current.filter((entry) => entry.cartLineId !== cartLineId);
        });
        throw err;
      }
    },
    [getAuthHeaders, items, useServerCart]
  );

  const removeFromCart = useCallback(
    async (cartLineId: string) => {
      if (useServerCart) {
        setSyncing(true);
        try {
          await removeCartLine(cartLineId, getAuthHeaders());
        } finally {
          setSyncing(false);
        }
      }
      setItems((current) => current.filter((entry) => entry.cartLineId !== cartLineId));
    },
    [getAuthHeaders, useServerCart]
  );

  const updateQuantity = useCallback(
    async (cartLineId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(cartLineId);
        return;
      }

      const existing = items.find((entry) => entry.cartLineId === cartLineId);
      if (!existing) return;

      if (useServerCart) {
        setSyncing(true);
        try {
          const lensItem: LensItem = {
            id: existing.id,
            costPrice: existing.costPrice,
            price: existing.price,
            sph: existing.sph,
            cyl: existing.cyl,
            axis: existing.axis,
            add: existing.add,
            eye: existing.eye,
            quantity: existing.quantity,
            createdAt: existing.createdAt,
            lensType: existing.lensType,
            brand: existing.brand,
            item: existing.item,
            coating: existing.coating,
          };
          const { item: saved } = await upsertCartLine(lensItem, quantity, getAuthHeaders());
          setItems((current) =>
            current.map((entry) => (entry.cartLineId === cartLineId ? saved : entry))
          );
        } finally {
          setSyncing(false);
        }
        return;
      }

      setItems((current) =>
        current.map((entry) => (entry.cartLineId === cartLineId ? { ...entry, cartQuantity: quantity } : entry))
      );
    },
    [getAuthHeaders, items, removeFromCart, useServerCart]
  );

  const clearCart = useCallback(async () => {
    if (useServerCart) {
      setSyncing(true);
      try {
        await clearServerCart(getAuthHeaders());
      } finally {
        setSyncing(false);
      }
    }
    setItems([]);
  }, [getAuthHeaders, useServerCart]);

  const isInCart = useCallback(
    (lensId: string) => items.some((entry) => entry.id === lensId),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, entry) => sum + entry.cartQuantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, entry) => sum + entry.price * entry.cartQuantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      totalPrice,
      loading,
      syncing,
      refreshCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
    }),
    [
      items,
      itemCount,
      totalPrice,
      loading,
      syncing,
      refreshCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isInCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
