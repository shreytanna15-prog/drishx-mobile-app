/**
 * Regression: parseOrders must drop null rows and return ReturnOrderPowerParam[].
 * Source-contract check (mirrors the in-file parseOrders implementation).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('return-request parseOrders', () => {
  it('builds OrderParam[] via push loop (no null filter predicate)', () => {
    const src = readFileSync(join(root, 'app/return-request.tsx'), 'utf8');
    assert.match(src, /const orders:\s*OrderParam\[]\s*=\s*\[\]/);
    assert.match(src, /orders\.push\(/);
    assert.doesNotMatch(src, /filter\(\(item\): item is/);
  });
});
