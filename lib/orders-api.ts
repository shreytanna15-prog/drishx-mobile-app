import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch, isOfflineQueuedError } from '@/lib/api-request';
import { loadOfflineCache, OFFLINE_CACHE_KEYS, saveOfflineCache } from '@/lib/offline-cache';
import { getIsOnline } from '@/lib/network';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import type { ApiLensType, CartItem, CartLineType, LensItem, WholesaleSpec } from '@/lib/types/lens';
import { toApiLensType } from '@/lib/types/lens';

export type OrderUser = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  businessName?: string | null;
};

/** Max length for order notes — must match backend `ORDER_NOTES_MAX_LENGTH`. */
export const ORDER_NOTES_MAX_LENGTH = 2000;

export type WholesaleOrderLineItem = {
  id: string;
  powerKey: string;
  quantity: number;
  reservedQuantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  sph: number;
  cyl?: number | null;
  axis?: number | null;
  add?: number | null;
  needsProcurement?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderRecord = {
  id: string;
  orderNumber?: number | null;
  checkoutBatchId?: string | null;
  orderImageUrl?: string | null;
  lensType: ApiLensType;
  lineType?: CartLineType | null;
  wholesaleSpec?: WholesaleSpec | null;
  wholesaleLineItems?: WholesaleOrderLineItem[];
  quantity: number;
  reservedQuantity?: number;
  pickedQuantity?: number;
  unitPrice: number | string;
  totalAmount: number | string;
  status: OrderTrackingStatus;
  notes?: string | null;
  /** Customer-selected prescription at checkout (preferred over catalog lens). */
  sph?: number | string | null;
  cyl?: number | string | null;
  axis?: number | null;
  add?: number | string | null;
  eye?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: OrderUser;
  singleVisionLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    item?: string | null;
    coating?: string | null;
    sph?: number | string | null;
    cyl?: number | string | null;
    crossPower?: number | string | null;
  } | null;
  kryptokLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    item?: string | null;
    coating?: string | null;
    sph?: number | string | null;
    cyl?: number | string | null;
    crossPower?: number | string | null;
    axis?: number | null;
    add?: number | string;
  } | null;
  progressiveLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    item?: string | null;
    coating?: string | null;
    sph?: number | string | null;
    cyl?: number | string | null;
    crossPower?: number | string | null;
    axis?: number | null;
    add?: number | string;
    eye?: string;
  } | null;
};

type CreateOrderPayload = {
  lensType: ApiLensType;
  lensId: string;
  quantity: number;
  cartLineKey?: string;
  checkoutBatchId?: string;
  sph: number;
  cyl?: number | null;
  axis?: number | null;
  add?: number | null;
  eye?: string;
  notes?: string;
  userId?: string;
};

function buildOrderPayload(item: CartItem): CreateOrderPayload {
  const lensType = toApiLensType(item.lensType ?? 'Progressive');
  const payload: CreateOrderPayload = {
    lensType,
    lensId: item.id,
    quantity: item.cartQuantity,
    cartLineKey: item.cartLineKey ?? item.cartLineId,
    sph: item.sph ?? 0,
    cyl: item.cyl,
  };

  if (lensType === 'KRYPTOK' || lensType === 'PROGRESSIVE') {
    payload.axis = item.axis;
    payload.add = item.add;
  }

  if (lensType === 'PROGRESSIVE' && item.eye) {
    payload.eye = item.eye.toUpperCase();
  }

  return payload;
}

export async function wholesaleCheckout(
  cartLineKeys: string[],
  headers: Record<string, string>,
  notes?: string,
  checkoutBatchId?: string
): Promise<
  | {
      success: true;
      successCount: number;
      procurementCount: number;
      queued?: boolean;
    }
  | {
      success: false;
      error: string;
      partialFailures?: string[];
      successCount?: number;
      procurementCount?: number;
    }
> {
  try {
    const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/wholesale-checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cartLineKeys,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
        ...(checkoutBatchId?.trim()
          ? { checkoutBatchId: checkoutBatchId.trim() }
          : {}),
      }),
      queueWhenOffline: true,
      queueLabel: 'Place wholesale order',
    });

    const result = await response.json().catch(() => ({}));
    const successCount =
      typeof result.successCount === 'number' ? result.successCount : 0;
    const procurementCount =
      typeof result.procurementCount === 'number' ? result.procurementCount : 0;

    if (!response.ok) {
      return {
        success: false,
        error: result?.error || 'Failed to place wholesale orders.',
        partialFailures: Array.isArray(result.failures) ? result.failures : undefined,
        successCount,
        procurementCount,
      };
    }

    return {
      success: true,
      successCount,
      procurementCount,
    };
  } catch (error) {
    if (isOfflineQueuedError(error)) {
      return { success: true, successCount: 0, procurementCount: 0, queued: true };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to place wholesale orders.',
    };
  }
}

export async function createOrder(
  item: CartItem,
  headers: Record<string, string>,
  notes?: string,
  checkoutBatchId?: string,
  userId?: string
): Promise<
  | { success: true; orderId: string; status?: string; queued?: boolean }
  | { success: false; error: string }
