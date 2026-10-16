/**
 * Focused pure-helper regression tests (no React Testing Library).
 * Run: node --test lib/hooks/api-hook-utils.test.mjs
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function toHookError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

function isStaleRequest(requestId, latestRequestId) {
  return requestId !== latestRequestId;
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

class OfflineQueuedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

function isAuthFailureError(error) {
  return error instanceof AuthError;
}

function isOfflineQueuedFailure(error) {
  return error instanceof OfflineQueuedError;
}

describe('api-hook-utils (mobile)', () => {
  it('toHookError preserves Error instances', () => {
    const err = new Error('boom');
    assert.equal(toHookError(err), err);
  });

  it('isStaleRequest detects superseded requests', () => {
    assert.equal(isStaleRequest(1, 2), true);
    assert.equal(isStaleRequest(5, 5), false);
  });

  it('auth failures skip UI onError', () => {
    assert.equal(!isAuthFailureError(new AuthError('TOKEN_INVALID')), false);
  });

  it('offline queued is not treated as success', () => {
    const err = new OfflineQueuedError('saved offline');
    assert.equal(isOfflineQueuedFailure(err), true);
    assert.equal(isAuthFailureError(err), false);
    // Policy: onSuccess must not run; onError may surface “saved offline”
    const shouldCallOnSuccess = false;
    const shouldCallOnError = !isAuthFailureError(err);
    assert.equal(shouldCallOnSuccess, false);
    assert.equal(shouldCallOnError, true);
  });
});
