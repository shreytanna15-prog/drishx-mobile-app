'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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
  type ReturnRequestType,
} from '@/lib/returns-api';
import { useBrandColors } from '@/lib/theme-provider';

type CustomerFilterKey = 'ALL' | 'ACTIVE' | 'HISTORY' | ReturnRequestType;
type StaffFilterKey =
  | 'ALL'
  | 'APPROVED_CREDIT'
  | 'AWAITING_MATERIAL'
  | 'MORE_INFO_REQUIRED'
  | 'CLOSED';

const CUSTOMER_FILTERS: { key: CustomerFilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'HISTORY', label: 'History' },
  { key: 'RETURN', label: 'Returns' },
  { key: 'REPLACEMENT', label: 'Replace' },
];

const STAFF_FILTERS: { key: StaffFilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED_CREDIT', label: 'Credit' },
  { key: 'AWAITING_MATERIAL', label: 'Replace' },
  { key: 'MORE_INFO_REQUIRED', label: 'More info' },
  { key: 'CLOSED', label: 'Closed' },
];

const ACTIVE_STATUSES = new Set<ReturnRequestStatus>([
  'SUBMITTED',
  'MORE_INFO_REQUIRED',
  'ESCALATED_TO_ADMIN',
  'AWAITING_MATERIAL',
  'APPROVED_CREDIT',
  'APPROVED_REPLACEMENT',
]);

const HISTORY_STATUSES = new Set<ReturnRequestStatus>(['REJECTED', 'CLOSED']);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function typeLabel(type: ReturnRequestType) {
  return type === 'REPLACEMENT' ? 'Replacement' : 'Return';
}

function itemSummary(request: ReturnRequestRecord) {
  const labels = request.items.map((item) => item.lensLabel).filter(Boolean);
  if (labels.length === 0) return 'No items';
  if (labels.length === 1) return labels[0]!;
  return `${labels[0]} +${labels.length - 1} more`;
}

function customerName(request: ReturnRequestRecord) {
  return (
    request.customer?.businessName ||
    request.customer?.name ||
    request.customer?.email ||
    'Customer'
  );
}

