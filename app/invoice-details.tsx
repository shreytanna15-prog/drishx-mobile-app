'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { appAlert } from '@/lib/app-alert';
import { downloadInvoicePdf, formatInvoiceLensDetails } from '@/lib/invoices-api';
import { useGetInvoice } from '@/lib/modules/invoices/query/use-get-invoice';
import { formatLensType } from '@/lib/types/lens';

const COMPANY_NAME = 'Drishx';

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
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

function formatInvoiceStatus(status: string): string {
  if (status === 'PAID') return 'Paid';
  if (status === 'PARTIALLY_PAID') return 'Partially paid';
  return 'Unpaid';
}

export default function InvoiceDetailsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAuthHeaders } = useAuth();
  const [pdfBusy, setPdfBusy] = useState(false);

  const invoiceId = Array.isArray(id) ? id[0] : id;
  const {
    data,
    loading,
    error,
    refetch,
  } = useGetInvoice(invoiceId, { enabled: Boolean(invoiceId) });

  // Drop prior invoice while id changes so we never render stale details.
  const invoice = data?.id === invoiceId ? data : undefined;
  const missingId = !invoiceId;
  const showLoading = Boolean(invoiceId) && (loading || (!invoice && !error));

  const lensDetails = useMemo(
    () => (invoice ? formatInvoiceLensDetails(invoice) : '—'),
    [invoice]
  );

  const showTaxBreakup =
    invoice != null &&
    (invoice.taxableAmount != null || (invoice.lines && invoice.lines.length > 0));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Invoice Details</Text>
          <View style={{ width: 22 }} />
        </View>

        {missingId ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Missing invoice id.</Text>
          </View>
        ) : showLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Loading invoice...</Text>
          </View>
        ) : error || !invoice ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>
              {error?.message || 'Invoice not found.'}
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyMuted}>{COMPANY_NAME}</Text>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    invoice.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      invoice.status === 'PAID'
                        ? styles.statusPaidText
                        : styles.statusUnpaidText,
                    ]}>
                    {formatInvoiceStatus(invoice.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.totalAmount}>₹{formatMoney(invoice.amount)}</Text>
              <Text style={styles.mutedLine}>
                Outstanding ₹{formatMoney(invoice.amountOutstanding ?? invoice.amount)}
              </Text>
              <Text style={styles.mutedLine}>
                Issued{' '}
                {new Date(invoice.issuedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {showTaxBreakup ? (
              <View style={styles.card}>
                <Text style={styles.cardTitleMuted}>Tax breakup</Text>
                <DetailRow label="Taxable" value={`₹${formatMoney(invoice.taxableAmount ?? 0)}`} />
                <DetailRow label="CGST" value={`₹${formatMoney(invoice.cgstAmount ?? 0)}`} />
                <DetailRow label="SGST" value={`₹${formatMoney(invoice.sgstAmount ?? 0)}`} />
                <DetailRow label="IGST" value={`₹${formatMoney(invoice.igstAmount ?? 0)}`} />
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitleMuted}>Customer</Text>
              <DetailRow
                label="Name"
                value={invoice.user?.name?.trim() || invoice.user?.email || '—'}
              />
              <DetailRow label="Email" value={invoice.user?.email || '—'} />
              <DetailRow label="Business" value={invoice.user?.businessName || '—'} />
              <DetailRow label="GST" value={invoice.user?.gstNumber || '—'} />
              <DetailRow label="Address" value={invoice.user?.businessAddress || '—'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitleMuted}>Order</Text>
              <DetailRow
                label="Order ID"
                value={
                  invoice.order?.id
                    ? `#${invoice.order.id.slice(-8).toUpperCase()}`
                    : '—'
                }
              />
              <DetailRow
                label="Lens type"
                value={
                  invoice.order?.lensType
                    ? String(formatLensType(invoice.order.lensType))
                    : '—'
                }
              />
              <DetailRow label="Lens details" value={lensDetails} />
              <DetailRow
                label="Quantity"
                value={String(invoice.order?.quantity ?? '—')}
              />
              <DetailRow
                label="Order total"
                value={`₹${formatMoney(invoice.order?.totalAmount ?? invoice.amount)}`}
              />
            </View>

            <Pressable
              style={[styles.pdfBtn, pdfBusy && styles.btnDisabled]}
              disabled={pdfBusy}
              onPress={() => {
                void (async () => {
                  setPdfBusy(true);
                  try {
                    await downloadInvoicePdf(
                      invoice.id,
                      getAuthHeaders(),
                      invoice.invoiceNumber
                    );
                  } catch (err) {
                    appAlert(
                      'Download failed',
                      err instanceof Error
                        ? err.message
                        : 'Could not download tax invoice.'
                    );
                  } finally {
                    setPdfBusy(false);
                  }
                })();
              }}>
              {pdfBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <MaterialIcons name="picture-as-pdf" size={18} color={colors.primary} />
              )}
              <Text style={styles.pdfBtnText}>
                {pdfBusy ? 'Preparing PDF…' : 'Download tax invoice'}
              </Text>
            </Pressable>

            {invoice.orderId ? (
              <Pressable
                style={styles.returnBtn}
                onPress={() =>
                  router.push({
                    pathname: '/return-request',
                    params: {
                      displayOrderId: invoice.invoiceNumber,
                      orders: JSON.stringify([
                        {
                          id: invoice.orderId,
                          quantity: Number(invoice.order?.quantity ?? 1) || 1,
                          eye: invoice.order?.progressiveLens?.eye ?? null,
                          label: invoice.order?.lensType
                            ? String(formatLensType(invoice.order.lensType))
                            : 'Order item',
                        },
                      ]),
                    },
                  } as never)
                }>
                <MaterialIcons name="assignment-return" size={18} color={colors.primaryText} />
                <Text style={styles.returnBtnText}>Return / Replacement</Text>
              </Pressable>
            ) : null}
          </ScrollView>
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
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 12,
      gap: 8,
    },
    summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    companyMuted: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    invoiceNumber: { color: c.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
    totalAmount: { color: c.primary, fontSize: 28, fontWeight: '800', marginTop: 4 },
    mutedLine: { color: c.textMuted, fontSize: 13 },
    statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    statusPaid: { backgroundColor: 'rgba(5, 150, 105, 0.15)' },
    statusUnpaid: { backgroundColor: 'rgba(240, 161, 50, 0.18)' },
    statusPillText: { fontSize: 11, fontWeight: '800' },
    statusPaidText: { color: c.success },
    statusUnpaidText: { color: c.primary },
    cardTitleMuted: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 2,
    },
    detailRow: { gap: 2 },
    detailLabel: {
      color: c.label,
      fontSize: 11,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    detailValue: { color: c.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 24,
    },
    helperText: { color: c.textMuted, fontSize: 14 },
    errorText: { color: c.danger, textAlign: 'center' },
    retryBtn: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryBtnText: { color: c.text, fontWeight: '700' },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.card,
      paddingVertical: 13,
    },
    pdfBtnText: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    btnDisabled: { opacity: 0.6 },
    returnBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 13,
    },
    returnBtnText: {
      color: c.primaryText,
      fontSize: 14,
      fontWeight: '800',
    },
  });
