'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { fetchLensCatalogItems, type LensCatalogItem } from '@/lib/lenses-api';
import { useOrderMode } from '@/lib/order-mode';
import {
  catalogCategoryDisplayTitle,
  parseWholesaleCategory,
  wholesaleCategoryToApiType,
} from '@/lib/wholesale-navigation';

function ItemCard({
  item,
  onPress,
  uppercase,
}: {
  item: LensCatalogItem;
  onPress: () => void;
  uppercase?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const disabled = item.productCount < 1;

  return (
    <Pressable
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}>
      <Text style={[styles.cardTitle, uppercase && styles.cardTitleUpper]} numberOfLines={3}>
        {item.name}
      </Text>
      <Text style={styles.cardMeta}>
        {disabled
          ? 'No products yet'
          : `${item.productCount} product${item.productCount === 1 ? '' : 's'}`}
      </Text>
    </Pressable>
  );
}

export default function ShopItemsScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { setMode } = useOrderMode();
  const params = useLocalSearchParams<{ category?: string }>();

  const category = useMemo(() => parseWholesaleCategory(params.category), [params.category]);
  const categoryTitle = catalogCategoryDisplayTitle(category);

  const [items, setItems] = useState<LensCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode('retail');
  }, [setMode]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLensCatalogItems(wholesaleCategoryToApiType(category));
      setItems(data);
    } catch (err) {
      setItems([]);
      const detail = err instanceof Error ? err.message : 'Network request failed';
      setError(
        detail.includes('Cannot reach backend')
          ? `${detail}\n\nUse your PC Wi-Fi IP in .env (not WSL 172.x), then restart Expo with: npx expo start -c`
          : 'Unable to load items from the backend.'
      );
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {categoryTitle}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <Text style={styles.hint}>Select an item</Text>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading items…</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <MaterialIcons name="cloud-off" size={32} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadItems()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(entry) => entry.name}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ItemCard
                item={item}
                uppercase
                onPress={() =>
                  router.push({
                    pathname: '/shop/products',
                    params: {
                      category,
                      item: item.name,
                    },
                  })
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.centeredState}>
                <MaterialIcons name="inventory-2" size={40} color={colors.textMuted} />
                <Text style={styles.stateText}>No items found for this category.</Text>
              </View>
            }
          />
        )}
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
      paddingBottom: 12,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
    hint: { color: c.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 12 },
    listContent: { paddingBottom: 24, gap: 12 },
    row: { justifyContent: 'space-between', gap: 12 },
    card: {
      flex: 1,
      minHeight: 96,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardDisabled: { opacity: 0.55 },
    cardTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 20,
    },
    cardTitleUpper: {
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    cardMeta: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    centeredState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 28,
    },
    stateText: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    errorText: { color: c.danger, fontSize: 14, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 4,
      backgroundColor: c.primary,
    },
    retryText: { color: c.primaryText, fontWeight: '800' },
  });
