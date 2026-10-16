/**
 * Phase 3 Batch 4 — return details uses useGetReturnRequest.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('useGetReturnRequest contract', () => {
  it('feature hook wraps fetchReturnRequest via useApiQuery', () => {
    const src = readFileSync(
      join(root, 'lib/modules/returns/query/use-get-return-request.ts'),
      'utf8',
    );
    assert.match(src, /QUERY_REGISTRY\.getReturnRequest/);
    assert.match(src, /useApiQuery/);
    assert.match(src, /fetchReturnRequest\(returnId!,\s*getAuthHeaders\(\)\)/);
    assert.match(src, /\[returnId\]/);
    assert.doesNotMatch(src, /apiFetch\(/);
  });

  it('return-details screen uses useGetReturnRequest for read path', () => {
    const src = readFileSync(join(root, 'app/return-details.tsx'), 'utf8');
    assert.match(src, /useGetReturnRequest/);
    assert.match(src, /data\?\.id === returnId/);
    assert.doesNotMatch(src, /fetchReturnRequest/);
    assert.doesNotMatch(src, /const load =/);
    assert.doesNotMatch(src, /useEffect\(/);
    // Staff mutation path preserved (not migrated in Batch 4).
    assert.match(src, /updateReturnRequest/);
  });

  it('registry includes getReturnRequest', () => {
    const src = readFileSync(join(root, 'lib/constants/api-registry.ts'), 'utf8');
    assert.match(src, /getReturnRequest:\s*"getReturnRequest"/);
  });
});
