/**
 * Phase 2 contract checks for useGetProcurementOrders wiring.
 * Run: node --test lib/modules/procurement/query/use-get-procurement-orders.contract.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('useGetProcurementOrders contract', () => {
  it('feature hook wraps fetchProcurementHistory via useApiQuery', () => {
    const src = readFileSync(
      join(root, 'lib/modules/procurement/query/use-get-procurement-orders.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getProcurementOrders/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchProcurementHistory/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('purchase-stock history path uses the hook (not direct fetchProcurementHistory)', () => {
    const src = readFileSync(
      join(root, 'app/(tabs)/purchase-stock.tsx'),
      'utf8',
    );
    assert.match(src, /useGetProcurementOrders/);
    assert.match(src, /enabled:\s*mode === 'history'/);
    assert.match(src, /refetchHistory/);
    assert.doesNotMatch(src, /fetchProcurementHistory/);
  });

  it('registry includes getProcurementOrders', () => {
    const src = readFileSync(
      join(root, 'lib/constants/api-registry.ts'),
      'utf8',
    );
    assert.match(src, /getProcurementOrders:\s*"getProcurementOrders"/);
  });
});
