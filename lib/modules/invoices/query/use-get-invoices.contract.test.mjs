/**
 * Phase C — mobile invoices uses paginated useGetInvoices.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('mobile useGetInvoices contract', () => {
  it('feature hook wraps fetchInvoices via useApiQuery with params', () => {
    const src = readFileSync(
      join(root, 'lib/modules/invoices/query/use-get-invoices.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getInvoices/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchInvoices\(getAuthHeaders\(\),\s*params\)/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('invoices screen uses useGetInvoices (no local fetchInvoices effect)', () => {
    const src = readFileSync(join(root, 'app/invoices.tsx'), 'utf8');
    assert.match(src, /useGetInvoices/);
    assert.doesNotMatch(src, /fetchInvoices/);
  });
});
