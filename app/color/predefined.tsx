'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TintStrengthSlider } from '@/components/color-mix-sliders';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { PREDEFINED_LENS_COLORS, type PredefinedLensColor } from '@/lib/color-lens';
import {
  buildColorLensRouteParams,
  COLOR_LENS_DEFAULT_TINT_STRENGTH,
} from '@/lib/color-lens-order';
import { useBrandColors } from '@/lib/theme-provider';

function ColorSwatch({
  color,
  selected,
  onPress,
}: {
  color: PredefinedLensColor;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const brand = useBrandColors();

  return (
    <Pressable style={styles.swatchCell} onPress={onPress}>
      <View style={styles.swatchOuter}>
        <View style={[styles.swatchSphere, { backgroundColor: color.hex }]}>
          <View style={[styles.swatchHighlight, { backgroundColor: color.highlight }]} />
          <View style={[styles.swatchShadow, { backgroundColor: color.shadow }]} />
        </View>
        {selected ? (
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={12} color={brand.primaryText} />
          </View>
        ) : null}
      </View>
      <Text style={styles.swatchLabel}>{color.name}</Text>
    </Pressable>
  );
}

export default function PredefinedColorsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tintStrength, setTintStrength] = useState(COLOR_LENS_DEFAULT_TINT_STRENGTH);

  const selectedColor = useMemo(
    () => PREDEFINED_LENS_COLORS.find((entry) => entry.id === selectedId) ?? null,
    [selectedId],
  );

  const handleContinue = () => {
    if (!selectedColor) return;
    router.push({
      pathname: '/color/lens-type',
      params: buildColorLensRouteParams({
        colorId: selectedColor.id,
        colorName: selectedColor.name,
        colorHex: selectedColor.hex,
        colorHighlight: selectedColor.highlight,
        colorShadow: selectedColor.shadow,
        tintStrength,
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
          <Text style={styles.title}>Predefined Colors</Text>
          <View style={styles.backBtn} />
        </View>

        <FlatList
          data={PREDEFINED_LENS_COLORS}
          keyExtractor={(item) => item.id}
          numColumns={4}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ColorSwatch
              color={item}
              selected={selectedId === item.id}
              onPress={() => setSelectedId(item.id)}
            />
          )}
        />

        <View style={styles.bottomPanel}>
          {selectedColor ? (
            <View style={styles.selectedCard}>
              <View style={[styles.selectedMiniSwatch, { backgroundColor: selectedColor.hex }]}>
                <View
                  style={[styles.selectedMiniHighlight, { backgroundColor: selectedColor.highlight }]}
                />
              </View>
              <View style={styles.selectedMeta}>
                <Text style={styles.selectedHint}>Selected Color</Text>
                <Text style={styles.selectedName}>{selectedColor.name}</Text>
                <Text style={styles.selectedCollection}>Classic Collection</Text>
              </View>
            </View>
          ) : (
            <View style={styles.selectedCardEmpty}>
              <Text style={styles.selectedEmptyText}>Select a color to continue</Text>
            </View>
          )}

          <View style={[styles.tintCard, !selectedColor && styles.tintCardDisabled]}>
            <View style={styles.tintHeader}>
              <View>
                <Text style={styles.tintTitle}>Tint Strength</Text>
                <Text style={styles.tintSubtitle}>How strong the lens tint appears</Text>
              </View>
              <Text style={styles.tintValue}>{tintStrength}%</Text>
            </View>
            <TintStrengthSlider
              value={tintStrength}
              accentHex={selectedColor?.hex ?? colors.primary}
              onChange={setTintStrength}
            />
          </View>

          <Pressable
            style={[styles.continueBtn, !selectedColor && styles.continueBtnDisabled]}
            disabled={!selectedColor}
            onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
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
      paddingBottom: 14,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
    gridContent: { paddingHorizontal: 12, paddingBottom: 12, flexGrow: 1 },
    gridRow: { justifyContent: 'space-between', marginBottom: 18 },
    swatchCell: { width: '23%', alignItems: 'center', gap: 8 },
    swatchOuter: { position: 'relative' },
    swatchSphere: {
      width: 58,
      height: 58,
      borderRadius: 29,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    swatchHighlight: {
      position: 'absolute',
      top: 8,
      left: 10,
      width: 18,
      height: 18,
      borderRadius: 9,
      opacity: 0.55,
    },
    swatchShadow: {
      position: 'absolute',
      bottom: 6,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      opacity: 0.35,
    },
    checkBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background,
    },
    swatchLabel: { color: c.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    selectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    selectedCardEmpty: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    selectedEmptyText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    selectedMiniSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
    },
    selectedMiniHighlight: {
      position: 'absolute',
      top: 6,
      left: 7,
      width: 12,
      height: 12,
      borderRadius: 6,
      opacity: 0.5,
    },
    selectedMeta: { flex: 1, gap: 1 },
    selectedHint: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    selectedName: { color: c.text, fontSize: 16, fontWeight: '800' },
    selectedCollection: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    tintCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    tintCardDisabled: { opacity: 0.55 },
    tintHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    tintTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    tintSubtitle: { color: c.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },
    tintValue: { color: c.primary, fontSize: 18, fontWeight: '900' },
    continueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#4F46E5',
      borderRadius: 14,
      paddingVertical: 15,
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    continueBtnDisabled: { opacity: 0.45 },
    continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  });
