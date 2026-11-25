import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBrandColors } from '@/lib/theme-provider';
import { useGetCatalogPowers } from '@/lib/modules/catalog-stock/query/use-get-catalog-powers';
import { useGetCatalogDeliveryServices } from '@/lib/modules/catalog-stock/query/use-get-catalog-delivery-services';
import { usePlaceCatalogOrder } from '@/lib/modules/catalog-stock/mutation/use-place-catalog-order';
import { appAlert } from '@/lib/app-alert';

export default function CatalogStockShopScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [mode, setMode] = useState<'LIVE' | 'NON_LIVE'>('LIVE');
  const [deliveryId, setDeliveryId] = useState('');
  const { data, loading, refreshing, error, refetch } = useGetCatalogPowers({ q, page, limit: 20 });
  const { data: services, error: deliveryError } = useGetCatalogDeliveryServices();
  const { mutate, pending, error: orderError } = usePlaceCatalogOrder({
    onSuccess: () => router.push('/(tabs)/my-orders'),
    onError: (err) => appAlert('Order failed', err.message),
  });
  const selected = data?.items.find((item) => item.id === selectedId);
  const units = Number(quantity);
  const canOrder = selected && deliveryId && Number.isInteger(units) && units > 0 &&
    (mode !== 'LIVE' || units <= selected.available);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>← Shop</Text></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Catalog stock</Text>
        <Text style={{ color: colors.textMuted }}>Shop by exact variant and power. Live orders require available stock; non-live orders can procure a shortage.</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.primary }]} placeholder="Search SKU or name" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => { setPage(1); setSelectedId(''); setQ(search.trim()); }}><Text style={styles.buttonText}>Search</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {refreshing ? <Text style={{ color: colors.textMuted }}>Refreshing…</Text> : null}
        {error ? <Pressable onPress={() => void refetch()}><Text style={{ color: colors.text }}>Could not load stock. Tap to retry.</Text></Pressable> : null}
        {data?.items.map((item) => (
          <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.card, { borderColor: selectedId === item.id ? colors.primary : colors.textMuted }]}>
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            <Text style={{ color: colors.textMuted }}>{item.skuCode} · {item.family} · {item.base}</Text>
            <Text style={{ color: colors.text }}>SPH {item.sph.toFixed(2)} / CYL {item.cyl.toFixed(2)}{item.axis != null ? ` · Axis ${item.axis}` : ''}{item.addition != null ? ` · ADD ${item.addition}` : ''}{item.eye ? ` · ${item.eye}` : ''}</Text>
            <Text style={{ color: colors.text }}>₹{item.price.toFixed(2)} per pair · {item.available} available</Text>
          </Pressable>
        ))}
        {data?.items.length === 0 ? <Text style={{ color: colors.text }}>No catalog stock leaves found.</Text> : null}
        <View style={styles.row}>
          <Pressable disabled={page <= 1} onPress={() => { setPage((value) => value - 1); setSelectedId(''); }}><Text style={{ color: colors.primary }}>Previous</Text></Pressable>
          <Text style={{ color: colors.text }}>Page {page}</Text>
          <Pressable disabled={!data?.hasMore} onPress={() => { setPage((value) => value + 1); setSelectedId(''); }}><Text style={{ color: colors.primary }}>Next</Text></Pressable>
        </View>
        {selected ? (
          <View style={[styles.card, { borderColor: colors.primary }]}>
            <Text style={[styles.name, { color: colors.text }]}>Order {selected.skuCode}</Text>
            <View style={styles.row}>
              <Pressable onPress={() => setMode('LIVE')}><Text style={{ color: colors.primary }}>{mode === 'LIVE' ? '●' : '○'} Live</Text></Pressable>
              <Pressable onPress={() => setMode('NON_LIVE')}><Text style={{ color: colors.primary }}>{mode === 'NON_LIVE' ? '●' : '○'} Non-live</Text></Pressable>
            </View>
            <Text style={{ color: colors.text }}>Quantity</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.primary }]} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
            <Text style={{ color: colors.text }}>Delivery service</Text>
            {deliveryError ? <Text style={{ color: colors.text }}>Could not load delivery services.</Text> : null}
            {services?.filter((service) => service.isActive !== false).map((service) => (
              <Pressable key={service.id} onPress={() => setDeliveryId(service.id)} style={styles.service}>
                <Text style={{ color: colors.text }}>{deliveryId === service.id ? '●' : '○'} {service.courierCompany} · {service.serviceName}</Text>
              </Pressable>
            ))}
            {orderError ? <Text style={{ color: colors.text }}>{orderError.message}</Text> : null}
            <Pressable disabled={!canOrder || pending} style={[styles.button, { backgroundColor: colors.primary, opacity: canOrder && !pending ? 1 : 0.5 }]} onPress={() => void mutate({ lensProductPowerId: selected.id, quantity: units, stockMode: mode, deliveryServiceId: deliveryId })}>
              <Text style={styles.buttonText}>{pending ? 'Placing…' : 'Place order'}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, gap: 14, paddingBottom: 80 },
  title: { fontSize: 28, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, flex: 1 },
  button: { borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  name: { fontSize: 16, fontWeight: '700' }, service: { paddingVertical: 6 },
});
