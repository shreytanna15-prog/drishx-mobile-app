'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import {
  ReplacementPowerFields,
  type ReplacementPowerValue,
  type ReturnOrderPowerParam,
} from '@/components/replacement-power-fields';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { appAlert } from '@/lib/app-alert';
import { useAuth } from '@/lib/auth';
import {
  createReturnRequest,
  RETURN_REASON_OPTIONS,
  type ReturnReason,
  type ReturnRequestType,
  uploadReturnRequestPhoto,
} from '@/lib/returns-api';
import { useBrandColors } from '@/lib/theme-provider';

type OrderParam = ReturnOrderPowerParam;

type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type ItemState = {
  selected: boolean;
  quantity: string;
  eye: string;
  reason: ReturnReason;
  itemRemarks: string;
  power: ReplacementPowerValue;
};

const MAX_BYTES = 10 * 1024 * 1024;

function parseOrders(raw: string | string[] | undefined): OrderParam[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as OrderParam;
        const id = String(row?.id ?? '').trim();
        const quantity = Number(row?.quantity ?? 1);
        if (!id) return null;
        return {
          id,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          eye: row?.eye ?? null,
          label: String(row?.label ?? id),
          lensType: row?.lensType ?? null,
          lensId: row?.lensId ?? null,
          sph: row?.sph != null ? Number(row.sph) : null,
          cyl: row?.cyl != null ? Number(row.cyl) : null,
          add: row?.add != null ? Number(row.add) : null,
          axis: row?.axis ?? null,
        } satisfies OrderParam;
      })
      .filter((item): item is OrderParam => Boolean(item));
  } catch {
    return [];
  }
}

