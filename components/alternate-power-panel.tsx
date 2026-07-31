'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  acceptAlternateSuggestion,
  fetchAlternateSuggestions,
  fetchPowerVersions,
  formatAlternatePowerLabel,
  markOrderPowerNotAvailable,
  rejectAllAlternateSuggestions,
  rejectAlternateSuggestion,
} from '@/lib/alternate-power-api';
import type {
  AlternatePowerSuggestion,
  OrderPowerVersion,
  OrderRecord,
} from '@/lib/orders-api';

type Mode = 'customer' | 'staff';

type AlternatePowerPanelProps = {
  order: OrderRecord;
  mode: Mode;
  getAuthHeaders: () => Record<string, string>;
  onChanged?: () => void;
};

function availabilityLabel(s: AlternatePowerSuggestion) {
  if (s.availability === 'WAREHOUSE') return 'Warehouse · Available';
  if (s.availability === 'OUT_OF_STOCK') return 'Not in stock';
  return `Supplier${s.etaDays != null ? ` · ${s.etaDays} day(s)` : ''}`;
}

function formatPowerDelta(
  suggestion: { sph: number; cyl: number | null },
  reference: { sph: number | null; cyl: number | null } | null
): string | null {
  if (!reference || reference.sph == null) return null;
  const dSph = Math.abs(Number(suggestion.sph) - Number(reference.sph));
  const dCyl = Math.abs((suggestion.cyl ?? 0) - (reference.cyl ?? 0));
  return `ΔSPH ${dSph.toFixed(2)} · ΔCYL ${dCyl.toFixed(2)}`;
}

export function AlternatePowerPanel({
  order,
  mode,
  getAuthHeaders,
  onChanged,
}: AlternatePowerPanelProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useBrandColors();
  const isRetail = (order.lineType ?? 'RETAIL') === 'RETAIL';
  const [suggestions, setSuggestions] = useState<AlternatePowerSuggestion[]>(
    order.alternateSuggestions?.filter((s) => s.status === 'PENDING') ?? []
  );
  const [versions, setVersions] = useState<OrderPowerVersion[]>(
    order.powerVersions ?? []
  );
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const referencePower = useMemo(() => {
    const na = [...versions]
      .reverse()
      .find((v) => v.status === 'POWER_NOT_AVAILABLE');
    const latest = versions[versions.length - 1];
    const ref = na ?? latest;
    if (ref) return { sph: ref.sph, cyl: ref.cyl };
    return {
      sph: order.sph != null ? Number(order.sph) : null,
      cyl: order.cyl != null ? Number(order.cyl) : null,
    };
  }, [versions, order.sph, order.cyl]);

  const reload = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [nextSuggestions, nextVersions] = await Promise.all([
        fetchAlternateSuggestions(order.id, headers, true),
        fetchPowerVersions(order.id, headers),
      ]);
      setSuggestions(nextSuggestions);
      setVersions(nextVersions);
    } catch {
      // keep existing
    }
  }, [getAuthHeaders, order.id]);

  useEffect(() => {
    if (!isRetail) return;
    void reload();
  }, [isRetail, reload]);

  if (!isRetail) return null;

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      await action();
      await reload();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy('');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Alternate power</Text>
      <Text style={styles.subtitle}>
        Original ordered power is never overwritten. Accepted alternates create a
        new version and restart fulfilment.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {versions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Power history</Text>
          {versions.map((v) => (
            <View key={v.id} style={styles.row}>
              <Text style={styles.rowTitle}>
                V{v.versionNumber}: {formatAlternatePowerLabel(v.sph, v.cyl)}
              </Text>
              <Text style={styles.rowMeta}>
                {v.source} · {v.status}
                {v.isFinalFulfilled ? ' · Final' : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {mode === 'staff' && order.status === 'AWAITING_PROCUREMENT' ? (
        <Pressable
          style={[styles.button, styles.outlineButton]}
          disabled={busy === 'na'}
          onPress={() =>
            void runAction('na', async () => {
              const result = await markOrderPowerNotAvailable(
                order.id,
                getAuthHeaders(),
                { notes: 'Marked not available from supplier' }
              );
              setSuggestions(result.suggestions);
              setMessage(
                result.suggestions.length
                  ? `${result.suggestions.length} alternate(s) sent to customer for Accept/Reject.`
                  : 'Marked not available. No other powers exist for this product family to suggest.'
              );
            })
          }
        >
          {busy === 'na' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.outlineButtonText}>Mark power not available</Text>
          )}
        </Pressable>
      ) : null}

      {mode === 'customer' &&
      suggestions.length === 0 &&
      versions.some((v) => v.status === 'POWER_NOT_AVAILABLE') ? (
        <Text style={styles.subtitle}>
          Ordered power is not available. No alternate powers are ready yet —
          our team will follow up.
        </Text>
      ) : null}

      {mode === 'staff' &&
      suggestions.length === 0 &&
      versions.some((v) => v.status === 'POWER_NOT_AVAILABLE') ? (
        <Text style={styles.subtitle}>
          No alternate powers were generated for this product family. Add stock
          with nearby powers, or provide a supplier lens id from admin.
        </Text>
      ) : null}

      {suggestions.length > 0 && mode === 'customer' ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose an alternate power</Text>
          {suggestions.map((s) => {
            const delta = formatPowerDelta(s, referencePower);
            return (
              <View key={s.id} style={styles.suggestionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {formatAlternatePowerLabel(s.sph, s.cyl)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {availabilityLabel(s)}
                    {delta ? ` · ${delta}` : ''}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    disabled={Boolean(busy)}
                    onPress={() =>
                      void runAction(`accept-${s.id}`, async () => {
                        await acceptAlternateSuggestion(
                          order.id,
                          s.id,
                          getAuthHeaders()
                        );
                        setMessage(
                          'Alternate accepted. Fulfilment will continue.'
                        );
                      })
                    }
                  >
                    <Text style={styles.primaryButtonText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.outlineButton]}
                    disabled={Boolean(busy)}
                    onPress={() =>
                      void runAction(`reject-${s.id}`, async () => {
                        await rejectAlternateSuggestion(
                          order.id,
                          s.id,
                          getAuthHeaders()
                        );
                        setMessage('Suggestion rejected.');
                      })
                    }
                  >
                    <Text style={styles.outlineButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Pressable
            style={styles.ghostButton}
            disabled={Boolean(busy)}
            onPress={() =>
              void runAction('reject-all', async () => {
                await rejectAllAlternateSuggestions(order.id, getAuthHeaders());
                setMessage('All alternates rejected. Our team will follow up.');
              })
            }
          >
            <Text style={styles.ghostButtonText}>Reject all</Text>
          </Pressable>
        </View>
      ) : null}

      {suggestions.length > 0 && mode === 'staff' ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sent to customer for approval</Text>
          {suggestions.map((s) => {
            const delta = formatPowerDelta(s, referencePower);
            return (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowTitle}>
                  {formatAlternatePowerLabel(s.sph, s.cyl)}
                </Text>
                <Text style={styles.rowMeta}>
                  {availabilityLabel(s)}
                  {delta ? ` · ${delta}` : ''} · Waiting for customer
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: BrandColorScheme) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      padding: 16,
      gap: 12,
    },
    title: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    error: {
      fontSize: 13,
      color: '#b91c1c',
    },
    success: {
      fontSize: 13,
      color: '#15803d',
    },
    section: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    row: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    suggestionRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      gap: 10,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    rowMeta: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.primaryText ?? '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    outlineButton: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: 'transparent',
    },
    outlineButtonText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    ghostButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    ghostButtonText: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
