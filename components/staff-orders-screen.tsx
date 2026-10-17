'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { EmployeeOrderListRow } from '@/components/employee-order-list-row';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { usePaginatedListState } from '@/lib/hooks/use-paginated-list-state';
import {
  filterStaffFulfillmentOrders,
  groupOrdersForList,
} from '@/lib/order-list-display';
import { useGetOrders } from '@/lib/modules/orders/query/use-get-orders';
import type { OrderRecord } from '@/lib/orders-api';
import { onOfflineSyncComplete } from '@/lib/offline-sync';
import {
  groupMatchesStaffFilter,
  STAFF_FILTER_STATUSES,
  STAFF_ORDER_FILTERS,
  staffOrdersEmptyTitle,
  type StaffOrderFilter,
} from '@/lib/staff-order-filters';

type StaffOrdersScreenProps = {
  variant?: 'standard' | 'rx';
};

function statusParamForStaffFilter(filter: StaffOrderFilter): string | undefined {
  if (filter === 'ALL') return undefined;
  return STAFF_FILTER_STATUSES[filter].join(',');
}

export function StaffOrdersScreen({ variant = 'standard' }: StaffOrdersScreenProps) {
  const isRx = variant === 'rx';
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<StaffOrderFilter>('ALL');
  const listResetKey = `${activeFilter}|${isRx ? 'rx' : 'std'}`;
  const { page, setPage, items, setItems, onPageSuccess } =
    usePaginatedListState<OrderRecord>(listResetKey);

  const { data, loading, refreshing, error, refetch } = useGetOrders(
    {
      page,
      limit: 30,
      status: statusParamForStaffFilter(activeFilter),
      scope: isRx ? 'rx_lab' : 'catalog',
    },
    { onSuccess: onPageSuccess }
  );

  useEffect(() => {
    return onOfflineSyncComplete(() => {
      setPage(1);
      setItems([]);
      void refetch();
    });
  }, [refetch, setPage, setItems]);

  const orderGroups = useMemo(() => {
    const fulfillment = filterStaffFulfillmentOrders(items);
    return groupOrdersForList(fulfillment);
  }, [items]);

  const filteredGroups = useMemo(
    () => orderGroups.filter((group) => groupMatchesStaffFilter(group, activeFilter)),
    [orderGroups, activeFilter]
  );

  const hasMore = Boolean(data?.hasMore);
  const showInitialLoading = loading && page === 1 && items.length === 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {isRx ? (
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back to orders">
                <MaterialIcons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            <Text style={[styles.screenTitle, isRx && styles.screenTitleFlex]}>
              {isRx ? 'Rx Orders' : 'Orders'}
            </Text>
            {isRx ? <View style={styles.headerSpacer} /> : null}
          </View>
          <Text style={styles.subtitle}>
            {isRx ? 'Prescription RX orders assigned to you' : 'Orders assigned to you'}
          </Text>
          {isRx ? null : (
            <View style={styles.headerActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push('/rx-orders')}
                accessibilityRole="button">
                <MaterialIcons name="science" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Rx Orders</Text>
              </Pressable>
              <Pressable
                style={styles.newOrderButton}
                onPress={() => router.push('/employee-order-on-behalf')}
                accessibilityRole="button">
                <MaterialIcons name="add-shopping-cart" size={18} color={colors.primaryText} />
                <Text style={styles.newOrderButtonText}>Order on Behalf</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {STAFF_ORDER_FILTERS.map((filter) => {
              const active = filter.key === activeFilter;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.key)}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {showInitialLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>{isRx ? 'Loading RX orders...' : 'Loading orders...'}</Text>
          </View>
        ) : error && items.length === 0 ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="error-outline" size={48} color={colors.danger} />
            <Text style={styles.errorText}>{error.message}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setPage(1);
                void refetch();
              }}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing && page === 1}
                onRefresh={() => {
                  setPage(1);
                  void refetch();
                }}
                tintColor={colors.primary}
              />
            }
            onEndReached={() => {
              if (hasMore && !loading && !refreshing) {
                setPage((p) => p + 1);
              }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMore && (loading || refreshing) && page > 1 ? (
                <View style={styles.loadMoreFooter}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="receipt-long" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {staffOrdersEmptyTitle(activeFilter, { isRx })}
                </Text>
                <Text style={styles.stateText}>Try switching filters or refresh the list.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <EmployeeOrderListRow
                group={item}
                onPress={() =>
                  router.push({
                    pathname: '/order-details',
                    params: { id: item.orders[0].id, groupKey: item.key },
                  } as never)
                }
              />
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
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    headerSpacer: { width: 36 },
    screenTitle: { fontSize: 30, fontWeight: '800', color: c.text },
    screenTitleFlex: { flex: 1, textAlign: 'center', fontSize: 24 },
    subtitle: { marginTop: 4, fontSize: 14, color: c.textMuted },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      flexWrap: 'wrap',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.card,
    },
    secondaryButtonText: { color: c.primary, fontWeight: '700', fontSize: 13 },
    newOrderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    newOrderButtonText: { color: c.primaryText, fontWeight: '700', fontSize: 13 },
    filterWrap: { paddingBottom: 8 },
    filterRow: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
    },
    filterChipText: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
    filterChipTextActive: { color: c.primary },
    listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    loadMoreFooter: { paddingVertical: 16, alignItems: 'center' },
    separator: { height: 10 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
      gap: 10,
    },
    stateText: { color: c.textMuted, textAlign: 'center', fontSize: 14 },
    emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
    errorText: { color: c.danger, textAlign: 'center', fontSize: 14 },
    retryButton: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
  });
