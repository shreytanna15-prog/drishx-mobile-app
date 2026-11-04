'use client';

import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { OrderTrackingHorizontal } from '@/components/order-tracking-horizontal';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { appAlert } from '@/lib/app-alert';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { getBatchTrackingStatus } from '@/lib/order-detail-display';
import {
  formatOrderDateTime,
  getStatusPillStyle,
  type OrderListGroup,
} from '@/lib/order-list-display';
import {
  formatOrderStatusLabel,
  getStaffStatusOptions,
  MAIN_TRACKING_STEPS,
  normalizeOrderStatus,
  type OrderTrackingStatus,
} from '@/lib/order-tracking';
import { resolvePhotoOrderImageUrl } from '@/lib/photo-orders-api';

type EmployeePhotoOrderDetailProps = {
  group: OrderListGroup;
  onUpdateStatus: (orderId: string, status: OrderTrackingStatus) => Promise<void>;
  updatingOrderId: string | null;
};

export function EmployeePhotoOrderDetail({
  group,
  onUpdateStatus,
  updatingOrderId,
}: EmployeePhotoOrderDetailProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const order = group.orders[0];
  const pillStyle = getStatusPillStyle(group.status.variant);
  const rawImageUrl = group.photoUrl ?? order.orderImageUrl ?? null;
  const photoUri = rawImageUrl ? resolvePhotoOrderImageUrl(rawImageUrl) : null;
  const status = normalizeOrderStatus(order.status);
  const options = getStaffStatusOptions(status);
  const isUpdating = updatingOrderId === order.id;
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const trackingStatus = getBatchTrackingStatus(group.orders);

  const handleTrackingStepPress = useCallback(
    (step: OrderTrackingStatus) => {
      if (isUpdating || updatingTracking) return;

      const stepLabel = MAIN_TRACKING_STEPS.find((item) => item.key === step)?.label ?? step;
      appAlert('Update order tracking', `Set this order to "${stepLabel}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdatingTracking(true);
            try {
              await onUpdateStatus(order.id, step);
            } finally {
              setUpdatingTracking(false);
            }
          },
        },
      ]);
    },
    [isUpdating, onUpdateStatus, order.id, updatingTracking]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.heroCard}>
        <Text style={styles.orderId}>{group.displayOrderId}</Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: pillStyle.backgroundColor,
              borderColor: pillStyle.borderColor,
            },
          ]}>
          <Text style={[styles.statusPillText, { color: pillStyle.color }]}>{group.status.label}</Text>
        </View>
        <Text style={styles.companyName}>{group.companyName}</Text>
        {order.user?.email ? <Text style={styles.customerEmail}>{order.user.email}</Text> : null}
        <Text style={styles.dateTime}>{formatOrderDateTime(group.createdAt)}</Text>
        <Text style={styles.photoHint}>Product details are in the attached image below.</Text>
      </View>

      {photoUri && !photoLoadFailed ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          contentFit="contain"
          onError={() => setPhotoLoadFailed(true)}
        />
      ) : (
        <View style={styles.photoMissing}>
          <MaterialIcons name="image-not-supported" size={40} color={colors.textMuted} />
          <Text style={styles.photoMissingText}>
            {photoUri ? 'Could not load attached image' : 'Image unavailable'}
          </Text>
        </View>
      )}

      {options.length > 0 ? (
        <View style={styles.chipsRow}>
          {options.map((nextStatus) => (
            <Pressable
              key={nextStatus}
              style={[
                styles.statusChip,
                nextStatus === 'CANCELLED' ? styles.statusChipDanger : styles.statusChipPrimary,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={() => onUpdateStatus(order.id, nextStatus)}
              disabled={isUpdating}>
              <Text
                style={[
                  styles.statusChipText,
                  nextStatus === 'CANCELLED' ? styles.statusChipTextDanger : styles.statusChipTextPrimary,
                ]}>
                {formatOrderStatusLabel(nextStatus)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.trackingCard}>
        <OrderTrackingHorizontal
          status={trackingStatus}
          onStepPress={handleTrackingStepPress}
          disabled={updatingTracking || isUpdating}
        />
      </View>

      {isUpdating ? (
        <View style={styles.updatingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.updatingText}>Updating status...</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: { gap: 14 },
    heroCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 8,
    },
    orderId: { color: c.text, fontSize: 22, fontWeight: '800' },
    statusPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
    },
    statusPillText: { fontSize: 12, fontWeight: '700' },
    companyName: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
    customerEmail: { color: c.textMuted, fontSize: 13 },
    dateTime: { color: c.textMuted, fontSize: 13 },
    photoHint: { color: c.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
    photo: {
      width: '100%',
      height: 360,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    photoMissing: {
      height: 200,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    photoMissingText: { color: c.textMuted, fontSize: 14 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    statusChipPrimary: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
    },
    statusChipDanger: {
      borderColor: '#fca5a5',
      backgroundColor: '#450a0a',
    },
    statusChipText: { fontSize: 13, fontWeight: '700' },
    statusChipTextPrimary: { color: c.primary },
    statusChipTextDanger: { color: '#fda4af' },
    trackingCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
    },
    updatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    updatingText: { color: c.textMuted, fontSize: 13 },
    buttonDisabled: { opacity: 0.7 },
  });
