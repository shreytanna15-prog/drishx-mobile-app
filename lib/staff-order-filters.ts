import type { OrderListGroup } from '@/lib/order-list-display';
import { normalizeOrderStatus, type OrderTrackingStatus } from '@/lib/order-tracking';

export type StaffOrderFilter =
  | 'ALL'
  | 'PENDING'
  | 'PICKING'
  | 'PARTIAL'
  | 'PACKED'
  | 'DISPATCHED'
  | 'COMPLETED';

export const STAFF_ORDER_FILTERS: { key: StaffOrderFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PICKING', label: 'Picking' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'COMPLETED', label: 'Completed' },
];

/** Line statuses that belong under each staff filter tab (excluding ALL). */
export const STAFF_FILTER_STATUSES: Record<
  Exclude<StaffOrderFilter, 'ALL'>,
  OrderTrackingStatus[]
> = {
  PENDING: ['PENDING'],
  PICKING: ['PICKING'],
  PARTIAL: ['PARTIALLY_FULFILLED'],
  PACKED: ['PACKED'],
  DISPATCHED: ['DISPATCHED'],
  COMPLETED: ['COMPLETED'],
};

function groupHasStatus(group: OrderListGroup, status: OrderTrackingStatus): boolean {
  return group.orders.some((order) => normalizeOrderStatus(order.status) === status);
}

/**
 * Whether a checkout-batch group belongs under the active staff Orders filter.
 *
 * Picking / Packed / Dispatched are single-status tabs. Partial covers
 * PARTIALLY_FULFILLED and mixed-status checkout batches (card variant `partial`).
 * Other tabs exclude Partial cards so a "Partial" pill never appears under them.
 */
export function groupMatchesStaffFilter(
  group: OrderListGroup,
  filter: StaffOrderFilter
): boolean {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'PARTIAL') {
    return (
      group.status.variant === 'partial' || groupHasStatus(group, 'PARTIALLY_FULFILLED')
    );
  }

  // Keep status chips aligned with the card label for mixed checkout batches.
  if (group.status.variant === 'partial') {
    return false;
  }

  const allowed = STAFF_FILTER_STATUSES[filter];
  return group.orders.some((order) =>
    allowed.includes(normalizeOrderStatus(order.status))
  );
}

/** Empty-list title for staff Orders / Rx Orders. */
export function staffOrdersEmptyTitle(
  filter: StaffOrderFilter,
  options: { isRx?: boolean } = {}
): string {
  if (filter !== 'ALL') {
    return 'No orders match this filter';
  }
  return options.isRx ? 'No RX orders assigned to you' : 'No orders assigned to you';
}
