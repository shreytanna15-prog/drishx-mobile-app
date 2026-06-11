'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRESCRIPTION_PICKER_HEIGHT, PrescriptionWheelPicker } from '@/components/prescription-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { COLOR_LENS_TYPE_OPTIONS, type ColorLensTypeId } from '@/lib/color-lens';
import { buildColorLensRouteParams, parseColorLensOrderParams } from '@/lib/color-lens-order';
import {
  buildAddOptions,
  buildCylOptions,
  buildSphOptions,
  createDefaultPrescription,
  formatAxisPickerLabel,
  getAxisOptionsForLensType,
  lensTypeShowsAdd,
  snapPrescriptionToLensType,
  type ColorLensPrescription,
  type EyePowerValues,
} from '@/lib/color-lens-prescription';
import { useBrandColors } from '@/lib/theme-provider';

type EyeSide = 'right' | 'left';

function EyePowerCard({
  side,
  title,
  badge,
  values,
  showAdd,
  sphOptions,
  cylOptions,
  axisOptions,
  addOptions,
  onFieldChange,
}: {
  side: EyeSide;
  title: string;
  badge: string;
  values: EyePowerValues;
  showAdd: boolean;
  sphOptions: number[];
  cylOptions: number[];
  axisOptions: number[];
  addOptions: number[];
  onFieldChange: (field: keyof EyePowerValues, value: number) => void;
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

      <View style={styles.prescriptionCard}>
        <View style={styles.prescriptionHeader}>
          <Text style={styles.prescriptionHeaderLabel}>SPH</Text>
          <Text style={styles.prescriptionHeaderLabel}>CYL</Text>
          <Text style={[styles.prescriptionHeaderLabel, showAdd && styles.prescriptionHeaderLabelCompact]}>
            AXIS
          </Text>
          {showAdd ? (
            <Text style={[styles.prescriptionHeaderLabel, styles.prescriptionHeaderLabelCompact]}>ADD</Text>
          ) : null}
        </View>

        <View style={styles.prescriptionRow}>
          <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
            <PrescriptionWheelPicker
              options={sphOptions}
              value={values.sph}
              onChange={(value) => onFieldChange('sph', value)}
            />
          </View>
          <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
            <PrescriptionWheelPicker
              options={cylOptions}
              value={values.cyl}
              onChange={(value) => onFieldChange('cyl', value)}
            />
          </View>
          <View style={[styles.pickerColumn, showAdd && styles.pickerColumnCompact]}>
            <PrescriptionWheelPicker
              options={axisOptions}
              value={values.axis}
              formatLabel={formatAxisPickerLabel}
              onChange={(value) => onFieldChange('axis', value)}
            />
          </View>
          {showAdd ? (
            <View style={[styles.pickerColumn, styles.pickerColumnCompact]}>
              <PrescriptionWheelPicker
                options={addOptions}
                value={values.add}
                onChange={(value) => onFieldChange('add', value)}
              />
            </View>
          ) : null}
        </View>
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
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const order = useMemo(() => parseColorLensOrderParams(rawParams), [rawParams]);

  const lensType = (order.lensType as ColorLensTypeId | undefined) ?? 'single-vision';
  const showAdd = lensTypeShowsAdd(lensType);

  const lensTypeLabel = useMemo(
    () => COLOR_LENS_TYPE_OPTIONS.find((entry) => entry.id === lensType)?.title ?? 'Lens',
    [lensType]
  );

  const sphOptions = useMemo(() => buildSphOptions(), []);
  const cylOptions = useMemo(() => buildCylOptions(), []);
  const addOptions = useMemo(() => buildAddOptions(), []);
  const axisOptions = useMemo(() => getAxisOptionsForLensType(lensType), [lensType]);

  const [prescription, setPrescription] = useState<ColorLensPrescription>(() =>
    createDefaultPrescription(lensType)
  );
  const [sameForBothEyes, setSameForBothEyes] = useState(true);

  useEffect(() => {
    setPrescription((current) => snapPrescriptionToLensType(current, lensType));
  }, [lensType, axisOptions]);

  const updateField = useCallback(
    (eye: EyeSide, field: keyof EyePowerValues, value: number) => {
      setPrescription((current) => {
        const updatedEye = { ...current[eye], [field]: value };

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
      params: buildColorLensRouteParams({
        ...order,
        prescription,
      }),
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
            <Text style={styles.subtitle}>
              {lensTypeLabel} · {order.colorName ?? 'Tinted lens'}
            </Text>
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
            sphOptions={sphOptions}
            cylOptions={cylOptions}
            axisOptions={axisOptions}
            addOptions={addOptions}
            onFieldChange={(field, value) => updateField('right', field, value)}
          />

          <EyePowerCard
            side="left"
            title="Left Eye (OS)"
            badge="L"
            values={prescription.left}
            showAdd={showAdd}
            sphOptions={sphOptions}
            cylOptions={cylOptions}
            axisOptions={axisOptions}
            addOptions={addOptions}
            onFieldChange={(field, value) => updateField('left', field, value)}
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
    prescriptionCard: {
      backgroundColor: c.menuRow,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingTop: 10,
      paddingBottom: 6,
      paddingHorizontal: 6,
      gap: 4,
    },
    prescriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    prescriptionHeaderLabel: {
      flex: 1,
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    prescriptionHeaderLabelCompact: {
      flex: 0.85,
    },
    prescriptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: PRESCRIPTION_PICKER_HEIGHT,
    },
    pickerColumn: {
      flex: 1,
      minWidth: 0,
    },
    pickerColumnCompact: {
      flex: 0.85,
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
