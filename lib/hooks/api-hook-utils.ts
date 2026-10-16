import { AuthError } from '@/lib/auth-fetch';
import { isOfflineQueuedError } from '@/lib/api-request';

/** Normalize unknown throwables to Error for hook state / callbacks. */
export function toHookError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Auth failures are handled by authFetch (refresh / session failure).
 * Hooks must not invoke UI onError / appAlert for these.
 */
export function isAuthFailureError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Offline queue is not a completed server mutation — surface via onError,
 * never treat as onSuccess.
 */
export function isOfflineQueuedFailure(error: unknown): boolean {
  return isOfflineQueuedError(error);
}

/** True when a request generation is no longer the latest (stale / unmounted). */
export function isStaleRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId !== latestRequestId;
}
