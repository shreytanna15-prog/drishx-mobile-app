import { Platform } from 'react-native';
import { getEnv } from './env';

/** Backend origin — no trailing slash. Prefer EXPO_PUBLIC_BACKEND_BASE_URL at build time. */
export const BACKEND_BASE_URL = getEnv().BACKEND_BASE_URL;

if (BACKEND_BASE_URL.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use your deployed URL or a LAN IP instead.'
  );
}
