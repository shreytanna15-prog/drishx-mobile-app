import { BACKEND_BASE_URL } from '@/lib/api-config';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '@/lib/secure-auth-storage';

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

type RefreshResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
  error?: string;
  code?: AuthErrorCode;
};

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let onAuthFailure: (() => void) | null = null;

export function setMemoryAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getMemoryAccessToken() {
  return memoryAccessToken;
}

export function registerAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
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

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mobile',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearRefreshToken();
        return false;
      }

      const data = (await response.json()) as RefreshResponse;
      const nextAccessToken = resolveAccessToken(data);
      if (!nextAccessToken) {
        return false;
      }

      memoryAccessToken = nextAccessToken;
      if (data.refreshToken) {
        await setRefreshToken(data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
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
        'X-Client': 'mobile',
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
  const resolved = token ?? memoryAccessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
  const headers = new Headers(init?.headers);
  const accessToken = memoryAccessToken;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status !== 401 || !allowRetry) {
    return response;
  }

  const authError = await parseAuthError(response.clone());
  if (
    authError.code !== 'TOKEN_EXPIRED' &&
    authError.code !== 'TOKEN_INVALID' &&
    authError.code !== 'TOKEN_MISSING'
  ) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    onAuthFailure?.();
    throw authError;
  }

  const retryHeaders = new Headers(init?.headers);
  const nextToken = memoryAccessToken;
  if (nextToken) {
    retryHeaders.set('Authorization', `Bearer ${nextToken}`);
  }
  if (init?.body && !retryHeaders.has('Content-Type')) {
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
  'X-Client': 'mobile',
} as const;
