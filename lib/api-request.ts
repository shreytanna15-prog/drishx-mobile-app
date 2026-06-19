import { enqueueOfflineRequest } from '@/lib/offline-queue';
import { getIsOnline, isNetworkError } from '@/lib/network';

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
};

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { queueWhenOffline = false, queueLabel, ...init } = options;
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

  try {
    return await fetch(url, init);
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
  if (!headers) {
    return { 'Content-Type': 'application/json' };
  }
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}
