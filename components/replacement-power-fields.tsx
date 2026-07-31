'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  PRESCRIPTION_PICKER_HEIGHT,
  PrescriptionWheelPicker,
} from '@/components/prescription-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatPowerLabel } from '@/lib/cart-utils';
import { fetchProductSiblings } from '@/lib/lenses-api';
import {
  resolveAddOptions,
  resolveSelectableRange,
} from '@/lib/prescription-range';
import { useBrandColors } from '@/lib/theme-provider';
import type { LensType, SelectableRange } from '@/lib/types/lens';

export type ReplacementPowerValue = {
  sph: number | null;
  cyl: number | null;
  add: number | null;
  axis: number | null;
};

export type ReturnOrderPowerParam = {
  id: string;
  quantity: number;
  eye?: string | null;
  label: string;
  lensType?: string | null;
  lensId?: string | null;
  sph?: number | null;
  cyl?: number | null;
  add?: number | null;
  axis?: number | null;
};

type Props = {
  order: ReturnOrderPowerParam;
  enabled: boolean;
  value: ReplacementPowerValue;
  onChange: (value: ReplacementPowerValue) => void;
};

function snapToOption(value: number | null, options: number[]): number | null {
  if (value === null || options.length === 0) return options[0] ?? null;
  const match = options.find((option) => Math.abs(option - value) < 0.001);
  if (match !== undefined) return match;
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best
  );
}

function toLensType(apiType?: string | null): LensType | null {
  if (apiType === 'SINGLE_VISION' || apiType === 'Single Vision') return 'Single Vision';
  if (apiType === 'KRYPTOK' || apiType === 'Kryptok') return 'Kryptok';
  if (apiType === 'PROGRESSIVE' || apiType === 'Progressive') return 'Progressive';
  return null;
}

function formatCurrentPower(order: ReturnOrderPowerParam): string {
  const parts = [
    order.sph != null ? `SPH ${formatPowerLabel(Number(order.sph))}` : null,
    order.cyl != null ? `CYL ${formatPowerLabel(Number(order.cyl))}` : null,
    order.add != null ? `ADD ${formatPowerLabel(Number(order.add))}` : null,
    order.axis != null ? `AXIS ${order.axis}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function ReplacementPowerFields({ order, enabled, value, onChange }: Props) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<SelectableRange | null>(null);
  const [supportsAdd, setSupportsAdd] = useState(false);

  const lensType = toLensType(order.lensType);
  const canSelect = Boolean(enabled && order.lensId && lensType);
  const currentLabel = useMemo(() => formatCurrentPower(order), [order]);
  const addOptions = useMemo(
    () => (supportsAdd ? resolveAddOptions() : []),
    [supportsAdd]
  );

  useEffect(() => {
    if (!canSelect || !order.lensId || !lensType) {
      setRange(null);
      setSupportsAdd(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const siblings = await fetchProductSiblings(order.lensId!, lensType);
        if (cancelled) return;
        const lens =
          siblings.find((item) => item.id === order.lensId) ?? siblings[0] ?? null;
        if (!lens) {
          setError('No power range found for this product.');
          setRange(null);
          return;
        }
        const selectable = resolveSelectableRange(lens);
        setRange(selectable);
        const showAdd = lensType !== 'Single Vision';
        setSupportsAdd(showAdd);
        onChange({
          sph: snapToOption(value.sph ?? order.sph ?? null, selectable.sph.options),
          cyl: selectable.cyl
            ? snapToOption(value.cyl ?? order.cyl ?? null, selectable.cyl.options)
            : null,
          add: showAdd
            ? snapToOption(value.add ?? order.add ?? null, resolveAddOptions())
            : null,
          axis: value.axis ?? order.axis ?? null,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load power range.');
          setRange(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelect, order.lensId, lensType, order.id]);

  if (!enabled) return null;

  if (!canSelect) {
    return (
      <View style={styles.box}>
        <Text style={styles.label}>Current power</Text>
        <Text style={styles.value}>{currentLabel}</Text>
        <Text style={styles.hint}>Power selection is available for catalog products only.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.box}>
        <Text style={styles.label}>Current power</Text>
        <Text style={styles.value}>{currentLabel}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.hint}>Loading available powers…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : range ? (
        <View style={styles.pickers}>
          <Text style={styles.label}>New SPH</Text>
          <View style={styles.pickerShell}>
            <PrescriptionWheelPicker
              options={range.sph.options}
              value={value.sph}
              onChange={(sph) => onChange({ ...value, sph })}
            />
          </View>

          {range.cyl ? (
            <>
              <Text style={styles.label}>New CYL</Text>
              <View style={styles.pickerShell}>
                <PrescriptionWheelPicker
                  options={range.cyl.options}
                  value={value.cyl}
                  onChange={(cyl) => onChange({ ...value, cyl })}
                />
              </View>
            </>
          ) : null}

          {supportsAdd ? (
            <>
              <Text style={styles.label}>New ADD</Text>
              <View style={styles.pickerShell}>
                <PrescriptionWheelPicker
                  options={addOptions}
                  value={value.add}
                  onChange={(add) => onChange({ ...value, add })}
                />
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    wrap: { gap: 10, marginTop: 4 },
    box: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      padding: 12,
      backgroundColor: c.card,
      gap: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    value: { fontSize: 14, fontWeight: '600', color: c.text },
    hint: { fontSize: 12, color: c.textMuted },
    error: { fontSize: 12, fontWeight: '600', color: c.danger },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pickers: { gap: 8 },
    pickerShell: {
      height: PRESCRIPTION_PICKER_HEIGHT,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.card,
    },
  });
