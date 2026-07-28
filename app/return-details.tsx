'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { appAlert } from '@/lib/app-alert';
import { useAuth } from '@/lib/auth';
import {
  fetchReturnRequest,
  formatReturnStatus,
  updateReturnRequest,
  type ReturnRequestRecord,
} from '@/lib/returns-api';
import { useBrandColors } from '@/lib/theme-provider';

export default function ReturnDetailsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders, isStaff } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const returnId = Array.isArray(id) ? id[0] : id;

  const [request, setRequest] = useState<ReturnRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!returnId) {
      setError('Missing return request id.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setRequest(await fetchReturnRequest(returnId, getAuthHeaders()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load return request.');
    } finally {
      setLoading(false);
    }
  }, [returnId, getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: 'more-info' | 'escalate' | 'reject') {
    if (!request) return;
    if (action === 'reject' && !remarks.trim()) {
      appAlert('Remarks required', 'Please add a rejection reason.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateReturnRequest(
        request.id,
        action,
        remarks.trim() || undefined,
        getAuthHeaders()
      );
      setRequest(updated);
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
    (request?.status === 'SUBMITTED' || request?.status === 'MORE_INFO_REQUIRED');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>{request?.requestNumber ?? 'Return details'}</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !request ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error || 'Return request not found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {request.customer?.businessName ||
                  request.customer?.name ||
                  request.customer?.email ||
                  'Customer'}
              </Text>
              <Text style={styles.meta}>
                {request.requestType} · {formatReturnStatus(request.status)}
              </Text>
              {request.customerRemarks ? (
                <Text style={styles.bodyText}>{request.customerRemarks}</Text>
              ) : null}
              {request.rejectionReason ? (
                <Text style={styles.errorText}>{request.rejectionReason}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items</Text>
              {request.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.lensLabel}</Text>
                  <Text style={styles.meta}>
                    Qty {item.quantity}
                    {item.eye ? ` · ${item.eye}` : ''} · {formatReturnStatus(item.reason)}
                  </Text>
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
                <Text style={styles.sectionTitle}>Employee actions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  placeholder="Remarks"
                  placeholderTextColor={colors.textMuted}
                  value={remarks}
                  editable={canAct && !submitting}
                  onChangeText={setRemarks}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, styles.primaryBtn, (!canAct || submitting) && styles.disabled]}
                    disabled={!canAct || submitting}
                    onPress={() => void runAction('more-info')}>
                    <Text style={styles.primaryBtnText}>Ask for more photos</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.secondaryBtn, (!canAct || submitting) && styles.disabled]}
                    disabled={!canAct || submitting}
                    onPress={() => void runAction('escalate')}>
                    <Text style={styles.secondaryBtnText}>Escalate to admin</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.dangerBtn, (!canAct || submitting) && styles.disabled]}
                    disabled={!canAct || submitting}
                    onPress={() => void runAction('reject')}>
                    <Text style={styles.dangerBtnText}>Reject</Text>
                  </Pressable>
                </View>
                {!canAct ? (
                  <Text style={styles.meta}>
                    This request is already {formatReturnStatus(request.status)}.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              {request.timelineEvents.map((event) => (
                <View key={event.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{event.message}</Text>
                  <Text style={styles.meta}>{formatReturnStatus(event.eventType)}</Text>
                </View>
              ))}
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
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: 14,
      gap: 10,
    },
    cardTitle: { color: c.text, fontSize: 17, fontWeight: '800' },
    sectionTitle: {
      color: c.primary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    meta: { color: c.textMuted, fontSize: 13 },
    bodyText: { color: c.text, fontSize: 14, lineHeight: 20 },
    itemCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 10,
      gap: 4,
    },
    itemTitle: { color: c.text, fontWeight: '700', fontSize: 14 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    image: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      backgroundColor: c.background,
    },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    actions: { gap: 8 },
    actionBtn: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtn: { backgroundColor: c.primary },
    primaryBtnText: { color: c.primaryText, fontWeight: '800' },
    secondaryBtn: { borderWidth: 1, borderColor: c.cardBorder },
    secondaryBtnText: { color: c.text, fontWeight: '700' },
    dangerBtn: { backgroundColor: `${c.danger}22`, borderWidth: 1, borderColor: c.danger },
    dangerBtnText: { color: c.danger, fontWeight: '800' },
    disabled: { opacity: 0.55 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: c.danger, textAlign: 'center' },
  });
