'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand-colors';
import { useAuth } from '@/lib/auth';
import { fetchInvoiceById, type InvoiceRecord } from '@/lib/invoices-api';
import { formatLensType } from '@/lib/types/lens';

const GOLD = BrandColors.primary;
const BG = BrandColors.background;
const CARD = BrandColors.card;
const BORDER = BrandColors.cardBorder;
const COMPANY_NAME = 'Drishx';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatMoney(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-IN');
}

export default function InvoiceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAuthHeaders } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = Array.isArray(id) ? id[0] : id;

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError('Missing invoice id.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchInvoiceById(invoiceId, getAuthHeaders());
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, getAuthHeaders]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const lensDetails = useMemo(() => {
    const order = invoice?.order;
    if (!order) return '—';
    if (order.progressiveLens) {
      const d = order.progressiveLens;
      return `SPH ${d.sph}, CYL ${d.cyl ?? '—'}, ADD ${d.add}, Eye ${d.eye}`;
    }
    if (order.kryptokLens) {
      const d = order.kryptokLens;
      return `SPH ${d.sph}, CYL ${d.cyl ?? '—'}, ADD ${d.add}`;
    }
    if (order.singleVisionLens) {
      const d = order.singleVisionLens;
      return `SPH ${d.sph}, CYL ${d.cyl ?? '—'}`;
    }
    return '—';
  }, [invoice]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={GOLD} />
          </Pressable>
          <Text style={styles.headerTitle}>Invoice Details</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.helperText}>Loading invoice...</Text>
          </View>
        ) : error || !invoice ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error || 'Invoice not found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{COMPANY_NAME}</Text>
              <DetailRow label="Invoice No" value={invoice.invoiceNumber} />
              <DetailRow
                label="Date"
                value={new Date(invoice.issuedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <DetailRow label="Status" value={invoice.status} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Customer</Text>
              <DetailRow label="Name" value={invoice.user?.name?.trim() || invoice.user?.email || '—'} />
              <DetailRow label="Email" value={invoice.user?.email || '—'} />
              <DetailRow label="GST" value={invoice.user?.gstNumber || '—'} />
              <DetailRow label="Business" value={invoice.user?.businessName || '—'} />
              <DetailRow label="Address" value={invoice.user?.businessAddress || '—'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Order Bill</Text>
              <DetailRow label="Order ID" value={invoice.order?.id ? `#${invoice.order.id.slice(-8).toUpperCase()}` : '—'} />
              <DetailRow label="Lens Type" value={invoice.order?.lensType ? String(formatLensType(invoice.order.lensType)) : '—'} />
              <DetailRow label="Lens Details" value={lensDetails} />
              <DetailRow label="Quantity" value={String(invoice.order?.quantity ?? '—')} />
              <DetailRow label="Unit Price" value={`₹${formatMoney(invoice.order?.unitPrice ?? 0)}`} />
              <DetailRow label="Total" value={`₹${formatMoney(invoice.amount)}`} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: BrandColors.text, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 12,
    gap: 8,
  },
  cardTitle: { color: GOLD, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  detailRow: { gap: 2 },
  detailLabel: { color: BrandColors.label, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  detailValue: { color: BrandColors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  helperText: { color: BrandColors.textMuted, fontSize: 14 },
  errorText: { color: '#f87171', textAlign: 'center' },
});
