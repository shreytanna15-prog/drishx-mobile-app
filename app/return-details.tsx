'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { appAlert } from '@/lib/app-alert';
import { useAuth } from '@/lib/auth';
import { useGetReturnRequest } from '@/lib/modules/returns/query/use-get-return-request';
import {
  formatReturnPowerLine,
  formatReturnStatus,
  updateReturnRequest,
  type ReturnRequestRecord,
  type ReturnRequestStatus,
} from '@/lib/returns-api';
import { useBrandColors } from '@/lib/theme-provider';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTone(status: ReturnRequestStatus, colors: BrandColorScheme) {
  switch (status) {
    case 'SUBMITTED':
    case 'ESCALATED_TO_ADMIN':
      return { border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(245, 158, 11, 0.16)', text: '#FBBF24' };
    case 'MORE_INFO_REQUIRED':
      return { border: 'rgba(56, 189, 248, 0.4)', bg: 'rgba(14, 165, 233, 0.16)', text: '#7DD3FC' };
    case 'AWAITING_MATERIAL':
    case 'APPROVED_REPLACEMENT':
    case 'APPROVED_CREDIT':
      return { border: 'rgba(52, 211, 153, 0.4)', bg: 'rgba(16, 185, 129, 0.16)', text: colors.success };
    case 'REJECTED':
      return { border: 'rgba(248, 113, 113, 0.45)', bg: 'rgba(239, 68, 68, 0.14)', text: colors.danger };
    default:
      return { border: colors.cardBorder, bg: colors.card, text: colors.textMuted };
  }
}

export default function ReturnDetailsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders, isStaff } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const returnId = Array.isArray(id) ? id[0] : id;

  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Local overlay for staff mutation response — avoids refetch while keeping UI in sync.
  const [mutatedRequest, setMutatedRequest] = useState<ReturnRequestRecord | null>(
    null,
  );

  const {
    data,
    loading,
    error,
  } = useGetReturnRequest(returnId, { enabled: Boolean(returnId) });

  const missingId = !returnId;
  const baseRequest = data?.id === returnId ? data : undefined;
  const request =
    mutatedRequest?.id === returnId ? mutatedRequest : baseRequest;
  const showLoading =
    Boolean(returnId) && (loading || (!request && !error && !missingId));

  async function runAction(action: 'more-info') {
    if (!request) return;
    setSubmitting(true);
    try {
      const updated = await updateReturnRequest(
        request.id,
        action,
        remarks.trim() || undefined,
        getAuthHeaders()
      );
      setMutatedRequest(updated);
      setRemarks('');
      appAlert('Updated', `Request marked as ${formatReturnStatus(updated.status)}.`);
    } catch (err) {
      appAlert('Update failed', err instanceof Error ? err.message : 'Failed to update request.');
    } finally {
      setSubmitting(false);
    }
  }

  const canAct =
    isStaff &&
    (request?.status === 'APPROVED_CREDIT' ||
      request?.status === 'AWAITING_MATERIAL' ||
      request?.status === 'APPROVED_REPLACEMENT' ||
      request?.status === 'MORE_INFO_REQUIRED');

  const tone = request ? statusTone(request.status, colors) : null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {request?.requestNumber ?? 'Return details'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isStaff ? 'Assigned request details' : 'Status and history'}
            </Text>
          </View>
          <View style={styles.headerBtnPlaceholder} />
        </View>

        {missingId ? (
          <View style={styles.centered}>
            <MaterialIcons name="error-outline" size={36} color={colors.danger} />
            <Text style={styles.errorText}>Missing return request id.</Text>
          </View>
        ) : showLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !request ? (
          <View style={styles.centered}>
            <MaterialIcons name="error-outline" size={36} color={colors.danger} />
            <Text style={styles.errorText}>
              {error?.message || 'Return request not found.'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.typeEyebrow}>
                    {request.requestType === 'REPLACEMENT' ? 'Replacement' : 'Return'}
                  </Text>
                  <Text style={styles.summaryStatus}>{formatReturnStatus(request.status)}</Text>
                  <Text style={styles.meta}>Submitted {formatDate(request.createdAt)}</Text>
                </View>
                {tone ? (
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: tone.border, backgroundColor: tone.bg },
                    ]}>
                    <Text style={[styles.statusBadgeText, { color: tone.text }]}>
                      {formatReturnStatus(request.status)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {isStaff ? (
                <View style={styles.rowMeta}>
                  <MaterialIcons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.rowMetaText}>
                    {request.customer?.businessName ||
                      request.customer?.name ||
                      request.customer?.email ||
                      'Customer'}
                  </Text>
                </View>
              ) : null}

              {request.customerRemarks ? (
                <Text style={styles.bodyText}>
                  <Text style={styles.labelInline}>Your remarks: </Text>
                  {request.customerRemarks}
                </Text>
              ) : null}
              {request.adminRemarks ? (
                <Text style={styles.bodyText}>
                  <Text style={styles.labelInline}>Admin notes: </Text>
                  {request.adminRemarks}
                </Text>
              ) : null}
              {request.employeeRemarks ? (
                <Text style={styles.bodyText}>
                  <Text style={styles.labelInline}>Staff notes: </Text>
                  {request.employeeRemarks}
                </Text>
              ) : null}
              {request.rejectionReason ? (
                <Text style={styles.rejectText}>{request.rejectionReason}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items</Text>
              {request.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{item.lensLabel}</Text>
                    <Text style={styles.meta}>Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {formatReturnStatus(item.reason)}
                    {item.eye ? ` · ${item.eye}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    Original:{' '}
                    {formatReturnPowerLine({
                      sph: item.originalSph,
                      cyl: item.originalCyl,
                      add: item.originalAdd,
                      axis: item.originalAxis,
                    })}
                  </Text>
                  {item.requestedSph != null || item.requestedCyl != null ? (
                    <Text style={styles.bodyText}>
                      Requested:{' '}
                      {formatReturnPowerLine({
                        sph: item.requestedSph,
                        cyl: item.requestedCyl,
                        add: item.requestedAdd,
                        axis: item.requestedAxis,
                      })}
                    </Text>
                  ) : null}
                  {item.itemRemarks ? (
                    <Text style={styles.bodyText}>{item.itemRemarks}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            {request.images.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <View style={styles.imageGrid}>
                  {request.images.map((image) => (
                    <Image
                      key={image.id}
                      source={{ uri: image.imageUrl }}
                      style={styles.image}
                      contentFit="contain"
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {isStaff ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Request more info</Text>
                <Text style={styles.meta}>
                  Ask the customer for additional photos or details if needed.
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  placeholder="Remarks for customer"
                  placeholderTextColor={colors.placeholder}
                  value={remarks}
                  editable={canAct && !submitting}
                  onChangeText={setRemarks}
                />
                <Pressable
                  style={[
                    styles.actionBtn,
                    styles.primaryBtn,
                    (!canAct || submitting) && styles.disabled,
                  ]}
                  disabled={!canAct || submitting}
                  onPress={() => void runAction('more-info')}>
                  {submitting ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Ask for more photos</Text>
                  )}
                </Pressable>
                {!canAct ? (
                  <Text style={styles.meta}>
                    This request is {formatReturnStatus(request.status)}.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              {request.timelineEvents.length === 0 ? (
                <Text style={styles.meta}>No events yet.</Text>
              ) : (
                request.timelineEvents.map((event) => (
                  <View key={event.id} style={styles.itemCard}>
                    <View style={styles.timelineTop}>
                      <Text style={styles.itemTitle}>{event.message}</Text>
                      <Text style={styles.dateSm}>{formatDate(event.createdAt)}</Text>
                    </View>
                    <Text style={styles.meta}>{formatReturnStatus(event.eventType)}</Text>
                  </View>
                ))
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
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    headerBtnPlaceholder: { width: 36, height: 36 },
    headerCenter: { flex: 1, minWidth: 0 },
    headerTitle: { color: c.text, fontSize: 17, fontWeight: '800' },
    headerSubtitle: { color: c.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 16,
      gap: 10,
    },
    summaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    summaryLeft: { flex: 1, minWidth: 0, gap: 4 },
    typeEyebrow: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    summaryStatus: { color: c.text, fontSize: 18, fontWeight: '800' },
    sectionTitle: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    meta: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
    labelInline: { color: c.textMuted, fontWeight: '700' },
    bodyText: { color: c.text, fontSize: 14, lineHeight: 20 },
    statusBadge: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: 130,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowMetaText: { flex: 1, color: c.text, fontSize: 14, fontWeight: '700' },
    itemCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 4,
      backgroundColor: c.background,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    itemTitle: { flex: 1, color: c.text, fontWeight: '700', fontSize: 14 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    image: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    actionBtn: {
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryBtn: { backgroundColor: c.primary },
    primaryBtnText: { color: c.primaryText, fontWeight: '800' },
    disabled: { opacity: 0.55 },
    rejectText: { color: c.danger, fontSize: 13, fontWeight: '600' },
    timelineTop: { gap: 4 },
    dateSm: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 10,
    },
    errorText: { color: c.danger, textAlign: 'center', fontWeight: '600' },
  });
