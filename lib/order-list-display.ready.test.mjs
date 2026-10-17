/**
 * Ready fulfillment count / display for order list cards (MOB-UX-04).
 * Run: node --test lib/order-list-display.ready.test.mjs
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

function isProcurementLine(status) {
  return status === 'AWAITING_PROCUREMENT' || status === 'PARTIALLY_FULFILLED';
}

/** Mirrors lib/order-list-display.ts isReadyFulfillmentStatus. */
function isReadyFulfillmentStatus(status) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'CANCELLED' || normalized === 'COMPLETED') {
    return false;
  }
  return !isProcurementLine(normalized);
}

/** Mirrors shouldShowOrderReadyProgress. */
function shouldShowOrderReadyProgress(group) {
  if (group.isPhotoOrder) return false;
  if (group.status.variant === 'completed') return false;
  return group.readyProductCount > 0 || group.procurementProductCount > 0;
}

function readyProductCountFor(statuses) {
  return statuses
    .map(normalizeOrderStatus)
    .filter((status) => status !== 'CANCELLED')
    .filter((status) => isReadyFulfillmentStatus(status)).length;
}

describe('readyProductCount excludes completed', () => {
  it('COMPLETED-only batch has zero ready (ORD465878-style)', () => {
    assert.equal(readyProductCountFor(['COMPLETED']), 0);
  });

  it('active fulfillment statuses still count as ready', () => {
    assert.equal(readyProductCountFor(['PENDING']), 1);
    assert.equal(readyProductCountFor(['PICKING', 'PACKED']), 2);
    assert.equal(readyProductCountFor(['DISPATCHED']), 1);
  });

  it('procurement-path statuses are not ready', () => {
    assert.equal(readyProductCountFor(['AWAITING_PROCUREMENT']), 0);
    assert.equal(readyProductCountFor(['PARTIALLY_FULFILLED']), 0);
  });

  it('mixed COMPLETED + PICKING counts only the active ready line', () => {
    assert.equal(readyProductCountFor(['COMPLETED', 'PICKING']), 1);
  });
});

describe('shouldShowOrderReadyProgress', () => {
  it('hides Ready UI on completed groups', () => {
    assert.equal(
      shouldShowOrderReadyProgress({
        isPhotoOrder: false,
        status: { variant: 'completed', label: 'Completed' },
        readyProductCount: 0,
        procurementProductCount: 0,
      }),
      false
    );
  });

  it('shows Ready UI for active groups with ready lines', () => {
    assert.equal(
      shouldShowOrderReadyProgress({
        isPhotoOrder: false,
        status: { variant: 'progress', label: 'Picking' },
        readyProductCount: 1,
        procurementProductCount: 0,
      }),
      true
    );
  });

  it('hides Ready UI for photo orders', () => {
    assert.equal(
      shouldShowOrderReadyProgress({
        isPhotoOrder: true,
        status: { variant: 'progress', label: 'Photo order' },
        readyProductCount: 0,
        procurementProductCount: 0,
      }),
      false
    );
  });
});

describe('MOB-UX-04 source contracts', () => {
  it('order-list-display excludes COMPLETED from ready count', () => {
    const src = readFileSync(join(root, 'lib/order-list-display.ts'), 'utf8');
    assert.match(src, /export function isReadyFulfillmentStatus/);
    assert.match(src, /normalized === 'COMPLETED'/);
    assert.match(src, /isReadyFulfillmentStatus\(normalizeOrderStatus/);
    assert.match(src, /export function shouldShowOrderReadyProgress/);
  });

  it('employee and customer list use shouldShowOrderReadyProgress', () => {
    const employee = readFileSync(
      join(root, 'components/employee-order-list-row.tsx'),
      'utf8'
    );
    const customer = readFileSync(join(root, 'app/(tabs)/my-orders.tsx'), 'utf8');
    assert.match(employee, /shouldShowOrderReadyProgress\(group\)/);
    assert.match(customer, /shouldShowOrderReadyProgress\(group\)/);
  });
});
