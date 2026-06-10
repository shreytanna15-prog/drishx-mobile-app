'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatPowerLabel } from '@/lib/cart-utils';
import { COLOR_LENS_TYPE_OPTIONS, type ColorLensTypeId } from '@/lib/color-lens';
import {
  createDefaultPrescription,
  lensTypeShowsAdd,
  stepEyePower,
  type ColorLensPrescription,
  type EyePowerValues,
} from '@/lib/color-lens-prescription';
import { useBrandColors } from '@/lib/theme-provider';

type EyeSide = 'right' | 'left';

function PowerStepper({
  label,
  displayValue,
  onDecrease,
  onIncrease,
}: {
  label: string;
  displayValue: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.powerField}>
      <Text style={styles.powerLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperBtn} onPress={onDecrease} hitSlop={6}>
          <MaterialIcons name="remove" size={16} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue} numberOfLines={1}>
          {displayValue}
        </Text>
        <Pressable style={styles.stepperBtn} onPress={onIncrease} hitSlop={6}>
          <MaterialIcons name="add" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function EyePowerCard({
  side,
  title,
  badge,
  values,
  showAdd,
  onStep,
}: {
  side: EyeSide;
  title: string;
  badge: string;
  values: EyePowerValues;
  showAdd: boolean;
  onStep: (field: keyof EyePowerValues, direction: 1 | -1) => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.eyeCard}>
      <View style={styles.eyeHeader}>
        <View style={styles.eyeBadge}>
          <Text style={styles.eyeBadgeText}>{badge}</Text>
        </View>
        <Text style={styles.eyeTitle}>{title}</Text>
      </View>

      <View style={styles.powerRow}>
        <PowerStepper
          label="SPH"
          displayValue={formatPowerLabel(values.sph)}
          onDecrease={() => onStep('sph', -1)}
          onIncrease={() => onStep('sph', 1)}
        />
        <PowerStepper
          label="CYL"
          displayValue={formatPowerLabel(values.cyl)}
          onDecrease={() => onStep('cyl', -1)}
          onIncrease={() => onStep('cyl', 1)}
        />
        <PowerStepper
          label="AXIS"
          displayValue={String(Math.round(values.axis))}
          onDecrease={() => onStep('axis', -1)}
          onIncrease={() => onStep('axis', 1)}
        />
        {showAdd ? (
          <PowerStepper
            label="ADD"
            displayValue={formatPowerLabel(values.add)}
            onDecrease={() => onStep('add', -1)}
            onIncrease={() => onStep('add', 1)}
          />
        ) : null}
      </View>

      <Text style={styles.eyeHint}>
        {side === 'right' ? 'OD — Oculus Dexter' : 'OS — Oculus Sinister'}
      </Text>
    </View>
  );
}

export default function EnterPowerScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    colorId?: string;
    colorName?: string;
    colorHex?: string;
    lensType?: string;
  }>();

  const lensType = (params.lensType as ColorLensTypeId | undefined) ?? 'single-vision';
  const showAdd = lensTypeShowsAdd(lensType);

  const lensTypeLabel = useMemo(
    () => COLOR_LENS_TYPE_OPTIONS.find((entry) => entry.id === lensType)?.title ?? 'Lens',
    [lensType]
  );

  const [prescription, setPrescription] = useState<ColorLensPrescription>(createDefaultPrescription);
  const [sameForBothEyes, setSameForBothEyes] = useState(true);

  const stepField = useCallback(
    (eye: EyeSide, field: keyof EyePowerValues, direction: 1 | -1) => {
      setPrescription((current) => {
        const source = current[eye];
        const nextValue = stepEyePower(field, source[field], direction);
        const updatedEye = { ...source, [field]: nextValue };

        if (sameForBothEyes) {
          return {
            right: { ...updatedEye },
            left: { ...updatedEye },
          };
        }

        return {
          ...current,
          [eye]: updatedEye,
        };
      });
    },
    [sameForBothEyes]
  );

  const toggleSameForBoth = () => {
    setSameForBothEyes((current) => {
      const next = !current;
      if (next) {
        setPrescription((prev) => ({
          right: { ...prev.right },
          left: { ...prev.right },
        }));
      }
      return next;
    });
  };

  const handleContinue = () => {
    router.push({
      pathname: '/color/lens-specifications',
      params: {
        colorId: params.colorId ?? '',
        colorName: params.colorName ?? '',
        colorHex: params.colorHex ?? '',
        lensType: params.lensType ?? '',
      },
    } as never);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Enter Power</Text>
            <Text style={styles.subtitle}>{lensTypeLabel} · {params.colorName ?? 'Tinted lens'}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <EyePowerCard
            side="right"
            title="Right Eye (OD)"
            badge="R"
            values={prescription.right}
            showAdd={showAdd}
            onStep={(field, direction) => stepField('right', field, direction)}
          />

          <EyePowerCard
            side="left"
            title="Left Eye (OS)"
            badge="L"
            values={prescription.left}
            showAdd={showAdd}
            onStep={(field, direction) => stepField('left', field, direction)}
          />

          <Pressable style={styles.samePowerRow} onPress={toggleSameForBoth}>
            <View style={[styles.checkbox, sameForBothEyes && styles.checkboxChecked]}>
              {sameForBothEyes ? (
                <MaterialIcons name="check" size={14} color={colors.primaryText} />
              ) : null}
            </View>
            <Text style={styles.samePowerText}>Same power for both eyes</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.bottomPanel}>
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.primaryText} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 10,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', gap: 3 },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
    eyeCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    eyeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eyeBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyeBadgeText: { color: c.primaryText, fontSize: 13, fontWeight: '900' },
    eyeTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
    powerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    powerField: { width: '47%', flexGrow: 1, gap: 6 },
    powerLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.menuRow,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 4,
      paddingVertical: 6,
      gap: 2,
    },
    stepperBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
    },
    stepperValue: {
      flex: 1,
      color: c.text,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    eyeHint: { color: c.textMuted, fontSize: 11, fontWeight: '500' },
    samePowerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    samePowerText: { color: c.text, fontSize: 14, fontWeight: '600' },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.background,
    },
    continueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    continueBtnText: { color: c.primaryText, fontSize: 16, fontWeight: '900' },
  });
