import AsyncStorage from '@react-native-async-storage/async-storage';

export const OFFLINE_QUEUE_STORAGE_KEY = '@drishx/offline-queue';

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

export async function loadOfflineQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as QueuedRequest[];
    return Array.isArray(parsed) ? parsed : [];
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
    url: input.url,
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
  remaining: number;
};

export async function flushOfflineQueue(): Promise<FlushOfflineQueueResult> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const entry of queue) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message =
          typeof result?.error === 'string' ? result.error : `Request failed (${response.status})`;
        console.warn('[offline-queue] replay failed:', entry.label ?? entry.url, message);
        failed += 1;
        remaining.push(entry);
        continue;
      }

      processed += 1;
    } catch (error) {
      console.warn('[offline-queue] replay network error:', entry.label ?? entry.url, error);
      failed += 1;
      remaining.push(entry);
      break;
    }
  }

  await saveOfflineQueue(remaining);
  await notifyQueueChanged();
  return { processed, failed, remaining: remaining.length };
}
