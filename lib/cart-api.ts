import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import { buildCartLineId } from '@/lib/cart-utils';
import type { CartItem, LensItem, WholesaleSpec } from '@/lib/types/lens';
import { toApiLensType } from '@/lib/types/lens';

export type ServerCartItem = {
  id: string;
  cartLineId: string;
  cartLineKey: string;
  cartQuantity: number;
  reservedQuantity: number;
  isBackorder: boolean;
  price: number;
  sph: number;
  cyl: number | null;
  add: number | null;
  axis: number | null;
  eye: string | null;
  brand: string | null;
  item: string | null;
  coating: string | null;
  lensType: string | null;
  quantity: number;
  expiresAt: string;
  createdAt: string;
  lineType?: 'RETAIL' | 'WHOLESALE';
  wholesaleSpec?: WholesaleSpec | null;
};

type UpsertCartLineOptions = {
  cartLineKey?: string;
  lineType?: 'RETAIL' | 'WHOLESALE';
};

type BulkCartLineInput = {
  item: LensItem;
  quantity: number;
  cartLineKey?: string;
  lineType?: 'RETAIL' | 'WHOLESALE';
};

function mapServerItem(row: ServerCartItem): CartItem {
  const cartLineKey = row.cartLineKey ?? row.cartLineId;
  return {
    id: row.id,
    cartLineId: cartLineKey,
    cartLineKey,
    cartQuantity: row.cartQuantity,
    reservedQuantity: row.reservedQuantity,
    isBackorder: row.isBackorder,
    expiresAt: row.expiresAt,
    price: row.price,
    costPrice: null,
    sph: row.sph,
    cyl: row.cyl,
    add: row.add,
    axis: row.axis,
    eye: row.eye ?? undefined,
    quantity: row.quantity,
    createdAt: row.createdAt,
    lensType: (row.lensType as CartItem['lensType']) ?? undefined,
    brand: row.brand,
    item: row.item,
    coating: row.coating,
    lineType: row.lineType ?? 'RETAIL',
    wholesaleSpec: row.wholesaleSpec ?? null,
  };
}

export async function fetchCart(headers: Record<string, string>): Promise<CartItem[]> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/cart`, {
    headers,
    authenticated: true,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load cart.');
  }
  const items = (result.items ?? []) as ServerCartItem[];
  return items.map(mapServerItem);
}

export async function fetchCustomerCart(
  customerId: string,
  headers: Record<string, string>
): Promise<CartItem[]> {
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/cart?userId=${encodeURIComponent(customerId)}`,
    { headers, authenticated: true }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load customer cart.');
  }
  const items = (result.items ?? []) as ServerCartItem[];
  return items.map(mapServerItem);
}

