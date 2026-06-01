'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { fetchInvoices, type InvoiceRecord } from '@/lib/invoices-api';
import { useBrandColors } from '@/lib/theme-provider';

type InvoiceFilter = 'ALL' | 'PAID' | 'UNPAID';

const FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Paid' },
  { key: 'UNPAID', label: 'Unpaid' },
];

function formatAmount(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN');
}

type InvoicesStyles = ReturnType<typeof createStyles>;

function InvoiceRow({
  item,
  onPress,
  styles,
}: {
  item: InvoiceRecord;
  onPress: () => void;
  styles: InvoicesStyles;
}) {
  const statusPaid = item.status === 'PAID';
  return (
    <Pressable style={styles.invoiceRow} onPress={onPress}>
      <View style={styles.invoiceLeft}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
        <Text style={styles.invoiceDate}>
          {new Date(item.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={styles.invoiceAmount}>₹{formatAmount(item.amount)}</Text>
      <View style={[styles.statusBadge, statusPaid ? styles.paidBadge : styles.unpaidBadge]}>
        <Text style={[styles.statusText, statusPaid ? styles.paidText : styles.unpaidText]}>
          {statusPaid ? 'Paid' : 'Unpaid'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>('ALL');
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const loadInvoices = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchInvoices(getAuthHeaders());
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return invoices;
    return invoices.filter((invoice) => invoice.status === filter);
  }, [invoices, filter]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Invoices</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((entry) => {
            const active = entry.key === filter;
            return (
              <Pressable
                key={entry.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(entry.key)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Loading invoices...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadInvoices()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadInvoices();
                }}
                tintColor={colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.helperText}>No invoices found.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <InvoiceRow
                item={item}
                styles={styles}
                onPress={() =>
                  router.push({
                    pathname: '/invoice-details' as never,
                    params: { id: item.id },
                  })
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    filterChip: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingVertical: 10,
      alignItems: 'center',
    },
    filterChipActive: { borderColor: c.primary },
    filterText: { color: c.textMuted, fontWeight: '600' },
    filterTextActive: { color: c.primary, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    invoiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 12,
      gap: 10,
    },
    invoiceLeft: { flex: 1 },
    invoiceNumber: { color: c.text, fontSize: 16, fontWeight: '700' },
    invoiceDate: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    invoiceAmount: { color: c.text, fontSize: 17, fontWeight: '700' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    paidBadge: { backgroundColor: '#134e32' },
    unpaidBadge: { backgroundColor: '#4a2d11' },
    statusText: { fontSize: 12, fontWeight: '700' },
    paidText: { color: '#86efac' },
    unpaidText: { color: '#fdba74' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
    helperText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, textAlign: 'center', fontSize: 14 },
    retryButton: {
      marginTop: 6,
      borderRadius: 10,
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryText: { color: c.primaryText, fontWeight: '700' },
  });
