import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/lib/theme-provider';

/** Resolved app color scheme (respects System / Light / Dark preference). */
export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  const system = useRNColorScheme() ?? 'light';

  if (!ctx) {
    return system;
  }

  if (ctx.preference === 'system') {
    return system;
  }

  return ctx.preference;
}
