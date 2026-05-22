'use client';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://192.168.10.115:3000' : 'http://localhost:3000';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || DEFAULT_HOST;

type LensItem = {
  id: string;
  price: number;
  sph: number;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  eye?: string;
  quantity: number;
  createdAt: string;
};


export default function ShopScreen() {
  const [allLenses, setAllLenses] = useState<LensItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLensProducts() {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/lenses`);
        if (!response.ok) {
          throw new Error('Failed to load lenses');
        }
        const data = await response.json();

        if (!isMounted) {
          return;
        }

        // Flatten all lenses into a single array
        const flattenedLenses: LensItem[] = [];
        if (data.kryptok) {
          flattenedLenses.push(...data.kryptok.map((item: any) => ({ ...item, lensType: 'Kryptok' })));
        }
        if (data.progressive) {
          flattenedLenses.push(...data.progressive.map((item: any) => ({ ...item, lensType: 'Progressive' })));
        }
        if (data.singleVision) {
          flattenedLenses.push(...data.singleVision.map((item: any) => ({ ...item, lensType: 'Single Vision' })));
        }

        setAllLenses(flattenedLenses);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        console.warn('Lens fetch error', fetchError);
        setError('Unable to load product data from the backend.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLensProducts();

    return () => {
      isMounted = false;
    };
  }, []);


  const renderLensItem = (item: LensItem & { lensType?: string }) => {
    return (
      <View key={item.id} style={styles.productCard}>
        <ThemedText type="defaultSemiBold">{item.lensType || 'Lens'}</ThemedText>
        <ThemedText type="defaultSemiBold">Price: ₹{item.price}</ThemedText>
        <ThemedText>
          SPH: {item.sph} • CYL: {item.cyl ?? '—'}
          {item.add !== null && item.add !== undefined && ` • ADD: ${item.add}`}
        </ThemedText>
        {item.eye && (
          <ThemedText>Eye: {item.eye}</ThemedText>
        )}
        {item.axis !== null && item.axis !== undefined && (
          <ThemedText>Axis: {item.axis}</ThemedText>
        )}
        <ThemedText>Qty: {item.quantity}</ThemedText>
      </View>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFFFFF', dark: '#0A0A0A' }}
      headerImage={
        <IconSymbol
          size={200}
          color="#0f546d"
          name="bag.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Shop</ThemedText>
        <ThemedText style={styles.totalCount}>{allLenses.length} products</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0f546d" />
            <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
          </View>
        ) : error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {allLenses.length > 0 ? (
              allLenses.map((item) => renderLensItem(item))
            ) : (
              <ThemedText style={styles.noItemsText}>No lenses available</ThemedText>
            )}
          </ScrollView>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  stepContainer: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerImage: {
    bottom: -40,
    left: -25,
    position: 'absolute',
  },
  totalCount: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  productCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#b91c1c',
    marginTop: 8,
  },
  noItemsText: {
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