function statusTone(status: ReturnRequestStatus, colors: BrandColorScheme) {
  switch (status) {
    case 'SUBMITTED':
    case 'ESCALATED_TO_ADMIN':
      return { border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(245, 158, 11, 0.16)', text: '#FBBF24' };
    case 'MORE_INFO_REQUIRED':
      return { border: 'rgba(56, 189, 248, 0.4)', bg: 'rgba(14, 165, 233, 0.16)', text: '#7DD3FC' };
    case 'AWAITING_MATERIAL':
    case 'APPROVED_REPLACEMENT':
    case 'APPROVED_CREDIT':
      return { border: 'rgba(52, 211, 153, 0.4)', bg: 'rgba(16, 185, 129, 0.16)', text: colors.success };
    case 'REJECTED':
      return { border: 'rgba(248, 113, 113, 0.45)', bg: 'rgba(239, 68, 68, 0.14)', text: colors.danger };
    default:
      return { border: colors.cardBorder, bg: colors.card, text: colors.textMuted };
  }
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
  const [customerFilter, setCustomerFilter] = useState<CustomerFilterKey>('ALL');
  const [staffFilter, setStaffFilter] = useState<StaffFilterKey>('ALL');

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
    if (isStaff) {
      if (staffFilter === 'ALL') return requests;
      return requests.filter((request) => request.status === staffFilter);
    }

    return requests.filter((request) => {
      if (customerFilter === 'ALL') return true;
      if (customerFilter === 'ACTIVE') return ACTIVE_STATUSES.has(request.status);
      if (customerFilter === 'HISTORY') return HISTORY_STATUSES.has(request.status);
      if (customerFilter === 'RETURN' || customerFilter === 'REPLACEMENT') {
        return request.requestType === customerFilter;
      }
      return true;
    });
  }, [customerFilter, isStaff, requests, staffFilter]);

  const filters = isStaff ? STAFF_FILTERS : CUSTOMER_FILTERS;
  const activeFilter = isStaff ? staffFilter : customerFilter;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isStaff ? 'Returns' : 'Returns & Replacements'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isStaff
                ? 'Assigned after admin approval'
                : 'Track status and full history'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setRefreshing(true);
              void load();
            }}
            hitSlop={8}
            style={styles.headerBtn}
            disabled={loading || refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="refresh" size={22} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {filters.map((filter) => {
              const active = filter.key === activeFilter;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => {
                    if (isStaff) {
                      setStaffFilter(filter.key as StaffFilterKey);
                    } else {
                      setCustomerFilter(filter.key as CustomerFilterKey);
                    }
                  }}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <MaterialIcons name="error-outline" size={36} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setLoading(true);
                void load();
              }}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
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
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="assignment-return" size={32} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilter === 'ALL' ? 'No return requests' : 'No matches for this filter'}
                </Text>
                <Text style={styles.emptyText}>
                  {isStaff
                    ? 'Returns appear here after admin approval and assignment.'
                    : 'Submit a return or replacement from an order detail page.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const tone = statusTone(item.status, colors);
              return (
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/return-details',
                      params: { id: item.id },
                    } as never)
                  }>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.requestNumber}>{item.requestNumber}</Text>
                      <Text style={styles.typeLine}>
                        {typeLabel(item.requestType)}
                        <Text style={styles.meta}>
                          {' '}
                          · {item.items.length} item{item.items.length === 1 ? '' : 's'}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.cardTopRight}>
                      <View
                        style={[
                          styles.statusBadge,
                          { borderColor: tone.border, backgroundColor: tone.bg },
                        ]}>
                        <Text style={[styles.statusBadgeText, { color: tone.text }]}>
                          {formatReturnStatus(item.status)}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                    </View>
                  </View>

                  {isStaff ? (
                    <View style={styles.rowMeta}>
                      <MaterialIcons name="person-outline" size={16} color={colors.primary} />
                      <Text style={styles.rowMetaText} numberOfLines={1}>
                        {customerName(item)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.rowMeta}>
                    <MaterialIcons name="inventory-2" size={16} color={colors.primary} />
                    <Text style={styles.rowMetaText} numberOfLines={2}>
                      {itemSummary(item)}
                    </Text>
                  </View>

                  {item.rejectionReason ? (
                    <Text style={styles.rejectText} numberOfLines={2}>
                      {item.rejectionReason}
                    </Text>
                  ) : null}

                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </Pressable>
              );
            }}
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
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    headerCenter: { flex: 1, minWidth: 0 },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
    headerSubtitle: { color: c.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
    filterWrap: {
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    filterChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    filterText: { color: c.textMuted, fontSize: 13, fontWeight: '700' },
    filterTextActive: { color: c.primary },
    list: { padding: 16, gap: 12, paddingBottom: 40, flexGrow: 1 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 16,
      gap: 10,
    },
    cardPressed: {
      borderColor: `${c.primary}73`,
      backgroundColor: `${c.primary}0D`,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    cardTopLeft: { flex: 1, minWidth: 0, gap: 4 },
    cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    requestNumber: { color: c.text, fontSize: 17, fontWeight: '800' },
    typeLine: { color: c.text, fontSize: 14, fontWeight: '700' },
    meta: { color: c.textMuted, fontWeight: '500' },
    statusBadge: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: 140,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    rowMetaText: {
      flex: 1,
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    rejectText: {
      color: c.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    date: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 10,
    },
    emptyCard: {
      marginTop: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 20,
      paddingVertical: 36,
      alignItems: 'center',
      gap: 8,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      backgroundColor: c.background,
    },
    emptyTitle: { color: c.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
    emptyText: { color: c.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
    errorText: { color: c.danger, textAlign: 'center', fontSize: 14, fontWeight: '600' },
    retryBtn: {
      marginTop: 4,
      borderRadius: 10,
      backgroundColor: c.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    retryBtnText: { color: c.primaryText, fontWeight: '800', fontSize: 14 },
  });
