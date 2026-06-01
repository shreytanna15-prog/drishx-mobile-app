import { formatOrderStatusLabel, normalizeOrderStatus, type OrderTrackingStatus } from '@/lib/order-tracking';
import type { OrderRecord } from '@/lib/orders-api';

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

function isProcurementLine(status: OrderTrackingStatus): boolean {
  return status === 'AWAITING_PROCUREMENT' || status === 'PARTIALLY_FULFILLED';
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

  for (const order of orders) {
    const key = order.checkoutBatchId?.trim() || order.id;
    const list = buckets.get(key) ?? [];
    list.push(order);
    buckets.set(key, list);
  }

  const groups: OrderListGroup[] = [];

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
      pairCount: sorted.reduce((sum, order) => sum + Math.max(1, Number(order.quantity) || 1), 0),
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
