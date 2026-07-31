'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogSearchBar } from '@/components/catalog-search-bar';
import { appAlert } from '@/lib/app-alert';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import {
  catalogImageForShopCategory,
  fetchCatalogImages,
  type CatalogImagesResponse,
} from '@/lib/catalog-images-api';
import { useOrderMode } from '@/lib/order-mode';
import { getCartBadgeCount } from '@/lib/order-quantity';
import { uploadPhotoOrder } from '@/lib/photo-orders-api';
import { LENS_CATALOG_CATEGORIES } from '@/lib/wholesale-navigation';

export default function ShopScreen() {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { items: cartItems } = useCart();
  const { mode: orderMode, setMode } = useOrderMode();
  const { getAuthHeaders } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [catalogImages, setCatalogImages] = useState<CatalogImagesResponse | null>(null);

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

  const submitPhotoOrder = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const uri = asset.uri;
      if (!uri) {
        appAlert('Upload failed', 'Could not read the selected image.');
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileName =
        asset.fileName ?? `prescription-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;

      setUploadingPhoto(true);
      try {
        const result = await uploadPhotoOrder(uri, mimeType, fileName, getAuthHeaders());
        appAlert(
          'Order received',
          result.message || 'Your order will be placed soon. Our team will process your prescription photo.'
        );
      } catch (err) {
        appAlert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setUploadingPhoto(false);
      }
    },
    [getAuthHeaders]
  );

  const handlePhotoOrderPress = useCallback(() => {
    if (uploadingPhoto) return;

    appAlert('Order with photo', 'Upload a prescription photo for our team to place your order.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            appAlert('Permission needed', 'Camera access is required to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await submitPhotoOrder(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            appAlert('Permission needed', 'Photo library access is required to choose an image.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await submitPhotoOrder(result.assets[0]);
          }
        },
      },
    ]);
  }, [submitPhotoOrder, uploadingPhoto]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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

        <View style={styles.grid}>
          {LENS_CATALOG_CATEGORIES.map((cat) => {
            const imageUrl = catalogImageForShopCategory(catalogImages, cat.id);
            return (
              <Pressable
                key={cat.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/shop/items',
                    params: { category: cat.id },
                  })
                }>
                <View style={styles.cardTop}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={styles.iconWrap}>
                      <MaterialIcons name={cat.icon} size={22} color={colors.primary} />
                    </View>
                  )}
                  <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                </View>
                <Text style={styles.cardTitle}>{cat.title}</Text>
                <Text style={styles.cardSubtitle}>{cat.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.fab, uploadingPhoto && styles.fabDisabled]}
          onPress={handlePhotoOrderPress}
          disabled={uploadingPhoto}
          accessibilityRole="button"
          accessibilityLabel="Upload prescription photo for order">
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <MaterialIcons name="add-a-photo" size={26} color={colors.primaryText} />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    safeArea: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
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
    searchWrap: { marginBottom: 16 },
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
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardImage: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
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
    cardTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    cardSubtitle: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    fabDisabled: { opacity: 0.75 },
  });
