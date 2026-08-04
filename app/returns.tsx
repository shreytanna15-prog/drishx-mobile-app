'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import {
  fetchReturnRequests,
  formatReturnStatus,
  type ReturnRequestRecord,
  type ReturnRequestStatus,
} from '@/lib/returns-api';
import { useBrandColors } from '@/lib/theme-provider';

type FilterKey = 'ALL' | ReturnRequestStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'SUBMITTED', label: 'Pending review' },
  { key: 'MORE_INFO_REQUIRED', label: 'More info' },
  { key: 'APPROVED_CREDIT', label: 'Credit' },
  { key: 'AWAITING_MATERIAL', label: 'Replacement' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CLOSED', label: 'Closed' },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReturnsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders, isStaff } = useAuth();
  const [requests, setRequests] = useState<ReturnRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const load = useCallback(async () => {
    try {
      setError(null);
      setRequests(await fetchReturnRequests(getAuthHeaders()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load returns.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (activeFilter === 'ALL') return requests;
    return requests.filter((request) => request.status === activeFilter);
  }, [activeFilter, requests]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>{isStaff ? 'Returns' : 'My Returns'}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  {error ||
                    (isStaff
                      ? 'Returns appear here after admin approval and assignment.'
                      : 'No return or replacement requests yet.')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/return-details', params: { id: item.id } } as never)
                }>
                <View style={styles.cardTop}>
                  <Text style={styles.requestNumber}>{item.requestNumber}</Text>
                  <Text style={styles.status}>{formatReturnStatus(item.status)}</Text>
                </View>
                <Text style={styles.meta}>
                  {item.customer?.businessName ||
                    item.customer?.name ||
                    item.customer?.email ||
                    'Customer'}{' '}
                  · {item.requestType.toLowerCase()} · {item.items.length} item
                  {item.items.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    filterText: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: c.primary },
    list: { padding: 16, gap: 10, paddingBottom: 32 },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 14,
      gap: 6,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    requestNumber: { color: c.text, fontSize: 16, fontWeight: '800' },
    status: { color: c.primary, fontSize: 12, fontWeight: '700' },
    meta: { color: c.textMuted, fontSize: 13 },
    date: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { color: c.textMuted, textAlign: 'center' },
  });
