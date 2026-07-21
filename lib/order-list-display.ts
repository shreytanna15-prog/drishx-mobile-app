import { hasCrossPower } from '@/lib/cross-power';
import { formatOrderStatusLabel, normalizeOrderStatus, type OrderTrackingStatus } from '@/lib/order-tracking';
import {
  getOrderLensDetails,
  type OrderRecord,
  type WholesaleOrderLineItem,
} from '@/lib/orders-api';
import { pairsFromPieces } from '@/lib/order-quantity';
import { formatLensType, type LensItem, type LensType } from '@/lib/types/lens';

export type OrderCardStatusVariant =
  | 'ready'
  | 'partial'
  | 'procurement'
  | 'progress'
  | 'completed'
  | 'cancelled';

export type OrderCardStatusDisplay = {
  label: string;
  variant: OrderCardStatusVariant;
};

export type OrderListGroup = {
  key: string;
  orders: OrderRecord[];
  displayOrderId: string;
  companyName: string;
  createdAt: string;
  productCount: number;
  pairCount: number;
  totalAmount: number;
  readyProductCount: number;
  procurementProductCount: number;
  status: OrderCardStatusDisplay;
  isPhotoOrder?: boolean;
  photoUrl?: string | null;
};

export function formatDisplayOrderId(order: OrderRecord): string {
  if (order.orderNumber != null && Number.isFinite(Number(order.orderNumber))) {
    return `ORD${order.orderNumber}`;
  }
  return `ORD${order.id.slice(-6).toUpperCase()}`;
}

