'use client';

import { StyleSheet, Text, View } from 'react-native';

import { PrescriptionWheelPicker } from '@/components/prescription-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { WHOLESALE_STEP_OPTIONS } from '@/lib/wholesale-range-options';

type WholesaleRangePickerProps = {
  from: number;
  to: number;
  step: number;
  boundOptions: number[];
  onFromChange: (value: number) => void;
  onToChange: (value: number) => void;
  onStepChange: (value: number) => void;
};

export function WholesaleRangePicker({
  from,
  to,
  step,
  boundOptions,
  onFromChange,
  onToChange,
  onStepChange,
}: WholesaleRangePickerProps) {
  const styles = useThemedStyles(createStyles);
  const stepOptions = [...WHOLESALE_STEP_OPTIONS];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>From</Text>
        <Text style={styles.headerLabel}>To</Text>
        <Text style={styles.headerLabel}>Step</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.column}>
          <PrescriptionWheelPicker options={boundOptions} value={from} onChange={onFromChange} />
        </View>
        <View style={styles.column}>
          <PrescriptionWheelPicker options={boundOptions} value={to} onChange={onToChange} />
        </View>
        <View style={styles.column}>
          <PrescriptionWheelPicker options={stepOptions} value={step} onChange={onStepChange} />
        </View>
      </View>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    card: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.menuRowAlt,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    headerLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: c.label,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    column: { flex: 1 },
  });
