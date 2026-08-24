export const CLIENT_HEADER = 'X-Client';
export const REQUEST_ID_HEADER = 'X-Request-Id';
export const OFFLINE_REPLAY_HEADER = 'X-Offline-Replay';

export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function mobileClientHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    [CLIENT_HEADER]: 'mobile',
    [REQUEST_ID_HEADER]: createRequestId(),
    ...extra,
  };
}

export function mergeMobileClientHeaders(
  init?: HeadersInit,
  extra?: Record<string, string>
): Headers {
  const headers = new Headers(init);
  const clientHeaders = mobileClientHeaders(extra);
  for (const [key, value] of Object.entries(clientHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return headers;
}