export function formatOrderDateTime(value: string): string {
  const date = new Date(value);
  const datePart = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export type OrderPowerDisplayLine = {
  key: string;
  order: OrderRecord;
  /** Ordered pieces for this power row. */
  quantity: number;
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  crossPower?: number | null;
};

function catalogCrossPower(order: OrderRecord): number | null {
  const catalog = order.progressiveLens ?? order.kryptokLens ?? order.singleVisionLens;
  if (!catalog || !('crossPower' in catalog)) {
    return null;
  }
  const value = catalog.crossPower;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toNullablePower(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function lineFromWholesaleItem(
  order: OrderRecord,
  line: WholesaleOrderLineItem
): OrderPowerDisplayLine {
  return {
    key: line.id || `${order.id}:${line.powerKey}`,
    order,
    quantity: Math.max(1, Number(line.quantity) || 1),
    sph: toNullablePower(line.sph),
    cyl: toNullablePower(line.cyl),
    axis: line.axis ?? null,
    add: toNullablePower(line.add),
    crossPower: catalogCrossPower(order),
  };
}

/** Expand an order into power rows (wholesale line items, or one retail row). */
export function getOrderPowerDisplayLines(order: OrderRecord): OrderPowerDisplayLine[] {
  if (order.wholesaleLineItems && order.wholesaleLineItems.length > 0) {
    return [...order.wholesaleLineItems]
      .sort((a, b) => {
        const sphDiff = Number(a.sph) - Number(b.sph);
        if (sphDiff !== 0) return sphDiff;
        return Number(a.cyl ?? 0) - Number(b.cyl ?? 0);
      })
      .map((line) => lineFromWholesaleItem(order, line));
  }

  const details = getOrderLensDetails(order);
  return [
    {
      key: order.id,
      order,
      quantity: Math.max(1, Number(order.quantity) || 1),
      sph: toNullablePower(details?.sph),
      cyl: toNullablePower(details?.cyl),
      axis: details?.axis ?? null,
      add: toNullablePower(details?.add),
      crossPower: catalogCrossPower(order),
    },
  ];
}

export function orderPowerLineToLensItem(line: OrderPowerDisplayLine): LensItem {
  const order = line.order;
  const catalog = order.progressiveLens ?? order.kryptokLens ?? order.singleVisionLens;
  const lensType = formatLensType(order.lensType) as LensType;

  return {
    id: catalog?.id ?? order.id,
    costPrice: null,
    price: Number(order.unitPrice || order.totalAmount || 0),
    sph: line.sph,
    cyl: line.cyl,
    crossPower: line.crossPower ?? null,
    axis: line.axis,
    add: line.add,
    eye:
      order.eye ??
      (catalog && 'eye' in catalog ? catalog.eye ?? undefined : undefined) ??
      undefined,
    quantity: Math.max(1, Number(line.quantity) || 1),
    createdAt: order.createdAt,
    lensType,
    brand: catalog?.brand ?? null,
    coating: catalog?.coating ?? null,
    item: catalog && 'item' in catalog ? (catalog.item ?? null) : null,
    index:
      catalog && 'index' in catalog && catalog.index != null
        ? Number(catalog.index)
        : null,
  };
}

/** Map an order line to shop-style product card fields (SV / KT / V2 naming). */
export function orderToLensItem(order: OrderRecord): LensItem {
  const lines = getOrderPowerDisplayLines(order);
  return orderPowerLineToLensItem(lines[0]!);
}

function isProcurementLine(status: OrderTrackingStatus): boolean {
  return status === 'AWAITING_PROCUREMENT' || status === 'PARTIALLY_FULFILLED';
}

/** Order batch waiting for stock purchase (Procurement tab). */
export function hasAwaitingProcurementOrder(group: OrderListGroup): boolean {
  if (group.isPhotoOrder) {
    return false;
  }
  return group.orders.some(
    (order) => normalizeOrderStatus(order.status) === 'AWAITING_PROCUREMENT'
  );
}

/** @deprecated Use hasAwaitingProcurementOrder — kept for badge logic elsewhere. */
export function isProcurementOnlyGroup(group: OrderListGroup): boolean {
  if (group.isPhotoOrder) {
    return false;
  }
  const active = group.orders.filter((order) => normalizeOrderStatus(order.status) !== 'CANCELLED');
  if (active.length === 0) {
    return false;
  }
  return active.every((order) => normalizeOrderStatus(order.status) === 'AWAITING_PROCUREMENT');
}

export function filterProcurementOrderGroups(groups: OrderListGroup[]): OrderListGroup[] {
  return groups.filter(hasAwaitingProcurementOrder);
}

export function filterNonProcurementOrderGroups(groups: OrderListGroup[]): OrderListGroup[] {
  return groups.filter((group) => !hasAwaitingProcurementOrder(group));
}

export function getOrderLensRef(order: OrderRecord): { lensType: OrderRecord['lensType']; lensId: string } | null {
  if (order.singleVisionLens?.id) {
    return { lensType: order.lensType, lensId: order.singleVisionLens.id };
  }
  if (order.kryptokLens?.id) {
    return { lensType: order.lensType, lensId: order.kryptokLens.id };
  }
  if (order.progressiveLens?.id) {
    return { lensType: order.lensType, lensId: order.progressiveLens.id };
  }
  return null;
}

export function isColorLensOrder(order: OrderRecord): boolean {
  return order.notes?.includes('[Color Lens]') ?? false;
}

export function isRxOrder(order: OrderRecord): boolean {
  return order.notes?.includes('[RX Order]') ?? false;
}

/** True when the ordered catalog product (or wholesale batch) is a cross lens. */
export function isCrossOrder(order: OrderRecord): boolean {
  const catalog = order.progressiveLens ?? order.kryptokLens ?? order.singleVisionLens;

  if (
    hasCrossPower({
      crossPower: catalog && 'crossPower' in catalog ? catalog.crossPower : null,
    })
  ) {
    return true;
  }

  if (hasCrossPower({ crossPower: order.wholesaleSpec?.crossPower })) {
    return true;
  }

  const itemLabel =
    catalog && 'item' in catalog ? catalog.item?.trim().toLowerCase() ?? '' : '';
  if (itemLabel === 'cross' || itemLabel.includes('cross')) {
    return true;
  }

  return false;
}

/** Shop prescription photo upload — not a completed color-lens or RX configuration. */
function isPhotoOrder(order: OrderRecord): boolean {
  return (
    Boolean(order.orderImageUrl?.trim()) && !isColorLensOrder(order) && !isRxOrder(order)
  );
}

export function getGroupStatusDisplay(orders: OrderRecord[]): OrderCardStatusDisplay {
  const statuses = orders.map((order) => normalizeOrderStatus(order.status));
  const active = statuses.filter((status) => status !== 'CANCELLED');

  if (active.length === 0) {
    return { label: 'Cancelled', variant: 'cancelled' };
  }

  const procurementLines = orders.filter((order) =>
    isProcurementLine(normalizeOrderStatus(order.status))
  ).length;
  const readyLines = orders.length - procurementLines;

  if (procurementLines > 0 && readyLines > 0) {
    return { label: 'Partial', variant: 'partial' };
  }

  if (procurementLines === orders.length) {
    return { label: 'Procurement', variant: 'procurement' };
  }

  if (active.every((status) => status === 'COMPLETED')) {
    return { label: 'Completed', variant: 'completed' };
  }

  if (active.every((status) => status === 'PICKING')) {
    return { label: 'Picking', variant: 'progress' };
  }

  if (active.every((status) => status === 'PENDING')) {
    return { label: 'Ready to Pick', variant: 'ready' };
  }

  if (active.some((status) => status === 'AWAITING_PROCUREMENT')) {
    return { label: 'Procurement', variant: 'procurement' };
  }

  if (active.some((status) => status === 'PARTIALLY_FULFILLED')) {
    return { label: 'Partial', variant: 'partial' };
  }

  if (active.some((status) => status === 'PACKED' || status === 'DISPATCHED')) {
    return { label: formatOrderStatusLabel(active[0]), variant: 'progress' };
  }

  return { label: formatOrderStatusLabel(active[0]), variant: 'progress' };
}

export function groupOrdersForList(
  orders: OrderRecord[],
  companyFallback?: string | null,
  defaultCompanyName = 'Customer'
): OrderListGroup[] {
  const buckets = new Map<string, OrderRecord[]>();
  const groups: OrderListGroup[] = [];

  for (const order of orders) {
    if (isPhotoOrder(order)) {
      const companyName =
        order.user?.businessName?.trim() ||
        companyFallback?.trim() ||
        order.user?.name?.trim() ||
        defaultCompanyName;

      groups.push({
        key: order.id,
        orders: [order],
        displayOrderId: formatDisplayOrderId(order),
        companyName,
        createdAt: order.createdAt,
        productCount: 0,
        pairCount: 0,
        totalAmount: 0,
        readyProductCount: 0,
        procurementProductCount: 0,
        status: { label: 'Photo order', variant: 'progress' },
        isPhotoOrder: true,
        photoUrl: order.orderImageUrl?.trim() || null,
      });
      continue;
    }

    const key = order.checkoutBatchId?.trim() || order.id;
    const list = buckets.get(key) ?? [];
    list.push(order);
    buckets.set(key, list);
  }

  for (const [key, batchOrders] of buckets) {
    const sorted = [...batchOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const primary = sorted[0];
    const companyName =
      primary.user?.businessName?.trim() ||
      companyFallback?.trim() ||
      primary.user?.name?.trim() ||
      defaultCompanyName;

    const activeOrders = sorted.filter(
      (order) => normalizeOrderStatus(order.status) !== 'CANCELLED'
    );
    const readyProductCount = activeOrders.filter(
      (order) => !isProcurementLine(normalizeOrderStatus(order.status))
    ).length;
    const procurementProductCount = activeOrders.length - readyProductCount;

    groups.push({
      key,
      orders: sorted,
      displayOrderId: formatDisplayOrderId(primary),
      companyName,
      createdAt: primary.createdAt,
      productCount: sorted.length,
      pairCount: sorted.reduce(
        (sum, order) => sum + pairsFromPieces(Math.max(1, Number(order.quantity) || 1)),
        0
      ),
      totalAmount: sorted.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      readyProductCount,
      procurementProductCount,
      status: getGroupStatusDisplay(sorted),
    });
  }

  return groups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getStatusPillStyle(variant: OrderCardStatusVariant) {
  switch (variant) {
    case 'ready':
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.14)',
        borderColor: 'rgba(34, 197, 94, 0.35)',
        color: '#4ade80',
      };
    case 'partial':
      return {
        backgroundColor: 'rgba(251, 146, 60, 0.14)',
        borderColor: 'rgba(251, 146, 60, 0.35)',
        color: '#fb923c',
      };
    case 'procurement':
      return {
        backgroundColor: 'rgba(248, 113, 113, 0.14)',
        borderColor: 'rgba(248, 113, 113, 0.35)',
        color: '#f87171',
      };
    case 'completed':
      return {
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        color: '#34d399',
      };
    case 'cancelled':
      return {
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        color: '#94a3b8',
      };
    default:
      return {
        backgroundColor: 'rgba(240, 161, 50, 0.14)',
        borderColor: 'rgba(240, 161, 50, 0.35)',
        color: '#f0a132',
      };
  }
}
