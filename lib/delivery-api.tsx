import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BACKEND_BASE_URL } from './api-config';
import { apiFetch } from './api-request';
import { useAuth } from './auth';
import { useBrandColors } from './theme-provider';

export type DeliveryServiceOption = {
  id: string;
  courierCompany: string;
  serviceName: string;
  serviceType: string;
  customerRate: number;
  etaText?: string | null;
};

export function useDeliveryServices() {
  const { getAuthHeaders } = useAuth();
  const [services, setServices] = useState<DeliveryServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch(`${BACKEND_BASE_URL}/api/delivery-services`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json().catch(() => []);
        if (!cancelled) setServices(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setServices([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { services, loading };
}

export function DeliveryServicePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const colors = useBrandColors();
  const { services, loading } = useDeliveryServices();

  if (loading) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.muted, { color: colors.textMuted }]}>Loading delivery options…</Text>
      </View>
    );
  }
  if (services.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>Delivery</Text>
      {services.map((s) => {
        const selected = value === s.id;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={[
              styles.card,
              { borderColor: colors.cardBorder, backgroundColor: colors.card },
              selected && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View style={styles.textWrap}>
              <Text style={[styles.name, { color: colors.text }]}>{s.serviceName}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                ₹{s.customerRate}/kg{s.etaText ? ` · ${s.etaText}` : ''}
              </Text>
            </View>
            <View style={[styles.radio, { borderColor: colors.textMuted }, selected && { borderColor: colors.primary }]}>
              {selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </View>
          </Pressable>
        );
      })}
      <Text style={[styles.muted, { color: colors.textMuted }]}>
        Delivery charge will be calculated after packing based on actual package weight.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 12 },
  title: { fontSize: 15, fontWeight: '800' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  textWrap: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  muted: { fontSize: 12 },
});
