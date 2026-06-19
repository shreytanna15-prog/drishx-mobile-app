'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useOfflineSync } from '@/lib/offline-sync';

export function OfflineStatusBanner() {
  const styles = useThemedStyles(createStyles);
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const offline = !isOnline;
  const message = offline
    ? pendingCount > 0
      ? `Offline · ${pendingCount} change${pendingCount === 1 ? '' : 's'} saved locally`
      : 'You are offline · changes will be saved locally'
    : isSyncing
      ? 'Syncing saved changes…'
      : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.banner, offline ? styles.bannerOffline : styles.bannerSync]}>
      <View style={styles.bannerContent}>
        {isSyncing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialIcons name={offline ? 'cloud-off' : 'cloud-upload'} size={16} color="#ffffff" />
        )}
        <Text style={styles.bannerText}>{message}</Text>
        {!offline && pendingCount > 0 && !isSyncing ? (
          <Pressable onPress={() => void syncNow()} hitSlop={8}>
            <Text style={styles.syncAction}>Sync now</Text>
          </Pressable>
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
    bannerText: {
      flex: 1,
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '600',
    },
    syncAction: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
  });
