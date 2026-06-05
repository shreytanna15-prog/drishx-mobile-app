import { useColorScheme as useRNColorScheme } from 'react-native';

/** Status bar icon style based on the device system appearance. */
export function useStatusBarStyle(): 'light' | 'dark' {
  return (useRNColorScheme() ?? 'light') === 'dark' ? 'light' : 'dark';
}
