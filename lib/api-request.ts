import { authFetch } from '@/lib/auth-fetch';
import { enqueueOfflineRequest } from '@/lib/offline-queue';
import { getIsOnline, isNetworkError } from '@/lib/network';
import {
  CLIENT_HEADER,
  createRequestId,
  REQUEST_ID_HEADER,
} from '@/lib/request-headers';

export class OfflineQueuedError extends Error {
  readonly queueId: string;

  constructor(queueId: string, label?: string) {
    super(label ? `${label} saved offline and will sync when you're back online.` : 'Saved offline.');
    this.name = 'OfflineQueuedError';
    this.queueId = queueId;
  }
}

export function isOfflineQueuedError(error: unknown): error is OfflineQueuedError {
  return error instanceof OfflineQueuedError;
}

type ApiFetchOptions = RequestInit & {
  queueWhenOffline?: boolean;
  queueLabel?: string;
  authenticated?: boolean;
};

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const {
    queueWhenOffline = false,
    queueLabel,
    authenticated = false,
    ...init
  } = options;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = normalizeHeaders(init.headers);
  const body = typeof init.body === 'string' ? init.body : undefined;

  const online = await getIsOnline();
  if (!online && queueWhenOffline) {
    const queued = await enqueueOfflineRequest({
      url,
      method,
      headers,
      body,
      label: queueLabel,
    });
    throw new OfflineQueuedError(queued.id, queueLabel);
  }

  const fetchImpl = authenticated || headers.Authorization ? authFetch : fetch;

  try {
    // Pass normalized headers so X-Client / request id are always present.
    return await fetchImpl(url, { ...init, headers });
  } catch (error) {
    if (queueWhenOffline && isNetworkError(error)) {
      const queued = await enqueueOfflineRequest({
        url,
        method,
        headers,
        body,
        label: queueLabel,
      });
      throw new OfflineQueuedError(queued.id, queueLabel);
    }
    throw error;
  }
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  let record: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!headers) {
    record[CLIENT_HEADER] = 'mobile';
    record[REQUEST_ID_HEADER] = createRequestId();
    return record;
  }
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value;
    });
  } else if (Array.isArray(headers)) {
    record = Object.fromEntries(headers);
  } else {
    record = { ...headers };
  }
  if (!record[CLIENT_HEADER]) {
    record[CLIENT_HEADER] = 'mobile';
  }
  if (!record[REQUEST_ID_HEADER]) {
    record[REQUEST_ID_HEADER] = createRequestId();
  }
  return record;
}
