import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch, isOfflineQueuedError } from '@/lib/api-request';
import { loadOfflineCache, OFFLINE_CACHE_KEYS, saveOfflineCache } from '@/lib/offline-cache';
import { getIsOnline } from '@/lib/network';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import type { Paginated } from '@/lib/types/api-client';
import type { ApiLensType, CartItem, CartLineType, LensItem, WholesaleSpec } from '@/lib/types/lens';
import { toApiLensType } from '@/lib/types/lens';

export type OrderUser = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  businessName?: string | null;
};

export type OrderAssignee = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
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
  /** List summary flag — signed URL only on detail GET (RW-11 Phase B). */
  hasOrderImage?: boolean;
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
  /** Staff-only — never sent to CUSTOMER role by the API. */
  internalNotes?: string | null;
  cancelReason?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  /** Courier dispatch slot decided at order placement (cutoff-aware). */
  dispatchDate?: string | null;
  /** True when the order was placed after the admin-configured dispatch cutoff. */
  cutoffDeferred?: boolean;
  dispatchOverridden?: boolean;
  deliveryServiceId?: string | null;
  deliveryService?: {
    id: string;
    courierCompany: string;
    serviceName: string;
    serviceType: string;
    customerRate: number | string;
    etaText?: string | null;
  } | null;
  delivery?: {
    actualWeight: number | string;
    chargeableWeight: number | string;
    customerCharge: number | string;
    weightEnteredAt?: string | null;
  } | null;
  /** Customer-selected prescription at checkout (preferred over catalog lens). */
  sph?: number | string | null;
  cyl?: number | string | null;
  axis?: number | null;
  add?: number | string | null;
  eye?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: OrderUser;
  assignedToId?: string | null;
  assignedAt?: string | null;
  assignedTo?: OrderAssignee | null;
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
  powerVersions?: OrderPowerVersion[];
  alternateSuggestions?: AlternatePowerSuggestion[];
};

