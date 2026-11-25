'use client';

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBrandColors } from '@/lib/theme-provider';
import { useGetCatalogPowers } from '@/lib/modules/catalog-stock/query/use-get-catalog-powers';
import { useGetCatalogDeliveryServices } from '@/lib/modules/catalog-stock/query/use-get-catalog-delivery-services';
import { usePlaceCatalogOrder } from '@/lib/modules/catalog-stock/mutation/use-place-catalog-order';
import { getOnBehalfCustomOrderContext } from '@/lib/on-behalf-custom-order';
import { appAlert } from '@/lib/app-alert';

export default function OnBehalfCatalogScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const [context, setContext] = useState(() => getOnBehalfCustomOrderContext());
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [mode, setMode] = useState<'LIVE' | 'NON_LIVE'>('LIVE');
  const [deliveryId, setDeliveryId] = useState('');
  const { data, loading, error, refetch } = useGetCatalogPowers({ q, page, limit: 20 });
  const { data: services } = useGetCatalogDeliveryServices();
  const { mutate, pending, error: orderError } = usePlaceCatalogOrder({
    onSuccess: () => {
      appAlert('Order placed', 'Catalog stock order created on behalf of customer.');
      router.replace((context?.returnTo || '/employee-order-on-behalf') as never);
    },
  });

  useEffect(() => {
    setContext(getOnBehalfCustomOrderContext());
  }, []);

  if (!context?.userId) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Select a customer on Order on behalf first.</Text>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>Go back</Text></Pressable>
      </View>
    );
  }

  const selected = data?.items.find((item) => item.id === selectedId);
  const units = Number(quantity);
  const canOrder = Boolean(selected && deliveryId && Number.isInteger(units) && units > 0 &&
    (mode !== 'LIVE' || units <= selected.available));

  return (
    <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Catalog stock (on behalf)</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>For {context.customerLabel}</Text>
      <View style={styles.row}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search SKU or name" placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.card }]} />
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => { setPage(1); setQ(search.trim()); setSelectedId(''); }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Search</Text>
        </Pressable>
      </View>
      {loading ? <Text style={{ color: colors.text }}>Loading…</Text> : null}
      {error ? <Pressable onPress={() => void refetch()}><Text style={{ color: colors.danger }}>{error.message} · Retry</Text></Pressable> : null}
      {data?.items.map((item) => (
        <Pressable key={item.id} onPress={() => setSelectedId(item.id)}
          style={[styles.card, { borderColor: selectedId === item.id ? colors.primary : colors.cardBorder, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
          <Text style={{ color: colors.textMuted }}>{item.skuCode} · SPH {item.sph.toFixed(2)} / CYL {item.cyl.toFixed(2)}</Text>
          <Text style={{ color: colors.text }}>₹{item.price.toFixed(2)} · {item.available} available</Text>
        </Pressable>
      ))}
      <View style={styles.row}>
        <Pressable disabled={page <= 1} onPress={() => { setPage((p) => p - 1); setSelectedId(''); }}><Text style={{ color: colors.primary }}>Previous</Text></Pressable>
        <Text style={{ color: colors.text }}>Page {page}</Text>
        <Pressable disabled={!data?.hasMore} onPress={() => { setPage((p) => p + 1); setSelectedId(''); }}><Text style={{ color: colors.primary }}>Next</Text></Pressable>
      </View>
      {selected ? (
        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card, gap: 10 }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Order {selected.skuCode}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setMode('LIVE')} style={[styles.chip, mode === 'LIVE' && { backgroundColor: colors.primary }]}>
              <Text style={{ color: mode === 'LIVE' ? '#fff' : colors.text }}>LIVE</Text>
            </Pressable>
            <Pressable onPress={() => setMode('NON_LIVE')} style={[styles.chip, mode === 'NON_LIVE' && { backgroundColor: colors.primary }]}>
              <Text style={{ color: mode === 'NON_LIVE' ? '#fff' : colors.text }}>NON_LIVE</Text>
            </Pressable>
          </View>
          <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad"
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background, flex: 1 }]} />
          {(services ?? []).filter((s) => s.isActive !== false).map((service) => (
            <Pressable key={service.id} onPress={() => setDeliveryId(service.id)}
              style={[styles.chip, deliveryId === service.id && { backgroundColor: colors.primary }]}>
              <Text style={{ color: deliveryId === service.id ? '#fff' : colors.text }}>{service.courierCompany} · {service.serviceName}</Text>
            </Pressable>
          ))}
          {orderError ? <Text style={{ color: colors.danger }}>{orderError.message}</Text> : null}
          <Pressable disabled={!canOrder || pending}
            style={[styles.button, { backgroundColor: colors.primary, opacity: canOrder && !pending ? 1 : 0.5 }]}
            onPress={() => void mutate({
              lensProductPowerId: selected.id, quantity: units, stockMode: mode, deliveryServiceId: deliveryId, userId: context.userId,
            })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{pending ? 'Placing…' : 'Place on-behalf order'}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  button: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd' },
});
