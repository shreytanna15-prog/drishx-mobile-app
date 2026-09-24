import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appAlert } from '@/lib/app-alert';
import { useDeliveryServices } from '@/lib/delivery-api';
import { dispatchOrder, updateOrderStatus, type OrderRecord } from '@/lib/orders-api';
import type { OrderTrackingStatus } from '@/lib/order-tracking';
import { useBrandColors } from '@/lib/theme-provider';

type Props = {
  order: OrderRecord;
  getAuthHeaders: () => Record<string, string>;
  onDone: () => void;
};

function formatDispatchDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** True while courier handover is blocked by the daily dispatch cutoff. */
function isHeldAfterCutoff(order: OrderRecord): boolean {
  if (order.dispatchOverridden) return false;
  if (!order.cutoffDeferred || !order.dispatchDate) return false;
  const dispatchDate = new Date(order.dispatchDate);
  if (Number.isNaN(dispatchDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dispatchDate.getTime() > today.getTime();
}

export function StaffDeliveryPackCard({ order, getAuthHeaders, onDone }: Props) {
  const colors = useBrandColors();
  const { services } = useDeliveryServices();
  const [serviceId, setServiceId] = useState(order.deliveryServiceId ?? '');
  const [weight, setWeight] = useState(
    order.delivery?.actualWeight != null ? String(order.delivery.actualWeight) : ''
  );
  const [reason, setReason] = useState('');
  const [courierName, setCourierName] = useState(order.courierName ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setServiceId(order.deliveryServiceId ?? '');
    setWeight(order.delivery?.actualWeight != null ? String(order.delivery.actualWeight) : '');
    setReason('');
    setCourierName(order.courierName ?? '');
    setTrackingNumber(order.trackingNumber ?? '');
  }, [order]);

  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return null;

  const heldAfterCutoff = isHeldAfterCutoff(order);

  async function handlePack() {
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      appAlert('Invalid weight', 'Enter the packed weight (kg) greater than 0.');
      return;
    }
    setBusy(true);
    try {
      // Status machine requires PENDING → PICKING → PACKED. Walk through
      // PICKING automatically so staff can pack in one tap.
      if (order.status !== 'PICKING' && order.status !== 'PACKED') {
        await updateOrderStatus(order.id, 'PICKING' as OrderTrackingStatus, getAuthHeaders(), order.pickedQuantity ?? 0);
      }
      await updateOrderStatus(order.id, 'PACKED' as OrderTrackingStatus, getAuthHeaders(), order.pickedQuantity ?? 0, {
        deliveryServiceId: serviceId || undefined,
        actualWeight: w,
      });
      onDone();
    } catch (err) {
      appAlert('Failed', err instanceof Error ? err.message : 'Could not mark packed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCorrect() {
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      appAlert('Invalid weight', 'Enter the packed weight (kg) greater than 0.');
      return;
    }
    if (!reason.trim()) {
      appAlert('Reason required', 'A reason is required to change the packed weight.');
      return;
    }
    setBusy(true);
    try {
      await updateOrderStatus(order.id, order.status as OrderTrackingStatus, getAuthHeaders(), order.pickedQuantity ?? 0, {
        deliveryServiceId: serviceId || undefined,
        actualWeight: w,
        weightReason: reason.trim(),
      });
      onDone();
    } catch (err) {
      appAlert('Failed', err instanceof Error ? err.message : 'Could not correct weight.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDispatch() {
    if (heldAfterCutoff) {
      appAlert(
        'Held after cutoff',
        order.dispatchDate
          ? `Courier handover is blocked until ${formatDispatchDay(order.dispatchDate)}. An admin can move this order forward.`
          : 'Courier handover is blocked until the cutoff day arrives or an admin moves this order forward.'
      );
      return;
    }
    if (!courierName.trim() || !trackingNumber.trim()) {
      appAlert('Details required', 'Enter both courier name and tracking number to dispatch.');
      return;
    }
    setBusy(true);
    try {
      const res = await dispatchOrder(order.id, courierName.trim(), trackingNumber.trim(), getAuthHeaders());
      if (res.duplicateWarning) {
        appAlert('Already dispatched', res.duplicateWarning);
      }
      onDone();
    } catch (err) {
      appAlert('Failed', err instanceof Error ? err.message : 'Could not dispatch order.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Delivery — pack &amp; weigh</Text>
      {order.cutoffDeferred ? (
        <View
          style={[
            styles.cutoffBanner,
            { borderColor: order.dispatchOverridden ? colors.cardBorder : colors.danger },
          ]}>
          <Text
            style={[
              styles.cutoffBannerTitle,
              { color: order.dispatchOverridden ? colors.text : colors.danger },
            ]}>
            {order.dispatchOverridden
              ? 'Dispatch moved forward by admin · cutoff lifted'
              : heldAfterCutoff
                ? `Held after daily dispatch cutoff${order.dispatchDate ? ` — expected dispatch ${formatDispatchDay(order.dispatchDate)}` : ''}`
                : order.dispatchDate
                  ? `Placed after cutoff · expected dispatch ${formatDispatchDay(order.dispatchDate)}`
                  : 'Placed after the daily dispatch cutoff'}
          </Text>
          {heldAfterCutoff ? (
            <Text style={[styles.cutoffBannerText, { color: colors.textMuted }]}>
              Courier handover is blocked until the cutoff day arrives or an admin moves this order forward.
            </Text>
          ) : null}
        </View>
      ) : null}
      {order.delivery ? (
        <Text style={[styles.meta, { color: colors.text }]}>
          {String(order.delivery.actualWeight)} kg → {String(order.delivery.chargeableWeight)} kg
          chargeable · ₹{Number(order.delivery.customerCharge).toLocaleString('en-IN')}
        </Text>
      ) : (
        <Text style={[styles.muted, { color: colors.textMuted }]}>Charge is calculated after packing from actual weight.</Text>
      )}
      {order.status !== 'PACKED' ? (
        <View style={styles.gap}>
          <View style={styles.options}>
            <Pressable
              style={[styles.opt, { borderColor: colors.cardBorder }, !serviceId && { borderColor: colors.primary, borderWidth: 2 }]}
              onPress={() => setServiceId('')}>
              <Text style={[styles.optText, { color: colors.text }]}>No service</Text>
            </Pressable>
            {services.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.opt, { borderColor: colors.cardBorder }, serviceId === s.id && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setServiceId(s.id)}>
                <Text style={[styles.optText, { color: colors.text }]}>
                  {s.serviceName} · ₹{s.customerRate}/kg
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
            keyboardType="decimal-pad"
            placeholder="Packed weight (kg), e.g. 2.40"
            placeholderTextColor={colors.textMuted}
            value={weight}
            onChangeText={setWeight}
          />
          <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => void handlePack()} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Mark packed with weight</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.gap}>
          <TextInput
            style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
            keyboardType="decimal-pad"
            placeholder="Corrected weight (kg)"
            placeholderTextColor={colors.textMuted}
            value={weight}
            onChangeText={setWeight}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
            placeholder="Reason for change (required)"
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={setReason}
          />
          <Pressable style={[styles.secondary, { borderColor: colors.primary }]} onPress={() => void handleCorrect()} disabled={busy}>
            {busy ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Correct weight</Text>
            )}
          </Pressable>
          <View style={[styles.dispatchBox, { borderTopColor: colors.cardBorder }]}>
            <Text style={[styles.dispatchTitle, { color: colors.text }]}>Dispatch — handover to courier</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.cardBorder, color: colors.text },
                heldAfterCutoff && { opacity: 0.55 },
              ]}
              placeholder="Courier, e.g. Sri Raj Courier"
              placeholderTextColor={colors.textMuted}
              value={courierName}
              onChangeText={setCourierName}
              autoCapitalize="words"
              editable={!heldAfterCutoff}
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.cardBorder, color: colors.text },
                heldAfterCutoff && { opacity: 0.55 },
              ]}
              placeholder="Tracking / AWB number"
              placeholderTextColor={colors.textMuted}
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!heldAfterCutoff}
            />
            <Pressable
              style={[
                styles.primary,
                { backgroundColor: colors.primary },
                (busy || heldAfterCutoff) && { opacity: 0.55 },
              ]}
              onPress={() => void handleDispatch()}
              disabled={busy || heldAfterCutoff}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {heldAfterCutoff ? 'Held until dispatch day' : 'Dispatch order'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '800' },
  cutoffBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cutoffBannerTitle: { fontSize: 13, fontWeight: '800' },
  cutoffBannerText: { fontSize: 12, lineHeight: 17 },
  meta: { fontSize: 13, fontWeight: '600' },
  muted: { fontSize: 12 },
  gap: { gap: 8 },
  options: { gap: 6 },
  opt: { borderWidth: 1, borderRadius: 10, padding: 10 },
  optText: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '800' },
  dispatchBox: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 8,
  },
  dispatchTitle: { fontSize: 13, fontWeight: '800' },
});
