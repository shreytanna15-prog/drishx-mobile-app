/**
 * Staff Orders status filter + mixed checkout-batch status display.
 * Run: node --test lib/staff-order-filters.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function normalizeOrderStatus(status) {
  if (status === 'COMPLETED') return 'COMPLETED';
  const known = [
    'PENDING',
    'PICKING',
    'PACKED',
    'DISPATCHED',
    'PARTIALLY_FULFILLED',
    'AWAITING_PROCUREMENT',
    'COMPLETED',
    'CANCELLED',
  ];
  return known.includes(status) ? status : 'PENDING';
}

function formatOrderStatusLabel(status) {
  const labels = {
    PENDING: 'Pending',
    PICKING: 'Picking',
    PACKED: 'Packed',
    DISPATCHED: 'Dispatched',
    PARTIALLY_FULFILLED: 'Partially Fulfilled',
    AWAITING_PROCUREMENT: 'In procurement',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status;
}

/** Mirrors lib/order-list-display.ts getGroupStatusDisplay. */
function getGroupStatusDisplay(orders) {
  const statuses = orders.map((order) => normalizeOrderStatus(order.status));
  const active = statuses.filter((status) => status !== 'CANCELLED');

  if (active.length === 0) {
    return { label: 'Cancelled', variant: 'cancelled' };
  }

  const awaitingProcurement = orders.filter(
    (order) => normalizeOrderStatus(order.status) === 'AWAITING_PROCUREMENT'
  ).length;
  const nonAwaiting = orders.length - awaitingProcurement;

  if (awaitingProcurement > 0 && nonAwaiting === 0) {
    return { label: 'Procurement', variant: 'procurement' };
  }

  if (awaitingProcurement > 0 && nonAwaiting > 0) {
    return { label: 'Partial', variant: 'partial' };
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

  if (active.some((status) => status === 'PARTIALLY_FULFILLED')) {
    return { label: 'Partial', variant: 'partial' };
  }

  const uniqueActive = new Set(active);
  if (uniqueActive.size > 1) {
    return { label: 'Partial', variant: 'partial' };
  }

  if (active.some((status) => status === 'PACKED' || status === 'DISPATCHED')) {
    return { label: formatOrderStatusLabel(active[0]), variant: 'progress' };
  }

  return { label: formatOrderStatusLabel(active[0]), variant: 'progress' };
}

const STAFF_FILTER_STATUSES = {
  PENDING: ['PENDING'],
  PICKING: ['PICKING'],
  PARTIAL: ['PARTIALLY_FULFILLED'],
  PACKED: ['PACKED'],
  DISPATCHED: ['DISPATCHED'],
  COMPLETED: ['COMPLETED'],
};

function groupHasStatus(group, status) {
  return group.orders.some((order) => normalizeOrderStatus(order.status) === status);
}

/** Mirrors lib/staff-order-filters.ts groupMatchesStaffFilter. */
function groupMatchesStaffFilter(group, filter) {
  if (filter === 'ALL') return true;

  if (filter === 'PARTIAL') {
    return (
      group.status.variant === 'partial' || groupHasStatus(group, 'PARTIALLY_FULFILLED')
    );
  }

  if (group.status.variant === 'partial') return false;

  const allowed = STAFF_FILTER_STATUSES[filter];
  return group.orders.some((order) =>
    allowed.includes(normalizeOrderStatus(order.status))
  );
}

function makeGroup(statuses, overrides = {}) {
  const orders = statuses.map((status, i) => ({
    id: `o${i}`,
    status,
    quantity: 2,
    totalAmount: 0,
  }));
  return {
    key: 'batch-1',
    orders,
    status: getGroupStatusDisplay(orders),
    ...overrides,
  };
}

describe('staff order filter mapping', () => {
  it('Picking matches PICKING only (not PARTIALLY_FULFILLED)', () => {
    const picking = makeGroup(['PICKING']);
    const partial = makeGroup(['PARTIALLY_FULFILLED']);

    assert.equal(groupMatchesStaffFilter(picking, 'PICKING'), true);
    assert.equal(groupMatchesStaffFilter(partial, 'PICKING'), false);
    assert.equal(groupMatchesStaffFilter(partial, 'PARTIAL'), true);
  });

  it('does not show Partial-labeled cards under Picking', () => {
    const mixed = makeGroup(['PICKING', 'PARTIALLY_FULFILLED']);
    assert.equal(mixed.status.label, 'Partial');
    assert.equal(mixed.status.variant, 'partial');
    assert.equal(groupMatchesStaffFilter(mixed, 'PICKING'), false);
    assert.equal(groupMatchesStaffFilter(mixed, 'PARTIAL'), true);
  });

  it('Partial filter includes pure PARTIALLY_FULFILLED batches', () => {
    const group = makeGroup(['PARTIALLY_FULFILLED', 'PARTIALLY_FULFILLED']);
    assert.equal(groupMatchesStaffFilter(group, 'PARTIAL'), true);
    assert.equal(groupMatchesStaffFilter(group, 'PICKING'), false);
  });

  it('mixed PICKING + PACKED displays Partial and filters under Partial only', () => {
    const mixed = makeGroup(['PICKING', 'PACKED']);
    assert.equal(mixed.status.variant, 'partial');
    assert.equal(groupMatchesStaffFilter(mixed, 'PICKING'), false);
    assert.equal(groupMatchesStaffFilter(mixed, 'PACKED'), false);
    assert.equal(groupMatchesStaffFilter(mixed, 'PARTIAL'), true);
  });

  it('Packed matches PACKED only; Dispatched is separate', () => {
    const packed = makeGroup(['PACKED']);
    const dispatched = makeGroup(['DISPATCHED']);

    assert.equal(groupMatchesStaffFilter(packed, 'PACKED'), true);
    assert.equal(groupMatchesStaffFilter(packed, 'DISPATCHED'), false);
    assert.equal(groupMatchesStaffFilter(dispatched, 'PACKED'), false);
    assert.equal(groupMatchesStaffFilter(dispatched, 'DISPATCHED'), true);
  });

  it('Pending / Completed filters stay status-scoped', () => {
    assert.equal(groupMatchesStaffFilter(makeGroup(['PENDING']), 'PENDING'), true);
    assert.equal(groupMatchesStaffFilter(makeGroup(['PENDING']), 'PICKING'), false);
    assert.equal(groupMatchesStaffFilter(makeGroup(['COMPLETED']), 'COMPLETED'), true);
    assert.equal(groupMatchesStaffFilter(makeGroup(['PICKING']), 'ALL'), true);
  });
});

describe('staff orders empty title', () => {
  function staffOrdersEmptyTitle(filter, options = {}) {
    if (filter !== 'ALL') {
      return 'No orders match this filter';
    }
    return options.isRx ? 'No RX orders assigned to you' : 'No orders assigned to you';
  }

  it('keeps assigned copy for All, filter copy otherwise', () => {
    assert.equal(staffOrdersEmptyTitle('ALL'), 'No orders assigned to you');
    assert.equal(
      staffOrdersEmptyTitle('ALL', { isRx: true }),
      'No RX orders assigned to you'
    );
    assert.equal(staffOrdersEmptyTitle('PICKING'), 'No orders match this filter');
    assert.equal(staffOrdersEmptyTitle('PARTIAL', { isRx: true }), 'No orders match this filter');
  });
});

describe('staff order filter source contracts', () => {
  it('staff-order-filters.ts exposes Partial, Packed-only, and Dispatched mapping', () => {
    const src = readFileSync(join(root, 'lib/staff-order-filters.ts'), 'utf8');
    assert.match(src, /key: 'PARTIAL',\s*label: 'Partial'/);
    assert.match(src, /key: 'DISPATCHED',\s*label: 'Dispatched'/);
    assert.match(src, /PICKING:\s*\['PICKING'\]/);
    assert.match(src, /PARTIAL:\s*\['PARTIALLY_FULFILLED'\]/);
    assert.match(src, /PACKED:\s*\['PACKED'\]/);
    assert.match(src, /DISPATCHED:\s*\['DISPATCHED'\]/);
    assert.doesNotMatch(
      src,
      /PICKING:\s*\['PICKING',\s*'PARTIALLY_FULFILLED'\]/
    );
    assert.doesNotMatch(src, /PACKED:\s*\['PACKED',\s*'DISPATCHED'\]/);
  });

  it('staff-orders-screen uses shared filter helpers', () => {
    const src = readFileSync(join(root, 'components/staff-orders-screen.tsx'), 'utf8');
    assert.match(src, /STAFF_ORDER_FILTERS/);
    assert.match(src, /groupMatchesStaffFilter/);
    assert.match(src, /staffOrdersEmptyTitle\(activeFilter/);
    assert.match(src, /from '@\/lib\/staff-order-filters'/);
    assert.doesNotMatch(src, /PARTIALLY_FULFILLED.*PICKING|PICKING.*PARTIALLY_FULFILLED/);
  });

  it('staff-order-filters.ts exports staffOrdersEmptyTitle', () => {
    const src = readFileSync(join(root, 'lib/staff-order-filters.ts'), 'utf8');
    assert.match(src, /export function staffOrdersEmptyTitle/);
    assert.match(src, /No orders match this filter/);
  });

  it('getGroupStatusDisplay treats mixed checkout statuses as Partial', () => {
    const src = readFileSync(join(root, 'lib/order-list-display.ts'), 'utf8');
    assert.match(src, /uniqueActive\.size > 1/);
    assert.match(src, /label: 'Partial',\s*variant: 'partial'/);
  });
});
