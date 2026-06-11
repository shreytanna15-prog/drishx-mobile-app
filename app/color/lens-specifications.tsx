'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { buildColorLensRouteParams, parseColorLensOrderParams } from '@/lib/color-lens-order';
import {
  COLOR_LENS_DIAMETER_MM,
  formatLensIndex,
  getLensIndexForMaterial,
  getMaterialOptionsForLensType,
  type ColorLensMaterialId,
} from '@/lib/color-lens-specifications';
import { useBrandColors } from '@/lib/theme-provider';

function SpecRow({
  label,
  value,
  onPress,
  showChevron = false,
  chevronUp = false,
  style,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  showChevron?: boolean;
  chevronUp?: boolean;
  style?: object;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const content = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        {showChevron ? (
          <MaterialIcons
            name={chevronUp ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22}
            color={colors.textMuted}
          />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.specRow, style]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.specRow, style]}>{content}</View>;
}

export default function LensSpecificationsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const order = useMemo(() => parseColorLensOrderParams(rawParams), [rawParams]);

  const materialOptions = useMemo(
    () => getMaterialOptionsForLensType(order.lensType),
    [order.lensType]
  );

  const [selectedMaterialId, setSelectedMaterialId] = useState<ColorLensMaterialId>(
    (order.materialId as ColorLensMaterialId | undefined) ?? 'tintable-brc'
  );
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);

  useEffect(() => {
    if (!materialOptions.some((option) => option.id === selectedMaterialId)) {
      setSelectedMaterialId(materialOptions[0]?.id ?? 'tintable-brc');
    }
  }, [materialOptions, selectedMaterialId]);

  const selectedMaterial = useMemo(
    () =>
      materialOptions.find((entry) => entry.id === selectedMaterialId) ?? materialOptions[0],
    [materialOptions, selectedMaterialId]
  );

  const lensIndex = getLensIndexForMaterial(selectedMaterialId);
  const colorLabel = order.colorName?.trim() || 'Tinted lens';

  const toggleMaterialPicker = () => {
    setMaterialPickerOpen((open) => !open);
  };

  const selectMaterial = (id: ColorLensMaterialId) => {
    setSelectedMaterialId(id);
    setMaterialPickerOpen(false);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/color/review-confirm',
      params: buildColorLensRouteParams({
        ...order,
        materialId: selectedMaterialId,
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
            <Text style={styles.title}>Lens Specifications</Text>
            <Text style={styles.subtitle}>{colorLabel} · Configure your lens</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.content}>
          <View style={styles.materialSection}>
            <SpecRow
              label="Lens Material"
              value={selectedMaterial.title}
              onPress={toggleMaterialPicker}
              showChevron
              chevronUp={materialPickerOpen}
              style={materialPickerOpen ? styles.specRowOpen : undefined}
            />

            {materialPickerOpen ? (
              <View style={styles.materialDropdown}>
                {materialOptions.map((option, index) => {
                  const selected = selectedMaterialId === option.id;
                  const isLast = index === materialOptions.length - 1;
                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.materialOption,
                        !isLast && styles.materialOptionBorder,
                        selected && styles.materialOptionSelected,
                      ]}
                      onPress={() => selectMaterial(option.id)}>
                      <Text
                        style={[
                          styles.materialOptionText,
                          selected && styles.materialOptionTextSelected,
                        ]}>
                        {option.title}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <SpecRow label="Index" value={formatLensIndex(lensIndex)} />
          <SpecRow label="Diameter" value={`${COLOR_LENS_DIAMETER_MM} mm`} />
        </View>

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
      paddingBottom: 8,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', gap: 3 },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    materialSection: {
      gap: 0,
    },
    specRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 18,
      minHeight: 56,
    },
    specRowOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    rowLabel: {
      color: c.text,
      fontSize: 15,
      fontWeight: '700',
    },
    rowValueWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
      marginLeft: 12,
    },
    rowValue: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      flexShrink: 1,
    },
    materialDropdown: {
      marginTop: -1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.cardBorder,
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
      overflow: 'hidden',
    },
    materialOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    materialOptionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    materialOptionSelected: {
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
    materialOptionText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
    },
    materialOptionTextSelected: {
      color: c.primary,
      fontWeight: '800',
    },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
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
