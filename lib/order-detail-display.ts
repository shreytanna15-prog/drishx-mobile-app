import { getOrderLensDetails } from '@/lib/orders-api';
import type { OrderRecord } from '@/lib/orders-api';
import { normalizeOrderStatus, type OrderTrackingStatus } from '@/lib/order-tracking';
import { formatLensType } from '@/lib/types/lens';

export type PickState = 'full' | 'partial' | 'none' | 'cancelled';

export type PowerLineRow = {
  orderId: string;
  /** All order ids merged into this row (same SPH/CYL within a product). */
  orderIds?: string[];
  sphCylLabel: string;
  ordered: number;
  picked: number;
  pickState: PickState;
};

export type OrderProductSection = {
  key: string;
  title: string;
  subtitle: string;
  totalPairs: number;
  pickedPairs: number;
  lines: PowerLineRow[];
};

function joinParts(parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ');
}

function getProductMeta(order: OrderRecord): { key: string; title: string; subtitle: string } {
  const lensLabel = formatLensType(order.lensType);

  if (order.singleVisionLens?.id) {
    const lens = order.singleVisionLens;
    return {
      key: `sv-${lens.id}`,
      title: lens.brand?.trim() || lensLabel,
      subtitle: joinParts([lensLabel, lens.item, lens.coating, lens.category]) || lensLabel,
    };
  }

  if (order.kryptokLens?.id) {
    const lens = order.kryptokLens;
    return {
      key: `kr-${lens.id}`,
      title: lens.brand?.trim() || lensLabel,
      subtitle: joinParts([lensLabel, lens.coating, lens.category]) || lensLabel,
    };
  }

  if (order.progressiveLens?.id) {
    const lens = order.progressiveLens;
    return {
      key: `pr-${lens.id}`,
      title: lens.brand?.trim() || lens.item?.trim() || lensLabel,
      subtitle: joinParts([lensLabel, lens.item, lens.coating, lens.category]) || lensLabel,
    };
  }

  return {
    key: `order-${order.id}`,
    title: lensLabel,
    subtitle: lensLabel,
  };
}

function normalizePowerValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  const rounded = Math.round(num * 100) / 100;
  const fixed = rounded.toFixed(2);
  if (rounded === 0) {
    return '0';
  }
  if (fixed.endsWith('.00')) {
    return String(Math.trunc(rounded));
  }
  if (fixed.endsWith('0')) {
    return fixed.slice(0, -1);
  }
  return fixed;
}

function formatSphCyl(order: OrderRecord): string {
  const details = getOrderLensDetails(order);
  if (!details) {
    return '—';
  }
  const sph = normalizePowerValue(details.sph);
  const cyl = normalizePowerValue(details.cyl);
  return `${sph} / ${cyl}`;
}

export function getLinePickInfo(order: OrderRecord): { ordered: number; picked: number; pickState: PickState } {
  const status = normalizeOrderStatus(order.status);
  const ordered = Math.max(1, Number(order.quantity) || 1);

  if (status === 'CANCELLED') {
    return { ordered, picked: 0, pickState: 'cancelled' };
  }

  if (status === 'COMPLETED' || status === 'DISPATCHED' || status === 'PACKED') {
    return { ordered, picked: ordered, pickState: 'full' };
  }

  if (status === 'PARTIALLY_FULFILLED') {
    const picked = Math.max(0, ordered - 1);
    return { ordered, picked, pickState: picked > 0 && picked < ordered ? 'partial' : 'partial' };
  }

  if (status === 'PICKING') {
    return { ordered, picked: 0, pickState: 'partial' };
  }

  return { ordered, picked: 0, pickState: 'none' };
}

function derivePickState(ordered: number, picked: number, allCancelled: boolean): PickState {
  if (allCancelled) {
    return 'cancelled';
  }
  if (picked >= ordered) {
    return 'full';
  }
  if (picked > 0) {
    return 'partial';
  }
  return 'none';
}

function mergePowerLines(lines: PowerLineRow[]): PowerLineRow[] {
  const merged = new Map<
    string,
    PowerLineRow & { orderIds: string[]; cancelledLines: number }
  >();

  for (const line of lines) {
    const existing = merged.get(line.sphCylLabel);
    if (!existing) {
      merged.set(line.sphCylLabel, {
        ...line,
        orderIds: [line.orderId],
        cancelledLines: line.pickState === 'cancelled' ? 1 : 0,
      });
      continue;
    }

    existing.ordered += line.ordered;
    existing.picked += line.picked;
    existing.orderIds.push(line.orderId);
    if (line.pickState === 'cancelled') {
      existing.cancelledLines += 1;
    }
    existing.pickState = derivePickState(
      existing.ordered,
      existing.picked,
      existing.cancelledLines === existing.orderIds.length
    );
  }

  return [...merged.values()]
    .map(({ orderIds, cancelledLines: _cancelledLines, ...line }) => ({
      ...line,
      orderIds,
    }))
    .sort((a, b) => a.sphCylLabel.localeCompare(b.sphCylLabel));
}

export function buildOrderProductSections(orders: OrderRecord[]): OrderProductSection[] {
  const sections = new Map<string, OrderProductSection>();

  for (const order of orders) {
    const meta = getProductMeta(order);
    const pick = getLinePickInfo(order);
    const line: PowerLineRow = {
      orderId: order.id,
      sphCylLabel: formatSphCyl(order),
      ordered: pick.ordered,
      picked: pick.picked,
      pickState: pick.pickState,
    };

    const existing = sections.get(meta.key);
    if (existing) {
      existing.lines.push(line);
      existing.totalPairs += pick.ordered;
      existing.pickedPairs += pick.picked;
      continue;
    }

    sections.set(meta.key, {
      key: meta.key,
      title: meta.title,
      subtitle: meta.subtitle,
      totalPairs: pick.ordered,
      pickedPairs: pick.picked,
      lines: [line],
    });
  }

  return [...sections.values()].map((section) => ({
    ...section,
    lines: mergePowerLines(section.lines),
  }));
}

const STATUS_RANK: Record<OrderTrackingStatus, number> = {
  AWAITING_PROCUREMENT: 0,
  PENDING: 1,
  PARTIALLY_FULFILLED: 2,
  PICKING: 3,
  PACKED: 4,
  DISPATCHED: 5,
  COMPLETED: 6,
  CANCELLED: -1,
};

/** Batch progress follows the least-advanced active line. */
export function getBatchTrackingStatus(orders: OrderRecord[]): OrderTrackingStatus {
  const active = orders.filter((order) => normalizeOrderStatus(order.status) !== 'CANCELLED');
  if (active.length === 0) {
    return 'CANCELLED';
  }

  let slowest: OrderTrackingStatus = normalizeOrderStatus(active[0].status);
  let slowestRank = STATUS_RANK[slowest];

  for (const order of active) {
    const status = normalizeOrderStatus(order.status);
    const rank = STATUS_RANK[status];
    if (rank < slowestRank) {
      slowest = status;
      slowestRank = rank;
    }
  }

  return slowest;
}
