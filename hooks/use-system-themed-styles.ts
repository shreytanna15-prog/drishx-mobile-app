import { useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getBrandColorsForScheme, type BrandColorScheme } from '@/constants/brand-colors';
import { resolveColorScheme } from '@/lib/resolve-color-scheme';

/** Brand colors that follow the device system light/dark setting. */
export function useSystemBrandColors(): BrandColorScheme {
  const scheme = resolveColorScheme(useRNColorScheme());
  return useMemo(() => getBrandColorsForScheme(scheme), [scheme]);
}

export function useSystemThemedStyles<T>(
  factory: (colors: BrandColorScheme) => T,
  deps: readonly unknown[] = []
): T {
  const colors = useSystemBrandColors();
  return useMemo(() => factory(colors), [colors, ...deps]);
}