export default function ReturnRequestScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders } = useAuth();
  const params = useLocalSearchParams<{ orders?: string; displayOrderId?: string }>();
  const orders = useMemo(() => parseOrders(params.orders), [params.orders]);

  const [requestType, setRequestType] = useState<ReturnRequestType>('RETURN');
  const [customerRemarks, setCustomerRemarks] = useState('');
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    setItemState(
      Object.fromEntries(
        orders.map((order) => [
          order.id,
          {
            selected: orders.length === 1,
            quantity: String(Math.max(1, Math.floor(order.quantity))),
            eye: order.eye ?? '',
            reason: 'WRONG_POWER' as ReturnReason,
            itemRemarks: '',
            power: {
              sph: order.sph ?? null,
              cyl: order.cyl ?? null,
              add: order.add ?? null,
              axis: order.axis ?? null,
            },
          },
        ])
      )
    );
  }, [orders]);

  const selectedCount = Object.values(itemState).filter((item) => item.selected).length;
  const isReplacement = requestType === 'REPLACEMENT';

  async function pickPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert('Permission needed', 'Photo access is required to attach return evidence.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });

    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      appAlert('File too large', 'Please choose an image that is 10 MB or smaller.');
      return;
    }
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setPhotos((current) => [
      ...current,
      {
        uri: asset.uri,
        mimeType,
        fileName: asset.fileName ?? `return-${Date.now()}.jpg`,
      },
    ]);
  }

  async function handleSubmit() {
    const items = orders
      .filter((order) => itemState[order.id]?.selected)
      .map((order) => {
        const state = itemState[order.id]!;
        return {
          orderId: order.id,
          quantity: Number(state.quantity),
          eye: state.eye.trim() || null,
          reason: state.reason,
          itemRemarks: state.itemRemarks.trim(),
          ...(isReplacement
            ? {
                requestedSph: state.power.sph,
                requestedCyl: state.power.cyl,
                requestedAxis: state.power.axis,
                requestedAdd: state.power.add,
              }
            : {}),
        };
      });

    if (items.length === 0) {
      appAlert('Select items', 'Choose at least one item to return or replace.');
      return;
    }

    if (isReplacement) {
      const catalogSelected = orders.some(
        (order) => itemState[order.id]?.selected && Boolean(order.lensId)
      );
      const missingPower = items.some(
        (item) => item.requestedSph === null || item.requestedSph === undefined
      );
      if (catalogSelected && missingPower) {
        appAlert('Select power', 'Choose a replacement power for each catalog product.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await createReturnRequest(
        {
          requestType,
          customerRemarks: customerRemarks.trim(),
          items,
        },
        getAuthHeaders()
      );

      for (const photo of photos) {
        await uploadReturnRequestPhoto(
          created.id,
          photo.uri,
          photo.mimeType,
          photo.fileName,
          getAuthHeaders()
        );
      }

      appAlert('Submitted', `Request ${created.requestNumber} was submitted for review.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      appAlert('Submit failed', err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Return / Replacement</Text>
          <View style={{ width: 22 }} />
        </View>

        {orders.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>No order items were provided.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>
              {params.displayOrderId
                ? `Request for ${params.displayOrderId}`
                : 'Select items and submit for approval'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Request type</Text>
              <View style={styles.chipRow}>
                {(['RETURN', 'REPLACEMENT'] as ReturnRequestType[]).map((type) => {
                  const active = requestType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setRequestType(type)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {type === 'RETURN' ? 'Return' : 'Replacement'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {orders.map((order) => {
              const state = itemState[order.id];
              if (!state) return null;
              return (
                <View key={order.id} style={styles.card}>
                  <Pressable
                    style={styles.itemHeader}
                    onPress={() =>
                      setItemState((current) => ({
                        ...current,
                        [order.id]: { ...current[order.id], selected: !current[order.id].selected },
                      }))
                    }>
                    <MaterialIcons
                      name={state.selected ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={state.selected ? colors.primary : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{order.label}</Text>
                      <Text style={styles.helper}>Ordered qty: {order.quantity}</Text>
                    </View>
                  </Pressable>

                  {state.selected ? (
                    <View style={styles.itemFields}>
                      <Text style={styles.label}>Quantity</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={state.quantity}
                        onChangeText={(value) =>
                          setItemState((current) => ({
                            ...current,
                            [order.id]: { ...current[order.id], quantity: value },
                          }))
                        }
                      />

                      <Text style={styles.label}>Eye</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="LEFT / RIGHT"
                        placeholderTextColor={colors.textMuted}
                        value={state.eye}
                        onChangeText={(value) =>
                          setItemState((current) => ({
                            ...current,
                            [order.id]: { ...current[order.id], eye: value },
                          }))
                        }
                      />

                      <Text style={styles.label}>Reason</Text>
                      <View style={styles.reasonWrap}>
                        {RETURN_REASON_OPTIONS.map((option) => {
                          const active = state.reason === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              style={[styles.reasonChip, active && styles.chipActive]}
                              onPress={() =>
                                setItemState((current) => ({
                                  ...current,
                                  [order.id]: { ...current[order.id], reason: option.value },
                                }))
                              }>
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <ReplacementPowerFields
                        order={order}
                        enabled={isReplacement}
                        value={state.power}
                        onChange={(power) =>
                          setItemState((current) => ({
                            ...current,
                            [order.id]: { ...current[order.id], power },
                          }))
                        }
                      />

                      <Text style={styles.label}>Item remarks</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        value={state.itemRemarks}
                        onChangeText={(value) =>
                          setItemState((current) => ({
                            ...current,
                            [order.id]: { ...current[order.id], itemRemarks: value },
                          }))
                        }
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={styles.card}>
              <Text style={styles.label}>Photos (optional)</Text>
              <View style={styles.chipRow}>
                <Pressable style={styles.secondaryBtn} onPress={() => void pickPhoto(true)}>
                  <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => void pickPhoto(false)}>
                  <MaterialIcons name="photo-library" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Gallery</Text>
                </Pressable>
              </View>
              {photos.length > 0 ? (
                <Text style={styles.helper}>
                  {photos.length} photo{photos.length === 1 ? '' : 's'} attached
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>General remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={customerRemarks}
                onChangeText={setCustomerRemarks}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Pressable
              style={[styles.primaryBtn, (submitting || selectedCount === 0) && styles.btnDisabled]}
              disabled={submitting || selectedCount === 0}
              onPress={() => void handleSubmit()}>
              {submitting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.primaryBtnText}>Submit request</Text>
              )}
            </Pressable>
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
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    subtitle: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 14,
      gap: 10,
    },
    label: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    chipText: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: c.primary },
    itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    itemTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
    helper: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    itemFields: { gap: 8, marginTop: 4 },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      backgroundColor: c.background,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reasonChip: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      maxWidth: '100%',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    secondaryBtnText: { color: c.primary, fontWeight: '700', fontSize: 13 },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryBtnText: { color: c.primaryText, fontWeight: '800', fontSize: 15 },
    btnDisabled: { opacity: 0.55 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: c.danger, textAlign: 'center' },
  });
