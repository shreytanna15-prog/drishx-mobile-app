'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useOfflineSync } from '@/lib/offline-sync';

export function OfflineStatusBanner() {
  const styles = useThemedStyles(createStyles);
  const { isOnline, pendingCount, isSyncing, lastSyncError, syncNow, dismissPendingSync } =
    useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing && !lastSyncError) {
    return null;
  }

  const offline = !isOnline;
  const hasPending = pendingCount > 0;
  const showError = Boolean(lastSyncError) && hasPending && !isSyncing;

  const message = offline
    ? hasPending
      ? `Offline · ${pendingCount} change${pendingCount === 1 ? '' : 's'} saved locally`
      : 'You are offline · changes will be saved locally'
    : isSyncing
      ? 'Syncing saved changes…'
      : showError
        ? lastSyncError
        : hasPending
          ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`
          : lastSyncError;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.banner,
        offline ? styles.bannerOffline : showError ? styles.bannerError : styles.bannerSync,
      ]}>
      <View style={styles.bannerContent}>
        {isSyncing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialIcons
            name={offline ? 'cloud-off' : showError ? 'error-outline' : 'cloud-upload'}
            size={16}
            color="#ffffff"
          />
        )}
        <Text style={styles.bannerText} numberOfLines={2}>
          {message}
        </Text>
        {!offline && hasPending && !isSyncing ? (
          <View style={styles.actions}>
            <Pressable onPress={() => void syncNow()} hitSlop={8}>
              <Text style={styles.syncAction}>{showError ? 'Retry' : 'Sync now'}</Text>
            </Pressable>
            {showError ? (
              <Pressable onPress={() => void dismissPendingSync()} hitSlop={8}>
                <Text style={styles.syncAction}>Dismiss</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    banner: {
      width: '100%',
    },
    bannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    bannerOffline: {
      backgroundColor: '#b45309',
    },
    bannerSync: {
      backgroundColor: c.primary,
    },
    bannerError: {
      backgroundColor: '#b91c1c',
    },
    bannerText: {
      flex: 1,
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    syncAction: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
  });
