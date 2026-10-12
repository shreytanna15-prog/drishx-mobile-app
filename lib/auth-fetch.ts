import { BACKEND_BASE_URL } from '@/lib/api-config';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '@/lib/secure-auth-storage';
import {
  CLIENT_HEADER,
  createRequestId,
  mergeMobileClientHeaders,
  REQUEST_ID_HEADER,
} from '@/lib/request-headers';

export type AuthErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_MISSING'
  | 'ACCOUNT_PENDING'
  | 'ACCOUNT_INACTIVE'
  | 'MISSING_PERMISSION'
  | 'FORBIDDEN';

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;

  constructor(message: string, code: AuthErrorCode, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

/** Outcome of a refresh attempt — transient failures must not force logout. */
export type RefreshOutcome =
  | { status: 'refreshed' }
  | { status: 'auth_failed' }
  | { status: 'transient' };

type RefreshResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
  error?: string;
  code?: AuthErrorCode;
};

const REFRESH_TIMEOUT_MS = 15_000;

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<RefreshOutcome> | null = null;
let onAuthFailure: (() => void) | null = null;
let onAccessTokenRefreshed: ((token: string) => void) | null = null;

export function setMemoryAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getMemoryAccessToken() {
  return memoryAccessToken;
}

export function registerAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

/** Keep React auth state in sync after a silent access-token refresh. */
export function registerAccessTokenRefreshHandler(
  handler: ((token: string) => void) | null
) {
  onAccessTokenRefreshed = handler;
}

function resolveAccessToken(data: RefreshResponse) {
  return data.accessToken ?? data.token ?? null;
}

async function parseAuthError(response: Response): Promise<AuthError> {
  try {
    const data = (await response.json()) as { error?: string; code?: AuthErrorCode };
    return new AuthError(data.error ?? 'Unauthorized.', data.code ?? 'TOKEN_INVALID', response.status);
  } catch {
    return new AuthError('Unauthorized.', 'TOKEN_INVALID', response.status);
  }
}

function isTransientRefreshStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return { status: 'auth_failed' };
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CLIENT_HEADER]: 'mobile',
          [REQUEST_ID_HEADER]: createRequestId(),
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (isTransientRefreshStatus(response.status)) {
          return { status: 'transient' };
        }
        // Definitive auth failure — drop the stored refresh token.
        await clearRefreshToken();
        return { status: 'auth_failed' };
      }

      const data = (await response.json()) as RefreshResponse;
      const nextAccessToken = resolveAccessToken(data);
      if (!nextAccessToken) {
        return { status: 'auth_failed' };
      }

      memoryAccessToken = nextAccessToken;
      if (data.refreshToken) {
        await setRefreshToken(data.refreshToken);
      }
      onAccessTokenRefreshed?.(nextAccessToken);
      return { status: 'refreshed' };
    } catch {
      // Network blip / timeout — keep refresh token and session.
      return { status: 'transient' };
    } finally {
      clearTimeout(timer);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logoutSession(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await fetch(`${BACKEND_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CLIENT_HEADER]: 'mobile',
        [REQUEST_ID_HEADER]: createRequestId(),
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } catch {
    // best effort
  } finally {
    memoryAccessToken = null;
    await clearRefreshToken();
  }
}

export function getAuthHeaders(token?: string | null): Record<string, string> {
  // Prefer live memory token so callers keep working after a silent refresh
  // even if React state still holds an expired access JWT.
  const resolved = memoryAccessToken ?? token ?? null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [CLIENT_HEADER]: 'mobile',
    [REQUEST_ID_HEADER]: createRequestId(),
  };
  if (resolved) {
    headers.Authorization = `Bearer ${resolved}`;
  }
  return headers;
}

export async function authFetch(
  url: string,
  init?: RequestInit,
  allowRetry = true
): Promise<Response> {
  const headers = mergeMobileClientHeaders(init?.headers);
  const accessToken = memoryAccessToken;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status !== 401 || !allowRetry) {
    return response;
  }

  const authError = await parseAuthError(response.clone());
  // Refresh for token problems (bare 401 → TOKEN_INVALID). Do not refresh
  // permission / account-state failures.
  const nonRefreshable: AuthErrorCode[] = [
    'ACCOUNT_PENDING',
    'ACCOUNT_INACTIVE',
    'MISSING_PERMISSION',
    'FORBIDDEN',
  ];
  if (nonRefreshable.includes(authError.code)) {
    return response;
  }

  const outcome = await refreshAccessToken();
  if (outcome.status === 'transient') {
    return response;
  }
  if (outcome.status !== 'refreshed') {
    onAuthFailure?.();
    throw authError;
  }

  const retryHeaders = mergeMobileClientHeaders(init?.headers);
  const nextToken = memoryAccessToken;
  if (nextToken) {
    retryHeaders.set('Authorization', `Bearer ${nextToken}`);
  }
  if (init?.body && !(init.body instanceof FormData) && !retryHeaders.has('Content-Type')) {
    retryHeaders.set('Content-Type', 'application/json');
  }

  response = await fetch(url, { ...init, headers: retryHeaders });
  if (response.status === 401) {
    onAuthFailure?.();
    throw await parseAuthError(response);
  }

  return response;
}

export async function storeMobileAuthSession(input: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  memoryAccessToken = input.accessToken;
  if (input.refreshToken) {
    await setRefreshToken(input.refreshToken);
  }
}

export function resolveAuthTokens(data: {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}) {
  return {
    accessToken: data.accessToken ?? data.token ?? '',
    refreshToken: data.refreshToken ?? null,
  };
}

export const MOBILE_CLIENT_HEADERS = {
  [CLIENT_HEADER]: 'mobile',
} as const;
