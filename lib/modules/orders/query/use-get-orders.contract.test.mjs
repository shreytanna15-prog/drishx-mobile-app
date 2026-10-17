/**
 * Phase B — mobile My Orders uses paginated useGetOrders.
 * Run: node --test lib/modules/orders/query/use-get-orders.contract.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('mobile useGetOrders contract', () => {
  it('feature hook wraps fetchOrders via useApiQuery with params', () => {
    const src = readFileSync(
      join(root, 'lib/modules/orders/query/use-get-orders.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getOrders/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchOrders\(getAuthHeaders\(\),\s*params\)/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('my-orders screen uses useGetOrders (no local fetchOrders effect)', () => {
    const src = readFileSync(join(root, 'app/(tabs)/my-orders.tsx'), 'utf8');
    assert.match(src, /useGetOrders/);
    assert.match(src, /refetch/);
    assert.match(src, /import type \{ OrderRecord \} from ['"]@\/lib\/orders-api['"]/);
    assert.doesNotMatch(src, /import \{[^}]*fetchOrders/);
    assert.doesNotMatch(src, /loadOrders/);
  });
});
