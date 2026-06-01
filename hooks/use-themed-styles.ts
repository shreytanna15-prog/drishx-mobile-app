import { useMemo } from 'react';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useBrandColors } from '@/lib/theme-provider';

export function useThemedStyles<T>(
  factory: (colors: BrandColorScheme) => T,
  deps: readonly unknown[] = []
): T {
  const colors = useBrandColors();
  return useMemo(() => factory(colors), [colors, ...deps]);
}
