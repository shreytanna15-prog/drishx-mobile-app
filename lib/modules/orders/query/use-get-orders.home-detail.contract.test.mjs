/**
 * Phase 3 Batch 5 — mobile order details + home orders use useGetOrders.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('useGetOrders mobile home/detail contract', () => {
  it('order-details uses useGetOrders; keeps updateOrderStatus + offline path', () => {
    const src = readFileSync(join(root, 'app/order-details.tsx'), 'utf8');
    assert.match(src, /useGetOrders/);
    assert.match(src, /refetch/);
    assert.match(src, /updateOrderStatus/);
    assert.match(src, /isOfflineQueuedError/);
    assert.doesNotMatch(src, /(?<![A-Za-z])fetchOrders\s*\(/);
  });

  it('home tab migrates orders via useGetOrders; notifications stay local', () => {
    const src = readFileSync(join(root, 'app/(tabs)/index.tsx'), 'utf8');
    assert.match(src, /useGetOrders/);
    assert.match(src, /fetchNotifications/);
    assert.match(src, /fetchMyTasks/);
    assert.doesNotMatch(src, /(?<![A-Za-z])fetchOrders\s*\(/);
  });
});

