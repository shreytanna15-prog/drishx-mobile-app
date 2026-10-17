/**
 * Phase C — mobile returns uses paginated useGetReturnRequests.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('mobile useGetReturnRequests contract', () => {
  it('feature hook wraps fetchReturnRequests via useApiQuery with params', () => {
    const src = readFileSync(
      join(root, 'lib/modules/returns/query/use-get-return-requests.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getReturnRequests/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchReturnRequests\(getAuthHeaders\(\),\s*params\)/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('returns screen uses useGetReturnRequests (no local fetchReturnRequests effect)', () => {
    const src = readFileSync(join(root, 'app/returns.tsx'), 'utf8');
    assert.match(src, /useGetReturnRequests/);
    assert.doesNotMatch(src, /fetchReturnRequests/);
  });
});
