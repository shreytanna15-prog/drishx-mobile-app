import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBrandColors } from '@/lib/theme-provider';
import { useGetOrderGroup } from '@/lib/modules/orders/query/use-get-order-group';
import { useGetOrderModifications } from '@/lib/modules/orders/query/use-get-order-modifications';
import { useGetCatalogPowers } from '@/lib/modules/catalog-stock/query/use-get-catalog-powers';
import { useRequestOrderModification } from '@/lib/modules/orders/mutation/use-request-order-modification';
import { appAlert } from '@/lib/app-alert';

export default function ChangeCatalogOrderScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] ?? '' : rawId ?? '';
  const { data: orders, loading } = useGetOrderGroup(id);
  const { data: changes, refetch } = useGetOrderModifications(id);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [powerSearch, setPowerSearch] = useState('');
  const [q, setQ] = useState('');
  const [selectedPower, setSelectedPower] = useState('');
  const { data: powers } = useGetCatalogPowers({ q, page: 1, limit: 20 });
  const { mutate, pending, error } = useRequestOrderModification({
    onSuccess: () => { setReason(''); void refetch(); appAlert('Submitted', 'An admin will review your change request.'); },
    onError: (err) => appAlert('Change request failed', err.message),
  });
  const order = orders?.find((row) => row.id === id);
  const units = Number(quantity);
  const hasPending = changes?.items.some((change) => change.status === 'PENDING');
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>← Back to order</Text></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Request an order change</Text>
        <Text style={{ color: colors.textMuted }}>Admin approval reverses the original order and returns stock. Then place a new order for your preferred power and quantity.</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {order?.lensProductPowerId && !['CANCELLED', 'COMPLETED', 'DISPATCHED'].includes(order.status) ? (
          <View style={styles.card}>
            <Text style={{ color: colors.text }}>Current quantity: {order.quantity}</Text>
            <Text style={{ color: colors.text }}>Requested quantity</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.primary }]} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.primary }]} placeholder="Search replacement SKU (optional)" placeholderTextColor={colors.textMuted} value={powerSearch} onChangeText={setPowerSearch} />
            <Pressable onPress={() => setQ(powerSearch.trim())}><Text style={{ color: colors.primary }}>Search powers</Text></Pressable>
            <Pressable onPress={() => setSelectedPower('')}><Text style={{ color: colors.text }}>{selectedPower ? '○' : '●'} Keep current power</Text></Pressable>
            {powers?.items.map((power) => (
              <Pressable key={power.id} onPress={() => setSelectedPower(power.id)}><Text style={{ color: colors.text }}>{selectedPower === power.id ? '●' : '○'} {power.skuCode} · {power.sph.toFixed(2)}/{power.cyl.toFixed(2)}</Text></Pressable>
            ))}
            <Text style={{ color: colors.text }}>Reason</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.primary }]} value={reason} onChangeText={setReason} maxLength={500} />
            {error ? <Text style={{ color: colors.text }}>{error.message}</Text> : null}
            {hasPending ? <Text style={{ color: colors.text }}>A change request is awaiting admin review.</Text> : null}
            <Pressable disabled={pending || hasPending || !reason.trim() || !Number.isInteger(units) || units <= 0} style={[styles.button, { backgroundColor: colors.primary, opacity: pending || hasPending ? 0.5 : 1 }]} onPress={() => void mutate({ orderId: id, quantity: units, reason, ...(selectedPower ? { lensProductPowerId: selectedPower } : {}) })}>
              <Text style={styles.buttonText}>{pending ? 'Submitting…' : 'Request approval'}</Text>
            </Pressable>
          </View>
        ) : null}
        {changes?.items.map((change) => (
          <View key={change.id} style={styles.card}>
            <Text style={{ color: colors.text }}>{change.status} · {change.reason} · {change.requestedQuantity} units</Text>
            {change.decisionReason ? <Text style={{ color: colors.textMuted }}>Admin: {change.decisionReason}</Text> : null}
          </View>
        ))}
        {changes?.items.some((change) => change.status === 'APPROVED') ? (
          <Pressable onPress={() => router.push('/shop/catalog')}><Text style={{ color: colors.primary }}>Shop a new catalog order →</Text></Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, gap: 14 },
  title: { fontSize: 25, fontWeight: '800' },
  card: { borderWidth: 1, borderColor: '#aaa', borderRadius: 12, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  button: { borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
