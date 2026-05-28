import { Platform } from 'react-native';

const raw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim();
const unquoted = raw?.replace(/^['"]|['"]$/g, '');

if (!unquoted) {
  throw new Error(
    'EXPO_PUBLIC_BACKEND_BASE_URL is not set. Add it to .env and rebuild the app (npx expo start -c or npx expo run:android).'
  );
}

/** Backend origin from .env — no trailing slash. Set EXPO_PUBLIC_BACKEND_BASE_URL before building. */
const normalized = unquoted.replace(/\/+$/, '');

try {
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('invalid protocol');
  }
} catch {
  throw new Error(
    `EXPO_PUBLIC_BACKEND_BASE_URL is invalid: "${normalized}". Use a full URL like https://example.com`
  );
}

export const BACKEND_BASE_URL = normalized;

if (BACKEND_BASE_URL.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use your deployed URL or a LAN IP instead.'
  );
}
