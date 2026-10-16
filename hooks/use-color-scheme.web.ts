import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/lib/theme-provider';
import { resolveColorScheme } from '@/lib/resolve-color-scheme';

export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHasHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const system = resolveColorScheme(useRNColorScheme());
  const resolvedSystem = hasHydrated ? system : 'light';

  if (!ctx) {
    return resolvedSystem;
  }

  if (ctx.preference === 'system') {
    return resolvedSystem;
  }

  return ctx.preference;
}
