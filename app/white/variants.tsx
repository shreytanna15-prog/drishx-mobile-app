'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { getOnBehalfCustomOrderContext } from '@/lib/on-behalf-custom-order';
import {
  buildWhiteCatalogLensItem,
  getWhiteProductLine,
  listWhiteVariants,
  parseWhiteLensType,
  parseWhiteProductLine,
} from '@/lib/white-catalog';

export default function WhiteVariantsScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ lensType?: string; line?: string }>();

  const lensType = useMemo(() => parseWhiteLensType(params.lensType), [params.lensType]);
  const lineId = useMemo(() => parseWhiteProductLine(params.line), [params.line]);
  const line = useMemo(() => (lineId ? getWhiteProductLine(lineId) : null), [lineId]);
  const variants = useMemo(() => (lineId ? listWhiteVariants(lineId) : []), [lineId]);

  if (!lensType || !lineId || !line) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Text style={styles.errorText}>Invalid white product line.</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>{line.title}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Power ranges</Text>
          {variants.map((variant) => (
            <Pressable
              key={variant.id}
              style={styles.optionCard}
              onPress={() => {
                const catalogItem = buildWhiteCatalogLensItem(lineId, variant.id);
                const onBehalf = getOnBehalfCustomOrderContext();
                router.push({
                  pathname: '/lens-product',
                  params: {
                    payload: encodeURIComponent(JSON.stringify(catalogItem)),
                    ...(onBehalf ? { mode: 'on-behalf-select' } : {}),
                  },
                });
              }}>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{variant.title}</Text>
                <Text style={styles.optionDescription}>{variant.subtitle}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
            </Pressable>
          ))}
        </ScrollView>
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
      paddingBottom: 12,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, color: c.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
    sectionTitle: { color: c.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    optionTextWrap: { flex: 1, gap: 4 },
    optionTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
    optionDescription: { color: c.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    errorText: { color: c.danger, textAlign: 'center', marginTop: 24, fontSize: 15 },
  });
