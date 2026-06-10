'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import {
  COLOR_LENS_TYPE_OPTIONS,
  type ColorLensTypeId,
  type ColorLensTypeOption,
} from '@/lib/color-lens';
import { useBrandColors } from '@/lib/theme-provider';

function LensTypeCard({
  option,
  selected,
  onPress,
}: {
  option: ColorLensTypeOption;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={[styles.typeCard, selected && styles.typeCardSelected]}
      onPress={onPress}>
      <View style={[styles.typeIconWrap, selected && styles.typeIconWrapSelected]}>
        <MaterialIcons name={option.icon} size={28} color={colors.primary} />
      </View>

      <View style={styles.typeMeta}>
        <Text style={[styles.typeTitle, selected && styles.typeTitleSelected]}>{option.title}</Text>
        <Text style={styles.typeSubtitle} numberOfLines={2}>
          {option.subtitle}
        </Text>
      </View>

      <View style={[styles.typeCheck, selected && styles.typeCheckSelected]}>
        {selected ? (
          <MaterialIcons name="check" size={16} color={colors.primaryText} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SelectLensTypeScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    colorId?: string;
    colorName?: string;
    colorHex?: string;
  }>();

  const [selectedTypeId, setSelectedTypeId] = useState<ColorLensTypeId>('single-vision');

  const selectedType = useMemo(
    () =>
      COLOR_LENS_TYPE_OPTIONS.find((entry) => entry.id === selectedTypeId) ??
      COLOR_LENS_TYPE_OPTIONS[0],
    [selectedTypeId]
  );

  const colorLabel = params.colorName?.trim() || 'your color';
  const colorHex = params.colorHex?.trim();

  const handleContinue = () => {
    router.push({
      pathname: '/color/enter-power',
      params: {
        colorId: params.colorId ?? '',
        colorName: params.colorName ?? '',
        colorHex: params.colorHex ?? '',
        lensType: selectedTypeId,
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
            <Text style={styles.title}>Select Lens Type</Text>
            <Text style={styles.subtitle}>Choose the lens that fits your vision needs</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {colorHex ? (
          <View style={styles.colorBanner}>
            <View style={[styles.colorSwatch, { backgroundColor: colorHex }]} />
            <View style={styles.colorBannerMeta}>
              <Text style={styles.colorBannerLabel}>Selected tint</Text>
              <Text style={styles.colorBannerName}>{colorLabel}</Text>
            </View>
            <MaterialIcons name="palette" size={20} color={colors.primary} />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Lens categories</Text>

          <View style={styles.typeList}>
            {COLOR_LENS_TYPE_OPTIONS.map((option) => (
              <LensTypeCard
                key={option.id}
                option={option}
                selected={selectedTypeId === option.id}
                onPress={() => setSelectedTypeId(option.id)}
              />
            ))}
          </View>

          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={styles.aboutTitle}>About Lens Type</Text>
            </View>
            <Text style={styles.aboutLensName}>{selectedType.title}</Text>
            <Text style={styles.aboutText}>{selectedType.description}</Text>
          </View>
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
    subtitle: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    colorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.6)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    colorBannerMeta: { flex: 1, gap: 2 },
    colorBannerLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    colorBannerName: { color: c.text, fontSize: 16, fontWeight: '800' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
    sectionLabel: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 4,
    },
    typeList: { gap: 12 },
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    typeCardSelected: {
      borderColor: c.primary,
      borderWidth: 1.5,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
      shadowColor: c.primary,
      shadowOpacity: 0.12,
    },
    typeIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    typeIconWrapSelected: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.22)',
    },
    typeMeta: { flex: 1, gap: 4 },
    typeTitle: { color: c.textMuted, fontSize: 16, fontWeight: '800' },
    typeTitleSelected: { color: c.text },
    typeSubtitle: { color: c.textMuted, fontSize: 12, fontWeight: '500', lineHeight: 16 },
    typeCheck: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.menuRow,
    },
    typeCheckSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    aboutCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
      gap: 8,
    },
    aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    aboutTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    aboutLensName: { color: c.primary, fontSize: 14, fontWeight: '800', marginTop: 2 },
    aboutText: { color: c.textMuted, fontSize: 13, fontWeight: '500', lineHeight: 20 },
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
