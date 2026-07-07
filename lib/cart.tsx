'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { clearServerCart, bulkUpsertCartLines, fetchCart, removeCartLine, upsertCartLine, upsertWholesaleCartBatch, type UpsertWholesaleCartInput } from '@/lib/cart-api';
import { buildCartLineId } from '@/lib/cart-utils';
import { isOfflineQueuedError } from '@/lib/api-request';
import { useAuth } from '@/lib/auth';
import { loadOfflineCache, OFFLINE_CACHE_KEYS, saveOfflineCache } from '@/lib/offline-cache';
import { lineTotalForPieceQuantity } from '@/lib/lens-pricing';
import { onOfflineSyncComplete } from '@/lib/offline-sync';
import type { CartItem, LensItem } from '@/lib/types/lens';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  loading: boolean;
  syncing: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (item: LensItem, quantity: number) => Promise<{ message?: string }>;
  /** Set an absolute cart quantity (wholesale grid / replace line qty). */
  setCartQuantity: (item: LensItem, quantity: number) => Promise<{ message?: string }>;
  /** Wholesale grid: set many lines in one (or chunked) API call. */
  bulkSetCartQuantities: (
    lines: Array<{ item: LensItem; quantity: number }>
  ) => Promise<{ savedCount: number; message?: string }>;
  addWholesaleBatchToCart: (
    input: UpsertWholesaleCartInput
  ) => Promise<{ expandedLineCount: number; message?: string }>;
  removeFromCart: (cartLineId: string) => Promise<void>;
  removeLinesFromCart: (cartLineIds: string[]) => Promise<void>;
  updateQuantity: (cartLineId: string, quantity: number) => Promise<void>;
  /** Apply a delta (+/-1, etc). Safer for rapid taps than setting an absolute quantity. */
  adjustQuantity: (cartLineId: string, delta: number) => Promise<void>;
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
  const mutationIdRef = useRef(0);

  const persistLocalCart = useCallback(async (nextItems: CartItem[]) => {
    if (!useServerCart) {
      return;
    }
    await saveOfflineCache(OFFLINE_CACHE_KEYS.cart, nextItems);
  }, [useServerCart]);

  const refreshCart = useCallback(async () => {
    if (!useServerCart) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const serverItems = await fetchCart(getAuthHeaders());
      setItems(serverItems);
      await saveOfflineCache(OFFLINE_CACHE_KEYS.cart, serverItems);
    } catch {
      const cached = await loadOfflineCache<CartItem[]>(OFFLINE_CACHE_KEYS.cart);
      setItems(cached ?? []);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, useServerCart]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    return onOfflineSyncComplete(() => {
      void refreshCart();
    });
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
        reservedQuantity: 0,
        isBackorder: false,
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
        await persistLocalCart(
          items
            .filter((entry) => entry.cartLineId !== cartLineId)
            .concat(saved)
        );
        return {};
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(
            items
              .filter((entry) => entry.cartLineId !== cartLineId)
              .concat(optimisticItem)
          );
          return { message: err.message };
        }
        setItems((current) => {
          if (existing) {
            return current.map((entry) => (entry.cartLineId === cartLineId ? existing : entry));
          }
          return current.filter((entry) => entry.cartLineId !== cartLineId);
        });
        throw err;
      }
    },
    [getAuthHeaders, items, persistLocalCart, useServerCart]
  );

  const setCartQuantity = useCallback(
    async (item: LensItem, quantity: number) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const cartLineId = buildCartLineId(item);

      const optimisticItem: CartItem = {
        ...item,
        cartLineId,
        cartLineKey: cartLineId,
        cartQuantity: safeQuantity,
        reservedQuantity: 0,
        isBackorder: false,
      };

      setItems((current) => {
        const without = current.filter((entry) => entry.cartLineId !== cartLineId);
        return [...without, optimisticItem];
      });

      if (!useServerCart) {
        return {};
      }

      try {
        const { item: saved } = await upsertCartLine(item, safeQuantity, getAuthHeaders());
        setItems((current) => {
          const without = current.filter((entry) => entry.cartLineId !== cartLineId);
          return [...without, saved];
        });
        await persistLocalCart(
          items
            .filter((entry) => entry.cartLineId !== cartLineId)
            .concat(saved)
        );
        return {};
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(
            items
              .filter((entry) => entry.cartLineId !== cartLineId)
              .concat(optimisticItem)
          );
          return { message: err.message };
        }
        await refreshCart();
        throw err;
      }
    },
    [getAuthHeaders, items, persistLocalCart, refreshCart, useServerCart]
  );

  const bulkSetCartQuantities = useCallback(
    async (lines: Array<{ item: LensItem; quantity: number }>) => {
      if (lines.length === 0) {
        return { savedCount: 0 };
      }

      const optimisticItems: CartItem[] = lines.map(({ item, quantity }) => {
        const cartLineId = buildCartLineId(item);
        const safeQuantity = Math.max(1, Math.floor(quantity));
        return {
          ...item,
          cartLineId,
          cartLineKey: cartLineId,
          cartQuantity: safeQuantity,
          reservedQuantity: 0,
          isBackorder: false,
        };
      });

      const optimisticIds = new Set(optimisticItems.map((entry) => entry.cartLineId));
      let mergedSnapshot: CartItem[] = [];

      setItems((current) => {
        const kept = current.filter((entry) => !optimisticIds.has(entry.cartLineId));
        mergedSnapshot = [...kept, ...optimisticItems];
        return mergedSnapshot;
      });

      if (!useServerCart) {
        await persistLocalCart(mergedSnapshot);
        return { savedCount: optimisticItems.length };
      }

      try {
        const { count, message } = await bulkUpsertCartLines(lines, getAuthHeaders());
        await persistLocalCart(mergedSnapshot);

        return { savedCount: count, message };
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(mergedSnapshot);
          return { savedCount: optimisticItems.length, message: err.message };
        }

        setItems((current) => current.filter((entry) => !optimisticIds.has(entry.cartLineId)));
        throw err;
      }
    },
    [getAuthHeaders, persistLocalCart, useServerCart]
  );

  const addWholesaleBatchToCart = useCallback(
    async (input: UpsertWholesaleCartInput) => {
      if (!useServerCart) {
        throw new Error('Sign in to add wholesale batches to your cart.');
      }

      const { item, expandedLineCount, message } = await upsertWholesaleCartBatch(
        input,
        getAuthHeaders()
      );

      setItems((current) => {
        const kept = current.filter((entry) => entry.cartLineId !== item.cartLineId);
        const next = [...kept, item];
        void persistLocalCart(next);
        return next;
      });

      return { expandedLineCount, message };
    },
    [getAuthHeaders, persistLocalCart, useServerCart]
  );

  const removeFromCart = useCallback(
    async (cartLineId: string) => {
      const snapshot = items;
      setItems((current) => current.filter((entry) => entry.cartLineId !== cartLineId));

      if (!useServerCart) {
        return;
      }

      try {
        await removeCartLine(cartLineId, getAuthHeaders());
        await persistLocalCart(snapshot.filter((entry) => entry.cartLineId !== cartLineId));
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(snapshot.filter((entry) => entry.cartLineId !== cartLineId));
          return;
        }
        setItems(snapshot);
      }
    },
    [getAuthHeaders, items, persistLocalCart, useServerCart]
  );

  const removeLinesFromCart = useCallback(
    async (cartLineIds: string[]) => {
      const uniqueIds = [...new Set(cartLineIds.filter(Boolean))];
      if (uniqueIds.length === 0) {
        return;
      }

      const idSet = new Set(uniqueIds);
      const snapshot = items;
      setItems((current) => current.filter((entry) => !idSet.has(entry.cartLineId)));

      if (!useServerCart) {
        return;
      }

      try {
        await Promise.all(uniqueIds.map((cartLineId) => removeCartLine(cartLineId, getAuthHeaders())));
        await persistLocalCart(snapshot.filter((entry) => !idSet.has(entry.cartLineId)));
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(snapshot.filter((entry) => !idSet.has(entry.cartLineId)));
          return;
        }
        setItems(snapshot);
      }
    },
    [getAuthHeaders, items, persistLocalCart, useServerCart]
  );

  const updateQuantity = useCallback(
    async (cartLineId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(cartLineId);
        return;
      }

      const existing = items.find((entry) => entry.cartLineId === cartLineId);
      if (!existing) return;

      const snapshot = items;
      setItems((current) =>
        current.map((entry) =>
          entry.cartLineId === cartLineId ? { ...entry, cartQuantity: quantity } : entry
        )
      );

      if (!useServerCart) {
        return;
      }

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
        await persistLocalCart(
          snapshot.map((entry) => (entry.cartLineId === cartLineId ? saved : entry))
        );
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          await persistLocalCart(
            snapshot.map((entry) =>
              entry.cartLineId === cartLineId ? { ...entry, cartQuantity: quantity } : entry
            )
          );
          return;
        }
        setItems(snapshot);
      }
    },
    [getAuthHeaders, items, persistLocalCart, removeFromCart, useServerCart]
  );

  const adjustQuantity = useCallback(
    async (cartLineId: string, delta: number) => {
      if (!delta) return;

      if (!useServerCart) {
        setItems((current) => {
          const entry = current.find((e) => e.cartLineId === cartLineId);
          if (!entry) return current;
          const nextQty = entry.cartQuantity + delta;
          if (nextQty <= 0) {
            return current.filter((e) => e.cartLineId !== cartLineId);
          }
          return current.map((e) =>
            e.cartLineId === cartLineId ? { ...e, cartQuantity: nextQty } : e
          );
        });
        return;
      }

      // Capture latest response only (prevents older requests overwriting newer taps).
      mutationIdRef.current += 1;
      const mutationId = mutationIdRef.current;

      let nextQty: number | null = null;
      let lensItemToSave: LensItem | null = null;

      setItems((current) => {
        const entry = current.find((e) => e.cartLineId === cartLineId);
        if (!entry) return current;

        const computed = entry.cartQuantity + delta;
        nextQty = computed;

        lensItemToSave = {
          id: entry.id,
          costPrice: entry.costPrice,
          price: entry.price,
          sph: entry.sph,
          cyl: entry.cyl,
          axis: entry.axis,
          add: entry.add,
          eye: entry.eye,
          quantity: entry.quantity,
          createdAt: entry.createdAt,
          lensType: entry.lensType,
          brand: entry.brand,
          item: entry.item,
          coating: entry.coating,
        };

        if (computed <= 0) {
          return current.filter((e) => e.cartLineId !== cartLineId);
        }

        return current.map((e) =>
          e.cartLineId === cartLineId ? { ...e, cartQuantity: computed } : e
        );
      });

      if (nextQty === null) return;

      setSyncing(true);
      try {
        if (nextQty <= 0) {
          await removeCartLine(cartLineId, getAuthHeaders());
        } else if (lensItemToSave) {
          const { item: saved } = await upsertCartLine(lensItemToSave, nextQty, getAuthHeaders());

          // Ignore out-of-order responses.
          if (mutationId !== mutationIdRef.current) return;

          setItems((current) =>
            current.map((e) => (e.cartLineId === cartLineId ? saved : e))
          );
        }
      } catch (err) {
        if (isOfflineQueuedError(err)) {
          return;
        }
        // If something fails, resync from server.
        await refreshCart();
      } finally {
        // Allow UI to continue; syncing is only for optional indicators.
        setSyncing(false);
      }
    },
    [getAuthHeaders, refreshCart, useServerCart]
  );

  const clearCart = useCallback(async () => {
    if (useServerCart) {
      setSyncing(true);
      try {
        await clearServerCart(getAuthHeaders());
        await saveOfflineCache(OFFLINE_CACHE_KEYS.cart, []);
      } catch (err) {
        if (!isOfflineQueuedError(err)) {
          throw err;
        }
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
    () =>
      items.reduce(
        (sum, entry) => sum + lineTotalForPieceQuantity(entry.price, entry.cartQuantity),
        0
      ),
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
      setCartQuantity,
      bulkSetCartQuantities,
      addWholesaleBatchToCart,
      removeFromCart,
      removeLinesFromCart,
      updateQuantity,
      adjustQuantity,
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
      setCartQuantity,
      bulkSetCartQuantities,
      addWholesaleBatchToCart,
      removeFromCart,
      removeLinesFromCart,
      updateQuantity,
      adjustQuantity,
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
