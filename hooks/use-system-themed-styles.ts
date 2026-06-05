import { useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getBrandColorsForScheme, type BrandColorScheme } from '@/constants/brand-colors';

/** Brand colors that follow the device system light/dark setting. */
export function useSystemBrandColors(): BrandColorScheme {
  const scheme = useRNColorScheme() ?? 'light';
  return useMemo(() => getBrandColorsForScheme(scheme), [scheme]);
}

export function useSystemThemedStyles<T>(
  factory: (colors: BrandColorScheme) => T,
  deps: readonly unknown[] = []
): T {
  const colors = useSystemBrandColors();
  return useMemo(() => factory(colors), [colors, ...deps]);
}
