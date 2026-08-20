import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'drishx_refresh_token';

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // ignore secure store failures
  }
}

export async function clearRefreshToken(): Promise<void> {
  await setRefreshToken(null);
}
