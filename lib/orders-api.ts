import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import type { ApiLensType, CartItem } from '@/lib/types/lens';
import { toApiLensType } from '@/lib/types/lens';

export type OrderUser = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

/** Max length for order notes — must match backend `ORDER_NOTES_MAX_LENGTH`. */
export const ORDER_NOTES_MAX_LENGTH = 2000;

export type OrderRecord = {
  id: string;
  lensType: ApiLensType;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  status: OrderTrackingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: OrderUser;
  singleVisionLens?: { sph: number | string; cyl: number | string | null } | null;
  kryptokLens?: {
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
  } | null;
  progressiveLens?: {
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
    eye: string;
  } | null;
};

type CreateOrderPayload = {
  lensType: ApiLensType;
  lensId: string;
  quantity: number;
  sph: number;
  cyl?: number | null;
  axis?: number | null;
  add?: number | null;
  eye?: string;
  notes?: string;
};

function buildOrderPayload(item: CartItem): CreateOrderPayload {
  const lensType = toApiLensType(item.lensType ?? 'Progressive');
  const payload: CreateOrderPayload = {
    lensType,
    lensId: item.id,
    quantity: item.cartQuantity,
    sph: item.sph,
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

export async function createOrder(
  item: CartItem,
  headers: Record<string, string>,
  notes?: string
): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
  const body = buildOrderPayload(item);
  const payload = notes?.trim() ? { ...body, notes: notes.trim() } : body;

  const response = await fetch(`${BACKEND_BASE_URL}/api/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result?.error || 'Failed to place order.' };
  }

  return { success: true, orderId: result.order?.id ?? result.id };
}

export async function fetchOrders(headers: Record<string, string>): Promise<OrderRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/orders`, { headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load orders.');
  }
  return response.json();
}

export async function cancelOrder(orderId: string, headers: Record<string, string>): Promise<void> {
  await updateOrderStatus(orderId, 'CANCELLED', headers);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderTrackingStatus,
  headers: Record<string, string>
): Promise<OrderRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/orders/${orderId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to update order status.');
  }

  return result;
}

export function getOrderLensDetails(order: OrderRecord) {
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
