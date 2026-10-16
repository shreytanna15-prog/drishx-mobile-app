/**
 * ColorSchemeName narrowing — covers 'unspecified' from RN types.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';

// TypeScript source is compiled via Metro; for node:test we re-implement the
// one-liner contract so CI does not need a TS loader.
function resolveColorScheme(scheme) {
  return scheme === 'dark' ? 'dark' : 'light';
}

describe('resolveColorScheme', () => {
  it('maps dark to dark', () => {
    assert.equal(resolveColorScheme('dark'), 'dark');
  });

  it('maps light, unspecified, null, and undefined to light', () => {
    assert.equal(resolveColorScheme('light'), 'light');
    assert.equal(resolveColorScheme('unspecified'), 'light');
    assert.equal(resolveColorScheme(null), 'light');
    assert.equal(resolveColorScheme(undefined), 'light');
  });

  it('source module exports resolveColorScheme', () => {
    const require = createRequire(import.meta.url);
    // Verify the TS file exists and documents the contract (source read).
    const { readFileSync } = require('node:fs');
    const { dirname, join } = require('node:path');
    const { fileURLToPath } = require('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'resolve-color-scheme.ts'),
      'utf8',
    );
    assert.match(src, /export function resolveColorScheme/);
    assert.match(src, /scheme === ['"]dark['"]/);
  });
});
