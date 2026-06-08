'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useOrderMode } from '@/lib/order-mode';

type WholesaleCategory = {
  id: 'sv' | 'kt' | 'v2';
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const CATEGORIES: WholesaleCategory[] = [
  { id: 'sv', title: 'Single Vision', subtitle: 'SV products', icon: 'remove-red-eye' },
  { id: 'kt', title: 'Kryptok', subtitle: 'KT products', icon: 'visibility' },
  { id: 'v2', title: 'Progressive', subtitle: 'V2 products', icon: 'center-focus-strong' },
];

export default function WholesaleCategoryScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { setMode } = useOrderMode();

  useEffect(() => {
    // Ensure wholesale rules (pairs, etc) apply in later screens.
    setMode('wholesale');
  }, [setMode]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Wholesale Order</Text>
          <View style={styles.backBtn} />
        </View>

        <Text style={styles.hint}>Select a category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/wholesale/items',
                  params: { category: cat.id },
                })
              }>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <MaterialIcons name={cat.icon} size={22} color={colors.primary} />
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
              </View>
              <Text style={styles.cardTitle}>{cat.title}</Text>
              <Text style={styles.cardSubtitle}>{cat.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      paddingBottom: 14,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    hint: { color: c.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    card: {
      width: '48%',
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 14,
      minHeight: 132,
      justifyContent: 'space-between',
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { color: c.text, fontSize: 16, fontWeight: '800', marginTop: 10 },
    cardSubtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  });

