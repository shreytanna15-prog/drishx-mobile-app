'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { fetchNotifications, markAllNotificationsRead, type NotificationRecord } from '@/lib/notifications-api';
import { useBrandColors } from '@/lib/theme-provider';

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffHr < 48) return 'Yesterday';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function notificationIcon(type: NotificationRecord['type']): keyof typeof MaterialIcons.glyphMap {
  if (type === 'ORDER_PLACED') return 'receipt-long';
  if (type === 'TASK_ASSIGNED') return 'task-alt';
  return 'notifications';
}

type NotificationStyles = ReturnType<typeof createStyles>;

function NotificationRow({
  item,
  styles,
  colors,
}: {
  item: NotificationRecord;
  styles: NotificationStyles;
  colors: BrandColorScheme;
}) {
  return (
    <View style={[styles.rowCard, !item.isRead && styles.rowCardUnread]}>
      <View style={styles.rowIconWrap}>
        <MaterialIcons name={notificationIcon(item.type)} size={14} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMessage}>{item.message}</Text>
      </View>
      <Text style={styles.rowTime}>{formatRelativeTime(item.createdAt)}</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchNotifications(getAuthHeaders());
      const hasUnread = data.some((item) => !item.isRead);
      if (hasUnread) {
        await markAllNotificationsRead(getAuthHeaders());
        setNotifications(data.map((item) => ({ ...item, isRead: true })));
      } else {
        setNotifications(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const hasNotifications = useMemo(() => notifications.length > 0, [notifications.length]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.backButton} />
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={44} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listWrap}>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    void loadNotifications();
                  }}
                  tintColor={colors.primary}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centeredState}>
                  <MaterialIcons name="notifications-none" size={44} color={colors.textMuted} />
                  <Text style={styles.stateText}>No notifications yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <NotificationRow item={item} styles={styles} colors={colors} />
              )}
            />

            {hasNotifications ? (
              <Pressable style={styles.viewAllButton} onPress={() => void loadNotifications()}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    backButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    listWrap: { flex: 1, padding: 14 },
    listContent: { paddingBottom: 8 },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      backgroundColor: c.card,
      padding: 12,
    },
    rowCardUnread: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.06)',
    },
    rowIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240, 161, 50, 0.10)',
      marginTop: 2,
    },
    rowContent: { flex: 1 },
    rowTitle: { color: c.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
    rowMessage: { color: c.textMuted, fontSize: 12, lineHeight: 17 },
    rowTime: { color: c.label, fontSize: 11, marginTop: 2 },
    separator: { height: 8 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 8,
    },
    stateText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, fontSize: 14, textAlign: 'center' },
    retryButton: {
      marginTop: 8,
      backgroundColor: c.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
    viewAllButton: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 10,
      alignItems: 'center',
      paddingVertical: 10,
    },
    viewAllText: { color: c.primary, fontWeight: '700' },
  });
