/**
 * Phase B/D — mobile order details use useGetOrderGroup; home uses overview.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('useGetOrders mobile home/detail contract', () => {
  it('order-details uses useGetOrderGroup; keeps updateOrderStatus + offline path', () => {
    const src = readFileSync(join(root, 'app/order-details.tsx'), 'utf8');
    assert.match(src, /useGetOrderGroup/);
    assert.match(src, /refetch/);
    assert.match(src, /updateOrderStatus/);
    assert.match(src, /isOfflineQueuedError/);
    assert.doesNotMatch(src, /(?<![A-Za-z])fetchOrders\s*\(/);
  });

  it('home tab uses useGetOrdersOverview; notifications stay local', () => {
    const src = readFileSync(join(root, 'app/(tabs)/index.tsx'), 'utf8');
    assert.match(src, /useGetOrdersOverview/);
    assert.match(src, /fetchNotifications/);
    assert.doesNotMatch(src, /useGetOrders\b/);
    assert.doesNotMatch(src, /fetchMyTasks/);
    assert.doesNotMatch(src, /(?<![A-Za-z])fetchOrders\s*\(/);
  });
});
