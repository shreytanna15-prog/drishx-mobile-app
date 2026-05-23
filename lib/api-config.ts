import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://192.168.10.115:3000' : 'http://localhost:3000';

export const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || DEFAULT_HOST;

if (process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.includes('localhost') && Platform.OS !== 'web') {
  console.warn(
    'EXPO_PUBLIC_BACKEND_BASE_URL uses localhost on a native device. Use a LAN IP or emulator host alias instead of localhost.'
  );
}
