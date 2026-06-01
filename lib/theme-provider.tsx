'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import {
  getBrandColorsForScheme,
  type BrandColorScheme,
} from '@/constants/brand-colors';

const STORAGE_KEY = '@drishx/theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colorScheme: 'light' | 'dark';
  colors: BrandColorScheme;
  ready: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (stored === 'system' || stored === 'light' || stored === 'dark')
        ) {
          setPreferenceState(stored);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const colorScheme: 'light' | 'dark' =
    preference === 'system' ? systemScheme : preference;

  const colors = useMemo(() => getBrandColorsForScheme(colorScheme), [colorScheme]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      colorScheme,
      colors,
      ready,
    }),
    [preference, setPreference, colorScheme, colors, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function useBrandColors(): BrandColorScheme {
  return useTheme().colors;
}

export function useResolvedColorScheme(): 'light' | 'dark' {
  return useTheme().colorScheme;
}
