'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LightnessSlider, TintStrengthSlider } from '@/components/color-mix-sliders';
import {
  ColorWheelPicker,
  createWheelColor,
  type WheelColor,
} from '@/components/color-wheel-picker';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { hslToHex, mixHslColors, type HslColor } from '@/lib/color-utils';
import { useBrandColors } from '@/lib/theme-provider';

const MAX_COLORS = 3;

const DEFAULT_COLORS: WheelColor[] = [
  createWheelColor('1', { h: 224, s: 75, l: 42 }),
  createWheelColor('2', { h: 265, s: 68, l: 50 }),
];

export default function CustomMixScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [selectedColors, setSelectedColors] = useState<WheelColor[]>(DEFAULT_COLORS);
  const [activeColorId, setActiveColorId] = useState(DEFAULT_COLORS[0].id);
  const [tintStrength, setTintStrength] = useState(55);

  const activeColor =
    selectedColors.find((entry) => entry.id === activeColorId) ?? selectedColors[0] ?? null;

  const mixedPreview = useMemo(() => {
    const blended = mixHslColors(
      selectedColors.map((entry) => ({ h: entry.h, s: entry.s, l: entry.l }))
    );
    return hslToHex(blended);
  }, [selectedColors]);

  const updateColor = useCallback((id: string, next: HslColor) => {
    setSelectedColors((current) =>
      current.map((entry) =>
        entry.id === id
          ? createWheelColor(id, {
              h: next.h,
              s: next.s,
              l: next.l,
            })
          : entry
      )
    );
  }, []);

  const addColor = () => {
    if (selectedColors.length >= MAX_COLORS) return;

    const id = `${Date.now()}`;
    const last = selectedColors[selectedColors.length - 1];
    const nextColor = createWheelColor(id, {
      h: ((last?.h ?? 180) + 48) % 360,
      s: 72,
      l: 50,
    });

    setSelectedColors((current) => [...current, nextColor]);
    setActiveColorId(id);
  };

  const removeColor = (id: string) => {
    if (selectedColors.length <= 1) return;
    setSelectedColors((current) => current.filter((entry) => entry.id !== id));
    if (activeColorId === id) {
      setActiveColorId(selectedColors.find((entry) => entry.id !== id)?.id ?? '1');
    }
  };

  const showPreviewComingSoon = () => {
    Alert.alert('Coming soon', 'Mix preview will be available in a future update.');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Custom Mix</Text>
            <Text style={styles.subtitle}>Blend up to {MAX_COLORS} custom tints</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerRow}>
              <View style={styles.wheelColumn}>
                <ColorWheelPicker
                  colors={selectedColors}
                  activeColorId={activeColor?.id ?? selectedColors[0]?.id ?? '1'}
                  onColorChange={updateColor}
                  centerFill={mixedPreview}
                />
              </View>

              {activeColor ? (
                <LightnessSlider
                  color={activeColor}
                  onChange={(lightness) =>
                    updateColor(activeColor.id, {
                      h: activeColor.h,
                      s: activeColor.s,
                      l: lightness,
                    })
                  }
                />
              ) : null}
            </View>

            <Text style={styles.pickerHint}>
              Drag on the wheel to pick hue. Use the slider to adjust brightness.
            </Text>
          </View>

          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>Selected Colors</Text>
              <Text style={styles.selectedCount}>
                {selectedColors.length}/{MAX_COLORS}
              </Text>
            </View>

            <View style={styles.selectedRow}>
              {selectedColors.map((entry) => {
                const isActive = entry.id === activeColor?.id;
                return (
                  <Pressable
                    key={entry.id}
                    style={[styles.colorChip, isActive && styles.colorChipActive]}
                    onPress={() => setActiveColorId(entry.id)}
                    onLongPress={() => removeColor(entry.id)}>
                    <View style={[styles.colorChipSwatch, { backgroundColor: entry.hex }]} />
                    <View style={styles.colorChipMeta}>
                      <Text style={styles.colorChipHex}>{entry.hex}</Text>
                      <Text style={styles.colorChipLight}>{entry.l}% light</Text>
                    </View>
                    {isActive ? (
                      <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}

              {selectedColors.length < MAX_COLORS ? (
                <Pressable style={styles.addColorBtn} onPress={addColor}>
                  <MaterialIcons name="add" size={24} color={colors.primary} />
                  <Text style={styles.addColorText}>Add</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.blendCard}>
              <View style={styles.blendLeft}>
                <Text style={styles.blendLabel}>Blend preview</Text>
                <Text style={styles.blendHex}>{mixedPreview}</Text>
              </View>
              <View style={[styles.blendSwatch, { backgroundColor: mixedPreview }]} />
            </View>
          </View>

          <View style={styles.tintCard}>
            <View style={styles.tintHeader}>
              <View>
                <Text style={styles.tintTitle}>Tint Strength</Text>
                <Text style={styles.tintSubtitle}>How strong the lens tint appears</Text>
              </View>
              <Text style={styles.tintValue}>{tintStrength}%</Text>
            </View>
            <TintStrengthSlider
              value={tintStrength}
              accentHex={mixedPreview}
              onChange={setTintStrength}
            />
          </View>
        </ScrollView>

        <View style={styles.bottomPanel}>
          <Pressable style={styles.previewBtn} onPress={showPreviewComingSoon}>
            <Text style={styles.previewBtnText}>Preview Mix</Text>
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
    headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
    title: { color: c.text, fontSize: 20, fontWeight: '900' },
    subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
    pickerCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      minHeight: 270,
    },
    wheelColumn: { flex: 1 },
    pickerHint: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 17,
    },
    selectedCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 14,
    },
    selectedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    selectedCount: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
    selectedRow: { gap: 10 },
    colorChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: c.menuRow,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    colorChipActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
    colorChipSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    colorChipMeta: { flex: 1, gap: 2 },
    colorChipHex: { color: c.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
    colorChipLight: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    addColorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.cardBorder,
      backgroundColor: c.menuRowAlt,
    },
    addColorText: { color: c.primary, fontSize: 13, fontWeight: '800' },
    blendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    blendLeft: { gap: 4 },
    blendLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    blendHex: { color: c.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
    blendSwatch: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: c.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    tintCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 12,
    },
    tintHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tintTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    tintSubtitle: { color: c.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },
    tintValue: { color: c.primary, fontSize: 18, fontWeight: '900' },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.background,
    },
    previewBtn: {
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
    previewBtnText: { color: c.primaryText, fontSize: 16, fontWeight: '900' },
  });
