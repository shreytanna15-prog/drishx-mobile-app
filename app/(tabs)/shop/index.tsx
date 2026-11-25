'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogSearchBar } from '@/components/catalog-search-bar';
import { ShopCategoryCard } from '@/components/shop-category-card';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors, useResolvedColorScheme } from '@/lib/theme-provider';
import { useCart } from '@/lib/cart';
import {
  catalogImageSourceForShopCategory,
  fetchCatalogImages,
  type CatalogImagesResponse,
} from '@/lib/catalog-images-api';
import { fetchLensCatalogItems } from '@/lib/lenses-api';
import { useOrderMode } from '@/lib/order-mode';
import { getCartBadgeCount } from '@/lib/order-quantity';
import {
  LENS_CATALOG_CATEGORIES,
  wholesaleCategoryToApiType,
  type WholesaleCategoryId,
} from '@/lib/wholesale-navigation';

export default function ShopScreen() {
  const colors = useBrandColors();
  const colorScheme = useResolvedColorScheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { items: cartItems } = useCart();
  const { mode: orderMode, setMode } = useOrderMode();
  const [catalogImages, setCatalogImages] = useState<CatalogImagesResponse | null>(null);
  const [productCounts, setProductCounts] = useState<
    Partial<Record<WholesaleCategoryId, number>>
  >({});

  const cartBadgeCount = getCartBadgeCount(
    cartItems.reduce((sum, entry) => sum + entry.cartQuantity, 0),
    orderMode
  );

  useFocusEffect(
    useCallback(() => {
      setMode('retail');
    }, [setMode])
  );

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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>Shop</Text>
            <Text style={styles.subtitle}>Select a category</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.push('/(tabs)/cart')}>
            <MaterialIcons name="shopping-cart" size={22} color={colors.primary} />
            {cartBadgeCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartBadgeCount > 99 ? '99+' : cartBadgeCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <CatalogSearchBar />
        </View>

        <Pressable
          style={[styles.iconButton, { alignSelf: 'stretch', marginBottom: 16 }]}
          onPress={() => router.push('/shop/catalog')}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Shop catalog stock →</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.sectionUnderline} />
          </View>
          <Pressable
            onPress={() => router.push('/shop/search')}
            hitSlop={8}
            style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View all</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {LENS_CATALOG_CATEGORIES.map((cat) => {
            const imageSource = catalogImageSourceForShopCategory(
              catalogImages,
              cat.id,
              colorScheme
            );
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
                    pathname: '/shop/items',
                    params: { category: cat.id },
                  })
                }
              />
            );
          })}
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 16,
    },
    titleBlock: { flex: 1, paddingRight: 8 },
    screenTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: c.text,
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      marginTop: 4,
      fontWeight: '600',
    },
    searchWrap: { marginBottom: 18 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
    },
    sectionUnderline: {
      marginTop: 4,
      width: 36,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewAllText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(240, 161, 50, 0.12)',
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: c.primary,
    },
    cartBadgeText: { color: c.primaryText, fontSize: 11, fontWeight: '800' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
  });
