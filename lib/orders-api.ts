import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import type { ApiLensType, CartItem, LensItem } from '@/lib/types/lens';
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

export type OrderRecord = {
  id: string;
  orderNumber?: number | null;
  checkoutBatchId?: string | null;
  orderImageUrl?: string | null;
  lensType: ApiLensType;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  status: OrderTrackingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: OrderUser;
  singleVisionLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    item?: string | null;
    coating?: string | null;
    sph: number | string;
    cyl: number | string | null;
  } | null;
  kryptokLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    coating?: string | null;
    sph: number | string;
    cyl: number | string | null;
    axis: number | null;
    add: number | string;
  } | null;
  progressiveLens?: {
    id: string;
    brand?: string | null;
    category?: string | null;
    item?: string | null;
    coating?: string | null;
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
  notes?: string,
  checkoutBatchId?: string,
  userId?: string
): Promise<
  { success: true; orderId: string; status?: string } | { success: false; error: string }
> {
  const body = buildOrderPayload(item);
  const payload = {
    ...body,
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
    ...(checkoutBatchId?.trim() ? { checkoutBatchId: checkoutBatchId.trim() } : {}),
    ...(userId?.trim() ? { userId: userId.trim() } : {}),
  };

  const response = await fetch(`${BACKEND_BASE_URL}/api/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result?.error || 'Failed to place order.' };
  }

  const order = result.order ?? result;
  const status = typeof order?.status === 'string' ? order.status : 'PENDING';
  return { success: true, orderId: order?.id ?? result.id, status };
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
  { success: true; orderId: string; status?: string } | { success: false; error: string }
> {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  const cartLikeItem: CartItem = {
    ...lens,
    cartLineId: lens.id,
    cartLineKey: lens.id,
    cartQuantity: safeQuantity,
    reservedQuantity: safeQuantity,
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
  const response = await fetch(`${BACKEND_BASE_URL}/api/orders`, { headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to load orders.');
  }
  return response.json();
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
