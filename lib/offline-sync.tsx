'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  clearOfflineQueue,
  flushOfflineQueue,
  loadOfflineQueue,
  subscribeToOfflineQueue,
} from '@/lib/offline-queue';
import { getIsOnline, subscribeToNetwork } from '@/lib/network';

type SyncListener = () => void;
const syncCompleteListeners = new Set<SyncListener>();

export function onOfflineSyncComplete(listener: SyncListener): () => void {
  syncCompleteListeners.add(listener);
  return () => {
    syncCompleteListeners.delete(listener);
  };
}

function notifySyncComplete(): void {
  syncCompleteListeners.forEach((listener) => listener());
}

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<void>;
  dismissPendingSync: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await loadOfflineQueue();
    setPendingCount(queue.length);
    if (queue.length === 0) {
      setLastSyncError(null);
    }
  }, []);

  const dismissPendingSync = useCallback(async () => {
    await clearOfflineQueue();
    setLastSyncError(null);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    const online = await getIsOnline();
    if (!online) {
      setLastSyncError('You are offline. Connect to Wi-Fi or mobile data and try again.');
      return;
    }

    const queue = await loadOfflineQueue();
    if (queue.length === 0) {
      setLastSyncError(null);
      await refreshPendingCount();
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      let remaining = queue.length;
      let lastError: string | null = null;

      while (remaining > 0) {
        const result = await flushOfflineQueue();
        remaining = result.remaining;
        lastError = result.lastError;

        if (result.processed > 0 || result.dropped > 0) {
          notifySyncComplete();
        }

        if (result.processed === 0 && result.failed === 0 && result.dropped === 0) {
          break;
        }

        if (result.processed === 0 && (result.failed > 0 || result.dropped > 0)) {
          break;
        }
      }

      if (remaining > 0 && lastError) {
        setLastSyncError(lastError);
      } else {
        setLastSyncError(null);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    void refreshPendingCount();
    void getIsOnline().then(setIsOnline);

    const unsubscribeNetwork = subscribeToNetwork((online) => {
      setIsOnline(online);
      if (online) {
        void syncNow();
      }
    });

    const unsubscribeQueue = subscribeToOfflineQueue(setPendingCount);

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void getIsOnline().then((online) => {
          setIsOnline(online);
          if (online) {
            void syncNow();
          }
        });
      }
    };

    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      unsubscribeNetwork();
      unsubscribeQueue();
      appStateSub.remove();
    };
  }, [refreshPendingCount, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      lastSyncError,
      refreshPendingCount,
      syncNow,
      dismissPendingSync,
    }),
    [isOnline, pendingCount, isSyncing, lastSyncError, refreshPendingCount, syncNow, dismissPendingSync]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  }
  return context;
}
