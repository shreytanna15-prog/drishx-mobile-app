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

import { flushOfflineQueue, loadOfflineQueue, subscribeToOfflineQueue } from '@/lib/offline-queue';
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
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await loadOfflineQueue();
    setPendingCount(queue.length);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    const online = await getIsOnline();
    if (!online) {
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      let remaining = 1;
      while (remaining > 0) {
        const result = await flushOfflineQueue();
        remaining = result.remaining;
        if (result.processed === 0 && result.failed > 0) {
          break;
        }
        if (result.processed === 0 && result.remaining === 0) {
          break;
        }
      }
      notifySyncComplete();
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
      refreshPendingCount,
      syncNow,
    }),
    [isOnline, pendingCount, isSyncing, refreshPendingCount, syncNow]
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
