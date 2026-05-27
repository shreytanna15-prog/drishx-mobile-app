import type { OrderRecord } from '@/lib/orders-api';
import type { OrderTrackingStatus } from '@/lib/order-tracking';

const IN_PROGRESS: OrderTrackingStatus[] = [
  'PENDING',
  'PICKING',
  'PACKED',
  'PARTIALLY_FULFILLED',
  'AWAITING_PROCUREMENT',
];

export function computeCustomerOrderOverview(orders: OrderRecord[]) {
  const active = orders.filter((o) => o.status !== 'CANCELLED');
  const total = active.length;
  let inProgress = 0;
  let readyToShip = 0;
  let completed = 0;

  for (const o of active) {
    if (o.status === 'COMPLETED') {
      completed += 1;
    } else if (o.status === 'DISPATCHED') {
      readyToShip += 1;
    } else if (IN_PROGRESS.includes(o.status)) {
      inProgress += 1;
    }
  }

  return { total, inProgress, readyToShip, completed };
}
