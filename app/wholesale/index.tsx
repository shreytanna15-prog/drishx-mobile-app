'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShopCategoryCard } from '@/components/shop-category-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import {
  catalogImageSourceForShopCategory,
  fetchCatalogImages,
  type CatalogImagesResponse,
} from '@/lib/catalog-images-api';
import { fetchLensCatalogItems } from '@/lib/lenses-api';
import { useOrderMode } from '@/lib/order-mode';
import {
  LENS_CATALOG_CATEGORIES,
  wholesaleCategoryToApiType,
  type WholesaleCategoryId,
} from '@/lib/wholesale-navigation';

export default function WholesaleCategoryScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { setMode } = useOrderMode();
  const [catalogImages, setCatalogImages] = useState<CatalogImagesResponse | null>(null);
  const [productCounts, setProductCounts] = useState<
    Partial<Record<WholesaleCategoryId, number>>
  >({});

  useEffect(() => {
    setMode('wholesale');
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalogImages()
      .then((data) => {
        if (!cancelled) setCatalogImages(data);
      })
      .catch(() => {
        if (!cancelled) setCatalogImages(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      LENS_CATALOG_CATEGORIES.map(async (cat) => {
        try {
          const items = await fetchLensCatalogItems(wholesaleCategoryToApiType(cat.id));
          const total = items.reduce((sum, item) => sum + (item.productCount ?? 0), 0);
          return [cat.id, total] as const;
        } catch {
          return [cat.id, null] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const next: Partial<Record<WholesaleCategoryId, number>> = {};
      for (const [id, total] of entries) {
        if (typeof total === 'number') next[id] = total;
      }
      setProductCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.sectionUnderline} />
        </View>

        <View style={styles.grid}>
          {LENS_CATALOG_CATEGORIES.map((cat) => {
            const imageSource = catalogImageSourceForShopCategory(catalogImages, cat.id);
            return (
              <ShopCategoryCard
                key={cat.id}
                title={cat.title}
                subtitle={cat.subtitle}
                icon={cat.icon}
                imageSource={imageSource}
                productCount={productCounts[cat.id] ?? null}
                onPress={() =>
                  router.push({
                    pathname: '/wholesale/items',
                    params: { category: cat.id },
                  })
                }
              />
            );
          })}
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
    sectionHeader: { marginBottom: 14 },
    sectionTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
    sectionUnderline: {
      marginTop: 4,
      width: 36,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  });
