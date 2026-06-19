import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function isOnlineFromState(state: NetInfoState): boolean {
  if (state.isConnected !== true) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

export async function getIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return isOnlineFromState(state);
}

export function subscribeToNetwork(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    onChange(isOnlineFromState(state));
  });
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('internet connection')
    );
  }
  return false;
}