> {
  try {
    const body = buildOrderPayload(item);
    const payload = {
      ...body,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
      ...(checkoutBatchId?.trim() ? { checkoutBatchId: checkoutBatchId.trim() } : {}),
      ...(userId?.trim() ? { userId: userId.trim() } : {}),
    };

    const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      queueWhenOffline: true,
      queueLabel: 'Place order',
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result?.error || 'Failed to place order.' };
    }

    const order = result.order ?? result;
    const status = typeof order?.status === 'string' ? order.status : 'PENDING';
    return { success: true, orderId: order?.id ?? result.id, status };
  } catch (error) {
    if (isOfflineQueuedError(error)) {
      return { success: true, orderId: error.queueId, status: 'PENDING', queued: true };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place order.',
    };
  }
}

export async function createOrderFromLens(
  lens: LensItem,
  quantity: number,
  headers: Record<string, string>,
  options?: {
    notes?: string;
    checkoutBatchId?: string;
    userId?: string;
  }
): Promise<
  | { success: true; orderId: string; status?: string; queued?: boolean }
  | { success: false; error: string }
> {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  const cartLikeItem: CartItem = {
    ...lens,
    cartLineId: lens.id,
    cartLineKey: lens.id,
    cartQuantity: safeQuantity,
    isBackorder: false,
  };

  return createOrder(
    cartLikeItem,
    headers,
    options?.notes,
    options?.checkoutBatchId,
    options?.userId
  );
}

export async function fetchOrders(headers: Record<string, string>): Promise<OrderRecord[]> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/orders`, { headers });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result?.error || 'Failed to load orders.');
    }
    const orders = (await response.json()) as OrderRecord[];
    await saveOfflineCache(OFFLINE_CACHE_KEYS.orders, orders);
    return orders;
  } catch (error) {
    const cached = await loadOfflineCache<OrderRecord[]>(OFFLINE_CACHE_KEYS.orders);
    if (cached) {
      return cached;
    }
    const online = await getIsOnline();
    if (!online) {
      return [];
    }
    throw error;
  }
}

export async function fetchOrderById(orderId: string, headers: Record<string, string>): Promise<OrderRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/orders/${orderId}`, { headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load order.');
  }
  return result as OrderRecord;
}

export async function cancelOrder(orderId: string, headers: Record<string, string>): Promise<void> {
  await updateOrderStatus(orderId, 'CANCELLED', headers);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderTrackingStatus,
  headers: Record<string, string>,
  pickedQuantity?: number
): Promise<OrderRecord> {
  const payload: { status: OrderTrackingStatus; pickedQuantity?: number } = { status };
  if (pickedQuantity !== undefined) {
    payload.pickedQuantity = pickedQuantity;
  }

  const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/${orderId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
    queueWhenOffline: true,
    queueLabel: 'Update order',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to update order status.');
  }

  return result;
}

function hasOrderPrescription(order: OrderRecord): boolean {
  const hasSph = order.sph !== undefined && order.sph !== null && order.sph !== '';
  const hasCyl = order.cyl !== undefined && order.cyl !== null && order.cyl !== '';
  return hasSph || hasCyl;
}

function isWholesaleOrder(order: OrderRecord): boolean {
  return (
    order.lineType === 'WHOLESALE' ||
    (Array.isArray(order.wholesaleLineItems) && order.wholesaleLineItems.length > 0)
  );
}

export function getOrderLensDetails(order: OrderRecord) {
  if (hasOrderPrescription(order)) {
    const catalog =
      order.progressiveLens ?? order.kryptokLens ?? order.singleVisionLens ?? null;
    return {
      sph: order.sph ?? catalog?.sph ?? 0,
      cyl: order.cyl ?? catalog?.cyl ?? null,
      axis: order.axis ?? (order.kryptokLens?.axis ?? order.progressiveLens?.axis ?? null),
      add: order.add ?? (order.kryptokLens?.add ?? order.progressiveLens?.add ?? null),
      eye: order.eye ?? order.progressiveLens?.eye ?? undefined,
    };
  }

  // Wholesale parent rows keep sph/cyl null; powers live on wholesaleLineItems.
  if (isWholesaleOrder(order)) {
    return null;
  }

  if (order.progressiveLens) {
    return {
      sph: order.progressiveLens.sph,
      cyl: order.progressiveLens.cyl,
      axis: order.progressiveLens.axis,
      add: order.progressiveLens.add,
      eye: order.progressiveLens.eye,
    };
  }
  if (order.kryptokLens) {
    return {
      sph: order.kryptokLens.sph,
      cyl: order.kryptokLens.cyl,
      axis: order.kryptokLens.axis,
      add: order.kryptokLens.add,
    };
  }
  if (order.singleVisionLens) {
    return {
      sph: order.singleVisionLens.sph,
      cyl: order.singleVisionLens.cyl,
    };
  }
  return null;
}
