import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKEND_BASE_URL } from '@/lib/api-config';
import { OFFLINE_REPLAY_HEADER, REQUEST_ID_HEADER } from '@/lib/request-headers';

export const OFFLINE_QUEUE_STORAGE_KEY = '@drishx/offline-queue';
import {
  getMemoryAccessToken,
  refreshAccessToken,
} from '@/lib/auth-fetch';

let onAuthFailureDuringFlush: (() => void) | null = null;

/** Called when offline flush cannot refresh — typically signs the user out. */
export function registerOfflineAuthFailureHandler(handler: (() => void) | null) {
  onAuthFailureDuringFlush = handler;
}

const QUEUE_FETCH_TIMEOUT_MS = 15_000;

/** HTTP statuses that will not succeed on blind retry — drop to unblock the queue. */
const UNRECOVERABLE_STATUSES = new Set([400, 403, 404, 405, 409, 410, 422]);

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  label?: string;
  createdAt: string;
};

type QueueListener = (count: number) => void;
const queueListeners = new Set<QueueListener>();

export function subscribeToOfflineQueue(listener: QueueListener): () => void {
  queueListeners.add(listener);
  void loadOfflineQueue().then((queue) => listener(queue.length));
  return () => {
    queueListeners.delete(listener);
  };
}

async function notifyQueueChanged(): Promise<void> {
  const queue = await loadOfflineQueue();
  queueListeners.forEach((listener) => listener(queue.length));
}

function createQueueId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Rewrite stale dev hosts (e.g. WSL 172.x) to the current backend URL. */
export function migrateQueuedUrl(url: string): string {
  try {
    const target = new URL(url);
    const backend = new URL(BACKEND_BASE_URL);
    if (target.pathname.startsWith('/api/') && target.origin !== backend.origin) {
      return `${BACKEND_BASE_URL}${target.pathname}${target.search}`;
    }
  } catch {
    // Keep the original URL if parsing fails.
  }
  return url;
}

function migrateQueuedRequest(entry: QueuedRequest): QueuedRequest {
  const url = migrateQueuedUrl(entry.url);
  if (url === entry.url) {
    return entry;
  }
  return { ...entry, url };
}

async function loadCurrentSessionToken(): Promise<string | null> {
  const token = getMemoryAccessToken();
  return token?.trim() ? token.trim() : null;
}

async function getReplayHeaders(entry: QueuedRequest): Promise<Record<string, string>> {
  const headers = { ...entry.headers };
  const token = await loadCurrentSessionToken();

  // Use the latest signed-in token when replaying saved API mutations.
  // This avoids 401s after the user logs back in and the queued request
  // still carries an older bearer token from a previous session.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  headers[OFFLINE_REPLAY_HEADER] = 'true';
  if (!headers[REQUEST_ID_HEADER]) {
    headers[REQUEST_ID_HEADER] = entry.id;
  }

  return headers;
}

export async function loadOfflineQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as QueuedRequest[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    const migrated = parsed.map(migrateQueuedRequest);
    const changed = migrated.some((entry, index) => entry.url !== parsed[index]?.url);
    if (changed) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return [];
  }
}

