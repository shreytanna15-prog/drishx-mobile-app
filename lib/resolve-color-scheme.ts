import type { ColorSchemeName } from 'react-native';

/**
 * Narrow React Native's ColorSchemeName (`'light' | 'dark' | 'unspecified' | null`)
 * to the app's supported schemes. Treat unspecified/null as light.
 */
export function resolveColorScheme(
  scheme: ColorSchemeName | null | undefined,
): 'light' | 'dark' {
  return scheme === 'dark' ? 'dark' : 'light';
}
