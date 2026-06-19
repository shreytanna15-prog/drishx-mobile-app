import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveOfflineCache<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadOfflineCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const OFFLINE_CACHE_KEYS = {
  orders: '@drishx/cache/orders',
  cart: '@drishx/cache/cart',
  tasks: '@drishx/cache/tasks',
} as const;
