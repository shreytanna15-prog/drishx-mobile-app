/**
 * Phase 3 Batch 3 — returns list uses useGetReturnRequests.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('useGetReturnRequests contract', () => {
  it('feature hook wraps fetchReturnRequests via useApiQuery', () => {
    const src = readFileSync(
      join(root, 'lib/modules/returns/query/use-get-return-requests.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getReturnRequests/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchReturnRequests\(getAuthHeaders\(\)\)/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('returns screen uses useGetReturnRequests (no local fetchReturnRequests effect)', () => {
    const src = readFileSync(join(root, 'app/returns.tsx'), 'utf8');
    assert.match(src, /useGetReturnRequests/);
    assert.match(src, /refetch/);
    assert.doesNotMatch(src, /fetchReturnRequests/);
    assert.doesNotMatch(src, /const load =/);
    assert.doesNotMatch(src, /useEffect\(/);
  });

  it('registry includes getReturnRequests', () => {
    const src = readFileSync(join(root, 'lib/constants/api-registry.ts'), 'utf8');
    assert.match(src, /getReturnRequests:\s*"getReturnRequests"/);
  });
});