export type OrderPowerVersion = {
  id: string;
  orderId: string;
  versionNumber: number;
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  eye: string | null;
  lensType: string;
  lensId: string | null;
  source: string;
  status: string;
  reservedQuantity: number;
  pickedQuantity: number;
  isFinalFulfilled: boolean;
  acceptedAt?: string | null;
  supersededAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type AlternatePowerSuggestion = {
  id: string;
  orderId: string;
  forVersionId: string;
  sph: number;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  eye: string | null;
  lensType: string;
  lensId: string;
  availability: 'WAREHOUSE' | 'SUPPLIER' | 'OUT_OF_STOCK' | string;
  etaDays: number | null;
  distanceScore: number;
  status: string;
  createdAt: string;
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
  deliveryServiceId?: string;
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
  checkoutBatchId?: string,
  deliveryServiceId?: string
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
        ...(deliveryServiceId?.trim()
          ? { deliveryServiceId: deliveryServiceId.trim() }
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
  userId?: string,
  deliveryServiceId?: string
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
      ...(deliveryServiceId?.trim() ? { deliveryServiceId: deliveryServiceId.trim() } : {}),
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

/** Max orders kept in offline summary cache (bounded — RW-11 Phase B). */
export const OFFLINE_ORDERS_CACHE_MAX = 50;

export type ListOrdersParams = {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  userId?: string;
  batchId?: string;
  employeeId?: string;
  lineType?: string;
  orderKind?: string;
  scope?: 'all' | 'catalog' | 'rx_lab';
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PaginatedOrders = Paginated<OrderRecord>;

export function buildOrdersQueryString(params?: ListOrdersParams): string {
  const qs = new URLSearchParams();
  if (!params) return '';
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.status?.trim()) qs.set('status', params.status.trim());
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.userId?.trim()) qs.set('userId', params.userId.trim());
  if (params.batchId?.trim()) qs.set('batchId', params.batchId.trim());
  if (params.employeeId?.trim()) qs.set('employeeId', params.employeeId.trim());
  if (params.lineType?.trim()) qs.set('lineType', params.lineType.trim());
  if (params.orderKind?.trim()) qs.set('orderKind', params.orderKind.trim());
  if (params.scope && params.scope !== 'all') qs.set('scope', params.scope);
  if (params.assigneeId?.trim()) qs.set('assigneeId', params.assigneeId.trim());
  if (params.dateFrom?.trim()) qs.set('dateFrom', params.dateFrom.trim());
  if (params.dateTo?.trim()) qs.set('dateTo', params.dateTo.trim());
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function normalizeOrdersListResponse(data: unknown): PaginatedOrders {
  if (Array.isArray(data)) {
    return {
      items: data as OrderRecord[],
      page: 1,
      limit: data.length,
      hasMore: false,
      total: data.length,
    };
  }
  const body = data as Partial<PaginatedOrders> | null;
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    items,
    page: typeof body?.page === 'number' ? body.page : 1,
    limit: typeof body?.limit === 'number' ? body.limit : items.length,
    hasMore: Boolean(body?.hasMore),
    total: typeof body?.total === 'number' ? body.total : undefined,
  };
}

/**
 * Paginated summary list. Offline: caches first-page summary only (bounded).
 */
export async function fetchOrders(
  headers: Record<string, string>,
  params?: ListOrdersParams
): Promise<PaginatedOrders> {
  const page = params?.page ?? 1;
  const query = buildOrdersQueryString(params);

  try {
    const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders${query}`, {
      headers,
      authenticated: true,
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result?.error || 'Failed to load orders.');
    }
    const paginated = normalizeOrdersListResponse(await response.json());

    // Bound offline cache to first page (or a capped recent set).
    if (page <= 1) {
      await saveOfflineCache(OFFLINE_CACHE_KEYS.orders, {
        ...paginated,
        items: paginated.items.slice(0, OFFLINE_ORDERS_CACHE_MAX),
      });
    }

    return paginated;
  } catch (error) {
    if (isOfflineQueuedError(error)) {
      throw error;
    }
    const cached = await loadOfflineCache<unknown>(OFFLINE_CACHE_KEYS.orders);
    if (cached) {
      return normalizeOrdersListResponse(cached);
    }
    const online = await getIsOnline();
    if (!online) {
      return { items: [], page: 1, limit: params?.limit ?? 30, hasMore: false, total: 0 };
    }
    throw error;
  }
}

/** Role-scoped dashboard aggregates (RW-11 Phase D). */
export type CustomerOrdersOverview = {
  role: 'CUSTOMER';
  overview: {
    total: number;
    inProgress: number;
    readyToShip: number;
    completed: number;
  };
  trends: {
    total: { percent: number; direction: 'up' | 'down' | 'flat' };
    inProgress: { percent: number; direction: 'up' | 'down' | 'flat' };
    readyToShip: { percent: number; direction: 'up' | 'down' | 'flat' };
    completed: { percent: number; direction: 'up' | 'down' | 'flat' };
  };
  lastOrder: { id: string; label: string } | null;
  topProducts: Array<{
    lensId: string;
    title: string;
    subtitle: string;
    shopFilter: 'Single Vision' | 'Kryptok' | 'Progressive';
    orderCount: number;
    totalQuantity: number;
  }>;
};

export type StaffOrdersOverview = {
  role: 'EMPLOYEE' | 'ADMIN';
  tasksAssigned: number;
  tasksCompleted: number;
  ordersReceived: number;
  ordersPending: number;
  pendingOrders: Array<{
    id: string;
    status: string;
    createdAt: string;
    orderNumber: number | null;
    lensType: string;
    checkoutBatchId?: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      businessName: string | null;
    } | null;
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
  }>;
};

export type OrdersOverview = CustomerOrdersOverview | StaffOrdersOverview;

export async function fetchOrdersOverview(
  headers: Record<string, string>
): Promise<OrdersOverview> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/overview`, {
    headers,
    authenticated: true,
  });
  const data = (await response.json().catch(() => ({}))) as OrdersOverview & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to load orders overview.');
  }
  return data;
}

export async function fetchOrderById(
  orderId: string,
  headers: Record<string, string>
): Promise<OrderRecord> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/${orderId}`, {
    headers,
    authenticated: true,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load order.');
  }
  return result as OrderRecord;
}

/**
 * List rows omit signed image URLs. Hydrate lines that need a prescription
 * image from detail GET so group detail screens keep photo display.
 */
async function hydrateOrderImages(
  items: OrderRecord[],
  headers: Record<string, string>
): Promise<OrderRecord[]> {
  const needImage = items.filter(
    (o) => o.hasOrderImage && !o.orderImageUrl?.trim()
  );
  if (needImage.length === 0) return items;

  const details = await Promise.all(
    needImage.map(async (o) => {
      try {
        return await fetchOrderById(o.id, headers);
      } catch {
        return o;
      }
    })
  );
  const byId = new Map(details.map((d) => [d.id, d]));
  return items.map((o) => byId.get(o.id) ?? o);
}

/** Cap pages when expanding a checkout batch (100 × 50 = 5000 lines). */
export const ORDER_GROUP_MAX_PAGES = 50;

export type BatchOrdersPage<T extends { id: string } = OrderRecord> = {
  items: T[];
  hasMore: boolean;
};

/**
 * Walk paginated batch results until exhausted (no silent truncation).
 * Inject `fetchPage` for unit tests (groups > 100 lines).
 */
export async function collectAllBatchOrderPages<T extends { id: string }>(
  fetchPage: (page: number) => Promise<BatchOrdersPage<T>>,
  maxPages: number = ORDER_GROUP_MAX_PAGES
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= maxPages) {
    const result = await fetchPage(page);
    all.push(...result.items);
    hasMore = result.hasMore;
    page += 1;
  }
  return all;
}

async function listAllOrdersForBatch(
  batchId: string,
  headers: Record<string, string>
): Promise<OrderRecord[]> {
  return collectAllBatchOrderPages(async (page) => {
    const result = await fetchOrders(headers, { batchId, page, limit: 100 });
    return { items: result.items, hasMore: result.hasMore };
  });
}

/**
 * Resolve a list/detail group key (batch id or order id) to sibling lines.
 * Loads every page for the batch (no silent truncation at 100).
 */
export async function fetchOrdersForGroup(
  groupKey: string,
  headers: Record<string, string>
): Promise<OrderRecord[]> {
  const key = groupKey.trim();
  if (!key) return [];

  const byBatch = await listAllOrdersForBatch(key, headers);
  if (byBatch.length > 0) {
    return hydrateOrderImages(byBatch, headers);
  }

  try {
    const order = await fetchOrderById(key, headers);
    const batchId = order.checkoutBatchId?.trim();
    if (batchId && batchId !== key) {
      const batch = await listAllOrdersForBatch(batchId, headers);
      if (batch.length > 0) {
        return hydrateOrderImages(batch, headers);
      }
    }
    return [order];
  } catch {
    return [];
  }
}

export async function cancelOrder(orderId: string, headers: Record<string, string>): Promise<void> {
  await updateOrderStatus(orderId, 'CANCELLED', headers);
}

export async function dispatchOrder(
  orderId: string,
  courierName: string,
  trackingNumber: string,
  headers: Record<string, string>
): Promise<{ order: OrderRecord; duplicateWarning?: string | null }> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/${orderId}/dispatch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ courierName, trackingNumber }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to dispatch order.');
  }

  return result;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderTrackingStatus,
  headers: Record<string, string>,
  pickedQuantity?: number,
  extras?: {
    courierName?: string | null;
    trackingNumber?: string | null;
    deliveryServiceId?: string | null;
    actualWeight?: number | null;
    weightReason?: string | null;
  }
): Promise<OrderRecord> {
  const payload: {
    status: OrderTrackingStatus;
    pickedQuantity?: number;
    courierName?: string | null;
    trackingNumber?: string | null;
    deliveryServiceId?: string | null;
    actualWeight?: number | null;
    weightReason?: string | null;
  } = { status };
  if (pickedQuantity !== undefined) {
    payload.pickedQuantity = pickedQuantity;
  }
  if (extras?.courierName !== undefined) payload.courierName = extras.courierName;
  if (extras?.trackingNumber !== undefined) payload.trackingNumber = extras.trackingNumber;
  if (extras?.deliveryServiceId !== undefined) payload.deliveryServiceId = extras.deliveryServiceId;
  if (extras?.actualWeight !== undefined) payload.actualWeight = extras.actualWeight;
  if (extras?.weightReason !== undefined) payload.weightReason = extras.weightReason;

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
