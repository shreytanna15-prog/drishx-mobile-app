'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import { appAlert } from '@/lib/app-alert';

type OutstandingPayload = {
  outstanding: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amountOutstanding: number | string;
  }>;
};

export default function OutstandingPaymentsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { getAuthHeaders, user } = useAuth();
  const [data, setData] = useState<OutstandingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/receivables`, {
        headers: getAuthHeaders(),
        authenticated: true,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (err) {
      appAlert('Error', err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleInvoice(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submitClaim() {
    setSubmitting(true);
    try {
      const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/payments`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        authenticated: true,
        body: JSON.stringify({
          action: 'claim',
          amount: Number(amount),
          mode: 'UPI',
          reference,
          invoiceIds: selected.length ? selected : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Claim failed');
      appAlert('Submitted', 'Payment claim sent for admin confirmation.');
      setAmount('');
      setReference('');
      setSelected([]);
      await load();
    } catch (err) {
      appAlert('Error', err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitNoBillExpense() {
    if (user?.role !== 'EMPLOYEE' && user?.role !== 'ADMIN') {
      appAlert('Info', 'Expense submit is for employees.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`${BACKEND_BASE_URL}/api/finance/expenses`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        authenticated: true,
        body: JSON.stringify({
          category: 'Miscellaneous',
          amount: Number(amount),
          billAvailable: false,
          noBillReason: reference || 'No bill available',
          description: 'Mobile no-bill expense',
          postingClass: 'OPERATING',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Expense failed');
      appAlert('Submitted', 'Expense sent for admin approval.');
      setAmount('');
      setReference('');
    } catch (err) {
      appAlert('Error', err instanceof Error ? err.message : 'Expense failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Outstanding / Payments</Text>
          <View style={{ width: 22 }} />
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.label}>Total outstanding</Text>
              <Text style={styles.amount}>
                ₹{(data?.outstanding ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Open invoices</Text>
              {(data?.invoices ?? []).map((inv) => {
                const checked = selected.includes(inv.id);
                return (
                  <View key={inv.id} style={styles.invoiceRow}>
                    <Pressable
                      style={styles.checkboxHit}
                      onPress={() => toggleInvoice(inv.id)}
                      hitSlop={8}>
                      <MaterialIcons
                        name={checked ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={checked ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.invoiceLink}
                      onPress={() =>
                        router.push({
                          pathname: '/invoice-details',
                          params: { id: inv.id },
                        } as never)
                      }>
                      <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                    </Pressable>
                    <Text style={styles.invoiceAmount}>
                      ₹{Number(inv.amountOutstanding).toLocaleString('en-IN')}
                    </Text>
                  </View>
                );
              })}
              {!data?.invoices?.length ? (
                <Text style={styles.muted}>No outstanding invoices.</Text>
              ) : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Submit payment claim</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              <TextInput
                style={styles.input}
                placeholder="UTR / reference"
                placeholderTextColor={colors.textMuted}
                value={reference}
                onChangeText={setReference}
              />
              <Pressable
                style={styles.btn}
                disabled={submitting}
                onPress={() => void submitClaim()}>
                <Text style={styles.btnText}>
                  {submitting ? 'Submitting…' : 'Submit claim'}
                </Text>
              </Pressable>
              {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN') && (
                <Pressable
                  style={[styles.btn, styles.btnOutline]}
                  disabled={submitting}
                  onPress={() => void submitNoBillExpense()}>
                  <Text style={[styles.btnText, { color: colors.primary }]}>
                    Submit no-bill expense
                  </Text>
                </Pressable>
              )}
            </View>
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
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    content: { padding: 16, gap: 12 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 16,
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: c.label,
      textTransform: 'uppercase',
    },
    amount: { fontSize: 28, fontWeight: '800', color: c.primary },
    invoiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    checkboxHit: { paddingVertical: 2 },
    invoiceLink: { flex: 1 },
    invoiceNumber: { color: c.primary, fontSize: 14, fontWeight: '700' },
    invoiceAmount: { color: c.text, fontSize: 14, fontWeight: '600' },
    muted: { color: c.textMuted, fontSize: 13 },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
    },
    btn: {
      marginTop: 4,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.primary,
    },
    btnText: { color: c.primaryText ?? '#fff', fontWeight: '700' },
  });
