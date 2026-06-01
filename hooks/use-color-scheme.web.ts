import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/lib/theme-provider';

export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useRNColorScheme() ?? 'light';
  const resolvedSystem = hasHydrated ? system : 'light';

  if (!ctx) {
    return resolvedSystem;
  }

  if (ctx.preference === 'system') {
    return resolvedSystem;
  }

  return ctx.preference;
}
