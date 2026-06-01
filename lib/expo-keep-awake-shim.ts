/**
 * Safe stand-in for `expo-keep-awake` used in __DEV__ via Expo's `withDevTools`.
 * The real module can reject with "Unable to activate keep awake" when the Android
 * activity is not ready yet, which surfaces as an uncaught promise error.
 */
export const ExpoKeepAwakeTag = 'ExpoKeepAwakeDefaultTag';

export type KeepAwakeListener = (event: { state: 'active' | 'inactive' }) => void;

export type KeepAwakeOptions = {
  listener?: KeepAwakeListener;
  suppressDeactivateWarnings?: boolean;
};

export function useKeepAwake(_tag?: string, _options?: KeepAwakeOptions): void {
  // No-op: screen stay-awake during dev is optional; avoids startup race on Android.
}

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function activateKeepAwakeAsync(_tag: string = ExpoKeepAwakeTag): Promise<void> {}

export function activateKeepAwake(_tag: string = ExpoKeepAwakeTag): Promise<void> {
  return activateKeepAwakeAsync(_tag);
}

export async function deactivateKeepAwake(_tag: string = ExpoKeepAwakeTag): Promise<void> {}

export function addListener(
  _tagOrListener?: string | KeepAwakeListener,
  _listener?: KeepAwakeListener
) {
  return { remove: () => {} };
}

// Satisfy any accidental default import.
export default {
  useKeepAwake,
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  ExpoKeepAwakeTag,
};
