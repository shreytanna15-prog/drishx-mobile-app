import { Platform } from 'react-native';

/** Production/preview default when env is missing at bundle time (must not crash launch). */
const FALLBACK_BACKEND_BASE_URL = 'https://drishx-admin-and-backend.vercel.app';

function resolveBackendBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim();
  const unquoted = raw?.replace(/^['"]|['"]$/g, '');

  if (!unquoted) {
    console.warn(
      'EXPO_PUBLIC_BACKEND_BASE_URL is not set; using fallback. Set it in .env / eas.json and rebuild.'
    );
    return FALLBACK_BACKEND_BASE_URL;
  }

  const normalized = unquoted.replace(/\/+$/, '');

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
  } catch {
    console.warn(
      `EXPO_PUBLIC_BACKEND_BASE_URL is invalid ("${normalized}"); using fallback.`
    );
    return FALLBACK_BACKEND_BASE_URL;
  }

  return normalized;
}

/** Backend origin — no trailing slash. Prefer EXPO_PUBLIC_BACKEND_BASE_URL at build time. */
export const BACKEND_BASE_URL = resolveBackendBaseUrl();

if (BACKEND_BASE_URL.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use your deployed URL or a LAN IP instead.'
  );
}
