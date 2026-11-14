import { z } from 'zod';

/** Production/preview default when env is missing at bundle time (must not crash launch). */
export const FALLBACK_BACKEND_BASE_URL =
  'https://drishx-admin-and-backend.vercel.app';

const backendUrlSchema = z
  .string()
  .trim()
  .transform((raw, ctx) => {
    const unquoted = raw.replace(/^['"]|['"]$/g, '');
    if (!unquoted) {
      return FALLBACK_BACKEND_BASE_URL;
    }
    const normalized = unquoted.replace(/\/+$/, '');
    try {
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid protocol');
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `EXPO_PUBLIC_BACKEND_BASE_URL is invalid ("${normalized}")`,
      });
      return z.NEVER;
    }
    return normalized;
  });

export type MobileEnv = {
  BACKEND_BASE_URL: string;
  usedFallback: boolean;
};

let cached: MobileEnv | null = null;

/**
 * Resolve backend URL with Zod. Never throws — invalid/missing env falls back
 * so Expo launch is not blocked.
 */
export function getEnv(): MobileEnv {
  if (cached) return cached;

  const raw = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim() ?? '';
  if (!raw) {
    console.warn(
      'EXPO_PUBLIC_BACKEND_BASE_URL is not set; using fallback. Set it in .env / eas.json and rebuild.'
    );
    cached = { BACKEND_BASE_URL: FALLBACK_BACKEND_BASE_URL, usedFallback: true };
    return cached;
  }

  const parsed = backendUrlSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `${parsed.error.issues[0]?.message ?? 'Invalid EXPO_PUBLIC_BACKEND_BASE_URL'}; using fallback.`
    );
    cached = { BACKEND_BASE_URL: FALLBACK_BACKEND_BASE_URL, usedFallback: true };
    return cached;
  }

  cached = { BACKEND_BASE_URL: parsed.data, usedFallback: false };
  return cached;
}
