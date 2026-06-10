'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
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
import { COLOR_LENS_TYPE_OPTIONS, PREDEFINED_LENS_COLORS } from '@/lib/color-lens';
import {
  COLOR_LENS_COLLECTION_LABEL,
  COLOR_LENS_DEFAULT_COATING,
  COLOR_LENS_DEFAULT_TINT_STRENGTH,
  COLOR_LENS_EST_DELIVERY,
  parseColorLensOrderParams,
} from '@/lib/color-lens-order';
import { createDefaultPrescription } from '@/lib/color-lens-prescription';
import {
  formatLensIndex,
  getLensIndexForMaterial,
  type ColorLensMaterialId,
} from '@/lib/color-lens-specifications';
import { hexToRgba } from '@/lib/color-utils';
import { useBrandColors } from '@/lib/theme-provider';

function ReviewRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

export default function ReviewConfirmScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const order = useMemo(() => parseColorLensOrderParams(rawParams), [rawParams]);

  const predefinedColor = useMemo(
    () => PREDEFINED_LENS_COLORS.find((entry) => entry.id === order.colorId) ?? null,
    [order.colorId]
  );

  const colorName = order.colorName?.trim() || predefinedColor?.name || 'Tinted lens';
  const colorHex = order.colorHex?.trim() || predefinedColor?.hex || '#2563EB';
  const colorHighlight = order.colorHighlight?.trim() || predefinedColor?.highlight;
  const colorShadow = order.colorShadow?.trim() || predefinedColor?.shadow;

  const lensTypeLabel = useMemo(
    () =>
      COLOR_LENS_TYPE_OPTIONS.find((entry) => entry.id === order.lensType)?.title ??
      'Single Vision',
    [order.lensType]
  );

  const materialId = (order.materialId as ColorLensMaterialId | undefined) ?? 'tintable-brc';
  const lensIndex = formatLensIndex(getLensIndexForMaterial(materialId));

  const prescription = order.prescription ?? createDefaultPrescription();
  const powerSummary = `${formatPowerLabel(prescription.right.sph)} / ${formatPowerLabel(prescription.left.sph)}`;

  const tintStrength = order.tintStrength ?? COLOR_LENS_DEFAULT_TINT_STRENGTH;
  const tintedBackground = hexToRgba(colorHex, 0.1);

  const handleChangeColor = () => {
    router.push('/color/predefined' as never);
  };

  const handleAddToOrder = () => {
    Alert.alert('Coming soon', 'Adding color lenses to your order will be available soon.');
  };

  return (
    <View style={[styles.root, { backgroundColor: tintedBackground }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Review & Confirm</Text>
            <Text style={styles.stepLabel}>Step 6 of 6</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.productCard}>
            <View style={[styles.productSwatch, { backgroundColor: colorHex }]}>
              {colorHighlight ? (
                <View style={[styles.swatchHighlight, { backgroundColor: colorHighlight }]} />
              ) : null}
              {colorShadow ? (
                <View style={[styles.swatchShadow, { backgroundColor: colorShadow }]} />
              ) : null}
            </View>

            <View style={styles.productMeta}>
              <Text style={styles.productName}>{colorName}</Text>
              <Text style={styles.productCollection}>{COLOR_LENS_COLLECTION_LABEL}</Text>
            </View>

            <Pressable onPress={handleChangeColor} hitSlop={8}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>

          <View style={styles.specCard}>
            <ReviewRow label="Lens Type" value={lensTypeLabel} />
            <View style={styles.specDivider} />
            <ReviewRow label="Power (OD/OS)" value={powerSummary} />
            <View style={styles.specDivider} />
            <ReviewRow label="Index" value={lensIndex} />
            <View style={styles.specDivider} />
            <ReviewRow label="Coating" value={COLOR_LENS_DEFAULT_COATING} />
            <View style={styles.specDivider} />
            <ReviewRow label="Tint Strength" value={`${tintStrength}%`} />
            <View style={styles.specDivider} />
            <ReviewRow label="Est. Delivery" value={COLOR_LENS_EST_DELIVERY} />
          </View>
        </ScrollView>

        <View style={styles.bottomPanel}>
          <Pressable style={styles.addBtn} onPress={handleAddToOrder}>
            <Text style={styles.addBtnText}>Add to Order</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1 },
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
    headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    stepLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    productSwatch: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    swatchHighlight: {
      position: 'absolute',
      top: 8,
      left: 9,
      width: 14,
      height: 14,
      borderRadius: 7,
      opacity: 0.55,
    },
    swatchShadow: {
      position: 'absolute',
      bottom: 6,
      right: 7,
      width: 16,
      height: 16,
      borderRadius: 8,
      opacity: 0.35,
    },
    productMeta: { flex: 1, gap: 2 },
    productName: { color: c.text, fontSize: 16, fontWeight: '800' },
    productCollection: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    changeLink: { color: '#7C3AED', fontSize: 14, fontWeight: '800' },
    specCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    reviewLabel: { color: c.textMuted, fontSize: 14, fontWeight: '600', flex: 1 },
    reviewValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'right',
      flexShrink: 1,
    },
    specDivider: { height: 1, backgroundColor: c.cardBorder },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: 'transparent',
    },
    addBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4F46E5',
      borderRadius: 16,
      paddingVertical: 16,
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  });
