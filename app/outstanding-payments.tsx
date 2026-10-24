'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { appAlert } from '@/lib/app-alert';
import { isOfflineQueuedFailure } from '@/lib/hooks/api-hook-utils';
import { useGetOutstandingReceivables } from '@/lib/modules/finance/query/use-get-outstanding-receivables';
import { useSubmitPaymentClaim } from '@/lib/modules/finance/mutation/use-submit-payment-claim';
import { useSubmitNoBillExpense } from '@/lib/modules/finance/mutation/use-submit-no-bill-expense';

export default function OutstandingPaymentsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data, loading, refetch } = useGetOutstandingReceivables({
    onError: (e) => appAlert('Error', e.message),
  });

  const { mutate: submitClaim, pending: claimPending } = useSubmitPaymentClaim({
    onSuccess: () => {
      appAlert('Submitted', 'Payment claim sent for admin confirmation.');
      setAmount('');
      setReference('');
      setSelected([]);
      void refetch();
    },
    onError: (e) => {
      if (isOfflineQueuedFailure(e)) {
        appAlert('Saved offline', e.message);
        return;
      }
      appAlert('Error', e.message);
    },
  });

  const { mutate: submitExpense, pending: expensePending } =
    useSubmitNoBillExpense({
      onSuccess: () => {
        appAlert('Submitted', 'Expense sent for admin approval.');
        setAmount('');
        setReference('');
      },
      onError: (e) => {
        if (isOfflineQueuedFailure(e)) {
          appAlert('Saved offline', e.message);
          return;
        }
        appAlert('Error', e.message);
      },
    });

  const submitting = claimPending || expensePending;
  const creditLimit =
    user?.creditLimit != null && user.creditLimit !== ''
      ? Number(user.creditLimit)
      : null;
  const outstanding = data?.outstanding ?? 0;
  const availableCredit =
    creditLimit != null && Number.isFinite(creditLimit)
      ? Math.max(0, creditLimit - outstanding)
      : null;

  function toggleInvoice(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onSubmitClaim() {
    void submitClaim({
      amount: Number(amount),
      mode: 'UPI',
      reference,
      invoiceIds: selected.length ? selected : undefined,
    });
  }

  function onSubmitNoBillExpense() {
    if (user?.role !== 'EMPLOYEE' && user?.role !== 'ADMIN') {
      appAlert('Info', 'Expense submit is for employees.');
      return;
    }
    void submitExpense({
      amount: Number(amount),
      noBillReason: reference || 'No bill available',
      description: 'Mobile no-bill expense',
      category: 'Miscellaneous',
    });
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
            {user?.pricingTierCode ||
            (user?.accountAction && user.accountAction !== 'NONE') ? (
              <Text style={styles.muted}>
                {user?.pricingTierCode
                  ? `Pricing tier ${user.pricingTierCode}`
                  : ''}
                {user?.accountAction && user.accountAction !== 'NONE'
                  ? `${user?.pricingTierCode ? ' · ' : ''}${user.accountAction.replace(/_/g, ' ')}`
                  : ''}
              </Text>
            ) : null}
            {creditLimit != null ? (
              <View style={styles.card}>
                <Text style={styles.label}>Credit limit</Text>
                <Text style={styles.amount}>
                  ₹{creditLimit.toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.label, { marginTop: 10 }]}>
                  Available credit
                </Text>
                <Text style={styles.amount}>
                  ₹{(availableCredit ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}
            <View style={styles.card}>
              <Text style={styles.label}>Total outstanding</Text>
              <Text style={styles.amount}>
                ₹{outstanding.toLocaleString('en-IN')}
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
                onPress={onSubmitClaim}>
                <Text style={styles.btnText}>
                  {submitting ? 'Submitting…' : 'Submit claim'}
                </Text>
              </Pressable>
              {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN') && (
                <Pressable
                  style={[styles.btn, styles.btnOutline]}
                  disabled={submitting}
                  onPress={onSubmitNoBillExpense}>
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