export async function upsertCartLine(
  item: LensItem,
  quantity: number,
  headers: Record<string, string>,
  customerId?: string,
  options?: UpsertCartLineOptions
): Promise<{ item: CartItem; message?: string }> {
  const cartLineKey = options?.cartLineKey?.trim() || buildCartLineId(item);
  const lensType = item.lensType ?? 'Progressive';

  const response = await apiFetch(`${BACKEND_BASE_URL}/api/cart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      lensType: toApiLensType(lensType),
      lensId: item.id,
      cartLineKey,
      quantity,
      unitPrice: item.price,
      sph: item.sph,
      cyl: item.cyl,
      add: item.add,
      axis: item.axis,
      eye: item.eye,
      brand: item.brand,
      coating: item.coating,
      item: item.item,
      lensTypeLabel: lensType,
      ...(options?.lineType ? { lineType: options.lineType } : {}),
      ...(customerId?.trim() ? { userId: customerId.trim() } : {}),
    }),
    queueWhenOffline: true,
    queueLabel: 'Update cart',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to add to cart.');
  }

  return {
    item: mapServerItem(result.item as ServerCartItem),
    message: typeof result.message === 'string' ? result.message : undefined,
  };
}

export const BULK_CART_CHUNK_SIZE = 200;

function toBulkLineBody(line: BulkCartLineInput) {
  const { item, quantity, cartLineKey: rawCartLineKey, lineType } = line;
  const cartLineKey = rawCartLineKey?.trim() || buildCartLineId(item);
  const lensType = item.lensType ?? 'Progressive';

  return {
    lensType: toApiLensType(lensType),
    lensId: item.id,
    cartLineKey,
    quantity: Math.max(1, Math.round(quantity)),
    unitPrice: item.price,
    sph: item.sph,
    cyl: item.cyl,
    add: item.add,
    axis: item.axis,
    eye: item.eye,
    brand: item.brand,
    coating: item.coating,
    item: item.item,
    lensTypeLabel: lensType,
    ...(lineType ? { lineType } : {}),
  };
}

export async function bulkUpsertCartLines(
  lines: BulkCartLineInput[],
  headers: Record<string, string>,
  customerId?: string
): Promise<{ items: CartItem[]; count: number; message?: string }> {
  if (lines.length === 0) {
    return { items: [], count: 0 };
  }

  let totalCount = 0;
  let message: string | undefined;

  for (let offset = 0; offset < lines.length; offset += BULK_CART_CHUNK_SIZE) {
    const chunk = lines.slice(offset, offset + BULK_CART_CHUNK_SIZE);
    const response = await apiFetch(`${BACKEND_BASE_URL}/api/cart/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lines: chunk.map((line) => toBulkLineBody(line)),
        ...(customerId?.trim() ? { userId: customerId.trim() } : {}),
      }),
      queueWhenOffline: true,
      queueLabel: 'Update cart',
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to add to cart.');
    }

    const chunkCount =
      typeof result.count === 'number'
        ? result.count
        : Array.isArray(result.items)
          ? result.items.length
          : chunk.length;
    totalCount += chunkCount;

    if (typeof result.message === 'string') {
      message = result.message;
    }
  }

  return { items: [], count: totalCount, message };
}

export type UpsertWholesaleCartInput = {
  lensId: string;
  lensType: string;
  unitPrice: number;
  brand?: string | null;
  coating?: string | null;
  item?: string | null;
  lensTypeLabel?: string | null;
  ranges: WholesaleSpec['ranges'];
  gridMode: WholesaleSpec['gridMode'];
  defaultPairsPerCell: number;
  qtyOverrides?: Record<string, number>;
  productAxis?: number | null;
  isBifocalLens: boolean;
  isSingleVision: boolean;
  crossPower?: number | null;
};

export async function upsertWholesaleCartBatch(
  input: UpsertWholesaleCartInput,
  headers: Record<string, string>
): Promise<{ item: CartItem; expandedLineCount: number; message?: string }> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/cart/wholesale`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
    queueWhenOffline: true,
    queueLabel: 'Add wholesale batch',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to add wholesale batch to cart.');
  }

  return {
    item: mapServerItem(result.item as ServerCartItem),
    expandedLineCount:
      typeof result.expandedLineCount === 'number' ? result.expandedLineCount : 0,
    message: typeof result.message === 'string' ? result.message : undefined,
  };
}

export async function removeCartLine(
  cartLineKey: string,
  headers: Record<string, string>,
  customerId?: string
): Promise<void> {
  const userParam = customerId?.trim()
    ? `&userId=${encodeURIComponent(customerId.trim())}`
    : '';
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/cart?cartLineKey=${encodeURIComponent(cartLineKey)}${userParam}`,
    {
      method: 'DELETE',
      headers,
      queueWhenOffline: true,
      queueLabel: 'Remove cart item',
    }
  );
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to remove from cart.');
  }
}

export async function clearServerCart(
  headers: Record<string, string>,
  customerId?: string
): Promise<void> {
  const userParam = customerId?.trim()
    ? `?userId=${encodeURIComponent(customerId.trim())}`
    : '';
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/cart${userParam}`, {
    method: 'DELETE',
    headers,
    queueWhenOffline: true,
    queueLabel: 'Clear cart',
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to clear cart.');
  }
}