async function saveOfflineQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function enqueueOfflineRequest(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  label?: string;
}): Promise<QueuedRequest> {
  const queue = await loadOfflineQueue();
  const entry: QueuedRequest = {
    id: createQueueId(),
    url: migrateQueuedUrl(input.url),
    method: input.method.toUpperCase(),
    headers: input.headers,
    body: input.body,
    label: input.label,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveOfflineQueue(queue);
  await notifyQueueChanged();
  return entry;
}

export async function removeOfflineRequest(id: string): Promise<void> {
  const queue = await loadOfflineQueue();
  const next = queue.filter((entry) => entry.id !== id);
  await saveOfflineQueue(next);
  await notifyQueueChanged();
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
  await notifyQueueChanged();
}

export type FlushOfflineQueueResult = {
  processed: number;
  failed: number;
  dropped: number;
  remaining: number;
  lastError: string | null;
};

/** Mirror authFetch: only TOKEN_* / bare 401s should attempt refresh. */
const NON_REFRESHABLE_AUTH_CODES = new Set([
  'ACCOUNT_PENDING',
  'ACCOUNT_INACTIVE',
  'MISSING_PERMISSION',
  'FORBIDDEN',
]);

async function responseAuthCode(response: Response): Promise<string | null> {
  try {
    const data = (await response.clone().json()) as { code?: string };
    return typeof data.code === 'string' ? data.code : null;
  } catch {
    return null;
  }
}

async function replayQueuedRequest(entry: QueuedRequest): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUEUE_FETCH_TIMEOUT_MS);

  try {
    const headers = await getReplayHeaders(entry);
    // Use the same Authorization refresh path as authFetch: latest memory token
    // is applied in getReplayHeaders; request goes through authenticated headers.
    return await fetch(migrateQueuedUrl(entry.url), {
      method: entry.method,
      headers,
      body: entry.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function flushOfflineQueue(): Promise<FlushOfflineQueueResult> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, dropped: 0, remaining: 0, lastError: null };
  }

  let processed = 0;
  let failed = 0;
  let dropped = 0;
  let lastError: string | null = null;
  const remaining: QueuedRequest[] = [];

  for (const entry of queue) {
    const migratedEntry = migrateQueuedRequest(entry);

    try {
      const response = await replayQueuedRequest(migratedEntry);

      if (!response.ok) {
        if (response.status === 401) {
          const authCode = await responseAuthCode(response);
          if (authCode && NON_REFRESHABLE_AUTH_CODES.has(authCode)) {
            // Account/permission failure — do not refresh; drop unrecoverable.
            dropped += 1;
            lastError = migratedEntry.label
              ? `${migratedEntry.label}: ${authCode}`
              : authCode;
            continue;
          }

          const outcome = await refreshAccessToken();
          if (outcome.status === 'refreshed') {
            const retryResponse = await replayQueuedRequest(migratedEntry);
            if (retryResponse.ok) {
              processed += 1;
              continue;
            }
            if (retryResponse.status === 401) {
              remaining.push(migratedEntry);
              remaining.push(
                ...queue.slice(queue.indexOf(entry) + 1).map(migrateQueuedRequest)
              );
              await saveOfflineQueue(remaining);
              onAuthFailureDuringFlush?.();
              return {
                processed,
                failed: failed + 1,
                dropped,
                remaining: remaining.length,
                lastError: 'Session expired. Sign in again to sync offline changes.',
              };
            }
            if (UNRECOVERABLE_STATUSES.has(retryResponse.status)) {
              dropped += 1;
              continue;
            }
            failed += 1;
            remaining.push(migratedEntry);
            continue;
          }
          // Keep queued work. Only force re-auth on definitive refresh failure;
          // transient network/5xx leaves the session intact for a later flush.
          remaining.push(migratedEntry);
          remaining.push(...queue.slice(queue.indexOf(entry) + 1).map(migrateQueuedRequest));
          await saveOfflineQueue(remaining);
          if (outcome.status === 'auth_failed') {
            onAuthFailureDuringFlush?.();
            return {
              processed,
              failed: failed + 1,
              dropped,
              remaining: remaining.length,
              lastError: 'Session expired. Sign in again to sync offline changes.',
            };
          }
          return {
            processed,
            failed: failed + 1,
            dropped,
            remaining: remaining.length,
            lastError: 'Could not refresh session. Will retry when you are back online.',
          };
        }

        const result = await response.json().catch(() => ({}));
        const message =
          typeof result?.error === 'string' ? result.error : `Request failed (${response.status})`;
        lastError = migratedEntry.label ? `${migratedEntry.label}: ${message}` : message;
        console.warn('[offline-queue] replay failed:', migratedEntry.label ?? migratedEntry.url, message);

        if (UNRECOVERABLE_STATUSES.has(response.status)) {
          dropped += 1;
          continue;
        }

        failed += 1;
        remaining.push(migratedEntry);
        continue;
      }

      processed += 1;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const detail =
        error instanceof Error
          ? isTimeout
            ? 'Request timed out'
            : error.message
          : 'Network error';
      lastError = migratedEntry.label ? `${migratedEntry.label}: ${detail}` : detail;
      console.warn('[offline-queue] replay network error:', migratedEntry.label ?? migratedEntry.url, error);
      failed += 1;
      remaining.push(migratedEntry);
      break;
    }
  }

  await saveOfflineQueue(remaining);
  await notifyQueueChanged();
  return { processed, failed, dropped, remaining: remaining.length, lastError };
}
